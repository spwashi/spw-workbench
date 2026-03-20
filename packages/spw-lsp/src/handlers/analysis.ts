/**
 * Analysis Handlers — diagnostics + folding ranges
 *
 * Structural analysis of .spw documents: parse errors, broken refs,
 * stale projections, brace physics, runtime diagnostics, and folding.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
    LspDiagnostic, LspFoldingRange, DocumentParams,
    HandlerDeps,
} from '../types'

// ── Diagnostics ─────────────────────────────────────────────────

export async function publishDiagnostics(uri: string, deps: HandlerDeps): Promise<void> {
    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return

    const diagnostics: LspDiagnostic[] = []

    // 1. Parse errors
    const pr = doc.parseResult
    if (pr && !pr.success) {
        for (const err of pr.errors) {
            const line = Math.max(0, err.position.line - 1)
            const col = Math.max(0, err.position.column - 1)
            diagnostics.push({
                range: { start: { line, character: col }, end: { line, character: col + 1 } },
                severity: 1,
                source: 'spw',
                message: err.rule ? `${err.rule}: parse error` : 'parse error',
            })
        }

        if (pr.error) {
            const msg = pr.error.message || 'unexpected parse failure'
            const expected = pr.error.expected?.length ? ` (expected: ${pr.error.expected.join(', ')})` : ''
            const found = pr.error.found ? ` (found: ${pr.error.found})` : ''
            const line = pr.errors[0] ? Math.max(0, pr.errors[0].position.line - 1) : 0
            diagnostics.push({
                range: { start: { line, character: 0 }, end: { line, character: 1 } },
                severity: 1,
                source: 'spw',
                message: `${msg}${expected}${found}`,
            })
        }
    }

    // 2. Broken refs
    const refSeverity = deps.config.diagnostics.unresolvedRefs
    if (refSeverity !== 'off') {
        const severityMap: Record<string, number> = { error: 1, warning: 2, hint: 4 }
        const severity = severityMap[refSeverity ?? 'warning'] ?? 2
        const docPath = doc.filePath
        const source = doc.text
        for (const hit of doc.selectorHits) {
            const resolved = await deps.resolveReferencePath(hit, source, docPath, { allowDirectory: true })
            if (resolved) continue

            const target = hit.kind === 'pathRef' ? hit.target : `@${hit.root}/${hit.target}`
            diagnostics.push({
                range: {
                    start: { line: hit.span.startLine, character: hit.span.startCharacter },
                    end: { line: hit.span.endLine, character: hit.span.endCharacter },
                },
                severity,
                source: 'spw',
                message: `unresolved reference: ${target}`,
            })
        }
    }

    // 3. Stale projections
    if (deps.config.diagnostics.staleProjections) {
        const docPath2 = doc.filePath
        const projections = deps.serverIndex.getProjectionsFromSpecOwner(docPath2)
        for (const proj of projections) {
            const genPath = path.resolve(deps.workspaceRoot, proj.root.replace(/^\.\//, '').replace(/\/$/, ''))
            try {
                const specStat = await fs.stat(docPath2)
                const genStat = await fs.stat(genPath)
                if (specStat.mtimeMs > genStat.mtimeMs) {
                    diagnostics.push({
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                        severity: 3,
                        source: 'spw',
                        message: `projection "${proj.name}" may be stale (spec changed since last generation)`,
                    })
                }
            } catch {
                // generated file doesn't exist — that's ok
            }
        }
    }

    // 4. Brace physics — depth budget
    {
        const lines = doc.text.split('\n')
        let depth = 0
        let maxDepthLine = -1
        let maxDepth = 0
        for (let i = 0; i < lines.length; i++) {
            for (const ch of lines[i]) {
                if (ch === '{') depth++
                else if (ch === '}') depth = Math.max(0, depth - 1)
            }
            if (depth > maxDepth) {
                maxDepth = depth
                maxDepthLine = i
            }
        }
        if (maxDepth >= 5 && maxDepthLine >= 0) {
            diagnostics.push({
                range: { start: { line: maxDepthLine, character: 0 }, end: { line: maxDepthLine, character: 1 } },
                severity: 4,
                source: 'spw-physics',
                message: `Nesting depth ${maxDepth} exceeds budget (4). Consider extracting a named sub-frame.`,
            })
        }
    }

    // 5. Brace physics — valence composition
    {
        const text = doc.text
        const frameRe = /\^(?:\["([^"]+)"\]|"([^"]+)"|'([^']+)')\s*\{/g
        let frameMatch: RegExpExecArray | null
        while ((frameMatch = frameRe.exec(text)) !== null) {
            const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3]
            const braceStart = text.indexOf('{', frameMatch.index + frameMatch[0].length - 1)
            if (braceStart < 0) continue

            let depth = 1
            let blockEnd = braceStart + 1
            for (; blockEnd < text.length && depth > 0; blockEnd++) {
                if (text[blockEnd] === '{') depth++
                else if (text[blockEnd] === '}') depth--
            }

            const block = text.slice(braceStart, blockEnd)
            const hasBoon = /!boon\b/.test(block)
            const hasBane = /!bane\b/.test(block)

            if (hasBoon && hasBane) {
                const lineNo = text.slice(0, frameMatch.index).split('\n').length - 1
                diagnostics.push({
                    range: { start: { line: lineNo, character: 0 }, end: { line: lineNo, character: frameMatch[0].length } },
                    severity: 4,
                    source: 'spw-physics',
                    message: `Frame "${frameName}" holds mixed valence (!boon + !bane) — intentional tension?`,
                })
            }
        }
    }

    // 6. Runtime diagnostics
    try {
        const trial = deps.trialRunSpw(doc.text, uri)
        if (!trial.success && trial.issues) {
            for (const issue of trial.issues) {
                if (issue.stage === 'parse') continue
                diagnostics.push({
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                    severity: 4,
                    source: `spw-runtime:${issue.stage}`,
                    message: issue.message,
                })
            }
        }
    } catch {
        // Runtime trial failed — don't break diagnostics
    }

    deps.sendNotification('textDocument/publishDiagnostics', { uri, diagnostics })
}

// ── Folding Ranges ──────────────────────────────────────────────

export function foldingRanges(params: DocumentParams, deps: HandlerDeps): LspFoldingRange[] {
    const uri = params?.textDocument?.uri
    if (!uri) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const lines = doc.text.split('\n')
    const ranges: LspFoldingRange[] = []

    // Brace-depth folding for { ... } blocks
    const stack: Array<{ startLine: number }> = []
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        let inString = false
        for (let j = 0; j < line.length; j += 1) {
            const ch = line[j]
            if (ch === '"' || ch === "'") { inString = !inString; continue }
            if (inString) continue
            if (line[j - 1] === '/' && ch === '/') break
            if (ch === '{') {
                stack.push({ startLine: i })
            } else if (ch === '}') {
                const top = stack.pop()
                if (top && i > top.startLine) {
                    ranges.push({ startLine: top.startLine, endLine: i })
                }
            }
        }
    }

    // Block comment folding /* ... */
    for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].trimStart().startsWith('/*')) {
            for (let j = i + 1; j < lines.length; j += 1) {
                if (lines[j].includes('*/')) {
                    if (j > i) ranges.push({ startLine: i, endLine: j, kind: 'comment' })
                    i = j
                    break
                }
            }
        }
    }

    return ranges
}

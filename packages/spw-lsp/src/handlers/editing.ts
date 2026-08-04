/**
 * Editing Handlers — completion + formatting
 *
 * Content authoring assistance: sigil completion, @-root completion,
 * annotation completion, file-system path completion, and document formatting.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
    MEDIAL_CAPSULE_CHANNELS,
    SIGIL_SNIPPET_CATALOG,
    TEMPLATE_SLOTS,
} from '@spwashi/spw-seed'
import { SIGIL_SEMANTICS } from '../server-index'
import type {
    LspCompletionItem, LspTextEdit, LspPosition,
    CompletionParams, DocumentFormattingParams, DocumentRangeFormattingParams,
    CodeActionParams, LspCodeAction,
    HandlerDeps,
} from '../types'
import { CK } from '../types'
import { formContextCodeActions } from './form-context'

// ── Completion ──────────────────────────────────────────────────

export async function completion(params: CompletionParams, deps: HandlerDeps): Promise<LspCompletionItem[]> {
    const uri = params?.textDocument?.uri
    const pos = params?.position as LspPosition | undefined
    if (!uri || !pos) return []

    const source = await deps.getDocumentText(uri)
    if (source === null) return []

    const line = source.split('\n')[pos.line] ?? ''
    const prefix = line.slice(0, pos.character)
    const items: LspCompletionItem[] = []

    // 1. @-root completion
    if (prefix.endsWith('@')) {
        const roots = deps.mergeRoots(source, path.dirname(deps.pathFromUri(uri) || deps.workspaceRoot))
        for (const [name, resolved] of Object.entries(roots)) {
            if (name === 'here' || name === 'repo') continue
            items.push({
                label: name,
                kind: CK.Folder,
                detail: path.relative(deps.workspaceRoot, resolved),
                sortText: `0-${name}`,
            })
        }
        return items
    }

    // 1b. Medial capsule channel completion after <
    if (prefix.endsWith('<')) {
        for (const channelDef of MEDIAL_CAPSULE_CHANNELS) {
            items.push({
                label: `<${channelDef.name}>`,
                kind: CK.Interface,
                detail: `${channelDef.description} (${channelDef.category})`,
                insertText: `${channelDef.name}>`,
                sortText: `0-${channelDef.name}`,
            })
        }
        return items
    }

    // 2. Annotation name completion after #, #:, #!, #>
    const annotPrefix = prefix.match(/(?:##>|#!|#:|#>|#)([a-zA-Z_]\w*)$/)
    if (annotPrefix) {
        const partial = annotPrefix[1].toLowerCase()
        const names = deps.serverIndex.allAnnotationNames()
        for (const name of names) {
            if (!name.toLowerCase().startsWith(partial)) continue
            const entries = deps.serverIndex.lookupAnnotation(name)
            const fileCount = new Set(entries.map(e => e.file)).size
            items.push({
                label: name,
                kind: CK.Reference,
                detail: `${fileCount} file(s)`,
                sortText: `0-${name}`,
            })
        }
        return items
    }

    // 3. Sigil keyword completions
    const sigilPrefixMatch = /(?:^|\s)([\^!@&*?~#=%.$])$/.exec(prefix)
    if (sigilPrefixMatch) {
        const sigil = sigilPrefixMatch[1]
        const sem = SIGIL_SEMANTICS[sigil]
        if (sem) {
            const snippets = SIGIL_SNIPPET_CATALOG[sigil] ?? []
            for (const s of snippets) {
                items.push({
                    label: s.label,
                    kind: CK.Keyword,
                    detail: s.detail ? `${sem.role} — ${s.detail}` : `${sem.role} — ${sem.physics}`,
                    insertText: s.insert,
                    insertTextFormat: 2, // Snippet
                    sortText: `0-${s.label}`,
                })
            }
            if (snippets.length > 0) return items
        }
    }

    // 4. Template slot completion after $ or ${
    const slotPrefix = /\$\{([A-Za-z_][\w]*)$/.exec(prefix) || /(?:^|[^\w$])\$([A-Za-z][\w]*)$/.exec(prefix)
    if (slotPrefix) {
        const partial = (slotPrefix[1] ?? '').toLowerCase()
        for (const slotDef of TEMPLATE_SLOTS) {
            if (partial && !slotDef.name.startsWith(partial)) continue
            const braced = prefix.includes('${')
            items.push({
                label: braced ? `\${${slotDef.name}}` : `$${slotDef.name}`,
                kind: CK.Variable,
                detail: slotDef.description,
                insertText: braced ? `${slotDef.name}}` : slotDef.name,
                sortText: `0-${slotDef.name}`,
            })
        }
        if (items.length) return items
    }

    // 5. File-system completion for ~"../" and @root/
    const fsMatch = /(?:~"((?:\.\.?\/)+)|@([A-Za-z_]\w*)\/)([^"]*)$/.exec(prefix)
    if (fsMatch) {
        const docDir = path.dirname(deps.pathFromUri(uri) || deps.workspaceRoot)
        let searchDir: string | undefined
        if (fsMatch[1]) {
            searchDir = path.resolve(docDir, fsMatch[1])
        } else if (fsMatch[2]) {
            const roots = deps.mergeRoots(source, docDir)
            searchDir = roots[fsMatch[2]]
        }

        if (searchDir) {
            const subPath = fsMatch[3] || ''
            const fullDir = subPath ? path.resolve(searchDir, subPath.replace(/[^/]*$/, '')) : searchDir

            try {
                const entries = await fs.readdir(fullDir, { withFileTypes: true })
                for (const entry of entries) {
                    if (entry.name.startsWith('.')) continue
                    const isDir = entry.isDirectory()
                    items.push({
                        label: entry.name,
                        kind: isDir ? CK.Folder : CK.File,
                        insertText: isDir ? `${entry.name}/` : entry.name,
                        sortText: isDir ? `0-${entry.name}` : `1-${entry.name}`,
                    })
                }
            } catch {
                // directory unreadable
            }
        }
    }

    return items
}

// ── Formatting ──────────────────────────────────────────────────

export function formatting(params: DocumentFormattingParams, deps: HandlerDeps): LspTextEdit[] {
    const uri = params?.textDocument?.uri
    if (!uri) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const formatted = deps.serverIndex.formatDocument(doc.text)
    if (formatted === doc.text) return []

    const lines = doc.text.split('\n')
    return [{
        range: {
            start: { line: 0, character: 0 },
            end: { line: lines.length - 1, character: lines[lines.length - 1].length },
        },
        newText: formatted,
    }]
}

export function rangeFormatting(params: DocumentRangeFormattingParams, deps: HandlerDeps): LspTextEdit[] {
    const uri = params?.textDocument?.uri
    const range = params?.range
    if (!uri || !range) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const lines = doc.text.split('\n')
    const lastLine = Math.max(0, lines.length - 1)
    const startLine = clampLine(Math.min(range.start.line, range.end.line), lastLine)
    const endLine = clampLine(Math.max(range.start.line, range.end.line), lastLine)
    const editRange = {
        start: { line: startLine, character: 0 },
        end: { line: endLine, character: lines[endLine]?.length ?? 0 },
    }

    const selected = doc.text.slice(
        lineOffset(doc.text, startLine),
        lineOffset(doc.text, endLine) + (lines[endLine]?.length ?? 0),
    )
    if (selected.length === 0) return []

    const formatted = deps.serverIndex.formatRange(selected, {
        ensureFinalNewline: endLine === lastLine,
    })
    if (formatted === selected) return []

    return [{
        range: editRange,
        newText: formatted,
    }]
}

// ── Code Actions ────────────────────────────────────────────────

export async function codeAction(params: CodeActionParams, deps: HandlerDeps): Promise<LspCodeAction[]> {
    const uri = params?.textDocument?.uri
    const range = params?.range
    if (!uri || !range) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const lines = doc.text.split('\n')
    const actions: LspCodeAction[] = []

    for (let i = range.start.line; i <= range.end.line; i++) {
        const line = lines[i]
        if (line === undefined) continue

        // Toggle Concise Trait -> Lexical Binding (~#key: value -> .{ key = value })
        const traitMatch = line.match(/^(\s*)~#([a-zA-Z0-9_]+):\s*(.+)$/)
        if (traitMatch) {
            const indent = traitMatch[1]
            const key = traitMatch[2]
            const value = traitMatch[3]
            actions.push({
                title: `Expand to Lexical Binding (.{ ${key} = ... })`,
                kind: 'refactor.rewrite',
                edit: {
                    changes: {
                        [uri]: [{
                            range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                            newText: `${indent}.{ ${key} = ${value} }`
                        }]
                    }
                }
            })
        }

        // Toggle Lexical Binding -> Concise Trait (.{ key = value } -> ~#key: value)
        const factMatch = line.match(/^(\s*)\.\{\s*([a-zA-Z0-9_]+)\s*=\s*(.+)\s*\}$/)
        if (factMatch && !factMatch[3].includes(',')) {
            const indent = factMatch[1]
            const key = factMatch[2]
            // trailing space in value should be stripped out for concise form
            let value = factMatch[3].trim()
            if (value.endsWith('}')) {
                // Should already be handled by the factMatch regex since the } is consumed
                value = value.replace(/\s*\}$/, '')
            }
            actions.push({
                title: `Toggle Concise Trait (~#${key})`,
                kind: 'refactor.rewrite',
                edit: {
                    changes: {
                        [uri]: [{
                            range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                            newText: `${indent}~#${key}: ${value}`
                        }]
                    }
                }
            })
        }
    }

    // Quick-fix for unresolved references
    const unresolvedDiags = (params.context?.diagnostics ?? []).filter(
        d => d.source === 'spw' && d.message.startsWith('unresolved reference:')
    )
    for (const diag of unresolvedDiags) {
        // Extract the selector hits from the document for this range
        const docHits = doc.selectorHits?.filter(
            h => h.span.startLine === diag.range.start.line
              && h.span.startCharacter === diag.range.start.character
        ) ?? []

        for (const hit of docHits) {
            const suggestion = await deps.suggestNearbyReference(hit, doc.text, doc.filePath)
            if (!suggestion) continue
            const original = hit.kind === 'pathRef' ? hit.target : `@${hit.root}/${hit.target}`
            const hitText = doc.text.slice(hit.span.startOffset, hit.span.endOffset)
            const replacement = hitText.replace(original, suggestion)
            if (replacement === hitText) continue
            actions.push({
                title: `Did you mean "${suggestion}"?`,
                kind: 'quickfix',
                edit: {
                    changes: {
                        [uri]: [{
                            range: {
                                start: { line: hit.span.startLine, character: hit.span.startCharacter },
                                // endCharacter is exclusive (LSP Range / SpwSelectorSpan contract)
                                end: { line: hit.span.endLine, character: hit.span.endCharacter },
                            },
                            newText: replacement,
                        }],
                    },
                },
            })
        }
    }

    // Wrap selection in frame (^["name"] { ... })
    if (range.start.line !== range.end.line || range.start.character !== range.end.character) {
        const startLine = lines[range.start.line]
        const indent = startLine?.match(/^(\s*)/)?.[1] ?? ''
        const innerIndent = indent + '  '
        const selectedLines = lines.slice(range.start.line, range.end.line + 1)
        const reindented = selectedLines
            .map(l => `${innerIndent}${l.replace(/^\s*/, '')}`)
            .join('\n')

        actions.push({
            title: 'Wrap in Frame (^["..."] { })',
            kind: 'refactor.extract',
            edit: {
                changes: {
                    [uri]: [{
                        range: {
                            start: { line: range.start.line, character: 0 },
                            end: { line: range.end.line, character: (lines[range.end.line] ?? '').length },
                        },
                        newText: `${indent}^["frame"] {\n${reindented}\n${indent}}`
                    }]
                }
            }
        })
    }

    // Label-mobility actions — only receipt-gated implemented rules
    {
        const caret = range.start
        actions.push(...formContextCodeActions(doc, caret))
    }

    return actions
}

function clampLine(line: number, lastLine: number): number {
    return Math.max(0, Math.min(line, lastLine))
}

function lineOffset(text: string, targetLine: number): number {
    if (targetLine <= 0) return 0

    let line = 0
    for (let i = 0; i < text.length; i += 1) {
        if (text[i] !== '\n') continue
        line += 1
        if (line === targetLine) return i + 1
    }

    return text.length
}

/**
 * Display Handlers — hover, document symbols, workspace symbols, code lens, inlay hints
 *
 * Visual enrichment of .spw documents: hover tooltips, symbol outline,
 * code lens metrics, and inlay hints (path status, brace depth, operator census).
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { SIGIL_SEMANTICS } from '../server-index'
import { findPathRefAtPosition } from '../spw-selector'
import { statKind } from '../helpers'
import type {
    LspHover, LspDocumentSymbol, LspSymbolInfo, LspCodeLens, LspInlayHint,
    LspDocumentHighlight,
    LspPosition, LspRange,
    HoverParams, DocumentParams, InlayHintParams, TextDocumentPositionParams,
    HandlerDeps,
} from '../types'
import { SK } from '../types'
import { outlineFromSource } from './outline'
import { formContextHover } from './form-context'
import {
  formatCatalogEntryMarkdown,
  getSyntaxCatalogEntry,
  resolveSurfaceProfile,
  scanExperimentalRefs,
  scanFlowProtocol,
  formatFlowProtocolSummary,
} from '@spwashi/spw-seed'
import { scanBracePhrases, countPhrasesById, measureProbesAndSubstrate } from '@spwashi/spw-runtime'

type DisplayAnnotationKind = 'topic' | 'lens' | 'intent' | 'anchor'

const ANNOTATION_RE = /(##>|#!|#:|#>|#)([a-zA-Z_][a-zA-Z0-9_]*)/g
const ANCHOR_RE = /##?>([a-zA-Z_][a-zA-Z0-9_]*)/
const PREFIX_BY_KIND: Record<DisplayAnnotationKind, string> = {
    topic: '#',
    lens: '#:',
    intent: '#!',
    anchor: '#>',
}

type VisibleStringDelimiter = '"' | "'" | '`' | null

interface DisplayLineContext {
    framePath: string[]
    ambientBraids: string[]
    localBraids: string[]
    enteredFrame: string | null
    deltaBraids: string[]
}

interface ParsedAnnotationMatch {
    raw: string
    sigil: string
    name: string
    start: number
    end: number
    braid: string
}

interface WonderBlockSummary {
    question: string
    depth: string | null
    lens: string | null
    probe: string | null
    metrics: string[]
    neighbor: string | null
    /** The block's following lines, so a hint can drop what they already show. */
    bodyText: string
}

function annotationKindFromSigil(sigil: string | undefined): DisplayAnnotationKind {
    switch (sigil) {
        case '#:': return 'lens'
        case '#!': return 'intent'
        case '#>':
        case '##>':
            return 'anchor'
        default:
            return 'topic'
    }
}

function summarizeReferenceSources(
    entries: Array<{ file: string; line: number }>,
    currentFile: string,
    workspaceRoot: string,
    limit: number = 2,
): string {
    const fileCounts = new Map<string, number>()
    for (const entry of entries) {
        if (entry.file === currentFile) continue
        fileCounts.set(entry.file, (fileCounts.get(entry.file) ?? 0) + 1)
    }

    const ranked = [...fileCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([file, count]) => `${path.relative(workspaceRoot, file)}×${count}`)

    return ranked.join(', ')
}

function collectAnnotationMatches(line: string): ParsedAnnotationMatch[] {
    const matches: Array<Omit<ParsedAnnotationMatch, 'braid'>> = []
    ANNOTATION_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = ANNOTATION_RE.exec(line)) !== null) {
        matches.push({
            raw: match[0],
            sigil: match[1] || '#',
            name: match[2],
            start: match.index,
            end: match.index + match[0].length,
        })
    }
    if (matches.length === 0) return []

    const grouped: ParsedAnnotationMatch[] = []
    let current = [matches[0]]

    const flush = () => {
        const braid = current.map((entry) => entry.raw).join(' ')
        for (const entry of current) {
            grouped.push({ ...entry, braid })
        }
    }

    for (let i = 1; i < matches.length; i += 1) {
        const previous = matches[i - 1]
        const next = matches[i]
        const between = line.slice(previous.end, next.start)
        if (/^\s+$/.test(between)) {
            current.push(next)
            continue
        }
        flush()
        current = [next]
    }

    flush()
    return grouped
}

function buildContextMarkdown(
    context: DisplayLineContext | null | undefined,
    activeBraid?: string,
): string {
    if (!context) return ''

    const lines: string[] = []
    if (context.framePath.length > 0) {
        lines.push(`Frame path: \`${context.framePath.join(' > ')}\``)
    }
    const activeFacets = activeBraid ? splitFacetAtoms(activeBraid) : context.localBraids
    const localLine = formatMarkdownFacetList('Active facet', 'Active facets', activeFacets)
    if (localLine) lines.push(localLine)
    if (context.ambientBraids.length > 0) {
        const ambient = context.ambientBraids.slice(-4).map((value) => `\`${value}\``).join(' · ')
        lines.push(`Ambient field: ${ambient}`)
    }

    return lines.length > 0 ? lines.join('  \n') + '\n\n' : ''
}

function splitFacetAtoms(value: string): string[] {
    return value.split(/\s+/).map((entry) => entry.trim()).filter(Boolean)
}

function formatMarkdownFacetList(
    singularLabel: string,
    pluralLabel: string,
    facets: string[],
): string | null {
    if (facets.length === 0) return null
    const label = facets.length === 1 ? singularLabel : pluralLabel
    return `${label}: ${facets.map((value) => `\`${value}\``).join(' · ')}`
}

function buildBoundaryHint(
    context: DisplayLineContext | null | undefined,
    lineText: string,
): { label: string; tooltip: string } | null {
    if (!context) return null

    // A hint earns its space by showing what the line does not already say.
    // The frame name and the line's own braids are visible in the text, so
    // echoing them inline is pure noise — surface only what the reader can't
    // see here (an entered frame named elsewhere, an inherited field braid).
    const parts: string[] = []
    if (context.enteredFrame && !lineText.includes(context.enteredFrame)) {
        parts.push(`enter ${context.enteredFrame}`)
    }
    const unseenBraids = context.deltaBraids.filter((braid) => !lineText.includes(braid))
    if (unseenBraids.length >= 2) {
        const delta = unseenBraids.map((braid) => `+${braid}`).join(' · ')
        parts.push(`field ${delta}`)
    }
    if (parts.length === 0) return null

    const tooltip: string[] = []
    if (context.enteredFrame) {
        tooltip.push(`Entering frame "${context.enteredFrame}".`)
    }
    if (context.framePath.length > 0) {
        tooltip.push(`Path: ${context.framePath.join(' > ')}.`)
    }
    if (context.ambientBraids.length > 0) {
        tooltip.push(`Ambient field: ${context.ambientBraids.join(' · ')}.`)
    }
    if (context.deltaBraids.length > 0) {
        tooltip.push(`Field shift: ${context.deltaBraids.join(' · ')}.`)
    }

    return {
        label: ` [${parts.join(' · ')}]`,
        tooltip: tooltip.join(' '),
    }
}

/** Count { and } in a line, skipping quoted string content and line comments. */
function countBracesOutsideStrings(line: string, startDepth: number): number {
    let depth = startDepth
    let i = 0
    while (i < line.length) {
        const c = line[i]
        // Skip // comment to end of line
        if (c === '/' && line[i + 1] === '/') break
        // Skip quoted strings (", ', `)
        if (c === '"' || c === "'" || c === '`') {
            const q = c
            i++
            while (i < line.length) {
                if (line[i] === '\\') { i += 2; continue }
                if (line[i] === q) { i++; break }
                i++
            }
            continue
        }
        if (c === '{') depth++
        else if (c === '}') depth = Math.max(0, depth - 1)
        i++
    }
    return depth
}

function buildWonderHint(summary: WonderBlockSummary): { label: string; tooltip: string } | null {
    // The hint sits on the `?[…]{` line; depth and lens are extracted from the
    // block's own following lines, so when the block is visible they only
    // repeat it. Keep the parts that genuinely compress — the metric count
    // stands in for a whole `$%[…]` line — and drop the verbatim echoes.
    const parts: string[] = []
    if (summary.depth && !summary.bodyText.includes(summary.depth)) parts.push(summary.depth)
    if (summary.lens && !summary.bodyText.includes(summary.lens)) parts.push(`lens: ${summary.lens}`)
    if (summary.metrics.length > 0) parts.push(`${summary.metrics.length} metric${summary.metrics.length === 1 ? '' : 's'}`)
    if (summary.neighbor) parts.push('neighbor')

    // With nothing compressive left, the question is already on the line — no
    // hint beats a hint that restates what the reader is looking at.
    if (parts.length === 0) return null

    const tooltip: string[] = [summary.question]
    if (summary.probe) tooltip.push(`Probe: ${summary.probe}`)
    if (summary.metrics.length > 0) tooltip.push(`Metrics: ${summary.metrics.join(', ')}`)
    if (summary.neighbor) tooltip.push(`Neighbor: ${summary.neighbor}`)

    return {
        label: ` [? ${parts.join(' · ')}]`,
        tooltip: tooltip.join('\n'),
    }
}

function parseWonderBlock(lines: string[], startLine: number): WonderBlockSummary | null {
    const line = lines[startLine] ?? ''
    const wonderMatch = line.match(/\?\["([^"]+)"\]/)
    if (!wonderMatch) return null

    const bodyLines: string[] = []
    let braceDepth = line.includes('{') ? 1 : 0

    if (braceDepth > 0) {
        for (let i = startLine + 1; i < lines.length && i < startLine + 12; i += 1) {
            const bodyLine = lines[i] ?? ''
            bodyLines.push(bodyLine)
            braceDepth += countVisibleBraceDelta(bodyLine)
            if (braceDepth <= 0) break
        }
    } else {
        for (let i = startLine + 1; i < lines.length && i < startLine + 6; i += 1) {
            const bodyLine = lines[i] ?? ''
            if (bodyLine.startsWith('  ') || bodyLine.trim() === '') {
                bodyLines.push(bodyLine)
                continue
            }
            break
        }
    }

    const bodyText = bodyLines.join('\n')
    const depthLine = bodyLines.find((entry) => entry.includes('#:depth'))
    const depth = depthLine?.match(/#!([a-z][a-z0-9_]*)/)?.[1] ?? null
    const lens = depthLine?.match(/\/\/\s*lens:\s*(.+)/)?.[1]?.trim() ?? null
    const probe = bodyText.match(/!probe\{\s*"([^"]+)"/s)?.[1] ?? null
    const metrics = [...bodyText.matchAll(/\$%\[([^\]]+)\]/g)]
        .flatMap((match) => match[1].split(',').map((value) => value.trim()).filter(Boolean))
    const neighbor = bodyText.match(/~<([^>]+)>/)?.[1]?.trim() ?? null

    return {
        question: wonderMatch[1],
        depth,
        lens,
        probe,
        metrics,
        neighbor,
        bodyText,
    }
}

function countVisibleBraceDelta(line: string): number {
    let depth = 0
    let delimiter: VisibleStringDelimiter = null
    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        const nextDelimiter = nextVisibleStringDelimiter(line, i, delimiter)
        if (nextDelimiter !== delimiter) {
            delimiter = nextDelimiter
            continue
        }
        if (delimiter) continue
        if (ch === '/' && line[i + 1] === '/') break
        if (ch === '{') depth += 1
        else if (ch === '}') depth -= 1
    }
    return depth
}

function nextVisibleStringDelimiter(
    text: string,
    index: number,
    current: VisibleStringDelimiter,
): VisibleStringDelimiter {
    const ch = text[index]
    if (current) {
        return ch === current && !isEscapedCharacter(text, index) ? null : current
    }
    return ch === '"' || ch === "'" || ch === '`' ? ch : null
}

function isEscapedCharacter(text: string, index: number): boolean {
    let slashCount = 0
    for (let i = index - 1; i >= 0 && text[i] === '\\'; i -= 1) {
        slashCount += 1
    }
    return slashCount % 2 === 1
}

// ── Hover ───────────────────────────────────────────────────────

/**
 * Hover for =exp[ id: … ], @dialect/@profile:Spw.*, and file-level stack chip
 * when the caret is on a ^seed[ header or first-line dialect mark.
 */
function hoverExperimentalOrDialect(
    source: string,
    line: string,
    pos: LspPosition,
    docPath: string | null,
    workspaceRoot: string,
): LspHover | null {
    // =exp[ id: foo.bar ]
    const expRe = /=\s*exp\s*\[\s*id\s*:\s*([a-zA-Z][a-zA-Z0-9_.]*)/g
    let m: RegExpExecArray | null
    while ((m = expRe.exec(line)) !== null) {
        const id = m[1]!
        const idStart = m.index + m[0].lastIndexOf(id)
        const idEnd = idStart + id.length
        if (pos.character < idStart || pos.character >= idEnd) continue
        const entry = getSyntaxCatalogEntry(id)
        const md = entry
            ? formatCatalogEntryMarkdown(entry)
            : `**\`${id}\`** — *unknown experimental id*\n\nNot in SYNTAX_CATALOG. Add to \`packages/spw-seed/src/experimental/syntax-catalog.ts\` to make it referenceable.`
        return {
            contents: { kind: 'markdown', value: md },
            range: {
                start: { line: pos.line, character: idStart },
                end: { line: pos.line, character: idEnd },
            },
        }
    }

    // @dialect:Spw.x / @profile:Spw.x / #:dialect Spw.x
    const dialectRe = /@(?:dialect|profile)\s*:\s*(Spw\.[blmxqfpt])\b|#:\s*dialect\b[^\n]*(Spw\.[blmxqfpt])\b/gi
    dialectRe.lastIndex = 0
    while ((m = dialectRe.exec(line)) !== null) {
        const raw = m[1] ?? m[2]
        if (!raw) continue
        const start = m.index
        const end = m.index + m[0].length
        if (pos.character < start || pos.character >= end) continue
        const rel = docPath ? path.relative(workspaceRoot, docPath) : ''
        const stack = resolveSurfaceProfile(source, { path: rel || undefined })
        const dialect = raw.replace(/^spw\./i, 'Spw.')
        let md = `**Dialect \`${dialect}\`**\n\n`
        md += `Resolved stack: **${stack.dialect}** (${stack.dialectSource}) · review=\`${stack.review}\` · format=\`${stack.format}\` · mutation=\`${stack.mutation}\`\n\n`
        md += `metasyntax: newlineAsSpace=${stack.metasyntax.newlineAsSpace} machineLint=${stack.metasyntax.machineLint} flowGlyphs=${stack.metasyntax.flowGlyphs} planStream=${stack.metasyntax.planStream}\n\n`
        md += `_Product surface — see docs/theory/spw/syntax-profile-stack.spw_`
        return {
            contents: { kind: 'markdown', value: md },
            range: {
                start: { line: pos.line, character: start },
                end: { line: pos.line, character: end },
            },
        }
    }

    // ^seed[ … ] header — show stack chip for the document
    if (/^\s*\^seed\[/.test(line) && pos.character < Math.min(line.length, 48)) {
        const rel = docPath ? path.relative(workspaceRoot, docPath) : ''
        const stack = resolveSurfaceProfile(source, { path: rel || undefined })
        const cited = scanExperimentalRefs(source)
        let md = `**Surface profile stack**\n\n`
        md += `| axis | value |\n|---|---|\n`
        md += `| dialect | \`${stack.dialect}\` (${stack.dialectSource}) |\n`
        md += `| review | \`${stack.review}\` |\n`
        md += `| format | \`${stack.format}\` |\n`
        md += `| mutation | \`${stack.mutation}\` |\n`
        md += `| domain | \`${stack.domain}\` |\n`
        md += `| reading | \`${stack.reading}\` |\n\n`
        if (cited.ids.length > 0) {
            md += `Cited \`=exp\` ids: ${cited.ids.map(id => `\`${id}\``).join(', ')}\n`
        }
        const phraseCounts = countPhrasesById(scanBracePhrases(source))
        const topPhrases = Object.entries(phraseCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
        if (topPhrases.length > 0) {
            md += `\n**Brace phrases** (sense prep):\n`
            for (const [id, n] of topPhrases) {
                md += `- \`${id}\` x${n}\n`
            }
        }
        const flow = scanFlowProtocol(source)
        md += `\n**Flow protocol:** ${formatFlowProtocolSummary(flow)}\n`
        const pm = measureProbesAndSubstrate(source)
        md += `**Probes:** ${pm.summary}\n`
        return {
            contents: { kind: 'markdown', value: md },
            range: {
                start: { line: pos.line, character: 0 },
                end: { line: pos.line, character: Math.min(line.length, 64) },
            },
        }
    }

    return null
}

export async function hover(params: HoverParams, deps: HandlerDeps): Promise<LspHover | null> {
    const uri = params?.textDocument?.uri
    const pos = params?.position as LspPosition | undefined
    if (!uri || !pos) return null

    const source = await deps.getDocumentText(uri)
    if (source === null) return null

    const docPath = deps.pathFromUri(uri)
    const line = source.split('\n')[pos.line] ?? ''
    const charAtPos = line[pos.character]

    // 0. Experimental catalog / dialect stack (plan-syntax presence)
    const expHover = hoverExperimentalOrDialect(source, line, pos, docPath, deps.workspaceRoot)
    if (expHover) return expHover

    // 1. Annotation hover
    const annotationMatches = collectAnnotationMatches(line)
    for (const annotation of annotationMatches) {
        const start = annotation.start
        const end = annotation.end
        if (pos.character < start || pos.character >= end) continue

        const prefix = annotation.sigil
        const name = annotation.name
        const kind = annotationKindFromSigil(prefix)
        const entries = deps.serverIndex.lookupAnnotation(name)
        const fileCount = new Set(entries.map(e => e.file)).size
        const coOccurs = deps.serverIndex.topCoOccurrences(name, 5)
        const externalRefs = docPath ? entries.filter(e => e.file !== docPath) : entries
        const sourceSummary = docPath ? summarizeReferenceSources(entries, docPath, deps.workspaceRoot, 4) : ''
        const context = deps.serverIndex.getContextAtPosition(uri, { line: pos.line, character: start }) as DisplayLineContext | null
        const activeBraid = annotation.braid.includes(' ') ? annotation.braid : undefined

        let md = `**${prefix}${name}** \u2014 *${kind}*\n\n`
        md += buildContextMarkdown(context, activeBraid)
        md += `**${fileCount}** file(s), **${entries.length}** occurrence(s)\n\n`
        if (externalRefs.length > 0 && sourceSummary) {
            md += `Top sources: ${sourceSummary}\n\n`
        }

        if (coOccurs.length > 0) {
            const partner = coOccurs[0]
            const rest = coOccurs.slice(1)
            md += `Co-occurs with: \`#${partner.name}\` (${partner.count}\u00d7)`
            if (rest.length > 0) md += `, ${rest.map(c => `\`#${c.name}\`\u00a0(${c.count}\u00d7)`).join(', ')}`
            md += '\n\n'
        }

        // Layer distribution across the workspace
        {
            const layerDist = new Map<string, number>()
            for (const entry of entries) {
                const fileAnnots = deps.serverIndex.annotationsForFile(entry.file)
                const layerAnnot = fileAnnots.find(a => a.kind === 'lens' && a.name === 'layer')
                if (!layerAnnot) continue
                const intentAnnot = fileAnnots.find(a => a.kind === 'intent' && a.line === layerAnnot.line)
                if (intentAnnot) layerDist.set(intentAnnot.name, (layerDist.get(intentAnnot.name) ?? 0) + 1)
            }
            if (layerDist.size > 0) {
                const LAYER_ORDER = ['grammar', 'semantics', 'pragmatics']
                const layerSummary = [...layerDist.entries()]
                    .sort((a, b) => (LAYER_ORDER.indexOf(a[0]) + 1 || 99) - (LAYER_ORDER.indexOf(b[0]) + 1 || 99) || b[1] - a[1])
                    .map(([l, n]) => `${l}\u00a0(${n})`)
                    .join(' · ')
                md += `Layers: ${layerSummary}\n\n`
            }
        }

        const seen = new Set<string>()
        for (const entry of entries) {
            const rel = path.relative(deps.workspaceRoot, entry.file)
            if (seen.has(rel) || seen.size >= 5) continue
            seen.add(rel)
            md += `- \`${rel}\`:${entry.line + 1}${entry.sectionLabel ? ` (${entry.sectionLabel})` : ''}\n`
        }
        if (fileCount > 5) md += `- *...and ${fileCount - 5} more*\n`

        return {
            contents: { kind: 'markdown', value: md },
            range: { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } },
        }
    }

    // 1.5 Form geometry — coupling packet + label site (seed-owned)
    {
        const doc = deps.serverIndex.getDocument(uri)
        if (doc) {
            const formHover = formContextHover(doc, pos)
            if (formHover) return formHover
        }
    }

    // 2. Frame hover
    const frameRe = /\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/
    const frameMatch = line.match(frameRe)
    if (frameMatch) {
        const frameStart = line.indexOf(frameMatch[0])
        const frameEnd = frameStart + frameMatch[0].length
        if (pos.character >= frameStart && pos.character < frameEnd) {
            const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3]
            const fileAnnotations = docPath ? deps.serverIndex.annotationsForFile(docPath) : []
            const inSection = fileAnnotations.filter(e => e.sectionLabel === frameName)
            const context = deps.serverIndex.getContextAtPosition(uri, { line: pos.line, character: frameStart }) as DisplayLineContext | null

            let opCounts = ''
            const blockStart = source.indexOf('{', source.indexOf(frameMatch[0]))
            if (blockStart >= 0) {
                const ops: Record<string, number> = {}
                let depth = 1
                for (let i = blockStart + 1; i < source.length && depth > 0; i += 1) {
                    if (source[i] === '{') depth += 1
                    else if (source[i] === '}') depth -= 1
                    else if (depth === 1 && SIGIL_SEMANTICS[source[i]]) {
                        ops[source[i]] = (ops[source[i]] ?? 0) + 1
                    }
                }
                const sorted = Object.entries(ops).sort((a, b) => b[1] - a[1]).slice(0, 6)
                if (sorted.length > 0) {
                    opCounts = sorted.map(([op, n]) => `\`${op}\` (${n}\u00d7)`).join(', ')
                }
            }

            const cacheTier = docPath ? deps.serverIndex.getCacheTierForFile(docPath) : 'warm'
            const projections = docPath ? deps.serverIndex.getProjectionsFromSpecOwner(docPath) : []

            let md = `**^["${frameName}"]** \u2014 *frame*\n\n`
            md += buildContextMarkdown(context)
            if (inSection.length > 0) {
                md += 'Annotations: ' + inSection.map(e => `\`${PREFIX_BY_KIND[e.kind as DisplayAnnotationKind] ?? '#'}${e.name}\``).join(', ') + '\n\n'
            }
            if (opCounts) md += `Operators: ${opCounts}\n\n`
            md += `Cache tier: ${cacheTier}\n`
            if (projections.length > 0) {
                md += `\nProjects to: ${projections.map(p => `\`${p.root}\``).join(', ')}\n`
            }

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: frameStart }, end: { line: pos.line, character: frameEnd } },
            }
        }
    }

    // 3. Selector name hover
    const selectorRe = /\b([a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+)\b/g
    let selMatch: RegExpExecArray | null
    while ((selMatch = selectorRe.exec(line)) !== null) {
        const start = selMatch.index
        const end = start + selMatch[0].length
        if (pos.character < start || pos.character >= end) continue

        const selectorDef = deps.serverIndex.getSelectorDef(selMatch[1])
        if (!selectorDef) continue

        let md = `**${selectorDef.name}** \u2014 *selector*\n\n`
        md += `| | |\n|:--|:--|\n`
        md += `| **Include** | ${selectorDef.include.join(', ')} |\n`
        md += `| **Combine** | ${selectorDef.combine} |\n`
        md += `| **Grounding** | ${selectorDef.grounding} |\n`
        md += `| **Defined in** | \`${path.relative(deps.workspaceRoot, selectorDef.file)}\` |\n`

        return {
            contents: { kind: 'markdown', value: md },
            range: { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } },
        }
    }

    // 4. Wonder block hover
    const wonderSummary = parseWonderBlock(source.split('\n'), pos.line)
    const wonderRe = /\?\["([^"]+)"\]/
    const wonderMatch = line.match(wonderRe)
    if (wonderMatch && wonderSummary) {
        const wStart = line.indexOf(wonderMatch[0])
        const wEnd = wStart + wonderMatch[0].length
        if (pos.character >= wStart && pos.character < wEnd) {
            const context = deps.serverIndex.getContextAtPosition(uri, { line: pos.line, character: wStart }) as DisplayLineContext | null

            let md = `**\u2753 Wonder**\n\n`
            md += buildContextMarkdown(context)
            md += `> ${wonderSummary.question}\n\n`
            if (wonderSummary.depth) md += `**Depth axis:** ${wonderSummary.depth}`
            if (wonderSummary.lens) md += ` \u00b7 **Lens:** ${wonderSummary.lens}`
            if (wonderSummary.depth || wonderSummary.lens) md += '\n\n'
            if (wonderSummary.metrics.length > 0) {
                md += `**Metrics:** \`${wonderSummary.metrics.join(', ')}\`\n\n`
            }
            if (wonderSummary.neighbor) md += `**Neighbor:** \`${wonderSummary.neighbor}\`\n\n`
            if (wonderSummary.probe) md += `**Probe:** ${wonderSummary.probe}\n`

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: wStart }, end: { line: pos.line, character: wEnd } },
            }
        }
    }

    // 5. Layer hover
    const layerRe = /#:layer\s+#!([a-z]+)/
    const layerMatch = line.match(layerRe)
    if (layerMatch) {
        const lStart = line.indexOf(layerMatch[0])
        const lEnd = lStart + layerMatch[0].length
        if (pos.character >= lStart && pos.character < lEnd) {
            const layerName = layerMatch[1]
            const layerDesc: Record<string, string> = {
                grammar: 'Defines parse-time rules, token shapes, and structural invariants. Files in this layer are the language\'s skeleton.',
                semantics: 'Maps structure to meaning \u2014 claims, theories, proofs. Files in this layer carry falsifiable propositions.',
                pragmatics: 'Shapes developer workflow, conventions, tooling. Files in this layer orient attention and reduce friction.',
            }
            const allAnnotations = deps.serverIndex.allAnnotations()
            const layerCount = new Set(
                allAnnotations.filter(a => a.name === layerName && a.kind === 'intent').map(a => a.file)
            ).size

            let md = `**#:layer #!${layerName}** \u2014 *kernel layer*\n\n`
            md += `${layerDesc[layerName] || 'Custom layer.'}\n\n`
            md += `**${layerCount}** file(s) in this layer across the workspace.\n`

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: lStart }, end: { line: pos.line, character: lEnd } },
            }
        }
    }

    // 6. Metric hover
    const metricHoverRe = /\$%\[([^\]]+)\]/
    const metricHoverMatch = line.match(metricHoverRe)
    if (metricHoverMatch) {
        const mStart = line.indexOf(metricHoverMatch[0])
        const mEnd = mStart + metricHoverMatch[0].length
        if (pos.character >= mStart && pos.character < mEnd) {
            const metrics = metricHoverMatch[1].split(',').map(m => m.trim())
            const metricDescs: Record<string, string> = {
                'file.frame_count': 'Number of ^-frames in this file',
                'file.annotation_density': 'Annotations per line (higher = more semantic richness)',
                'file.brace_depth_max': 'Maximum nesting depth of braces',
                'cache.tier': 'Retention class for eviction (hot/warm/cold) — not product identity',
                'cache.hit_ms': 'Average cache hit latency in milliseconds',
                'cache.hit_ratio': 'Ratio of cache hits to total lookups',
                'registry.entry_count': 'Number of entries in this registry',
                'registry.referrer_count': 'Files that reference this registry',
                'harness.run_count': 'Total probe/eval runs executed',
                'harness.pass_rate': 'Ratio of passing probes to total',
                'runtime.stage': 'Current runtime pipeline stage',
                'runtime.latency_ms': 'End-to-end pipeline latency',
                'lsp.request_count': 'LSP requests served since start',
                'lsp.avg_response_ms': 'Average response time in ms',
                'phase.index': 'Current spirit phase (0-5)',
                'phase.duration_ms': 'Time spent in current phase',
            }

            let md = `**\`$%[${metricHoverMatch[1]}]\`** \u2014 *measurement point*\n\n`

            const state = deps.observableState || {}
            let hasLive = false

            for (const m of metrics) {
                const desc = metricDescs[m] || `Runtime-bindable metric: ${m}`
                const liveValue = state[m]
                if (liveValue !== undefined && liveValue !== null) {
                    md += `- **${m}**: \`${liveValue}\` \u2014 ${desc}\n`
                    hasLive = true
                } else {
                    md += `- **${m}**: ${desc}\n`
                }
            }

            if (hasLive) {
                md += `\n*Live values from \`.spw/state/observable.spw\` (refreshed on save).*\n`
            } else {
                md += `\n*No live values \u2014 populate \`.spw/state/observable.spw\` to bind.*\n`
            }

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: mStart }, end: { line: pos.line, character: mEnd } },
            }
        }
    }

    // 6.5 Fact block hover
    if (line.includes('.{')) {
        const fStart = line.indexOf('.{')
        if (pos.character >= fStart && pos.character < fStart + 2) {
            let md = `**\`.{}\`** \u2014 *Fact Block*\n\n`
            md += `Serialized into the register bus matrix for downstream script access.\n`
            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: fStart }, end: { line: pos.line, character: fStart + 2 } },
            }
        }
    }

    // 6.6 Registry qualifier hover
    const regRe = /\[reg=([a-zA-Z0-9_]+)\]/g
    let regMatch: RegExpExecArray | null
    while ((regMatch = regRe.exec(line)) !== null) {
        const rStart = regMatch.index
        const rEnd = rStart + regMatch[0].length
        if (pos.character >= rStart && pos.character < rEnd) {
            let md = `**\`[reg=${regMatch[1]}]\`** \u2014 *Facet Qualifier*\n\n`
            md += `Flags this block for extraction by the layer-check and semantic validation hooks.\n`
            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: rStart }, end: { line: pos.line, character: rEnd } },
            }
        }
    }

    // 7. Sigil hover
    if (charAtPos && SIGIL_SEMANTICS[charAtPos]) {
        const sem = SIGIL_SEMANTICS[charAtPos]

        let md = `**\`${charAtPos}\`** \u2014 *${sem.role}*\n\n`
        md += `Physics: ${sem.physics}\n\n`
        md += `Phase: ${sem.phase}\n\n`
        md += `Tuning: ${sem.tuning}\n`
        if (sem.phaseIndex >= 0) {
            md += `\nSpirit sequence: ${deps.serverIndex.getSpiritSequence()}\n`
            md += `Active phase: ${sem.phaseIndex + 1}\n`
        }

        try {
            const trial = deps.trialRunSpw(source, uri)
            if (trial.success) {
                const snapshot = trial.runtime.registers
                const entries = Object.entries(snapshot.entries) as [string, any][]
                const sigil = charAtPos
                const related = entries.filter(([, e]: [string, any]) =>
                    e.meta.descriptor?.name?.toLowerCase().includes(sigil) ||
                    e.meta.provenance?.some((p: string) => p.includes(sigil))
                )
                if (related.length > 0) {
                    md += `\n---\n\n**Runtime** (${entries.length} registers)\n\n`
                    for (const [key, entry] of related.slice(0, 5) as [string, any][]) {
                        const phase = entry.meta.phases?.current ?? '\u2014'
                        const writes = entry.meta.writes
                        md += `- \`${key}\`: phase=${phase}, writes=${writes}\n`
                    }
                } else if (entries.length > 0) {
                    md += `\n---\n\n*Runtime: ${entries.length} register(s) active*\n`
                }
            }
        } catch {
            // Runtime trial failed — don't break hover
        }

        return {
            contents: { kind: 'markdown', value: md },
            range: { start: { line: pos.line, character: pos.character }, end: { line: pos.line, character: pos.character + 1 } },
        }
    }

    // 8. Symmetry hover
    const symRe = /(?:\{sym:(D4|Z4)\}|#\[(D4|Z4)\])/
    const symMatch = line.match(symRe)
    if (symMatch) {
        const symStart = line.indexOf(symMatch[0])
        const symEnd = symStart + symMatch[0].length
        if (pos.character >= symStart && pos.character < symEnd) {
            const group = symMatch[1] || symMatch[2]
            let md = `**${group} Symmetry** \u2014 *geometry*\n\n`
            if (group === 'D4') {
                md += `Dihedral group of order 8. Applies 8 geometric transformations (4 rotations, 4 reflections).\n\n`
                md += `- **Mirrors** \`.left\` \u2194 \`.right\`\n`
                md += `- **Register updates** reflect automatically.\n`
            } else if (group === 'Z4') {
                md += `Cyclic group of order 4. Applies 4 rotational states (0\u21921\u21922\u21923\u21920).\n\n`
                md += `- **Cycles** through clock-like evolution.\n`
            }
            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: symStart }, end: { line: pos.line, character: symEnd } }
            }
        }
    }

    // 9. @root hover
    const rootRe = /@([A-Za-z_][A-Za-z0-9_]*)/g
    let rootMatch: RegExpExecArray | null
    while ((rootMatch = rootRe.exec(line)) !== null) {
        const rootStart = rootMatch.index
        const rootEnd = rootStart + rootMatch[0].length
        if (pos.character < rootStart || pos.character > rootEnd) continue

        const rootName = rootMatch[1]
        const docPath = deps.pathFromUri(uri)
        const roots = deps.mergeRoots(source, path.dirname(docPath || deps.workspaceRoot))
        const resolved = roots[rootName]
        if (resolved) {
            const rel = path.relative(deps.workspaceRoot, resolved)
            const annotationsUnder = deps.serverIndex.allAnnotations().filter(e =>
                e.file.startsWith(resolved) || e.file.includes(`/${rootName}/`)
            )
            const uniqueFiles = new Set(annotationsUnder.map(e => e.file))
            const lenses = [...new Set(annotationsUnder.filter(e => e.kind === 'lens').map(e => e.name))]

            let md = `**\`@${rootName}\`** \u2192 \`${rel}\`\n\n`
            md += `**${uniqueFiles.size}** file(s), **${annotationsUnder.length}** annotation(s)\n\n`
            if (lenses.length > 0) {
                md += `Lenses: ${lenses.slice(0, 8).map(l => `\`#:${l}\``).join(', ')}\n`
            }

            return {
                contents: { kind: 'markdown', value: md },
                range: { start: { line: pos.line, character: rootStart }, end: { line: pos.line, character: rootEnd } },
            }
        }
    }

    // 10. Path peek
    const doc = deps.serverIndex.getDocument(uri)
    if (doc) {
        const hit = findPathRefAtPosition(doc.selectorHits, pos.line, pos.character)
        if (hit) {
            const docPath = deps.pathFromUri(uri)
            if (docPath) {
                const resolved = await deps.resolveReferencePath(hit, source, docPath, { allowDirectory: true })
                if (resolved) {
                    try {
                        const resolvedKind = await statKind(resolved)
                        const rel = path.relative(deps.workspaceRoot, resolved)
                        if (resolvedKind === 'dir') {
                            const entries = await fs.readdir(resolved, { withFileTypes: true })
                            const visible = entries.filter((entry) => !entry.name.startsWith('.'))
                            const spwFiles = visible.filter((entry) => entry.isFile() && entry.name.endsWith('.spw'))
                            const subdirs = visible.filter((entry) => entry.isDirectory())

                            // Semantic fingerprint from workspace annotation index
                            const dirAnnotations = deps.serverIndex.allAnnotations().filter(a =>
                                a.file.startsWith(resolved + path.sep) || a.file.startsWith(resolved + '/')
                            )
                            const annotFreq = new Map<string, number>()
                            const layerDist = new Map<string, number>()
                            const seenFiles = new Set<string>()
                            for (const a of dirAnnotations) {
                                annotFreq.set(a.name, (annotFreq.get(a.name) ?? 0) + 1)
                                if (!seenFiles.has(a.file)) {
                                    seenFiles.add(a.file)
                                    const fileAnnots = deps.serverIndex.annotationsForFile(a.file)
                                    const layerAnnot = fileAnnots.find(fa => fa.kind === 'lens' && fa.name === 'layer')
                                    if (layerAnnot) {
                                        const intentAnnot = fileAnnots.find(fa => fa.kind === 'intent' && fa.line === layerAnnot.line)
                                        if (intentAnnot) layerDist.set(intentAnnot.name, (layerDist.get(intentAnnot.name) ?? 0) + 1)
                                    }
                                }
                            }

                            const subroot = deps.serverIndex.getSubrootForFile(resolved + '/index.spw')
                                ?? deps.serverIndex.getSubrootForFile(resolved)
                            const plane = deps.serverIndex.getWorkspacePlaneForFile(resolved + '/index.spw')

                            let md = `\u2192 \`${rel}/\`\n\n`

                            // Topology placement
                            const metaParts: string[] = []
                            if (subroot) metaParts.push(`Subroot: ${subroot}`)
                            if (plane) metaParts.push(`Plane: ${plane}`)
                            metaParts.push(`${spwFiles.length} .spw`)
                            if (subdirs.length > 0) metaParts.push(`${subdirs.length} dir${subdirs.length > 1 ? 's' : ''}`)
                            md += metaParts.join(' · ') + '\n\n'

                            // Layer distribution
                            if (layerDist.size > 0) {
                                const LAYER_ORDER = ['grammar', 'semantics', 'pragmatics']
                                const layerSummary = [...layerDist.entries()]
                                    .sort((a, b) => (LAYER_ORDER.indexOf(a[0]) + 1 || 99) - (LAYER_ORDER.indexOf(b[0]) + 1 || 99))
                                    .map(([l, n]) => `${l}\u00a0(${n})`)
                                    .join(' · ')
                                md += `Layers: ${layerSummary}\n\n`
                            }

                            // Semantic fingerprint: top annotations by frequency
                            if (annotFreq.size > 0) {
                                const topAnnots = [...annotFreq.entries()]
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 6)
                                    .map(([n]) => `\`#${n}\``)
                                    .join(', ')
                                md += `Concepts: ${topAnnots}\n\n`
                            }

                            // File listing (abbreviated)
                            const preview = visible.slice(0, 6)
                            const rendered = preview
                                .map((entry) => `- ${entry.isDirectory() ? '[dir]' : '[file]'} \`${entry.name}${entry.isDirectory() ? '/' : ''}\``)
                                .join('\n')
                            if (rendered) md += rendered
                            if (visible.length > preview.length) md += `\n- *...and ${visible.length - preview.length} more*`

                            return {
                                contents: { kind: 'markdown', value: md },
                                range: {
                                    start: { line: hit.span.startLine, character: hit.span.startCharacter },
                                    end: { line: hit.span.endLine, character: hit.span.endCharacter },
                                },
                            }
                        }

                        const fileText = await fs.readFile(resolved, 'utf8')
                        const lines = fileText.split('\n').slice(0, 10)
                        const subroot = deps.serverIndex.getSubrootForFile(resolved) || 'workspace'
                        const tier = deps.serverIndex.getCacheTierForFile(resolved)
                        const fileAnnotations = deps.serverIndex.annotationsForFile(resolved)
                        const kinds = new Map<string, number>()
                        for (const a of fileAnnotations) kinds.set(a.kind, (kinds.get(a.kind) ?? 0) + 1)
                        const kindSummary = [...kinds.entries()].map(([k, n]) => `${n} ${k}`).join(', ')

                        const plane = deps.serverIndex.getWorkspacePlaneForFile(resolved)
                        const category = deps.serverIndex.getCategoryForFile(resolved)
                        const isGenerated = deps.serverIndex.isGeneratedFile(resolved)

                        let md = `\u2192 \`${rel}\`\n\n`
                        const metaParts: string[] = [`Subroot: ${subroot}`, `Cache: ${tier}`]
                        if (plane) metaParts.push(`Plane: ${plane}`)
                        if (category) metaParts.push(`Category: ${category}`)
                        if (isGenerated) metaParts.push('**generated**')
                        md += metaParts.join(' | ')
                        if (kindSummary) md += ` | Annotations: ${kindSummary}`
                        md += '\n\n```spw\n' + lines.join('\n')
                        if (fileText.split('\n').length > 10) md += '\n...'
                        md += '\n```\n'

                        return {
                            contents: { kind: 'markdown', value: md },
                            range: {
                                start: { line: hit.span.startLine, character: hit.span.startCharacter },
                                end: { line: hit.span.endLine, character: hit.span.endCharacter },
                            },
                        }
                    } catch {
                        // file unreadable
                    }
                }
            }
        }
    }

    return null
}

// ── Document Symbols ────────────────────────────────────────────

export function documentSymbols(params: DocumentParams, deps: HandlerDeps): LspDocumentSymbol[] {
    const uri = params?.textDocument?.uri
    if (!uri) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    return outlineFromSource(doc.text)
}

// ── Workspace Symbols ───────────────────────────────────────────

export function workspaceSymbols(params: { query?: string }, deps: HandlerDeps): LspSymbolInfo[] {
    const query = (params?.query as string) ?? ''
    if (!query) return []

    const results: LspSymbolInfo[] = []

    // Frames first — structural containers are highest navigation value
    const frameEntries = deps.serverIndex.searchFrames(query)
    for (const entry of frameEntries.slice(0, 20)) {
        const parentPath = entry.framePath.slice(0, -1).join(' > ')
        results.push({
            name: `^["${entry.name}"]`,
            kind: SK.Module,
            location: {
                uri: deps.uriFromPath(entry.file),
                range: { start: { line: entry.line, character: 0 }, end: { line: entry.line, character: 0 } },
            },
            containerName: parentPath || undefined,
        })
    }

    // Annotations
    const annotEntries = deps.serverIndex.searchAnnotations(query)
    const kindMap: Record<string, number> = { topic: SK.Key, lens: SK.Enum, intent: SK.Event, anchor: SK.Interface, prompt_root: SK.Interface }
    const prefixMap: Record<string, string> = { topic: '#', lens: '#:', intent: '#!', anchor: '#>', prompt_root: '##>' }
    for (const entry of annotEntries.slice(0, 40)) {
        results.push({
            name: `${prefixMap[entry.kind] ?? '#'}${entry.name}`,
            kind: kindMap[entry.kind] ?? SK.Key,
            location: {
                uri: deps.uriFromPath(entry.file),
                range: { start: { line: entry.line, character: 0 }, end: { line: entry.line, character: 0 } },
            },
            containerName: entry.sectionLabel,
        })
    }

    return results
}

// ── Code Lens ───────────────────────────────────────────────────

export function codeLens(params: DocumentParams, deps: HandlerDeps): LspCodeLens[] {
    const uri = params?.textDocument?.uri
    if (!uri) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const docPath = doc.filePath
    const fileAnnotations = deps.serverIndex.annotationsForFile(docPath)
    const lines = doc.text.split('\n')
    const lenses: LspCodeLens[] = []

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]

        // Frame annotation summary
        const frameMatch = line.match(/^\s*\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/)
        if (frameMatch) {
            const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3]
            const inFrame = fileAnnotations.filter(e => e.sectionLabel === frameName)
            if (inFrame.length > 0) {
                const kindCounts = new Map<string, number>()
                for (const entry of inFrame) kindCounts.set(entry.kind, (kindCounts.get(entry.kind) ?? 0) + 1)
                const summary = [...kindCounts.entries()].map(([k, n]) => `${n} ${k}`).join(', ')
                lenses.push({
                    range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                    command: { title: `\u25c7 ${summary}`, command: '' },
                })
            }
        }

        // Anchor cross-file refs
        const anchorMatch = line.match(ANCHOR_RE)
        if (anchorMatch) {
            const name = anchorMatch[1]
            const refs = deps.serverIndex.lookupAnnotation(name)
            const otherFiles = refs.filter(e => e.file !== docPath)
            const fileCount = new Set(otherFiles.map(e => e.file)).size
            const sourceSummary = summarizeReferenceSources(refs, docPath, deps.workspaceRoot)
            if (fileCount > 0) {
                lenses.push({
                    range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                    command: { title: `\u2197 ${fileCount} file ref(s)${sourceSummary ? ` \u00b7 ${sourceSummary}` : ''}`, command: '' },
                })
            } else {
                lenses.push({
                    range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                    command: { title: '\u25c7 anchor \u2014 no cross-file refs', command: '' },
                })
            }

            // Runtime register summary
            try {
                const trial = deps.trialRunSpw(doc.text, uri)
                if (trial.success) {
                    const regEntries = trial.runtime.registers.entries as Record<string, any>
                    const regCount = Object.keys(regEntries).length
                    const maxPhaseEntry = (Object.values(regEntries) as any[])
                        .filter((e: any) => e.meta.phases?.current)
                        .sort((a: any, b: any) => {
                            const order = ['lex', 'parse', 'semantic', 'optimize', 'pragmatic']
                            return order.indexOf(b.meta.phases!.current) - order.indexOf(a.meta.phases!.current)
                        })[0]
                    const maxPhase = maxPhaseEntry?.meta.phases?.current ?? '\u2014'
                    lenses.push({
                        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                        command: { title: `\u25c6 ${regCount} reg \u00b7 phase:${maxPhase}`, command: '' },
                    })
                }
            } catch {
                // Runtime trial failed — skip lens
            }
        }

        // Projection spec owner lens
        const projections = deps.serverIndex.getProjectionsFromSpecOwner(docPath)
        if (i === 0 && projections.length > 0) {
            const names = projections.map(p => p.name).join(', ')
            lenses.push({
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                command: { title: `\u2192 projects: ${names}`, command: '' },
            })
        }
    }

    // Projection target lens
    const proj = deps.serverIndex.getProjectionForFile(docPath)
    if (proj) {
        lenses.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            command: {
                title: `\u2190 generated from ${path.relative(deps.workspaceRoot, path.resolve(deps.workspaceRoot, proj.specOwner.replace(/^\.\//, '')))}`,
                command: '',
            },
        })
    }

    // File metrics banner
    const plane = deps.serverIndex.getWorkspacePlaneForFile(docPath)
    const category = deps.serverIndex.getCategoryForFile(docPath)
    const isGenerated = deps.serverIndex.isGeneratedFile(docPath)

    const frameCount = lines.filter(l => /^\s*\^(?:\["[^"]+"\]|"[^"]+"|\\[[A-Za-z_]\w*\\])/.test(l)).length
    const annotCount = fileAnnotations.length
    let maxBraceDepth = 0
    { let d = 0; for (const l of lines) { for (const c of l) { if (c === '{') d++; else if (c === '}') d = Math.max(0, d - 1); } if (d > maxBraceDepth) maxBraceDepth = d; } }
    const wonderCount = lines.filter(l => /^\s*#>wonder_/.test(l)).length
    // Dominant spirit phase: highest-indexed operator with meaningful presence
    const SPIRIT_PHASE_ORDER = ['!', '?', '~', '@', '&', '*', '^'] as const
    const opDist: Record<string, number> = {}
    for (const l of lines) { for (const c of l) { if ('~?!^%&*=@'.includes(c)) opDist[c] = (opDist[c] || 0) + 1 } }
    const topPhase = [...SPIRIT_PHASE_ORDER].reverse().find(op => (opDist[op] ?? 0) >= 3)

    const layerLine = lines.find(l => l.includes('#:layer'))
    const layerNameMatch = layerLine?.match(/#!([a-z]+)/)
    const layerLabel = layerNameMatch?.[1]

    if (isGenerated) {
        lenses.unshift({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            command: { title: '\u26a0 generated surface \u2014 do not hand-edit', command: '' },
        })
    } else {
        const parts: string[] = []
        if (layerLabel) parts.push(layerLabel)
        else if (plane) parts.push(plane)
        if (category) parts.push(category)
        parts.push(`${frameCount}^`)
        parts.push(`${annotCount}#`)
        parts.push(`d${maxBraceDepth}`)
        if (wonderCount > 0) parts.push(`${wonderCount}\u2753`)
        // Spirit phase indicator — only when file is clearly in an advanced phase (@, &, *, ^)
        if (topPhase && SPIRIT_PHASE_ORDER.indexOf(topPhase) >= 3) parts.push(`${topPhase}\u2191`)
        lenses.unshift({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            command: { title: `\u25c8 ${parts.join(' \u00b7 ')}`, command: '' },
        })
    }

    return lenses
}

// ── Inlay Hints ─────────────────────────────────────────────────

export async function inlayHints(params: InlayHintParams, deps: HandlerDeps): Promise<LspInlayHint[]> {
    const uri = params?.textDocument?.uri
    const range = params?.range as LspRange | undefined
    if (!uri || !range) return []

    const docPath = deps.pathFromUri(uri)
    if (!docPath) return []

    const source = await deps.getDocumentText(uri)
    if (source === null) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const lines = source.split('\n')
    const hints: LspInlayHint[] = []
    const fileAnnotations = deps.serverIndex.annotationsForFile(docPath)

    // 1) Path status hints
    if (deps.config.inlayHints.paths) {
        for (const hit of doc.selectorHits) {
            const sl = hit.span.startLine
            if (sl < range.start.line || sl > range.end.line) continue

            const resolved = await deps.resolveReferencePath(hit, source, docPath, { allowDirectory: true })
            const lineText = lines[hit.span.endLine] ?? ''
            // endCharacter is exclusive — place the inlay at the end of the path unit
            const hintAt = Math.min(hit.span.endCharacter, lineText.length)

            if (!resolved) continue

            const cleanResolved = resolved.replace(/#.*$/, '')
            const rel = path.relative(deps.workspaceRoot, cleanResolved)
            const target = hit.kind === 'pathRef' ? hit.target : `@${hit.root}/${hit.target}`
            const targetClean = target.replace(/#.*$/, '').replace(/^\.\//, '')
            if (rel === targetClean) continue

            hints.push({
                position: { line: hit.span.endLine, character: hintAt },
                label: ` => ${rel}`,
                kind: 2,
                tooltip: `Resolved target: ${cleanResolved}`,
                paddingLeft: true,
            })
        }
    }

    // 2) Boundary delta + wonder synopsis hints
    if (deps.config.inlayHints.annotations || deps.config.inlayHints.frames) {
        for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo += 1) {
            const line = lines[lineNo] ?? ''
            const context = doc.lineContexts[lineNo] as DisplayLineContext | undefined

            if (deps.config.inlayHints.frames || deps.config.inlayHints.annotations) {
                const boundaryHint = buildBoundaryHint(context, line)
                if (boundaryHint) {
                    hints.push({
                        position: { line: lineNo, character: line.length },
                        label: boundaryHint.label,
                        kind: 2,
                        tooltip: boundaryHint.tooltip,
                        paddingLeft: true,
                    })
                }
            }

            if (deps.config.inlayHints.annotations) {
                const wonder = parseWonderBlock(lines, lineNo)
                const hint = wonder ? buildWonderHint(wonder) : null
                if (hint) {
                    hints.push({
                        position: { line: lineNo, character: line.length },
                        label: hint.label,
                        kind: 2,
                        tooltip: hint.tooltip,
                        paddingLeft: true,
                    })
                }
            }
        }
    }

    // 3) Brace depth + charge hints
    // Uses a string-aware brace counter so quoted content doesn't skew depth.
    {
        let depth = 0
        for (let i = 0; i < range.start.line && i < lines.length; i++) {
            depth = countBracesOutsideStrings(lines[i], depth)
        }
        for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo++) {
            const line = lines[lineNo]
            const prevDepth = depth
            depth = countBracesOutsideStrings(line, depth)
            const openCount = depth - prevDepth > 0 ? depth - prevDepth : 0
            const closeCount = prevDepth - depth > 0 ? prevDepth - depth : 0
            const lineCtx = doc.lineContexts[lineNo]
            const frameLabel = lineCtx?.framePath.at(-1) ?? null
            const localBraidLabel = lineCtx?.localBraids.slice(0, 2).join(' · ') || null
            if (openCount > 0 && depth >= 3) {
                const contextLabel = frameLabel
                    ? ` ${frameLabel}`
                    : localBraidLabel
                        ? ` ${localBraidLabel}`
                        : ` d${depth}`
                const tension = openCount > closeCount ? '+tension' : openCount < closeCount ? '−discharge' : 'balanced'
                hints.push({
                    position: { line: lineNo, character: line.length },
                    label: ` \u2502${contextLabel.trimStart()}`,
                    kind: 2,
                    tooltip: `Depth ${depth} · ${tension}${frameLabel ? ` · frame: ${lineCtx?.framePath.join(' › ')}` : ''}`,
                    paddingLeft: true,
                })
            } else if (closeCount > 0 && prevDepth >= 3 && depth < prevDepth) {
                const exitLabel = lineCtx?.framePath.at(-1) ?? `d${depth}`
                hints.push({
                    position: { line: lineNo, character: line.length },
                    label: ` \u2502\u2514${exitLabel}`,
                    kind: 2,
                    tooltip: `Exit depth ${prevDepth} → ${depth}${lineCtx?.framePath.length ? ` · in: ${lineCtx.framePath.join(' › ')}` : ''}`,
                    paddingLeft: true,
                })
            }
        }
    }

    // 4) Incoming reference hints on anchor lines
    for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo++) {
        const line = lines[lineNo]
        const anchorMatch = line.match(ANCHOR_RE)
        if (!anchorMatch) continue

        const name = anchorMatch[1]
        const refs = deps.serverIndex.lookupAnnotation(name)
        const otherFiles = refs.filter((entry) => entry.file !== docPath)
        const fileCount = new Set(otherFiles.map((entry) => entry.file)).size
        const sourceSummary = summarizeReferenceSources(refs, docPath, deps.workspaceRoot, 2)

        if (fileCount > 0) {
            hints.push({
                position: { line: lineNo, character: line.length },
                label: ` [incoming ${fileCount}f${sourceSummary ? ` \u00b7 ${sourceSummary}` : ''}]`,
                kind: 2,
                tooltip: 'Files that reference this anchor.',
                paddingLeft: true,
            })
        }
        break
    }

    return hints
}

// ── Document Highlights ──────────────────────────────────────────

export function documentHighlight(params: TextDocumentPositionParams, deps: HandlerDeps): LspDocumentHighlight[] {
    const uri = params?.textDocument?.uri
    const pos = params?.position as LspPosition | undefined
    if (!uri || !pos) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const lines = doc.text.split('\n')
    const line = lines[pos.line] ?? ''
    const results: LspDocumentHighlight[] = []

    // 1. Annotation name highlight — all occurrences of the same #name in the document
    const annotationsAtCursor = collectAnnotationMatches(line)
    const activeAnnotation = annotationsAtCursor.find((match) =>
        pos.character >= match.start && pos.character <= match.end,
    )
    if (activeAnnotation) {
        const seen = new Set<string>()
        for (let i = 0; i < lines.length; i += 1) {
            const matches = collectAnnotationMatches(lines[i] ?? '')
            for (const match of matches) {
                const sameSigilAndName = match.sigil === activeAnnotation.sigil && match.name === activeAnnotation.name
                const sameName = match.name === activeAnnotation.name
                const sameBraid = match.braid === activeAnnotation.braid
                if (!sameSigilAndName && !sameName && !sameBraid) continue

                const key = `${i}:${match.start}:${match.end}`
                if (seen.has(key)) continue
                seen.add(key)

                results.push({
                    range: {
                        start: { line: i, character: match.start },
                        end: { line: i, character: match.end },
                    },
                    kind: i === pos.line && match.start === activeAnnotation.start
                        ? 3
                        : sameSigilAndName
                            ? 1
                            : 2,
                })
            }
        }
        return results
    }

    // 2. @root highlight — all occurrences of the same @name
    const rootAtCursor = /@([A-Za-z_]\w*)/g
    let rootMatch: RegExpExecArray | null
    while ((rootMatch = rootAtCursor.exec(line)) !== null) {
        const start = rootMatch.index
        const end = start + rootMatch[0].length
        if (pos.character >= start && pos.character <= end) {
            const name = rootMatch[1]
            const searchRe = new RegExp(`@(${name})(?!\\w)`, 'g')
            for (let i = 0; i < lines.length; i++) {
                let m: RegExpExecArray | null
                searchRe.lastIndex = 0
                while ((m = searchRe.exec(lines[i])) !== null) {
                    // Declaration: @name: ~"..." pattern
                    const isDecl = lines[i].slice(m.index).match(/^@\w+:\s*~"/)
                    results.push({
                        range: {
                            start: { line: i, character: m.index },
                            end: { line: i, character: m.index + m[0].length },
                        },
                        kind: isDecl ? 3 : 1,
                    })
                }
            }
            return results
        }
    }

    // 3. Frame name highlight — ^["name"] occurrences
    const frameAtCursor = /\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/g
    let frameMatch: RegExpExecArray | null
    while ((frameMatch = frameAtCursor.exec(line)) !== null) {
        const start = frameMatch.index
        const end = start + frameMatch[0].length
        if (pos.character >= start && pos.character <= end) {
            const name = frameMatch[1] || frameMatch[2] || frameMatch[3]
            for (let i = 0; i < lines.length; i++) {
                const fRe = /\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/g
                let fm: RegExpExecArray | null
                while ((fm = fRe.exec(lines[i])) !== null) {
                    const fName = fm[1] || fm[2] || fm[3]
                    if (fName === name) {
                        results.push({
                            range: {
                                start: { line: i, character: fm.index },
                                end: { line: i, character: fm.index + fm[0].length },
                            },
                            kind: 1,
                        })
                    }
                }
            }
            return results
        }
    }

    return results
}

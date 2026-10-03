/**
 * Wonder and apposition display — the `?["…"]{ … }` hover and inlay digest,
 * and the `~#name(reading)` hover.
 *
 * Both read the seed's tokens: the index's own parse when it holds this exact
 * text, else a fresh lex. An apposition is split by `readAppositionToken`, the
 * reader the index uses too, so a hover cannot see a reading the index missed,
 * or the reverse, and no third scanner can drift from the lexer.
 */

import path from 'node:path'
import { lex, type Token } from '@spwashi/spw-seed'
import { escapeMarkdownInline } from '../server-index'
import { normalizeReading, readAppositionToken } from '../apposition'
import type { HandlerDeps, LspHover, LspPosition } from '../types'

/** Where a wonder's lens was written. Only the apposition is canon; the comment never reaches the AST. */
type LensForm = 'apposition' | 'datum' | 'comment'

export interface WonderBlockSummary {
    question: string
    depth: string | null
    lens: string | null
    lensForm: LensForm | null
    probe: string | null
    metrics: string[]
    neighbor: string | null
    /** The block's own body, header-line tail included, so a hint can drop what the reader already sees. */
    bodyText: string
}

/** Tokens for the hovered source, fetched only when a reader needs them. */
export type TokensOf = () => readonly Token[]

/** The frame/field preamble for a hover anchored at `character` on the hovered line. */
export type ContextMarkdownAt = (character: number) => string

const WONDER_HEADER = /\?\["([^"]+)"\]/
const LEGACY_LENS_COMMENT = /^\/\/\s*lens:\s*(.+)$/
/** Lines read past the header: a brace body runs to its `}`, an indented one to its dedent. */
const BRACE_BODY_LINES = 11
const INDENT_BODY_LINES = 5

/**
 * The tokens behind `source`: the index's parse when it holds this same text
 * (and did not rewrite it for a line dialect), else a fresh lex.
 */
export function sourceTokens(source: string, uri: string, deps: HandlerDeps): readonly Token[] {
    const doc = deps.serverIndex.getDocument(uri)
    const parsed = doc?.text === source ? doc.parseResult : null
    if (parsed && !parsed.dialectPreprocessed) return parsed.tokens
    try {
        return lex(source, { eventPolicy: 'none' }).tokens
    } catch {
        return []
    }
}

/** `text` as one inline code span whatever backticks it holds: the fence outruns every run inside. */
export function codeSpan(text: string): string {
    const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
    const fence = '`'.repeat(longest + 1)
    const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
    return `${fence}${pad}${text}${pad}${fence}`
}

// ── Token positions (the seed counts lines and columns from 1) ──

const lineOf = (token: Token): number => token.span.start.line - 1
const columnOf = (token: Token): number => token.span.start.column - 1

/** Index of the first token starting at or after 0-indexed (line, character); tokens are in source order. */
function tokenIndexAt(tokens: readonly Token[], line: number, character: number): number {
    let lo = 0
    let hi = tokens.length
    while (lo < hi) {
        const mid = (lo + hi) >>> 1
        const at = tokens[mid]
        if (lineOf(at) < line || (lineOf(at) === line && columnOf(at) < character)) lo = mid + 1
        else hi = mid
    }
    return lo
}

function skipWhitespace(tokens: readonly Token[], index: number): number {
    while (tokens[index]?.type === 'WHITESPACE') index += 1
    return index
}

/** `?[` — a wonder opening, so a nested one's lens stays its own. */
function opensWonder(tokens: readonly Token[], index: number): boolean {
    const next = tokens[index + 1]
    return tokens[index].type === 'OPERATOR' && tokens[index].value.endsWith('?')
        && next?.type === 'CONTAINER_OPEN' && next.value === '['
}

/** Leading whitespace on a source line, in characters. */
const indentOf = (line: string): number => line.length - line.trimStart().length

/** Source text between two 0-indexed positions. */
function sliceLines(lines: string[], from: [number, number], to: [number, number]): string {
    if (from[0] === to[0]) return (lines[from[0]] ?? '').slice(from[1], to[1])
    const middle = lines.slice(from[0] + 1, to[0])
    return [(lines[from[0]] ?? '').slice(from[1]), ...middle, (lines[to[0]] ?? '').slice(0, to[1])].join('\n')
}

// ── Wonder block ────────────────────────────────────────────────

/** The wonder body's tokens [from, to) and its text, header-line tail included. */
interface WonderBody { from: number; to: number; text: string }

/**
 * Bound a wonder's own body by its tokens. A `{` body ends at the `}` that
 * balances it, even on the header line, so a one-line wonder never reads its
 * sibling's lines. A header with no `{` takes the lines below it indented
 * deeper than its own.
 * Null when the lexer saw no `?[` here (the header sits in a string or comment).
 */
function wonderBody(lines: string[], startLine: number, headerStart: number, headerEnd: number, tokens: readonly Token[]): WonderBody | null {
    const bracket = tokenIndexAt(tokens, startLine, headerStart + 1)
    if (bracket === 0 || !opensWonder(tokens, bracket - 1) || lineOf(tokens[bracket]) !== startLine || columnOf(tokens[bracket]) !== headerStart + 1) return null

    const afterHeader = tokenIndexAt(tokens, startLine, headerEnd)
    const open = skipWhitespace(tokens, afterHeader)
    if (tokens[open]?.type === 'CONTAINER_OPEN' && tokens[open].value === '{' && lineOf(tokens[open]) === startLine) {
        const lastLine = startLine + BRACE_BODY_LINES
        let depth = 1
        let to = open + 1
        for (; to < tokens.length; to += 1) {
            const token = tokens[to]
            if (token.type === 'EOF' || lineOf(token) > lastLine) break
            if (token.type === 'CONTAINER_OPEN' && token.value === '{') depth += 1
            else if (token.type === 'CONTAINER_CLOSE' && token.value === '}' && --depth === 0) break
        }
        const closed = tokens[to]?.type === 'CONTAINER_CLOSE' && lineOf(tokens[to]) <= lastLine
        const endLine = Math.min(lastLine, lines.length - 1)
        const end: [number, number] = closed ? [lineOf(tokens[to]), columnOf(tokens[to])] : [endLine, (lines[endLine] ?? '').length]
        return { from: open + 1, to, text: sliceLines(lines, [startLine, columnOf(tokens[open]) + 1], end) }
    }

    const headerIndent = indentOf(lines[startLine] ?? '')
    let lastLine = startLine
    for (let i = startLine + 1; i < lines.length && i <= startLine + INDENT_BODY_LINES; i += 1) {
        const bodyLine = lines[i] ?? ''
        if (bodyLine.trim() !== '' && indentOf(bodyLine) <= headerIndent) break
        lastLine = i
    }
    return {
        from: afterHeader,
        to: tokenIndexAt(tokens, lastLine + 1, 0),
        text: sliceLines(lines, [startLine, headerEnd], [lastLine, (lines[lastLine] ?? '').length]),
    }
}

/** A `~#lens: …` datum's value: a string's content, or the bare words up to a comment or the body's end. */
function datumValue(tokens: readonly Token[], index: number, to: number, lines: string[]): string | null {
    if (tokens[index + 1]?.type !== 'COLON') return null
    const start = skipWhitespace(tokens, index + 2)
    const value = tokens[start]
    if (!value || start >= to || lineOf(value) !== lineOf(tokens[index])) return null
    if (value.type === 'STRING') {
        const quote = value.value[0]
        const closed = value.value.length > 1 && value.value.endsWith(quote)
        return value.value.slice(1, closed ? -1 : undefined).trim() || null
    }
    const line = lines[lineOf(value)] ?? ''
    let stop = line.length
    for (let i = start; i < tokens.length && lineOf(tokens[i]) === lineOf(value); i += 1) {
        if (i >= to || tokens[i].type === 'COMMENT') {
            stop = columnOf(tokens[i])
            break
        }
    }
    return line.slice(columnOf(value), stop).trim() || null
}

/**
 * The wonder's lens, in canon's order of preference: the `~#lens(…)`
 * apposition, then a `~#lens: "…"` datum, then the legacy `// lens:` comment.
 * Only the wonder's own body is read, up to a nested `?[` whose lens is its own.
 * An empty reading states no lens.
 */
function readLens(tokens: readonly Token[], body: WonderBody, lines: string[]): { lens: string; form: LensForm } | null {
    let datum: string | null = null
    let comment: string | null = null
    for (let i = body.from; i < body.to; i += 1) {
        const token = tokens[i]
        if (opensWonder(tokens, i)) break
        if (token.type === 'APPOSITION') {
            const reading = readAppositionToken(token)
            if (reading?.name === 'lens' && reading.body) return { lens: reading.body, form: 'apposition' }
        } else if (token.type === 'ANNOTATION' && token.value === '~#lens') {
            datum ??= datumValue(tokens, i, body.to, lines)
        } else if (token.type === 'COMMENT') {
            comment ??= token.value.match(LEGACY_LENS_COMMENT)?.[1]?.trim() || null
        }
    }
    if (datum !== null) return { lens: datum, form: 'datum' }
    if (comment !== null) return { lens: comment, form: 'comment' }
    return null
}

export function parseWonderBlock(lines: string[], startLine: number, tokensOf: TokensOf): WonderBlockSummary | null {
    const header = WONDER_HEADER.exec(lines[startLine] ?? '')
    if (!header) return null
    const tokens = tokensOf()
    const body = wonderBody(lines, startLine, header.index, header.index + header[0].length, tokens)
    if (!body) return null

    const bodyText = body.text
    const depthLine = bodyText.split('\n').find((entry) => entry.includes('#:depth'))
    const lens = readLens(tokens, body, lines)
    return {
        question: header[1],
        depth: depthLine?.match(/#!([a-z][a-z0-9_]*)/)?.[1] ?? null,
        lens: lens?.lens ?? null,
        lensForm: lens?.form ?? null,
        probe: bodyText.match(/!probe\{\s*"([^"]+)"/s)?.[1] ?? null,
        metrics: [...bodyText.matchAll(/\$%\[([^\]]+)\]/g)]
            .flatMap((match) => match[1].split(',').map((value) => value.trim()).filter(Boolean)),
        neighbor: bodyText.match(/~<([^>]+)>/)?.[1]?.trim() ?? null,
        bodyText,
    }
}

export function buildWonderHint(summary: WonderBlockSummary): { label: string; tooltip: string } | null {
    // The hint sits on the `?[…]{` line; depth and lens are extracted from the
    // block's own body, so when the block is visible they only repeat it. Keep
    // the parts that genuinely compress — the metric count stands in for a
    // whole `$%[…]` line — and drop the verbatim echoes.
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

// ── Hovers ──────────────────────────────────────────────────────

function fileCountOf(entries: Array<{ file: string }>): number {
    return new Set(entries.map((entry) => entry.file)).size
}

/**
 * Hover for the `?["…"]` of a wonder block. It runs ahead of the form-geometry
 * hover, which otherwise claims every column of the question as a boundary.
 */
export function hoverWonder(lines: string[], pos: LspPosition, tokensOf: TokensOf, deps: HandlerDeps, contextAt: ContextMarkdownAt): LspHover | null {
    const header = WONDER_HEADER.exec(lines[pos.line] ?? '')
    if (!header) return null
    const start = header.index
    const end = start + header[0].length
    if (pos.character < start || pos.character >= end) return null

    const summary = parseWonderBlock(lines, pos.line, tokensOf)
    if (!summary) return null

    let md = `**❓ Wonder**\n\n`
    md += contextAt(start)
    md += `> ${summary.question}\n\n`
    const axes: string[] = []
    if (summary.depth) axes.push(`**Depth axis:** ${summary.depth}`)
    if (summary.lens) axes.push(`**Lens:** ${escapeMarkdownInline(summary.lens)}`)
    if (axes.length > 0) md += axes.join(' · ') + '\n\n'
    if (summary.lens) {
        const written = codeSpan(`~#lens(${summary.lens})`)
        const shared = deps.serverIndex.lookupReading('lens', summary.lens)
        if (shared.length > 0) md += `${written} recurs **${shared.length}**× in **${fileCountOf(shared)}** file(s)\n\n`
        if (summary.lensForm === 'comment') {
            md += `*This lens is a \`// lens:\` comment, which the parser drops; write ${written} to put it in the AST.*\n\n`
        }
    }
    if (summary.metrics.length > 0) md += `**Metrics:** \`${summary.metrics.join(', ')}\`\n\n`
    if (summary.neighbor) md += `**Neighbor:** \`${summary.neighbor}\`\n\n`
    if (summary.probe) md += `**Probe:** ${summary.probe}\n`

    return {
        contents: { kind: 'markdown', value: md },
        range: { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } },
    }
}

/**
 * Hover for the `~#name(…)` apposition under the caret. Without it the caret
 * on `~#lens(` falls to the annotation hover, which misreads it as the `#lens`
 * topic. An unterminated apposition gets none: the lexer's error speaks for it.
 */
export function hoverApposition(line: string, pos: LspPosition, tokensOf: TokensOf, deps: HandlerDeps, contextAt: ContextMarkdownAt): LspHover | null {
    if (!line.includes('~#')) return null
    const tokens = tokensOf()
    let token: Token | undefined
    for (let i = tokenIndexAt(tokens, pos.line, 0); i < tokens.length && lineOf(tokens[i]) === pos.line; i += 1) {
        const at = tokens[i]
        if (at.type !== 'APPOSITION' || pos.character < columnOf(at) || pos.character >= columnOf(at) + at.value.length) continue
        token = at
        break
    }
    const reading = token ? readAppositionToken(token) : null
    if (!token || !reading) return null

    const start = columnOf(token)
    const range = { start: { line: pos.line, character: start }, end: { line: pos.line, character: start + token.value.length } }
    let md = `**${codeSpan(token.value)}** — `

    if (!reading.name || !reading.body) {
        md += reading.name ? '*apposition (empty reading)*\n\n' : '*apposition (anonymous reading)*\n\n'
        md += contextAt(start)
        md += reading.name
            ? 'States no reading, so there is nothing to find or count; it is not indexed.\n'
            : 'A one-off reading: with no name it has no key to recur under, so it is not indexed. Name it (`~#name(…)`) once it recurs.\n'
        return { contents: { kind: 'markdown', value: md }, range }
    }

    const named = deps.serverIndex.lookupAppositions(reading.name)
    const same = deps.serverIndex.lookupReading(reading.name, reading.body)
    const key = normalizeReading(reading.body)

    md += '*apposition (named reading)*\n\n'
    md += contextAt(start)
    md += `This reading: **${same.length}** occurrence(s) in **${fileCountOf(same)}** file(s)  \n`
    md += `${codeSpan(`~#${reading.name}(…)`)} readings: **${named.length}** in **${fileCountOf(named)}** file(s)\n\n`

    const others = new Map<string, { body: string; count: number }>()
    for (const entry of named) {
        const otherKey = normalizeReading(entry.body ?? '')
        if (!otherKey || otherKey === key) continue
        const seen = others.get(otherKey)
        if (seen) seen.count += 1
        else others.set(otherKey, { body: entry.body ?? '', count: 1 })
    }
    const topOthers = [...others.values()]
        .sort((a, b) => b.count - a.count || a.body.localeCompare(b.body))
        .slice(0, 5)
    if (topOthers.length > 0) {
        md += `Other readings: ${topOthers.map((entry) => `${codeSpan(entry.body)}\u00a0(${entry.count}×)`).join(', ')}\n\n`
    }

    const seenFiles = new Set<string>()
    for (const entry of same) {
        const rel = path.relative(deps.workspaceRoot, entry.file)
        if (seenFiles.has(rel) || seenFiles.size >= 5) continue
        seenFiles.add(rel)
        md += `- \`${rel}\`:${entry.line + 1}${entry.sectionLabel ? ` (${entry.sectionLabel})` : ''}\n`
    }

    return { contents: { kind: 'markdown', value: md }, range }
}

/**
 * Semantic Tokens Handler
 *
 * Provides textDocument/semanticTokens/full for .spw files.
 * Ported from the extension-side semantic-tokens.ts provider, now with
 * LSP server context (ServerIndex) available for richer classification.
 *
 * Token types (indices match TOKEN_TYPES order declared in capabilities):
 *   0  operator    — braces, &, <<>>, <>, generic operators
 *   1  type        — #-annotations, type-like constructs
 *   2  variable    — @-roots, $, navigable path refs (~"…", ~<path>, @root/path)
 *   3  property    — ~#traits, ~#name( apposition heads, =-config, =exp[
 *   4  function    — !-actions, !charge, ?-probes, #!intent
 *   5  string      — quoted strings, apposition bodies
 *   6  keyword     — ^-framing, *, %, $%[, @dialect, ##>-anchors
 *   7  comment     — //-comments
 *   8  number      — numerics, times, fractions
 *   9  commitRef   — a landed commit's hash in a plan file, .[name](hash)
 *
 * Token modifiers (bit flags, matching MODIFIERS order):
 *   0  declaration   — frame/anchor, brace open, =exp, ^seed
 *   1  definition    — path units, dialect marks, <<>>, <>
 *   2  readonly      — =-config, bare * crystallize
 *   3  deprecated    — (unused)
 *   4  modification  — !-action / !charge
 *   5  async         — ?-probe, stream digraphs
 *
 * Path navigation ergonomics: full path spans are emitted as a single
 * variable+definition token so editors can underline/jump the whole unit.
 */

import type { DocumentParams, HandlerDeps } from '../types'
import { COMMIT_REF_STRATEGY, commitRefsIn } from './commit-refs'

// ── Token type / modifier indices ──────────────────────────────

const TT = {
    operator: 0,
    type:     1,
    variable: 2,
    property: 3,
    function: 4,
    string:   5,
    keyword:  6,
    comment:  7,
    number:   8,
    commitRef: 9,
} as const

const TM = {
    declaration: 1 << 0,
    definition:  1 << 1,
    readonly:    1 << 2,
    // deprecated: 1 << 3  — intentionally omitted
    modification: 1 << 4,
    async:        1 << 5,
} as const

/** Angle-bracket body that should paint/jump as a path (mirrors spw-selector). */
function isAnglePathLike(inner: string): boolean {
    const s = inner.trim()
    if (!s) return false
    if (/[#*{}()[\]|]/.test(s)) return false
    if (s.includes('/')) return true
    if (s.startsWith('.')) return true
    if (/\.(spw|ts|tsx|js|mjs|cjs|md|json)$/i.test(s)) return true
    return false
}

/**
 * `~#name(` (name optional, as the apposition matcher allows) with a body that
 * balances on this line. Returns the `~#name` length and the body length, or
 * null when the paren never closes — that falls through to the trait painter.
 */
function appositionAt(rest: string): { head: number; body: number } | null {
    const open = rest.match(/^~#[a-zA-Z0-9_-]*\(/)
    if (!open) return null
    const head = open[0].length - 1
    let depth = 0
    for (let i = head; i < rest.length; i++) {
        if (rest[i] === '(') depth++
        else if (rest[i] === ')' && --depth === 0) return { head, body: i - head - 1 }
    }
    return null
}

/**
 * Bracket material — `{` `[` `(` and their closers — paints as operator. An
 * opener carries `declaration` because it starts a shape; a closer carries
 * none. An apposition's parens are the same material and paint the same way.
 */
function bracketModifiers(ch: string): number {
    return ch === '{' || ch === '[' || ch === '(' ? TM.declaration : 0
}

// ── Result type ─────────────────────────────────────────────────

export interface LspSemanticTokens {
    data: number[]
}

// ── Legend (exported for capability declaration) ────────────────

export const SEMANTIC_TOKENS_LEGEND = {
    tokenTypes: ['operator', 'type', 'variable', 'property', 'function', 'string', 'keyword', 'comment', 'number', 'commitRef'],
    tokenModifiers: ['declaration', 'definition', 'readonly', 'deprecated', 'modification', 'async'],
}

// ── Handler ─────────────────────────────────────────────────────

export function semanticTokens(params: DocumentParams, deps: HandlerDeps): LspSemanticTokens {
    const uri = params?.textDocument?.uri
    if (!uri) return { data: [] }

    const doc = deps.serverIndex.getDocument(uri)
    const text = doc?.text ?? null
    if (text === null) return { data: [] }

    const lines = text.split('\n')
    /** Tokens at absolute positions; commit refs overlay them before encoding. */
    const tokens: AbsoluteToken[] = []

    function push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void {
        if (length <= 0) return
        tokens.push({ line, char, length, type: tokenType, modifiers: tokenModifiers })
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const lineText = lines[lineIndex]
        let col = 0

        while (col < lineText.length) {
            const ch = lineText[col]
            const rest = lineText.slice(col)

            // Whitespace
            if (/\s/.test(ch)) { col++; continue }

            // // line comment — consumes rest of line
            if (rest.startsWith('//')) {
                push(lineIndex, col, lineText.length - col, TT.comment, 0)
                break
            }

            // # line comment (Spw light) — rest of line when # not followed by : ! > letter
            if (ch === '#' && rest.length > 1 && !/[#:!>a-zA-Z_]/.test(rest[1]!)) {
                // plain "# " comment body — handled below as topic if #word; skip
            }

            // @dialect:Spw.x / @profile:Spw.x — dialect product surface (keyword + definition)
            const dialectMark = rest.match(/^@(?:dialect|profile)\s*:\s*Spw\.[blmxqfpt]\b/i)
            if (dialectMark) {
                push(lineIndex, col, dialectMark[0].length, TT.keyword, TM.definition)
                col += dialectMark[0].length
                continue
            }

            // =exp[ id: …  — experimental catalog citation (property + declaration)
            const expMatch = rest.match(/^=\s*exp\s*\[/)
            if (expMatch) {
                push(lineIndex, col, expMatch[0].length, TT.property, TM.declaration)
                col += expMatch[0].length
                continue
            }

            // $%[ — measure bundle open (keyword + definition)
            if (rest.startsWith('$%[')) {
                push(lineIndex, col, 3, TT.keyword, TM.definition)
                col += 3
                continue
            }

            // << or >> stream / schedule brackets (operator + async for flow)
            if (rest.startsWith('<<') || rest.startsWith('>>')) {
                push(lineIndex, col, 2, TT.operator, TM.async)
                col += 2
                continue
            }

            // !boon !bane !bone !bonk !honk — charged action (function + modification)
            const chargeMatch = rest.match(/^!(?:boon|bane|bone|bonk|honk)\b/)
            if (chargeMatch) {
                push(lineIndex, col, chargeMatch[0].length, TT.function, TM.modification)
                col += chargeMatch[0].length
                continue
            }

            // ^seed[ — framing declaration
            if (rest.startsWith('^seed[')) {
                push(lineIndex, col, 6, TT.keyword, TM.declaration)
                col += 6
                continue
            }

            // ##>anchor — prompt root anchor (keyword + declaration)
            const promptAnchorMatch = rest.match(/^##>[a-zA-Z_][a-zA-Z0-9_]*/)
            if (promptAnchorMatch) {
                push(lineIndex, col, promptAnchorMatch[0].length, TT.keyword, TM.declaration)
                col += promptAnchorMatch[0].length
                continue
            }

            // ~#name(reading) / ~#(reading) — apposition. The body is prose taken raw
            // to the balancing paren, so it paints as one string: an apostrophe,
            // a digit or a % inside it is not code.
            const apposition = appositionAt(rest)
            if (apposition) {
                const bodyStart = col + apposition.head + 1
                push(lineIndex, col, apposition.head, TT.property, TM.declaration)
                push(lineIndex, bodyStart - 1, 1, TT.operator, bracketModifiers('('))
                push(lineIndex, bodyStart, apposition.body, TT.string, 0)
                push(lineIndex, bodyStart + apposition.body, 1, TT.operator, bracketModifiers(')'))
                col += apposition.head + apposition.body + 2
                continue
            }

            // ~#trait — concise trait annotation
            const traitMatch = rest.match(/^~#[a-zA-Z_][a-zA-Z0-9_-]*/)
            if (traitMatch) {
                push(lineIndex, col, traitMatch[0].length, TT.property, TM.declaration)
                col += traitMatch[0].length
                continue
            }

            // Navigable path units — full span for click/jump ergonomics
            // ~"path", ~<label>"path"
            const quotedPathMatch = rest.match(/^~\s*(?:<[^>\n"]+>\s*)?"([^"\n]*)"/)
            if (quotedPathMatch) {
                push(lineIndex, col, quotedPathMatch[0].length, TT.variable, TM.definition)
                col += quotedPathMatch[0].length
                continue
            }
            // ~<.spw/foo.spw>, ~<./index.spw> (angle path, no trailing quote)
            const anglePathMatch = rest.match(/^~\s*<([^>\n"]+)>(?!\s*")/)
            if (anglePathMatch && isAnglePathLike(anglePathMatch[1] ?? '')) {
                push(lineIndex, col, anglePathMatch[0].length, TT.variable, TM.definition)
                col += anglePathMatch[0].length
                continue
            }
            // @root/path (and @root/path#anchor-ish tails trimmed by class)
            const rootPathMatch = rest.match(/^@[A-Za-z_][A-Za-z0-9_]*\/[A-Za-z0-9_.\-/*]+/)
            if (rootPathMatch) {
                let len = rootPathMatch[0].length
                // Trim postfix envelope * that is not a /* wildcard
                if (rootPathMatch[0].endsWith('*') && !rootPathMatch[0].endsWith('/*')) {
                    len -= 1
                }
                push(lineIndex, col, len, TT.variable, TM.definition)
                col += len
                continue
            }

            // #:lens — conceptual axis (type + definition)
            const lensMatch = rest.match(/^#:[a-zA-Z_][a-zA-Z0-9_]*/)
            if (lensMatch) {
                push(lineIndex, col, lensMatch[0].length, TT.type, TM.definition)
                col += lensMatch[0].length
                continue
            }

            // #!intent — action orientation (function + modification)
            const intentMatch = rest.match(/^#![a-zA-Z_][a-zA-Z0-9_]*/)
            if (intentMatch) {
                push(lineIndex, col, intentMatch[0].length, TT.function, TM.modification)
                col += intentMatch[0].length
                continue
            }

            // #>anchor — navigation landmark (keyword + declaration)
            const singleAnchorMatch = rest.match(/^#>[a-zA-Z_][a-zA-Z0-9_]*/)
            if (singleAnchorMatch) {
                push(lineIndex, col, singleAnchorMatch[0].length, TT.keyword, TM.declaration)
                col += singleAnchorMatch[0].length
                continue
            }

            // #topic — concept label (type)
            const topicMatch = rest.match(/^#[a-zA-Z_][a-zA-Z0-9_]*/)
            if (topicMatch) {
                push(lineIndex, col, topicMatch[0].length, TT.type, 0)
                col += topicMatch[0].length
                continue
            }

            // numbers, times, fractions
            const numMatch = rest.match(/^\d+(?::\d+|\/\d+|\.\d+)?/)
            if (numMatch) {
                push(lineIndex, col, numMatch[0].length, TT.number, 0)
                col += numMatch[0].length
                continue
            }

            // [*] wildcard
            if (rest.startsWith('[*]')) {
                push(lineIndex, col, 3, TT.keyword, TM.definition)
                col += 3
                continue
            }

            // ^-framing (keyword, declaration)
            if (ch === '^') {
                push(lineIndex, col, 1, TT.keyword, TM.declaration)
                col++
                continue
            }

            // !-action (function, modification)
            if (ch === '!') {
                push(lineIndex, col, 1, TT.function, TM.modification)
                col++
                continue
            }

            // ?-probe (function, async)
            if (ch === '?') {
                push(lineIndex, col, 1, TT.function, TM.async)
                col++
                continue
            }

            // ~-potential (variable — no deprecated modifier)
            if (ch === '~') {
                push(lineIndex, col, 1, TT.variable, 0)
                col++
                continue
            }

            // =-config/constraint (property, readonly)
            if (ch === '=') {
                push(lineIndex, col, 1, TT.property, TM.readonly)
                col++
                continue
            }

            // %-measure (keyword)
            if (ch === '%') {
                push(lineIndex, col, 1, TT.keyword, 0)
                col++
                continue
            }

            // *-variant then bare * crystallize
            if (ch === '*') {
                const mod = /[a-zA-Z_]/.test(rest[1] ?? '') ? 0 : TM.readonly
                push(lineIndex, col, 1, TT.keyword, mod)
                col++
                continue
            }

            // &[ confluence-select then bare &
            if (ch === '&') {
                if (rest.startsWith('&[')) {
                    push(lineIndex, col, 2, TT.operator, TM.definition)
                    col += 2
                    continue
                }
                push(lineIndex, col, 1, TT.operator, TM.definition)
                col++
                continue
            }

            // $-substrate (variable)
            if (ch === '$') {
                push(lineIndex, col, 1, TT.variable, 0)
                col++
                continue
            }

            // <> couple digraph before bare <
            if (rest.startsWith('<>')) {
                push(lineIndex, col, 2, TT.operator, TM.definition)
                col += 2
                continue
            }

            // Brace material — pair open/close as operator (shape literacy)
            if (ch === '{' || ch === '}' || ch === '[' || ch === ']' || ch === '(' || ch === ')') {
                push(lineIndex, col, 1, TT.operator, bracketModifiers(ch))
                col++
                continue
            }

            // +-list prefix (operator)
            if (ch === '+') {
                push(lineIndex, col, 1, TT.operator, 0)
                col++
                continue
            }

            // @root bare name (not @root/path — handled above)
            if (ch === '@') {
                const refMatch = rest.match(/^@[a-zA-Z_][a-zA-Z0-9_]*/)
                if (refMatch) {
                    push(lineIndex, col, refMatch[0].length, TT.variable, 0)
                    col += refMatch[0].length
                    continue
                }
                push(lineIndex, col, 1, TT.variable, 0)
                col++
                continue
            }

            // remaining: .
            if (ch === '.') {
                push(lineIndex, col, 1, TT.operator, 0)
                col++
                continue
            }

            // angle leftovers < >
            if (ch === '<' || ch === '>') {
                push(lineIndex, col, 1, TT.operator, TM.definition)
                col++
                continue
            }

            // double-quoted strings
            if (ch === '"') {
                const strMatch = rest.match(/^"([^"\\]|\\.)*"/)
                if (strMatch) {
                    push(lineIndex, col, strMatch[0].length, TT.string, 0)
                    col += strMatch[0].length
                    continue
                }
            }

            // single-quoted strings
            if (ch === "'") {
                const strMatch = rest.match(/^'([^'\\]|\\.)*'/)
                if (strMatch) {
                    push(lineIndex, col, strMatch[0].length, TT.string, 0)
                    col += strMatch[0].length
                    continue
                }
            }

            // backtick strings
            if (ch === '`') {
                const strMatch = rest.match(/^`([^`\\]|\\.)*`/)
                if (strMatch) {
                    push(lineIndex, col, strMatch[0].length, TT.string, 0)
                    col += strMatch[0].length
                    continue
                }
            }

            col++
        }
    }

    return { data: encodeTokens(overlayCommitRefs(tokens, text, doc?.filePath)) }
}

// ── Commit refs and encoding ────────────────────────────────────

interface AbsoluteToken {
    line: number
    char: number
    length: number
    type: number
    modifiers: number
}

/**
 * A landed commit's hash in a plan file is one commitRef token. The scanner
 * reads it in pieces (a number, then letters); those pieces give way to it.
 */
function overlayCommitRefs(tokens: AbsoluteToken[], text: string, filePath: string | undefined): AbsoluteToken[] {
    const refs = commitRefsIn(text, filePath).filter((ref) => COMMIT_REF_STRATEGY[ref.source].token)
    if (refs.length === 0) return tokens
    const covered = (token: AbsoluteToken) => refs.some((ref) =>
        ref.range.start.line === token.line &&
        token.char < ref.range.end.character &&
        ref.range.start.character < token.char + token.length)
    const overlaid = tokens.filter((token) => !covered(token))
    for (const ref of refs) {
        overlaid.push({
            line: ref.range.start.line,
            char: ref.range.start.character,
            length: ref.range.end.character - ref.range.start.character,
            type: TT.commitRef,
            modifiers: 0,
        })
    }
    return overlaid.sort((a, b) => a.line - b.line || a.char - b.char)
}

/** LSP relative encoding: each token's line and start are deltas from the one before. */
function encodeTokens(tokens: AbsoluteToken[]): number[] {
    const data: number[] = []
    let prevLine = 0
    let prevChar = 0
    for (const token of tokens) {
        const deltaLine = token.line - prevLine
        const deltaChar = deltaLine === 0 ? token.char - prevChar : token.char
        data.push(deltaLine, deltaChar, token.length, token.type, token.modifiers)
        prevLine = token.line
        prevChar = token.char
    }
    return data
}

/**
 * Semantic Tokens Handler
 *
 * Provides textDocument/semanticTokens/full for .spw files.
 * Ported from the extension-side semantic-tokens.ts provider, now with
 * LSP server context (ServerIndex) available for richer classification.
 *
 * Token types (indices match TOKEN_TYPES order declared in capabilities):
 *   0  operator    — generic sigil / operator (fallback)
 *   1  type        — #-annotations, type-like constructs
 *   2  variable    — @-roots, navigable path refs (~"…", ~<path>, @root/path)
 *   3  property    — ~#traits, =-config
 *   4  function    — !-actions, ?-probes
 *   5  string      — quoted strings
 *   6  keyword     — ^-framing, *-variants, %-measure, ##>-anchors
 *   7  comment     — //-comments
 *   8  number      — numerics, times, fractions
 *
 * Token modifiers (bit flags, matching MODIFIERS order):
 *   0  declaration   — frame/anchor/section declarations
 *   1  definition    — navigable path units, [*] wildcards
 *   2  readonly      — =-config (config is a constraint)
 *   3  deprecated    — (unused — was misused for ~ in old provider)
 *   4  modification  — !-action (fires effects)
 *   5  async         — ?-probe (deferred measurement)
 *
 * Path navigation ergonomics: full path spans are emitted as a single
 * variable+definition token so editors can underline/jump the whole unit.
 */

import type { DocumentParams, HandlerDeps } from '../types'

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

// ── Result type ─────────────────────────────────────────────────

export interface LspSemanticTokens {
    data: number[]
}

// ── Legend (exported for capability declaration) ────────────────

export const SEMANTIC_TOKENS_LEGEND = {
    tokenTypes: ['operator', 'type', 'variable', 'property', 'function', 'string', 'keyword', 'comment', 'number'],
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
    const data: number[] = []

    let prevLine = 0
    let prevChar = 0

    function push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void {
        if (length <= 0) return
        const deltaLine = line - prevLine
        const deltaChar = deltaLine === 0 ? char - prevChar : char
        data.push(deltaLine, deltaChar, length, tokenType, tokenModifiers)
        prevLine = line
        prevChar = char
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

            // ##>anchor — prompt root anchor (keyword + declaration)
            const promptAnchorMatch = rest.match(/^##>[a-zA-Z_][a-zA-Z0-9_]*/)
            if (promptAnchorMatch) {
                push(lineIndex, col, promptAnchorMatch[0].length, TT.keyword, TM.declaration)
                col += promptAnchorMatch[0].length
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

            // *-variant (keyword)
            if (ch === '*' && /[a-zA-Z_]/.test(rest[1] ?? '')) {
                push(lineIndex, col, 1, TT.keyword, 0)
                col++
                continue
            }

            // +-list prefix (operator)
            if (ch === '+') {
                push(lineIndex, col, 1, TT.operator, 0)
                col++
                continue
            }

            // &[-reference (operator + bracket)
            if (ch === '&' && rest.startsWith('&[')) {
                push(lineIndex, col, 2, TT.operator, 0)
                col += 2
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

            // remaining operators: . & $ *
            if (ch === '.' || ch === '&' || ch === '$' || ch === '*') {
                push(lineIndex, col, 1, TT.operator, 0)
                col++
                continue
            }

            // containers: [] {} () <>
            if ('[]{}()<>'.includes(ch)) {
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

    return { data }
}

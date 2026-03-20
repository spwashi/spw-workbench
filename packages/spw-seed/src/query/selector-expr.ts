/**
 * Spw Selector Expression Parser
 *
 * Parses Spw-native text expressions into SpwSelector objects.
 * Grammar mirrors Spw's own syntax so selectors feel native:
 *
 *   expr     = term (('|' | 'or') term)*
 *   term     = factor (('&' | 'and') factor)*
 *   factor   = 'not' factor | atom
 *   atom     = sigil braces? modifier? value? depth?
 *            | '(' expr ')'
 *   sigil    = '!' | '~' | '@' | '^' | '#' | '.' | '?' | '=' | '&' | '*' | '$' | '%' | '<>'
 *   braces   = '[]' | '{}' | '()' (primary) optionally '[]' | '{}' | '()' (secondary)
 *   modifier = identifier (e.g., 'boon', 'bone')
 *   value    = '"' string '"'
 *   depth    = '@' number | '@' number '-' number
 *
 * Combinators:
 *   '/' = descend (parent / child)
 *   '..' = sequence (sibling a .. sibling b)
 *
 * Examples:
 *   "^[]"       → { sigil: '^', brace: '[]' }
 *   "^[]{}"     → and({ sigil: '^', brace: '[]' }, { sigil: '^', brace2: '{}' })
 *   "!boon"     → { sigil: '!', modifier: 'boon' }
 *   "~ | @"     → or({ sigil: '~' }, { sigil: '@' })
 *   "^[] / ![]" → descend({ sigil: '^', brace: '[]' }, { sigil: '!', brace: '[]' })
 *   "~\"path\"" → { sigil: '~', value: 'path' }
 *   "*"         → { sigil: '*' }
 *
 * @spw:surface:query[system=selector-expr,semantic=prolog|sql|css,status=experimental] - Selector expressions are a user-facing query surface
 * @spw:portable:seed[layer=query,system=selector-engine,extract=candidate,basis=no-dom|pure-data] - No DOM or app-specific imports allowed
 * @spw:seed:starter[system=selector-engine,extract=candidate,next=match,density=sparse] - Strong sparse starting point for later query extraction
 */

import type {
    SpwSelector,
    SpwPattern,
    SigilSelector,
    BraceSelector,
} from './types'
import { and, or, not, descend, seq } from './types'

// ── Token types ──────────────────────────────────────────────

type Token =
    | { type: 'sigil'; value: SigilSelector }
    | { type: 'brace'; value: BraceSelector }
    | { type: 'modifier'; value: string }
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }
    | { type: 'pipe' }      // |
    | { type: 'amp' }       // &
    | { type: 'bang_not' }  // not
    | { type: 'slash' }     // /
    | { type: 'dotdot' }    // ..
    | { type: 'at' }        // @ (depth prefix)
    | { type: 'dash' }      // - (depth range separator)
    | { type: 'lparen' }    // (
    | { type: 'rparen' }    // )
    | { type: 'eof' }

// ── Sigil set ────────────────────────────────────────────────

const SIGILS = new Set<string>(['!', '~', '@', '^', '#', '.', '?', '=', '&', '*', '$', '%'])

// ── Tokenizer ────────────────────────────────────────────────

function tokenize(input: string): Token[] {
    const tokens: Token[] = []
    let i = 0

    while (i < input.length) {
        // Skip whitespace
        if (input[i] === ' ' || input[i] === '\t' || input[i] === '\n') {
            i++
            continue
        }

        // Two-char tokens first
        if (input[i] === '<' && input[i + 1] === '>') {
            tokens.push({ type: 'sigil', value: '<>' as SigilSelector })
            i += 2
            continue
        }

        if (input[i] === '.' && input[i + 1] === '.') {
            tokens.push({ type: 'dotdot' })
            i += 2
            continue
        }

        // Brace pairs
        if (input[i] === '[' && input[i + 1] === ']') {
            tokens.push({ type: 'brace', value: '[]' })
            i += 2
            continue
        }
        if (input[i] === '{' && input[i + 1] === '}') {
            tokens.push({ type: 'brace', value: '{}' })
            i += 2
            continue
        }
        if (input[i] === '(' && input[i + 1] === ')') {
            tokens.push({ type: 'brace', value: '()' })
            i += 2
            continue
        }

        // Single char tokens
        if (input[i] === '|') { tokens.push({ type: 'pipe' }); i++; continue }
        if (input[i] === '/') { tokens.push({ type: 'slash' }); i++; continue }
        if (input[i] === '-') { tokens.push({ type: 'dash' }); i++; continue }
        if (input[i] === '(') { tokens.push({ type: 'lparen' }); i++; continue }
        if (input[i] === ')') { tokens.push({ type: 'rparen' }); i++; continue }

        // Sigils — & is both a sigil and an 'amp' combinator
        // Disambiguate: if followed by another sigil or brace or letter, it's a sigil
        if (input[i] === '&') {
            const next = input[i + 1]
            if (next && (SIGILS.has(next) || next === '[' || next === '{' || next === '(' || /[a-zA-Z]/.test(next))) {
                tokens.push({ type: 'sigil', value: '&' })
            } else {
                tokens.push({ type: 'amp' })
            }
            i++
            continue
        }

        // Other sigils
        if (SIGILS.has(input[i])) {
            tokens.push({ type: 'sigil', value: input[i] as SigilSelector })
            i++
            continue
        }

        // Quoted string
        if (input[i] === '"') {
            i++
            let str = ''
            while (i < input.length && input[i] !== '"') {
                if (input[i] === '\\' && i + 1 < input.length) {
                    str += input[i + 1]
                    i += 2
                } else {
                    str += input[i]
                    i++
                }
            }
            if (i < input.length) i++ // skip closing quote
            tokens.push({ type: 'string', value: str })
            continue
        }

        // Numbers
        if (/[0-9]/.test(input[i])) {
            let num = ''
            while (i < input.length && /[0-9]/.test(input[i])) {
                num += input[i]
                i++
            }
            tokens.push({ type: 'number', value: parseInt(num, 10) })
            continue
        }

        // Identifiers (modifiers, keywords)
        if (/[a-zA-Z_]/.test(input[i])) {
            let ident = ''
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                ident += input[i]
                i++
            }
            if (ident === 'not') {
                tokens.push({ type: 'bang_not' })
            } else if (ident === 'or') {
                tokens.push({ type: 'pipe' })
            } else if (ident === 'and') {
                tokens.push({ type: 'amp' })
            } else {
                tokens.push({ type: 'modifier', value: ident })
            }
            continue
        }

        // Unknown character — skip
        i++
    }

    tokens.push({ type: 'eof' })
    return tokens
}

// ── Parser ───────────────────────────────────────────────────

class Parser {
    private pos = 0

    constructor(private tokens: Token[]) { }

    private peek(): Token {
        return this.tokens[this.pos] ?? { type: 'eof' }
    }

    private advance(): Token {
        const tok = this.tokens[this.pos]
        this.pos++
        return tok ?? { type: 'eof' }
    }

    private expect(type: Token['type']): Token {
        const tok = this.peek()
        if (tok.type !== type) {
            throw new SelectorParseError(
                `Expected ${type}, got ${tok.type}`,
                this.pos,
            )
        }
        return this.advance()
    }

    /**
     * expr = pipeline (('|' | 'or') pipeline)*
     */
    parseExpr(): SpwSelector {
        let left = this.parsePipeline()

        while (this.peek().type === 'pipe') {
            this.advance()
            const right = this.parsePipeline()
            left = or(left, right)
        }

        return left
    }

    /**
     * pipeline = term (('/' descend | '..' seq) term)*
     */
    private parsePipeline(): SpwSelector {
        let left = this.parseTerm()

        while (true) {
            const tok = this.peek()
            if (tok.type === 'slash') {
                this.advance()
                const right = this.parseTerm()
                left = descend(left, right)
            } else if (tok.type === 'dotdot') {
                this.advance()
                const right = this.parseTerm()
                left = seq(left, right)
            } else {
                break
            }
        }

        return left
    }

    /**
     * term = factor (('&' | 'and') factor)*
     */
    private parseTerm(): SpwSelector {
        let left = this.parseFactor()

        while (this.peek().type === 'amp') {
            this.advance()
            const right = this.parseFactor()
            left = and(left, right)
        }

        return left
    }

    /**
     * factor = 'not' factor | atom
     */
    private parseFactor(): SpwSelector {
        if (this.peek().type === 'bang_not') {
            this.advance()
            const inner = this.parseFactor()
            return not(inner)
        }

        return this.parseAtom()
    }

    /**
     * atom = sigil braces? modifier? value? depth?
     *      | '(' expr ')'
     *      | modifier (standalone modifier like 'boon')
     */
    private parseAtom(): SpwSelector {
        const tok = this.peek()

        // Grouped expression
        if (tok.type === 'lparen') {
            this.advance()
            const inner = this.parseExpr()
            this.expect('rparen')
            return inner
        }

        // Standalone modifier (e.g., just "boon")
        if (tok.type === 'modifier') {
            const mod = this.advance() as Extract<Token, { type: 'modifier' }>
            return { modifier: mod.value } as SpwPattern
        }

        // Sigil-led pattern
        if (tok.type === 'sigil') {
            const sigil = (this.advance() as Extract<Token, { type: 'sigil' }>).value
            const pattern: SpwPattern = { sigil }

            // Primary brace
            if (this.peek().type === 'brace') {
                pattern.brace = (this.advance() as Extract<Token, { type: 'brace' }>).value
            }

            // Secondary brace
            if (this.peek().type === 'brace') {
                pattern.brace2 = (this.advance() as Extract<Token, { type: 'brace' }>).value
            }

            // Modifier
            if (this.peek().type === 'modifier') {
                pattern.modifier = (this.advance() as Extract<Token, { type: 'modifier' }>).value
            }

            // Value (quoted string)
            if (this.peek().type === 'string') {
                pattern.value = (this.advance() as Extract<Token, { type: 'string' }>).value
            }

            // Depth: @N or @N-M — '@' is tokenized as sigil('@')
            const depthTok = this.peek()
            if (depthTok.type === 'sigil' && (depthTok as Extract<Token, { type: 'sigil' }>).value === '@') {
                this.advance()
                if (this.peek().type === 'number') {
                    const n = (this.advance() as Extract<Token, { type: 'number' }>).value
                    if (this.peek().type === 'dash') {
                        this.advance()
                        const m = (this.expect('number') as Extract<Token, { type: 'number' }>).value
                        pattern.depthRange = [n, m]
                    } else {
                        pattern.depth = n
                    }
                }
            }

            return pattern
        }

        // Standalone brace (no sigil, just [] or {})
        if (tok.type === 'brace') {
            const brace = (this.advance() as Extract<Token, { type: 'brace' }>).value
            return { brace } as SpwPattern
        }

        throw new SelectorParseError(
            `Unexpected token: ${tok.type}`,
            this.pos,
        )
    }
}

// ── Error class ──────────────────────────────────────────────

export class SelectorParseError extends Error {
    constructor(
        message: string,
        public readonly position: number,
    ) {
        super(`SelectorParseError at position ${position}: ${message}`)
        this.name = 'SelectorParseError'
    }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Parse a Spw selector expression string into a SpwSelector object.
 *
 * @example
 * parseSelector('^[]')        // { sigil: '^', brace: '[]' }
 * parseSelector('~ | @')      // or({ sigil: '~' }, { sigil: '@' })
 * parseSelector('^[] / ![]')  // descend({ sigil: '^', brace: '[]' }, { sigil: '!', brace: '[]' })
 * parseSelector('!boon')      // { sigil: '!', modifier: 'boon' }
 * parseSelector('~"./path"')  // { sigil: '~', value: './path' }
 * parseSelector('not ^[]')    // not({ sigil: '^', brace: '[]' })
 */
export function parseSelector(input: string): SpwSelector {
    const tokens = tokenize(input)
    const parser = new Parser(tokens)
    const result = parser.parseExpr()
    return result
}

/**
 * Try to parse a selector expression. Returns null on failure
 * instead of throwing.
 */
export function tryParseSelector(input: string): SpwSelector | null {
    try {
        return parseSelector(input)
    } catch {
        return null
    }
}

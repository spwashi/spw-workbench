/**
 * Closed text parser for the experimental Spw.q selector surface.
 *
 * Candidate contract: `docs/design/spw-q-candidate-spec.md`.
 * Status remains experimental; promotion requires semantic fingerprints,
 * migration fixtures, and compatibility gates in addition to syntax goldens.
 *
 * `$` opens the query envelope and `_` is its anonymous placeholder:
 *
 *   $@_       references
 *   $![_]     hydrate operations carrying a Frame
 *   $<_>      Capsule boundaries
 *   $_        any node
 *
 * Bare sigil atoms (`@`, `![]`) retain their legacy projections. Standalone
 * boundary atoms select the boundary node itself.
 *
 * Candidate gaps still open in this experimental surface (fail closed when added):
 *   - `?name:$atom` captures (programmatic `capture()` exists)
 *   - comma-driven `(A, B)` sequences (programmatic `seq()` + match slots exist)
 *   - composite marks `$~#name`, `$#>name`, `$#:name`, `$#!name`
 *   - valence-only modifiers (bone|boon|bane|bonk|honk); non-valence → label
 *   - child combinator `A > B` (descendant `/` already works)
 *   - caret diagnostics (line/column), not offset-only errors
 *
 * Reserved: `..` range/slice, `>>` stream. Spaced `&` is conjunction; bare `&` is integrate.
 *
 * @spw:surface:query[system=selector-expr,semantic=prolog|sql|css,status=experimental] - Selector expressions are a user-facing query surface
 * @spw:portable:seed[layer=query,system=selector-engine,extract=candidate,basis=no-dom|pure-data] - No DOM or app-specific imports allowed
 * @spw:seed:starter[system=selector-engine,extract=candidate,next=match,density=sparse] - Strong sparse starting point for later query extraction
 */

import type {
  AttachedBoundarySelector,
  BoundarySelector,
  SigilSelector,
  SpwPattern,
  SpwSelector,
} from './types'
import { and, anyNode, descend, not, or } from './types'
import { assertSpwSelector } from './validate'
import { readDecodedQuotedValue } from './quoted'

export class SelectorParseError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(`SelectorParseError at character ${position}: ${message}`)
    this.name = 'SelectorParseError'
  }
}

type LocatedToken = { offset: number }

type Token = LocatedToken & (
  | { type: 'sigil'; value: SigilSelector }
  | { type: 'boundary'; kind: BoundarySelector; value?: string; placeholder: boolean }
  | { type: 'modifier'; value: string }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'query' }
  | { type: 'placeholder' }
  | { type: 'any' }
  | { type: 'pipe' }
  | { type: 'amp' }
  | { type: 'bang_not' }
  | { type: 'slash' }
  | { type: 'dash' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'eof' }
)

const SIGILS = new Set<string>([
  '!', '~', '@', '^', '#', '.', '?', '=', '&', '*', '$', '%', '<>',
])

interface BoundaryLexeme {
  kind: BoundarySelector
  open: string
  close: string
  allowValue: boolean
}

const BOUNDARY_LEXEMES: readonly BoundaryLexeme[] = [
  { kind: 'stream', open: '<<', close: '>>', allowValue: true },
  { kind: 'nrange', open: '((', close: '))', allowValue: true },
  { kind: 'frame', open: '[', close: ']', allowValue: true },
  { kind: 'body', open: '{', close: '}', allowValue: true },
  { kind: 'capsule', open: '<', close: '>', allowValue: true },
  // A non-empty `(expr)` is grouping. `()` and `(_)` remain Scope selectors.
  { kind: 'scope', open: '(', close: ')', allowValue: false },
]

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let offset = 0

  while (offset < input.length) {
    const char = input[offset]
    if (isWhitespace(char)) {
      offset += 1
      continue
    }

    if (input.startsWith('..', offset)) {
      throw new SelectorParseError(
        '`..` is reserved for range and slice selectors; ordered query spelling is not assigned',
        offset,
      )
    }

    if (input.startsWith('<>', offset)) {
      tokens.push({ type: 'sigil', value: '<>', offset })
      offset += 2
      continue
    }

    if (
      char === '$'
      && tokens[tokens.length - 1]?.type !== 'query'
      && startsQueryEnvelope(input, offset + 1)
    ) {
      tokens.push({ type: 'query', offset })
      offset += 1
      continue
    }

    const boundary = readBoundary(
      input,
      offset,
      tokens[tokens.length - 1]?.type === 'query',
    )
    if (boundary) {
      tokens.push(boundary.token)
      offset = boundary.nextOffset
      continue
    }

    if (char === '|') {
      tokens.push({ type: 'pipe', offset })
      offset += 1
      continue
    }
    if (char === '/') {
      tokens.push({ type: 'slash', offset })
      offset += 1
      continue
    }
    if (char === '-') {
      tokens.push({ type: 'dash', offset })
      offset += 1
      continue
    }
    if (char === '(') {
      tokens.push({ type: 'lparen', offset })
      offset += 1
      continue
    }
    if (char === ')') {
      tokens.push({ type: 'rparen', offset })
      offset += 1
      continue
    }
    if (char === '_') {
      tokens.push({ type: 'placeholder', offset })
      offset += 1
      continue
    }

    if (char === '&') {
      if (isSymbolicAnd(input, offset, tokens)) {
        tokens.push({ type: 'amp', offset })
      } else {
        tokens.push({ type: 'sigil', value: '&', offset })
      }
      offset += 1
      continue
    }

    if (SIGILS.has(char)) {
      tokens.push({ type: 'sigil', value: char as SigilSelector, offset })
      offset += 1
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      const quoted = readQuoted(input, offset)
      tokens.push({ type: 'string', value: quoted.value, offset })
      offset = quoted.nextOffset
      continue
    }

    if (/[0-9]/.test(char)) {
      let end = offset + 1
      while (end < input.length && /[0-9]/.test(input[end])) end += 1
      tokens.push({ type: 'number', value: Number(input.slice(offset, end)), offset })
      offset = end
      continue
    }

    if (/[A-Za-z]/.test(char)) {
      let end = offset + 1
      while (end < input.length && /[A-Za-z0-9_]/.test(input[end])) end += 1
      const value = input.slice(offset, end)
      if (value === 'not') tokens.push({ type: 'bang_not', offset })
      else if (value === 'or') tokens.push({ type: 'pipe', offset })
      else if (value === 'and') tokens.push({ type: 'amp', offset })
      else if (value === 'any') tokens.push({ type: 'any', offset })
      else tokens.push({ type: 'modifier', value, offset })
      offset = end
      continue
    }

    throw new SelectorParseError(`Unexpected character ${JSON.stringify(char)}`, offset)
  }

  tokens.push({ type: 'eof', offset: input.length })
  return tokens
}

function startsQueryEnvelope(input: string, from: number): boolean {
  let offset = from
  while (offset < input.length && isWhitespace(input[offset])) offset += 1
  if (offset >= input.length) return false
  if (input[offset] === '_') return true
  if (input.startsWith('<>', offset)) return true
  if (SIGILS.has(input[offset])) return true
  return BOUNDARY_LEXEMES.some(({ open }) => input.startsWith(open, offset))
}

function readBoundary(
  input: string,
  offset: number,
  allowScopedValue = false,
): { token: Token; nextOffset: number } | null {
  for (const lexeme of BOUNDARY_LEXEMES) {
    if (!input.startsWith(lexeme.open, offset)) continue
    if (lexeme.kind === 'capsule' && input.startsWith('<>', offset)) continue

    const contentStart = offset + lexeme.open.length
    const closeOffset = findUnquotedClose(input, contentStart, lexeme.close)
    if (closeOffset < 0) {
      // A single `(` may still be a grouped expression whose close is reported
      // by the parser. Other boundary openings are unambiguously incomplete.
      if (lexeme.kind === 'scope' || lexeme.kind === 'nrange') return null
      throw new SelectorParseError(`Unterminated ${lexeme.kind} boundary selector`, offset)
    }

    const rawContent = input.slice(contentStart, closeOffset).trim()
    const interior = parseBoundaryInterior(
      rawContent,
      contentStart,
      lexeme.allowValue || (lexeme.kind === 'scope' && allowScopedValue),
    )
    if (!interior.accepted) {
      if (lexeme.kind === 'scope' || lexeme.kind === 'nrange') return null
      throw new SelectorParseError(
        `${lexeme.kind} selector interior must be empty, _, an identifier, or one quoted literal`,
        contentStart,
      )
    }

    return {
      token: {
        type: 'boundary',
        kind: lexeme.kind,
        placeholder: interior.placeholder,
        ...(interior.value === undefined ? {} : { value: interior.value }),
        offset,
      },
      nextOffset: closeOffset + lexeme.close.length,
    }
  }
  return null
}

function findUnquotedClose(input: string, from: number, close: string): number {
  let quote: string | null = null
  let escaped = false
  for (let offset = from; offset < input.length; offset += 1) {
    const char = input[offset]
    if (escaped) {
      escaped = false
      continue
    }
    if (quote && char === '\\') {
      escaped = true
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = quote === char ? null : quote ?? char
      continue
    }
    if (!quote && input.startsWith(close, offset)) return offset
  }
  return -1
}

function parseBoundaryInterior(
  raw: string,
  offset: number,
  allowValue: boolean,
): { accepted: boolean; value?: string; placeholder: boolean } {
  if (raw === '') return { accepted: true, placeholder: false }
  if (raw === '_') return { accepted: true, placeholder: true }
  if (!allowValue) return { accepted: false, placeholder: false }
  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(raw)) {
    return { accepted: true, value: raw, placeholder: false }
  }
  if (
    raw.length >= 2
    && (raw[0] === '"' || raw[0] === "'" || raw[0] === '`')
    && raw[raw.length - 1] === raw[0]
  ) {
    const quoted = readQuoted(raw, 0)
    if (quoted.nextOffset !== raw.length) {
      throw new SelectorParseError('Boundary literal must consume its interior', offset)
    }
    return { accepted: true, value: quoted.value, placeholder: false }
  }
  return { accepted: false, placeholder: false }
}

function readQuoted(input: string, offset: number): { value: string; nextOffset: number } {
  const decoded = readDecodedQuotedValue(input, offset)
  if (decoded) return decoded
  throw new SelectorParseError('Unterminated quoted literal', offset)
}

function isSymbolicAnd(input: string, offset: number, tokens: Token[]): boolean {
  const previous = tokens[tokens.length - 1]
  if (
    !previous
    || previous.type === 'query'
    || previous.type === 'pipe'
    || previous.type === 'amp'
    || previous.type === 'bang_not'
    || previous.type === 'slash'
    || previous.type === 'lparen'
  ) {
    return false
  }
  const hasSpaceBefore = offset > 0 && isWhitespace(input[offset - 1])
  const hasSpaceAfter = offset + 1 < input.length && isWhitespace(input[offset + 1])
  return hasSpaceBefore && hasSpaceAfter
}

function isWhitespace(char: string | undefined): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r'
}

class Parser {
  private position = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): SpwSelector {
    const selector = this.parseExpression()
    this.expect('eof')
    assertSpwSelector(selector)
    return selector
  }

  private peek(): Token {
    return this.tokens[this.position] ?? this.tokens[this.tokens.length - 1]!
  }

  private advance(): Token {
    const token = this.peek()
    this.position += 1
    return token
  }

  private expect<T extends Token['type']>(type: T): Extract<Token, { type: T }> {
    const token = this.peek()
    if (token.type !== type) {
      throw new SelectorParseError(`Expected ${type}, got ${token.type}`, token.offset)
    }
    return this.advance() as Extract<Token, { type: T }>
  }

  private parseExpression(): SpwSelector {
    let left = this.parsePipeline()
    while (this.peek().type === 'pipe') {
      this.advance()
      left = or(left, this.parsePipeline())
    }
    return left
  }

  private parsePipeline(): SpwSelector {
    let left = this.parseTerm()
    while (this.peek().type === 'slash') {
      this.advance()
      left = descend(left, this.parseTerm())
    }
    return left
  }

  private parseTerm(): SpwSelector {
    let left = this.parseFactor()
    while (this.peek().type === 'amp') {
      this.advance()
      left = and(left, this.parseFactor())
    }
    return left
  }

  private parseFactor(): SpwSelector {
    if (this.peek().type === 'bang_not') {
      this.advance()
      return not(this.parseFactor())
    }
    return this.parseAtom()
  }

  private parseAtom(): SpwSelector {
    const token = this.peek()
    if (token.type === 'query') {
      this.advance()
      return this.parseQueryAtom()
    }
    if (token.type === 'any') {
      this.advance()
      return anyNode()
    }
    if (token.type === 'lparen') {
      this.advance()
      const selector = this.parseExpression()
      this.expect('rparen')
      return selector
    }
    if (token.type === 'modifier') {
      this.advance()
      return { modifier: token.value }
    }
    if (token.type === 'sigil') return this.parseSigilPattern(false)
    if (token.type === 'boundary') return this.parseBoundaryPattern()

    throw new SelectorParseError(`Unexpected token ${token.type}`, token.offset)
  }

  private parseQueryAtom(): SpwSelector {
    const token = this.peek()
    if (token.type === 'placeholder' || token.type === 'any') {
      this.advance()
      return token.type === 'placeholder'
        ? { any: true, placeholder: true }
        : anyNode()
    }
    if (token.type === 'sigil') return this.parseSigilPattern(true)
    if (token.type === 'boundary') return this.parseBoundaryPattern()
    throw new SelectorParseError('Query envelope requires a sigil, boundary, or _', token.offset)
  }

  private parseBoundaryPattern(): SpwPattern {
    const boundary = this.expect('boundary')
    return {
      boundary: boundary.kind,
      ...(boundary.value === undefined ? {} : { value: boundary.value }),
      ...(boundary.placeholder ? { placeholder: true as const } : {}),
    }
  }

  private parseSigilPattern(queryEnvelope: boolean): SpwPattern {
    const sigil = this.expect('sigil')
    const pattern: SpwPattern = { sigil: sigil.value }
    const withBoundaries: AttachedBoundarySelector[] = []
    let anonymousPlaceholder = false

    while (this.peek().type === 'boundary') {
      const boundary = this.expect('boundary')
      if (!isAttachedBoundary(boundary.kind)) {
        throw new SelectorParseError(
          `${boundary.kind} is a direct boundary selector, not an attachable operation boundary`,
          boundary.offset,
        )
      }
      if (withBoundaries.includes(boundary.kind)) {
        throw new SelectorParseError(`Duplicate ${boundary.kind} boundary selector`, boundary.offset)
      }
      withBoundaries.push(boundary.kind)
      anonymousPlaceholder ||= boundary.placeholder
      if (boundary.value !== undefined) {
        throw new SelectorParseError(
          'Attached boundary literal matching is unassigned; select the boundary node directly',
          boundary.offset,
        )
      }
    }
    if (withBoundaries.length > 0) {
      if (queryEnvelope) {
        pattern.withBoundaries = withBoundaries
      } else {
        pattern.brace = braceSurface(withBoundaries[0])
        if (withBoundaries[1]) pattern.brace2 = braceSurface(withBoundaries[1])
      }
    }

    if (this.peek().type === 'modifier') {
      pattern.modifier = this.expect('modifier').value
    }
    let hasValueSurface = false
    if (this.peek().type === 'string') {
      const literal = this.expect('string').value
      hasValueSurface = true
      if (queryEnvelope && literal === '_') anonymousPlaceholder = true
      else pattern.value = literal
    }
    if (this.peek().type === 'placeholder') {
      this.advance()
      anonymousPlaceholder = true
    }

    if (anonymousPlaceholder) pattern.placeholder = true

    if (queryEnvelope) {
      if (
        sigil.value === '@'
        && withBoundaries.length === 0
        && pattern.modifier === undefined
      ) pattern.nodeType = 'Reference'
      else if (sigil.value === '~' && hasValueSurface) pattern.nodeType = 'PathRef'
      else pattern.nodeType = 'Operation'
    }

    const depth = this.peek()
    if (depth.type === 'sigil' && depth.value === '@') {
      this.advance()
      const minimum = this.expect('number')
      if (this.peek().type === 'dash') {
        this.advance()
        const maximum = this.expect('number')
        if (maximum.value < minimum.value) {
          throw new SelectorParseError('Depth range must be ascending', maximum.offset)
        }
        pattern.depthRange = [minimum.value, maximum.value]
      } else {
        pattern.depth = minimum.value
      }
    }

    return pattern
  }
}

function isAttachedBoundary(kind: BoundarySelector): kind is AttachedBoundarySelector {
  return kind === 'frame' || kind === 'body'
}

function braceSurface(kind: AttachedBoundarySelector): '[]' | '{}' {
  return kind === 'frame' ? '[]' : '{}'
}

/** Parse a selector only when every character belongs to the closed grammar. */
export function parseSelector(input: string): SpwSelector {
  return new Parser(tokenize(input)).parse()
}

export function tryParseSelector(input: string): SpwSelector | null {
  try {
    return parseSelector(input)
  } catch {
    return null
  }
}

/**
 * Lite scanner — the browser-shaped reader for Spw surfaces.
 *
 * This is a *scanner*, not the parser. It recognizes the lexical vocabulary
 * (sigils, bounds, quoted forms, particles) and nothing above it: no AST, no
 * combinators, no event stream, no backtracking. Consumers that only need to
 * colour a surface or measure its geometry get that here without pulling the
 * compiler into a client bundle.
 *
 * The vocabulary is *the same vocabulary* — SPW_OPERATORS and the bound table
 * are asserted against the full lexer's maps in scan.test.ts, so this cannot
 * quietly diverge into a fifth dialect the way ad-hoc inline regexes do.
 *
 * Zero imports on purpose. Anything imported here lands in every consumer's
 * bundle, and the point of this file is that almost nothing does.
 *
 * @see ../lexer/matchers — the full lexer this mirrors a subset of
 */

/** Sigils, longest-match first so `<>` beats `<`. */
export const SPW_OPERATORS = [
  '<>',
  '!', '^', '~', '?', '*', '=', '@', '#', '.', '&', '$', '%',
] as const

/** Aims that make `#⟨aim⟩name` a particle rather than a bare `#` operator. */
export const SPW_PARTICLE_AIMS = ['>', ':', '!'] as const

/** Paired bounds, longest-match first so `<<` beats `<` and `((` beats `(`. */
export const SPW_BOUNDS = [
  ['<<', '>>', 'stream'],
  ['((', '))', 'nrange'],
  ['(', ')', 'scope'],
  ['[', ']', 'frame'],
  ['{', '}', 'body'],
  ['<', '>', 'capsule'],
] as const

export type LiteBoundKind = (typeof SPW_BOUNDS)[number][2]

export type LiteTokenKind =
  | 'operator'
  | 'annotation'
  | 'particle'
  | 'open'
  | 'close'
  | 'string'
  | 'phrase'
  | 'comment'
  | 'arrow'
  | 'connector'
  | 'number'
  | 'identifier'
  | 'space'
  | 'other'

export interface LiteToken {
  kind: LiteTokenKind
  value: string
  start: number
  end: number
  /** Bound family, when kind is `open` or `close`. */
  bound?: LiteBoundKind
}

const CONNECTORS = ['..', '->', '|', '/', '+']
const IDENT_START = /[A-Za-z_]/
/** Dots and hyphens continue a name: `register.bank_size` is one identifier. */
const IDENT_BODY = /[A-Za-z0-9_.-]/
/** Particle names stop at a dot — `#:layer` is the particle, `.x` is not. */
const PARTICLE_BODY = /[A-Za-z0-9_-]/
const DIGIT = /[0-9]/
const SPACE = /\s/

/**
 * Scan `source` into flat tokens.
 *
 * Never throws and never fails: an unrecognized byte becomes an `other` token
 * so a partially written surface still colours. Offsets are absolute into
 * `source`, so callers can slice without re-deriving positions.
 */
export function scan(source: string): LiteToken[] {
  const out: LiteToken[] = []
  const n = source.length
  let i = 0

  const push = (kind: LiteTokenKind, start: number, end: number, bound?: LiteBoundKind) => {
    const tok: LiteToken = { kind, value: source.slice(start, end), start, end }
    if (bound) tok.bound = bound
    out.push(tok)
  }

  while (i < n) {
    const ch = source[i]!
    const start = i

    if (SPACE.test(ch)) {
      while (i < n && SPACE.test(source[i]!)) i++
      push('space', start, i)
      continue
    }

    // `//` line comments (same as full lexer).
    if (ch === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') i++
      push('comment', start, i)
      continue
    }

    // Hash-prose titles: `# …` to EOL when `#` is followed by whitespace or EOL.
    // Structural forms (`#:layer`, `#>id`, `#[…]`, `#{…}`, bare `#yes`) stay operators/particles.
    if (ch === '#') {
      const next = source[i + 1]
      if (
        next === undefined ||
        next === ' ' ||
        next === '\t' ||
        next === '\n' ||
        next === '\r'
      ) {
        i++
        while (i < n && source[i] !== '\n') i++
        push('comment', start, i)
        continue
      }
    }

    if (ch === '"' || ch === "'") {
      i = scanQuoted(source, i, ch)
      push('string', start, i)
      continue
    }

    if (ch === '`') {
      i = scanQuoted(source, i, '`')
      push('phrase', start, i)
      continue
    }

    if (ch === '=' && source[i + 1] === '>') {
      i += 2
      push('arrow', start, i)
      continue
    }

    // `~#name` is one annotation, as in the full lexer. Appositions (`~#(…)`)
    // are not modelled — they need balanced-paren scanning, and this file's
    // budget is the reason it exists.
    if (ch === '~' && source[i + 1] === '#' && IDENT_START.test(source[i + 2] ?? '')) {
      i += 2
      while (i < n && PARTICLE_BODY.test(source[i]!)) i++
      push('annotation', start, i)
      continue
    }

    // Particles before operators: `#>name` is one token, not `#` then `>name`.
    if (ch === '#' && isParticleAt(source, i)) {
      i += 2
      while (i < n && PARTICLE_BODY.test(source[i]!)) i++
      push('particle', start, i)
      continue
    }

    // Operators before bounds, as the full lexer does: `<>` is the concept
    // operator and must win over the `<` capsule open.
    const op = matchOperator(source, i)
    if (op) {
      i += op.length
      push('operator', start, i)
      continue
    }

    const bound = matchBound(source, i)
    if (bound) {
      i += bound.text.length
      push(bound.closing ? 'close' : 'open', start, i, bound.kind)
      continue
    }

    const conn = matchConnector(source, i)
    if (conn) {
      i += conn.length
      push('connector', start, i)
      continue
    }

    if (DIGIT.test(ch)) {
      while (i < n && (DIGIT.test(source[i]!) || source[i] === '.')) i++
      push('number', start, i)
      continue
    }

    if (IDENT_START.test(ch)) {
      while (i < n && IDENT_BODY.test(source[i]!)) i++
      push('identifier', start, i)
      continue
    }

    i++
    push('other', start, i)
  }

  return out
}

function scanQuoted(source: string, from: number, quote: string): number {
  let i = from + 1
  while (i < source.length) {
    const c = source[i]!
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === quote) return i + 1
    // Quotes do not span lines; an unterminated one ends at the newline so a
    // single stray quote cannot swallow the rest of the surface.
    if (c === '\n') return i
    i++
  }
  return i
}

function isParticleAt(source: string, i: number): boolean {
  const aim = source[i + 1]
  if (!aim || !(SPW_PARTICLE_AIMS as readonly string[]).includes(aim)) return false
  const next = source[i + 2]
  return next !== undefined && IDENT_START.test(next)
}

function matchBound(
  source: string,
  i: number,
): { text: string; kind: LiteBoundKind; closing: boolean } | null {
  for (const [open, close, kind] of SPW_BOUNDS) {
    if (source.startsWith(open, i)) return { text: open, kind, closing: false }
    if (source.startsWith(close, i)) return { text: close, kind, closing: true }
  }
  return null
}

function matchOperator(source: string, i: number): string | null {
  for (const op of SPW_OPERATORS) {
    if (source.startsWith(op, i)) return op
  }
  return null
}

function matchConnector(source: string, i: number): string | null {
  for (const conn of CONNECTORS) {
    if (source.startsWith(conn, i)) return conn
  }
  return null
}

export interface LiteGeometry {
  /** Sigil counts, e.g. `{ '&': 12, '^': 3 }`. */
  operators: Record<string, number>
  /** Opens seen per bound family. */
  bounds: Record<LiteBoundKind, number>
  /** Deepest nesting of paired bounds. */
  maxDepth: number
  /** Opens minus closes; non-zero means the surface is unbalanced. */
  balance: number
  tokens: number
}

const ZERO_BOUNDS = (): Record<LiteBoundKind, number> => ({
  stream: 0,
  nrange: 0,
  scope: 0,
  frame: 0,
  body: 0,
  capsule: 0,
})

/**
 * Measure a surface's shape without building a tree.
 *
 * What `spw geometry` reports, minus everything that needs the parser — enough
 * for a runtime module to size, colour, or lay out an expression.
 */
export function scanGeometry(source: string): LiteGeometry {
  const operators: Record<string, number> = {}
  const bounds = ZERO_BOUNDS()
  let depth = 0
  let maxDepth = 0
  let balance = 0
  let tokens = 0

  for (const tok of scan(source)) {
    if (tok.kind === 'space') continue
    tokens++
    if (tok.kind === 'operator') {
      operators[tok.value] = (operators[tok.value] ?? 0) + 1
      continue
    }
    // A census counts sigils by the role they play, and the sigils folded into
    // an annotation or particle are still operators doing operator work.
    if (tok.kind === 'annotation' || tok.kind === 'particle') {
      for (const ch of tok.value) {
        if ((SPW_OPERATORS as readonly string[]).includes(ch)) {
          operators[ch] = (operators[ch] ?? 0) + 1
        }
      }
      continue
    }
    if (tok.kind === 'open' && tok.bound) {
      bounds[tok.bound]++
      depth++
      balance++
      if (depth > maxDepth) maxDepth = depth
      continue
    }
    if (tok.kind === 'close') {
      depth = Math.max(0, depth - 1)
      balance--
    }
  }

  return { operators, bounds, maxDepth, balance, tokens }
}

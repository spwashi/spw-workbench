/**
 * Detect Spw dialect markers from source text (header / pragma).
 * Path-based defaults live in syntax-stack.ts.
 */

import {
  DEFAULT_DIALECT,
  DIALECT_IDS,
  type DialectDetection,
  type DialectId,
} from './types'

/** Match @profile:Spw.b or @profile:Spw.b~#[flags] inside seed / free text. */
const PROFILE_AT = /@profile\s*:\s*(Spw\.[blmxqfpt])\b/i

/** Match dialect: Spw.l or @dialect:Spw.l */
const DIALECT_AT = /@dialect\s*:\s*(Spw\.[blmxqfpt])\b/i

/** Match #:dialect Spw.q or #:dialect #!Spw.q */
const DIALECT_PRAGMA = /#:\s*dialect\b[^\n]*?(Spw\.[blmxqfpt])\b/i

/** Match ^seed[… @profile:Spw.b …] on early lines */
const SEED_HEAD = /^\s*\^seed\[[^\]]{0,400}\]/m

const ALLOWED = new Set<string>(DIALECT_IDS.map(d => d.toLowerCase()))

function normalizeDialectId(raw: string): DialectId | undefined {
  const key = raw.trim()
  // Preserve Spw.X casing
  const canon = DIALECT_IDS.find(d => d.toLowerCase() === key.toLowerCase())
  return canon
}

/**
 * Detect dialect from source. Header/pragma win; else default Spw.b.
 * Does not consult filesystem paths — use resolveSurfaceProfile for stacks.
 */
export function detectDialect(source: string): DialectDetection {
  const head = source.slice(0, Math.min(source.length, 4096))

  // Prefer explicit @dialect
  const dAt = DIALECT_AT.exec(head)
  if (dAt?.[1]) {
    const id = normalizeDialectId(dAt[1])
    if (id) {
      return {
        id,
        source: 'pragma',
        raw: dAt[0],
        spanHint: { start: dAt.index, end: dAt.index + dAt[0].length },
      }
    }
  }

  const pragma = DIALECT_PRAGMA.exec(head)
  if (pragma?.[1]) {
    const id = normalizeDialectId(pragma[1])
    if (id) {
      return {
        id,
        source: 'pragma',
        raw: pragma[0],
        spanHint: { start: pragma.index, end: pragma.index + pragma[0].length },
      }
    }
  }

  // @profile:Spw.* (seed header or free)
  const seed = SEED_HEAD.exec(head)
  const searchIn = seed ? seed[0]! : head
  const searchBase = seed ? seed.index : 0
  const pAt = PROFILE_AT.exec(searchIn)
  if (pAt?.[1]) {
    const id = normalizeDialectId(pAt[1])
    if (id) {
      const start = searchBase + pAt.index
      return {
        id,
        source: 'header',
        raw: pAt[0],
        spanHint: { start, end: start + pAt[0].length },
      }
    }
  }

  // Anywhere in head (fallback)
  const any = PROFILE_AT.exec(head)
  if (any?.[1]) {
    const id = normalizeDialectId(any[1])
    if (id) {
      return {
        id,
        source: 'header',
        raw: any[0],
        spanHint: { start: any.index, end: any.index + any[0].length },
      }
    }
  }

  return { id: DEFAULT_DIALECT, source: 'default' }
}

/** True when string is a known DialectId. */
export function isDialectId(value: string): value is DialectId {
  return ALLOWED.has(value.toLowerCase())
}

/**
 * Apply dialect metasyntax preprocess (currently newline-as-space for l/q).
 * Returns possibly rewritten source; original hash identity is caller's concern.
 */
export function applyDialectPreprocess(
  source: string,
  dialect: DialectId,
  newlineAsSpace: boolean,
): string {
  if (!newlineAsSpace) return source
  if (dialect !== 'Spw.l' && dialect !== 'Spw.q') return source
  // Preserve # line comments: only collapse newlines outside of full-line comments is hard;
  // for query/line dialect, collapse all newlines to single spaces (documented tradeoff).
  return source.replace(/\r\n/g, '\n').replace(/\n+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim() + '\n'
}

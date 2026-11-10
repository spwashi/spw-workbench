/**
 * Register stamps: the `[reg=name]` a writer sets after a closing bracket.
 *
 * A stamp is read from tokens, so one inside a string or a phrase is not a
 * stamp. Each stamp is compared with the shape its bracket already says: a
 * brace closes a facet, a square bracket a set, a stream a stream, a paren a
 * scope, an angle a capsule (the same words the normal form uses, onf.ts). A
 * stamp that names that shape restates it; any other stamp informs, and is the
 * only kind a reader can learn something from.
 *
 * What an informing register means (a voice, a sink, a phase, an authority) is
 * an open trial: interpretation-trials, wonder_trial_register. This module
 * reads stamps and tells the two kinds apart; it gives no register a meaning.
 */

import { lex } from '../lexer/lex'
import type { Token } from '../types'

export const REGISTER_STAMP_CONTRACT = 'register.stamp/1'

/** The bracket a stamp sits against, or null when it follows something else. */
export type StampedCloser = '}' | ']' | ')' | '>' | '>>'

/** The shape each closing bracket already says, in the normal form's words. */
export const REGISTER_OF_CLOSER: Readonly<Record<StampedCloser, string>> = Object.freeze({
  '}': 'facet',
  ']': 'set',
  ')': 'scope',
  '>': 'capsule',
  '>>': 'stream',
})

export interface RegisterStamp {
  /** The register named: facet in `[reg=facet]`. */
  name: string
  /** The closing bracket the stamp is written against, if any. */
  closes: StampedCloser | null
  /** The shape that bracket already says, if any. */
  shape: string | null
  /** Whether the stamp only repeats its bracket's shape. */
  restates: boolean
  /** Other pairs in the same stamp: tier in `[reg=facet, tier=warm]`. */
  also: Record<string, string>
  /** 1-based line of the stamp's opening bracket. */
  line: number
  /** Offsets of the stamp in the source, brackets included. */
  start: number
  end: number
}

export interface RegisterStampSummary {
  contract: typeof REGISTER_STAMP_CONTRACT
  total: number
  restating: number
  informing: number
  /** How many stamps name each register, restating or not. */
  names: Record<string, number>
  /** How many informing stamps name each register. */
  informingNames: Record<string, number>
  /** Stamps that follow no closing bracket. */
  detached: number
}

const SKIPPED = new Set(['WHITESPACE', 'NEWLINE', 'COMMENT'])
const VALUE_TYPES = new Set(['IDENTIFIER', 'NUMBER', 'MODIFIER', 'BOOLEAN'])

function closerOf(token: Token | undefined): StampedCloser | null {
  if (!token) return null
  const closing = token.type === 'CONTAINER_CLOSE' || token.type === 'CAPSULE_CLOSE' || token.type === 'STREAM_CLOSE'
  return closing && token.value in REGISTER_OF_CLOSER ? (token.value as StampedCloser) : null
}

/** The pairs of a stamp opening at `open`, and the index of its closing bracket; null when it is not a stamp. */
function pairsAt(tokens: Token[], open: number): { pairs: Array<[string, string]>; close: number } | null {
  const pairs: Array<[string, string]> = []
  let at = open + 1
  const next = (): Token | undefined => {
    while (at < tokens.length && SKIPPED.has(tokens[at]!.type)) at++
    return tokens[at]
  }
  for (;;) {
    const key = next()
    if (key?.type !== 'IDENTIFIER') return null
    at++
    const equals = next()
    if (equals?.type !== 'OPERATOR' || equals.value !== '=') return null
    at++
    const value = next()
    if (!value || !VALUE_TYPES.has(value.type)) return null
    at++
    pairs.push([String(key.value), String(value.value)])
    const after = next()
    if (after?.type === 'CONTAINER_CLOSE' && after.value === ']') return { pairs, close: at }
    if (after?.type !== 'COMMA') return null
    at++
  }
}

/** Every register stamp in `source`, in order. Total: text that does not lex yields no stamps. */
export function readRegisterStamps(source: string): RegisterStamp[] {
  let tokens: Token[]
  try {
    tokens = lex(source).tokens
  } catch {
    return []
  }
  const stamps: RegisterStamp[] = []
  for (let index = 0; index < tokens.length; index++) {
    const open = tokens[index]!
    if (open.type !== 'CONTAINER_OPEN' || open.value !== '[') continue
    const read = pairsAt(tokens, index)
    if (!read || read.pairs[0]?.[0] !== 'reg') continue
    const closes = closerOf(tokens[index - 1])
    const shape = closes ? REGISTER_OF_CLOSER[closes] : null
    const name = read.pairs[0][1]
    stamps.push({
      name,
      closes,
      shape,
      restates: shape !== null && shape === name,
      also: Object.fromEntries(read.pairs.slice(1)),
      line: open.span.start.line,
      start: open.span.start.offset,
      end: tokens[read.close]!.span.end.offset,
    })
    index = read.close
  }
  return stamps
}

export function summarizeRegisterStamps(stamps: ReadonlyArray<RegisterStamp>): RegisterStampSummary {
  const names: Record<string, number> = {}
  const informingNames: Record<string, number> = {}
  let restating = 0
  let detached = 0
  for (const stamp of stamps) {
    names[stamp.name] = (names[stamp.name] ?? 0) + 1
    if (stamp.restates) restating++
    else informingNames[stamp.name] = (informingNames[stamp.name] ?? 0) + 1
    if (!stamp.closes) detached++
  }
  return {
    contract: REGISTER_STAMP_CONTRACT,
    total: stamps.length,
    restating,
    informing: stamps.length - restating,
    names,
    informingNames,
    detached,
  }
}

/**
 * The source with every restating stamp removed and every other byte as written.
 * Informing and detached stamps stay. Removing twice removes nothing more.
 */
export function withoutRestatingStamps(source: string): { text: string; removed: number } {
  const restating = readRegisterStamps(source).filter(stamp => stamp.restates)
  let text = ''
  let from = 0
  for (const stamp of restating) {
    text += source.slice(from, stamp.start)
    from = stamp.end
  }
  return { text: text + source.slice(from), removed: restating.length }
}

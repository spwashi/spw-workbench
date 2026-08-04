/**
 * Comment Matchers
 *
 * Spw has no block comments. `/` is unassigned in the operator lattice, so
 * `/*` must not open anything — a stray one used to swallow the rest of a
 * surface silently. Prose titles use `# ` (hash + space) line comments so
 * narrative headers do not collide with operator `#`, particles `#:`/`#>`,
 * or set forms `#[…]`. Inline notes also use `//` or annotations.
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, peekString, isAtEnd } from '../state'

/**
 * Match line comment: // ...
 */
export function* matchLineComment(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peekString(state, 2) !== '//') return null

  const start = getPosition(state)
  let value = '//'
  advance(state, 2)

  while (!isAtEnd(state) && peek(state) !== '\n') {
    value += peek(state)
    advance(state)
  }

  const token: Token<'COMMENT'> = {
    type: 'COMMENT',
    value,
    span: { start, end: getPosition(state) },
    kind: 'line',
  }

  yield {
    type: 'token',
    rule: 'lineComment',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

/**
 * Match narrative hash-line prose: `# …` to end of line.
 *
 * Requires whitespace (or EOL) immediately after `#` so structural forms stay:
 * `#yes`, `#[a]`, `#:layer`, `#>id`, `#{…}`.
 */
export function* matchHashLineProse(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peek(state) !== '#') return null
  const next = peek(state, 1)
  // Space/tab → prose title. Newline/EOF → empty hash line (still prose).
  // Anything else → operator / particle / set (leave for other matchers).
  if (next !== undefined && next !== ' ' && next !== '\t' && next !== '\n' && next !== '\r') {
    return null
  }

  const start = getPosition(state)
  let value = '#'
  advance(state)

  while (!isAtEnd(state) && peek(state) !== '\n') {
    value += peek(state)
    advance(state)
  }

  const token: Token<'COMMENT'> = {
    type: 'COMMENT',
    value,
    span: { start, end: getPosition(state) },
    kind: 'hash-prose',
  }

  yield {
    type: 'token',
    rule: 'hashLineProse',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

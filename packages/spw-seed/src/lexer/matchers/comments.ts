/**
 * Comment Matchers
 *
 * Spw has no block comments. `/` is unassigned in the operator lattice, so
 * `/*` must not open anything — a stray one used to swallow the rest of a
 * surface silently. Prose belongs in `#` header lines; inline notes belong
 * in annotations, which the parser can actually see.
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

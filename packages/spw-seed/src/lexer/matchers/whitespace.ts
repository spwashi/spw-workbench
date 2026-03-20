/**
 * Whitespace Matcher
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, isAtEnd } from '../state'

/**
 * Match whitespace characters
 */
export function* matchWhitespace(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  const start = getPosition(state)
  let value = ''

  while (!isAtEnd(state) && /\s/.test(peek(state))) {
    value += peek(state)
    advance(state)
  }

  if (value.length === 0) return null

  const token: Token<'WHITESPACE'> = {
    type: 'WHITESPACE',
    value,
    span: { start, end: getPosition(state) },
  }

  yield {
    type: 'token',
    rule: 'whitespace',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

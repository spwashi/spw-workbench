/**
 * Punctuation Matchers
 *
 * Dot, colon, comma, and comparison operators.
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, peekString } from '../state'

/**
 * Match dot (.)
 *
 * Used for modifier chains and dotpaths.
 * Note: `..` is handled by the connector matcher, and decimals are handled by the number matcher.
 */
// eslint-disable-next-line require-yield -- Deprecated stub; maintains Generator interface for lexer pipeline compatibility
export function* matchDot(
  _state: LexerState,
  _depth: number
): Generator<ParseEvent, Token | null, void> {
  // Dot (.) is now handled as an OPERATOR (Ground) in matchers/operators.ts
  // This matcher is deprecated but kept for potential modifier-access logic if needed later
  return null
}

/**
 * Match colon
 */
export function* matchColon(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peek(state) !== ':') return null
  // Make sure it's not ::
  if (peek(state, 1) === ':') return null

  const start = getPosition(state)
  advance(state)

  const token: Token<'COLON'> = {
    type: 'COLON',
    value: ':',
    span: { start, end: getPosition(state) },
  }

  yield {
    type: 'token',
    rule: 'colon',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

/**
 * Match comma
 */
export function* matchComma(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peek(state) !== ',') return null

  const start = getPosition(state)
  advance(state)

  const token: Token<'COMMA'> = {
    type: 'COMMA',
    value: ',',
    span: { start, end: getPosition(state) },
  }

  yield {
    type: 'token',
    rule: 'comma',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

/**
 * Match comparison operators: == != < > <= >=
 */
export function* matchComparison(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  const start = getPosition(state)
  const twoChar = peekString(state, 2)

  const twoCharOps = ['==', '!=', '<=', '>=']
  if (twoCharOps.includes(twoChar)) {
    advance(state, 2)
    const token: Token<'COMPARISON'> = {
      type: 'COMPARISON',
      value: twoChar,
      span: { start, end: getPosition(state) },
      kind: twoChar,
    }
    yield {
      type: 'token',
      rule: 'comparison',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }

  return null
}

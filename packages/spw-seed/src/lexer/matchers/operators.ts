/**
 * Operator Matcher
 *
 * Spw operators: ! ^ ~ ? * = @ # . & $ %  (12 sigils)
 * Context-sensitive: .{ emits DOT (facet constructor), not part of identifier.
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, peekString } from '../state'
import { DEFAULT_OPERATOR_MAP } from '../profiles'

/**
 * Match Spw operators: ! ^ ~ <> ? * = @ #
 */
export function createOperatorMatcher(
  operatorMap: Record<string, string> = DEFAULT_OPERATOR_MAP
): (
  state: LexerState,
  depth: number
) => Generator<ParseEvent, Token | null, void> {
  const tokens = Object.keys(operatorMap).sort((a, b) => b.length - a.length)

  return function* matchOperator(
    state: LexerState,
    depth: number
  ): Generator<ParseEvent, Token | null, void> {
    const start = getPosition(state)
    const char = peek(state)

    // Reserved for annotations (~#)
    if (char === '~' && peek(state, 1) === '#') {
      return null
    }

    // Reserved for Range/Chain (..)
    if (char === '.' && peek(state, 1) === '.') {
      return null
    }

    // .{ → DOT operator (facet constructor: .{key: value})
    // Must be checked before the general operator loop to prevent
    // the dot being consumed as part of an identifier like `foo.bar`.
    if (char === '.' && peek(state, 1) === '{') {
      advance(state)
      const token: Token<'OPERATOR'> = {
        type: 'OPERATOR',
        value: '.',
        span: { start, end: getPosition(state) },
        kind: operatorMap['.'],
      }
      yield {
        type: 'token',
        rule: 'operator',
        position: start,
        data: { token } as TokenEventData,
        timestamp: performance.now(),
        depth,
      }
      return token
    }

    for (const tokenValue of tokens) {
      if (tokenValue.length === 1) {
        if (char !== tokenValue) continue
      } else if (peekString(state, tokenValue.length) !== tokenValue) {
        continue
      }

      // Check it's not part of a comparison operator (==, !=, <=, >=)
      if (tokenValue === '=' && peek(state, 1) === '=') return null
      if (tokenValue === '!' && peek(state, 1) === '=') return null

      advance(state, tokenValue.length)
      const token: Token<'OPERATOR'> = {
        type: 'OPERATOR',
        value: tokenValue,
        span: { start, end: getPosition(state) },
        kind: operatorMap[tokenValue],
      }
      yield {
        type: 'token',
        rule: 'operator',
        position: start,
        data: { token } as TokenEventData,
        timestamp: performance.now(),
        depth,
      }
      return token
    }

    return null
  }
}

const defaultMatcher = createOperatorMatcher()

export function* matchOperator(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  return yield* defaultMatcher(state, depth)
}

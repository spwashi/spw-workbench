/**
 * Connector Matcher
 *
 * Spw connectors: .. | || / -> ; (+ extras from profile)
 * Digraphs (`||`, `->`, `..`) win over single-char via longest-match sort.
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, peekString } from '../state'
import { DEFAULT_CONNECTOR_MAP } from '../profiles'

/**
 * Match Spw connectors: .. | & / ->
 */
export function createConnectorMatcher(
  connectorMap: Record<string, string> = DEFAULT_CONNECTOR_MAP
): (
  state: LexerState,
  depth: number
) => Generator<ParseEvent, Token | null, void> {
  const tokens = Object.keys(connectorMap).sort((a, b) => b.length - a.length)

  return function* matchConnector(
    state: LexerState,
    depth: number
  ): Generator<ParseEvent, Token | null, void> {
    const start = getPosition(state)

    for (const tokenValue of tokens) {
      if (tokenValue.length === 1) {
        if (peek(state) !== tokenValue) continue
      } else if (peekString(state, tokenValue.length) !== tokenValue) {
        continue
      }

      advance(state, tokenValue.length)
      const token: Token<'CONNECTOR'> = {
        type: 'CONNECTOR',
        value: tokenValue,
        span: { start, end: getPosition(state) },
        kind: connectorMap[tokenValue],
      }
      yield {
        type: 'token',
        rule: 'connector',
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

const defaultMatcher = createConnectorMatcher()

export function* matchConnector(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  return yield* defaultMatcher(state, depth)
}

/**
 * Modifier Matcher
 *
 * Spw modifiers (valence markers): bone, boon, bane, bonk, honk
 */

import type { Token, ParseEvent, TokenEventData, ModifierKind } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, peekString } from '../state'

/**
 * Match Spw modifiers: bone, boon, bane, bonk, honk
 */
export function* matchModifier(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  const modifiers: ModifierKind[] = ['bone', 'boon', 'bane', 'bonk', 'honk']
  const start = getPosition(state)

  for (const mod of modifiers) {
    if (peekString(state, mod.length) === mod) {
      // Check it's not part of a longer identifier
      const nextChar = peek(state, mod.length)
      if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) continue

      advance(state, mod.length)
      const token: Token<'MODIFIER'> = {
        type: 'MODIFIER',
        value: mod,
        span: { start, end: getPosition(state) },
        kind: mod,
      }
      yield {
        type: 'token',
        rule: 'modifier',
        position: start,
        data: { token } as TokenEventData,
        timestamp: performance.now(),
        depth,
      }
      return token
    }
  }

  return null
}

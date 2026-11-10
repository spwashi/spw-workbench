/**
 * Modifier Matcher
 *
 * Spw modifiers (valence markers): bone, boon, bane, bonk, honk
 *
 * A valence word is a charge sign only when it stands alone. Inside a longer
 * word (boonberry) or a hyphenated name (bane-frame) it is part of that name.
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
      // A hyphen that joins it to more word is part of a name (bane-frame, #boon-crossings).
      const afterHyphen = nextChar === '-' ? peek(state, mod.length + 1) : undefined
      if (afterHyphen && /[a-zA-Z0-9_]/.test(afterHyphen)) continue

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

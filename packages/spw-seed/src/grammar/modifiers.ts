/**
 * Modifier Chain Parser
 *
 * Spw modifiers: bone, boon, bane, bonk, honk
 */

import type { Token, ModifierChainNode } from '../types'
import {
  type Parser,
  getPosition,
  current,
  skipWhitespace,
  literal,
  named,
} from '../combinators'
import { modifier } from './tokens'

/**
 * Modifier chain: modifier ("." modifier)?
 */
export const modifierChain: Parser<ModifierChainNode> = named('modifierChain',
  function* modifierChainParser(stream, depth) {
    const startPos = getPosition(stream)

    // First modifier
    const firstGen = modifier(stream, depth + 1)
    let firstStep = firstGen.next()
    while (!firstStep.done) {
      yield firstStep.value
      firstStep = firstGen.next()
    }

    if (!firstStep.value.success) {
      return { success: false, consumed: 0, error: firstStep.value.error }
    }

    const modifiers: Token<'MODIFIER'>[] = [firstStep.value.value! as Token<'MODIFIER'>]
    let consumed = firstStep.value.consumed

    // Optional second modifier with dot
    skipWhitespace(stream)
    if (current(stream).value === '.') {
      const savedPos = stream.position

      // Try to match dot followed by modifier
      const dotGen = literal('.')(stream, depth + 1)
      let dotStep = dotGen.next()
      while (!dotStep.done) {
        yield dotStep.value
        dotStep = dotGen.next()
      }

      if (dotStep.value.success) {
        consumed += dotStep.value.consumed

        const secondGen = modifier(stream, depth + 1)
        let secondStep = secondGen.next()
        while (!secondStep.done) {
          yield secondStep.value
          secondStep = secondGen.next()
        }

        if (secondStep.value.success) {
          modifiers.push(secondStep.value.value! as Token<'MODIFIER'>)
          consumed += secondStep.value.consumed
        } else {
          // Backtrack
          stream.position = savedPos
        }
      }
    }

    const endPos = getPosition(stream)
    const node: ModifierChainNode = {
      type: 'ModifierChain',
      span: { start: startPos, end: endPos },
      modifiers,
    }

    return { success: true, value: node, consumed }
  }
)

/**
 * Parameter Parser
 *
 * Parameters: (name:)? value
 */

import type { Token, ParameterNode, LiteralNode, ReferenceNode } from '../types'
import {
  type Parser,
  getPosition,
  current,
  skipWhitespace,
  choice,
  named,
} from '../combinators'
import { identifier, colon } from './tokens'
import { literalNode } from './literals'
import { referenceNode } from './references'

/**
 * Parameter: (name:)? value
 */
export const parameterNode: Parser<ParameterNode> = named('parameter',
  function* parameterParser(stream, depth) {
    const startPos = getPosition(stream)
    let consumed = 0
    let nameToken: Token<'IDENTIFIER'> | undefined

    // Try name: prefix
    skipWhitespace(stream)
    if (current(stream).type === 'IDENTIFIER') {
      const savedPos = stream.position

      const idGen = identifier(stream, depth + 1)
      let idStep = idGen.next()
      while (!idStep.done) {
        yield idStep.value
        idStep = idGen.next()
      }

      if (idStep.value.success) {
        skipWhitespace(stream)
        if (current(stream).type === 'COLON') {
          nameToken = idStep.value.value
          consumed += idStep.value.consumed

          const colonGen = colon(stream, depth + 1)
          let colonStep = colonGen.next()
          while (!colonStep.done) {
            yield colonStep.value
            colonStep = colonGen.next()
          }

          if (colonStep.value.success) {
            consumed += colonStep.value.consumed
          }
        } else {
          // No colon, backtrack
          stream.position = savedPos
        }
      }
    }

    // Value: literal or reference
    const valueGen = choice<ReferenceNode | LiteralNode>(referenceNode, literalNode)(stream, depth + 1)
    let valueStep = valueGen.next()
    while (!valueStep.done) {
      yield valueStep.value
      valueStep = valueGen.next()
    }

    if (!valueStep.value.success) {
      return { success: false, consumed: 0, error: valueStep.value.error }
    }

    consumed += valueStep.value.consumed
    const endPos = getPosition(stream)

    const node: ParameterNode = {
      type: 'Parameter',
      span: { start: startPos, end: endPos },
      name: nameToken,
      value: valueStep.value.value as LiteralNode | ReferenceNode,
    }

    return { success: true, value: node, consumed }
  }
)

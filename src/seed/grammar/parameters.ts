/**
 * Parameter Parser
 *
 * Parameters: (name:)? value
 */

import type { Token, ParameterNode, LiteralNode, ReferenceNode, ExpressionNode } from '../types'
import {
  type Parser,
  getPosition,
  current,
  skipWhitespace,
  named,
} from '../combinators'
import { identifier, stringLit, colon } from './tokens'
import { expressionNode } from './expressions'

/**
 * Parameter: (name:)? value
 */
export const parameterNode: Parser<ParameterNode> = named('parameter',
  function* parameterParser(stream, depth) {
    const startPos = getPosition(stream)
    let consumed = 0
    let nameToken: Token<'IDENTIFIER' | 'STRING'> | undefined

    // Try name: prefix
    skipWhitespace(stream)
    if (current(stream).type === 'IDENTIFIER' || current(stream).type === 'STRING') {
      const savedPos = stream.position

      const nameGen = (current(stream).type === 'STRING' ? stringLit : identifier)(stream, depth + 1)
      let nameStep = nameGen.next()
      while (!nameStep.done) {
        yield nameStep.value
        nameStep = nameGen.next()
      }

      if (nameStep.value.success) {
        skipWhitespace(stream)
        if (current(stream).type === 'COLON') {
          nameToken = nameStep.value.value
          consumed += nameStep.value.consumed

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

    // Value: expression (most general), with a small simplification pass
    const valueGen = expressionNode(stream, depth + 1)
    let valueStep = valueGen.next()
    while (!valueStep.done) {
      yield valueStep.value
      valueStep = valueGen.next()
    }

    if (!valueStep.value.success) {
      return { success: false, consumed: 0, error: valueStep.value.error }
    }

    consumed += valueStep.value.consumed

    let value = valueStep.value.value as ExpressionNode
    if (value.type === 'Expression' && value.connectors.length == 0 && value.terms.length == 1) {
      const only = value.terms[0] as any
      if (only.type === 'Literal' || only.type === 'Reference') {
        value = only
      }
    }

    const endPos = getPosition(stream)

    const node: ParameterNode = {
      type: 'Parameter',
      span: { start: startPos, end: endPos },
      name: nameToken,
      value: value as any,
    }

    return { success: true, value: node, consumed }
  }
)

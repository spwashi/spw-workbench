/**
 * Seed Parser
 *
 * Top-level Spw grammar rule: annotation* expression
 */

import type { SeedNode, AnnotationNode, ParseEvent } from '../types'
import {
  type Parser,
  getPosition,
  current,
  skipWhitespace,
  named,
} from '../combinators'
import { annotationNode } from './references'
import { expressionNode } from './expressions'
import { proseNode } from './prose'

/**
 * Seed: annotation* expression
 */
export const seedNode: Parser<SeedNode> = named('seed',
  function* seedParser(stream, depth) {
    const startPos = getPosition(stream)
    const annotations: AnnotationNode[] = []
    let consumed = 0

    // annotation*
    while (true) {
      skipWhitespace(stream)
      if (current(stream).type !== 'ANNOTATION') break

      const annGen = annotationNode(stream, depth + 1)
      let annStep = annGen.next()
      while (!annStep.done) {
        yield annStep.value as ParseEvent
        annStep = annGen.next()
      }

      const annResult = annStep.value
      if (!annResult.success) break

      annotations.push(annResult.value!)
      consumed += annResult.consumed
    }

    // expression first, prose fallback
    // Expression remains the canonical top-level form for deterministic parsing.
    // Prose is a fallback for mixed narrative documents.
    let exprResult
    {
      const expressionGen = expressionNode(stream, depth + 1)
      let expressionStep = expressionGen.next()
      while (!expressionStep.done) {
        yield expressionStep.value as ParseEvent
        expressionStep = expressionGen.next()
      }
      exprResult = expressionStep.value
    }

    if (!exprResult.success) {
      const proseGen = proseNode(stream, depth + 1)
      let proseStep = proseGen.next()
      while (!proseStep.done) {
        yield proseStep.value as ParseEvent
        proseStep = proseGen.next()
      }
      exprResult = proseStep.value
      if (!exprResult.success) {
        return { success: false, consumed: 0, error: exprResult.error }
      }
    }

    consumed += exprResult.consumed
    const endPos = getPosition(stream)

    const node: SeedNode = {
      type: 'Seed',
      span: { start: startPos, end: endPos },
      annotations,
      expression: exprResult.value!,
    }

    return { success: true, value: node, consumed }
  }
)

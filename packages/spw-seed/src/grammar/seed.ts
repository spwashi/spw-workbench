/**
 * Seed Parser
 *
 * Top-level Spw grammar rule: annotation* sequence
 */

import type { SeedNode, AnnotationNode, ParseEvent } from '../types'
import {
  type Parser,
  getPosition,
  current,
  skipWhitespace,
  named,
} from '../combinators'
import { annotationNode, appositionNode } from './references'
import { sequenceNode } from './expressions'
import { proseNode } from './prose'

/**
 * Seed: annotation* sequence
 */
export const seedNode: Parser<SeedNode> = named('seed',
  function* seedParser(stream, depth) {
    const startPos = getPosition(stream)
    const annotations: AnnotationNode[] = []
    let consumed = 0

    // annotation*
    while (true) {
      skipWhitespace(stream)
      const leading = current(stream).type
      if (leading !== 'ANNOTATION' && leading !== 'APPOSITION') break

      const annGen = leading === 'APPOSITION'
        ? appositionNode(stream, depth + 1)
        : annotationNode(stream, depth + 1)
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

    // sequence first, prose fallback
    // Sequence remains the canonical top-level form for deterministic parsing.
    // Prose is a fallback for mixed narrative documents.
    let exprResult
    {
      const savedPos = stream.position

      const sequenceGen = sequenceNode(stream, depth + 1)
      let sequenceStep = sequenceGen.next()
      while (!sequenceStep.done) {
        yield sequenceStep.value as ParseEvent
        sequenceStep = sequenceGen.next()
      }
      exprResult = sequenceStep.value

      // If we didn't reach EOF, the file likely contains prose-heavy lines; fall back to prose parsing.
      skipWhitespace(stream)
      const reachedEOF = current(stream).type === 'EOF'
      // Capture where structured parsing stalled before rewinding — after the
      // rewind the position is the start of the surface, which teaches nothing.
      const stall = current(stream)
      if (!reachedEOF) {
        stream.position = savedPos
      }

      // sequenceNode can succeed with consumed=0; treat that as failure so we fall back to prose.
      if (!reachedEOF || !(exprResult.success && exprResult.consumed > 0)) {
        // The fallback itself is correct — a documentation language must not
        // hard-fail on a malformed expression. Silence is the defect: without a
        // signal an author sees a degraded parse and cannot learn why. Report
        // where structured parsing stopped, then degrade as before.
        yield {
          type: 'warning',
          rule: 'seed',
          position: stall.span.start,
          data: {
            message: reachedEOF
              ? 'Structured parse consumed nothing; surface degraded to prose.'
              : `Structured parse stopped at ${stall.type} ${JSON.stringify(stall.value)}; surface degraded to prose.`,
            code: 'prose-degradation',
            found: stall.type,
          },
          timestamp: performance.now(),
          depth,
        } as ParseEvent

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

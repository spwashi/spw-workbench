import type { LexOptions, LexOutput, ParseEvent } from '../types'
import { retainsParseEvent } from '../types'
import { classifyTokenGaps } from './gaps'
import { tokenize } from './tokenize'

/**
 * Collect all tokens from input (convenience function)
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 * @spw:lens:syntactic - tokenization operates purely on form
 */
export function lex(input: string, options: LexOptions = {}): LexOutput {
  const gen = tokenize(input, 0, options)
  const eventPolicy = options.eventPolicy ?? 'trace'
  const events: ParseEvent[] = []
  let generated = 0
  let result = gen.next()

  while (!result.done) {
    generated++
    if (retainsParseEvent(eventPolicy, result.value)) events.push(result.value)
    result = gen.next()
  }

  return {
    tokens: result.value,
    gaps: classifyTokenGaps(input, result.value),
    events,
    eventPolicy,
    eventCounts: { generated, retained: events.length },
  }
}

import type { Token, ParseEvent, LexOptions } from '../types'
import { tokenize } from './tokenize'

/**
 * Collect all tokens from input (convenience function)
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 * @spw:lens:syntactic - tokenization operates purely on form
 */
export function lex(input: string, options: LexOptions = {}): { tokens: Token[]; events: ParseEvent[] } {
  const gen = tokenize(input, 0, options)
  const events: ParseEvent[] = []
  let result = gen.next()

  while (!result.done) {
    events.push(result.value)
    result = gen.next()
  }

  return { tokens: result.value, events }
}

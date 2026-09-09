import type { Token } from '../types'
import { advance, getPosition, type LexerState } from './state'

/**
 * Plan entries own the rest of their physical line, including punctuation,
 * quotes, comment-like text, and incomplete timestamp headers. Keep that text
 * intact for the existing stream-entry grammar rather than reconstructing it
 * from ordinary expression tokens. An open << stream always takes precedence.
 */
export function readPlanStreamEntry(state: LexerState, streamDepth: number): Token[] | null {
  if (streamDepth > 0 || !state.input.startsWith('>>[', state.offset)) return null
  const lineStart = state.input.lastIndexOf('\n', state.offset - 1) + 1
  if (!/^[\t ]*$/.test(state.input.slice(lineStart, state.offset))) return null

  const start = getPosition(state)
  advance(state, 2)
  const payloadStart = getPosition(state)
  const marker: Token<'STREAM_CLOSE'> = {
    type: 'STREAM_CLOSE',
    kind: '>>',
    value: '>>',
    span: { start, end: payloadStart },
  }
  while (state.offset < state.input.length && !/[\r\n]/.test(state.input[state.offset]!)) {
    advance(state)
  }
  const payload: Token<'TEXT'> = {
    type: 'TEXT',
    value: state.input.slice(payloadStart.offset, state.offset),
    span: { start: payloadStart, end: getPosition(state) },
  }
  return [marker, payload]
}

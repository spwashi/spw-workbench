/**
 * Comment Matchers
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, peekString, isAtEnd } from '../state'

/**
 * Match line comment: // ...
 */
export function* matchLineComment(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peekString(state, 2) !== '//') return null

  const start = getPosition(state)
  let value = '//'
  advance(state, 2)

  while (!isAtEnd(state) && peek(state) !== '\n') {
    value += peek(state)
    advance(state)
  }

  const token: Token<'COMMENT'> = {
    type: 'COMMENT',
    value,
    span: { start, end: getPosition(state) },
    kind: 'line',
  }

  yield {
    type: 'token',
    rule: 'lineComment',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

/**
 * Match block comment: /\* ... *\/
 */
export function* matchBlockComment(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peekString(state, 2) !== '/*') return null

  const start = getPosition(state)
  let value = '/*'
  advance(state, 2)

  while (!isAtEnd(state) && peekString(state, 2) !== '*/') {
    value += peek(state)
    advance(state)
  }

  if (peekString(state, 2) === '*/') {
    value += '*/'
    advance(state, 2)
  }

  const token: Token<'COMMENT'> = {
    type: 'COMMENT',
    value,
    span: { start, end: getPosition(state) },
    kind: 'block',
  }

  yield {
    type: 'token',
    rule: 'blockComment',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

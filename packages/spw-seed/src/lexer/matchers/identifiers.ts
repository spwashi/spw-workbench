/**
 * Identifier Matchers
 *
 * Identifiers and annotations.
 */

import type { Token, ParseEvent, TokenEventData, ErrorEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, isAtEnd } from '../state'

/**
 * Match identifier: letter (letter | digit | _ | -)* with optional tight
 * dot-connected segments. A dot belongs to the identifier only when another
 * identifier segment starts immediately after it.
 * Also detects standalone _ as a HOLE token.
 */
export function* matchIdentifier(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  const start = getPosition(state)
  const firstChar = peek(state)

  if (!/[a-zA-Z_]/.test(firstChar)) return null

  // Standalone _ → HOLE token (unification variable / pattern wildcard)
  if (firstChar === '_' && !/[a-zA-Z0-9_]/.test(peek(state, 1) ?? '')) {
    advance(state)
    const token: Token<'HOLE'> = {
      type: 'HOLE',
      value: '_',
      span: { start, end: getPosition(state) },
    }
    yield {
      type: 'token',
      rule: 'hole',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }

  let value = firstChar
  advance(state)

  while (!isAtEnd(state)) {
    const char = peek(state)
    if (/[a-zA-Z0-9_-]/.test(char)) {
      value += char
      advance(state)
      continue
    }
    if (char === '.' && /[a-zA-Z_]/.test(peek(state, 1) ?? '')) {
      value += char
      advance(state)
      continue
    }
    break
  }

  const segments = value.split('.')

  const token: Token<'IDENTIFIER'> = {
    type: 'IDENTIFIER',
    value,
    span: { start, end: getPosition(state) },
    identifier: {
      segments,
      qualified: segments.length > 1,
    },
  }

  yield {
    type: 'token',
    rule: 'identifier',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

/**
 * Match annotation: ~#identifier
 */
export function* matchAnnotation(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peek(state) !== '~' || peek(state, 1) !== '#') return null

  const start = getPosition(state)
  let value = '~#'
  advance(state, 2)

  // Must be followed by identifier
  if (!/[a-zA-Z_]/.test(peek(state))) {
    yield {
      type: 'error',
      rule: 'annotation',
      position: start,
      data: {
        message: 'Expected identifier after ~#',
        expected: ['identifier'],
        found: peek(state) || 'EOF',
        recoverable: true,
      } as ErrorEventData,
      timestamp: performance.now(),
      depth,
    }
    return null
  }

  while (!isAtEnd(state) && /[a-zA-Z0-9_-]/.test(peek(state))) {
    value += peek(state)
    advance(state)
  }

  const token: Token<'ANNOTATION'> = {
    type: 'ANNOTATION',
    value,
    span: { start, end: getPosition(state) },
  }

  yield {
    type: 'token',
    rule: 'annotation',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

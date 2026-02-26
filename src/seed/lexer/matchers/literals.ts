/**
 * Literal Matchers
 *
 * String, number, and boolean literals.
 */

import type { Token, ParseEvent, TokenEventData, ErrorEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, peekString, isAtEnd } from '../state'

/**
 * Match string literals: "..." or '...'
 */
export function createStringMatcher(allowedQuotes: string[] = ['"', "'"]) {
  const allowed = new Set(allowedQuotes)
  return function* matchString(
    state: LexerState,
    depth: number
  ): Generator<ParseEvent, Token | null, void> {
    const quote = peek(state)
    if (!allowed.has(quote)) return null

    const start = getPosition(state)
    let value = quote
    advance(state)

    while (!isAtEnd(state)) {
      const char = peek(state)

      if (char === '\\' && !isAtEnd(state)) {
        // Escape sequence
        value += char
        advance(state)
        if (!isAtEnd(state)) {
          value += peek(state)
          advance(state)
        }
        continue
      }

      if (char === quote) {
        value += char
        advance(state)
        break
      }

      if (char === '\n') {
        // Unterminated string
        yield {
          type: 'error',
          rule: 'string',
          position: start,
          data: {
            message: 'Unterminated string literal',
            expected: [quote],
            found: 'newline',
            recoverable: true,
          } as ErrorEventData,
          timestamp: performance.now(),
          depth,
        }
        break
      }

      value += char
      advance(state)
    }

    const token: Token<'STRING'> = {
      type: 'STRING',
      value,
      span: { start, end: getPosition(state) },
      kind: quote,
    }

    yield {
      type: 'token',
      rule: 'string',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }

    return token
  }
}

// Default string matcher (both quote styles)
export const matchString = createStringMatcher()

/**
 * Match number literals: 123, 45.67
 */
export function* matchNumber(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  const start = getPosition(state)
  let value = ''

  // Must start with digit
  if (!/[0-9]/.test(peek(state))) return null

  // Integer part
  while (!isAtEnd(state) && /[0-9]/.test(peek(state))) {
    value += peek(state)
    advance(state)
  }

  // Decimal part
  if (peek(state) === '.' && /[0-9]/.test(peek(state, 1))) {
    value += peek(state)
    advance(state)
    while (!isAtEnd(state) && /[0-9]/.test(peek(state))) {
      value += peek(state)
      advance(state)
    }
  }

  const token: Token<'NUMBER'> = {
    type: 'NUMBER',
    value,
    span: { start, end: getPosition(state) },
  }

  yield {
    type: 'token',
    rule: 'number',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

/**
 * Match boolean literals: true, false
 */
export function* matchBoolean(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  const start = getPosition(state)

  for (const bool of ['true', 'false']) {
    if (peekString(state, bool.length) === bool) {
      const nextChar = peek(state, bool.length)
      if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) continue

      advance(state, bool.length)
      const token: Token<'BOOLEAN'> = {
        type: 'BOOLEAN',
        value: bool,
        span: { start, end: getPosition(state) },
      }
      yield {
        type: 'token',
        rule: 'boolean',
        position: start,
        data: { token } as TokenEventData,
        timestamp: performance.now(),
        depth,
      }
      return token
    }
  }

  return null
}

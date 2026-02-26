/**
 * Primitive Combinators
 *
 * Basic token matching: token(), tokenOneOf(), literal()
 */

import type {
  Token,
  TokenType,
  ParseEvent,
  ParseResult,
  EnterEventData,
  ExitEventData,
  MatchEventData,
} from '../types'

import { current, advance, getPosition } from './stream'
import type { Parser } from './index'

/**
 * Match a specific token type
 */
export function token<T extends TokenType>(
  expectedType: T,
  expectedKind?: string
): Parser<Token<T>> {
  return function* tokenParser(stream, depth): Generator<ParseEvent, ParseResult<Token<T>>, void> {
    const pos = getPosition(stream)
    const tok = current(stream)

    yield {
      type: 'enter',
      rule: `token(${expectedType}${expectedKind ? ':' + expectedKind : ''})`,
      position: pos,
      data: { input: tok.value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    if (tok.type === expectedType && (!expectedKind || tok.kind === expectedKind)) {
      advance(stream)

      yield {
        type: 'match',
        rule: `token(${expectedType})`,
        position: pos,
        data: { matched: tok.value, expected: expectedType } as MatchEventData,
        timestamp: performance.now(),
        depth,
      }

      yield {
        type: 'exit',
        rule: `token(${expectedType})`,
        position: getPosition(stream),
        data: { success: true, consumed: 1, result: tok } as ExitEventData,
        timestamp: performance.now(),
        depth,
      }

      return { success: true, value: tok as Token<T>, consumed: 1 }
    }

    yield {
      type: 'exit',
      rule: `token(${expectedType})`,
      position: pos,
      data: {
        success: false,
        consumed: 0,
        result: undefined,
      } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return {
      success: false,
      consumed: 0,
      error: {
        message: `Expected ${expectedType}${expectedKind ? ':' + expectedKind : ''}, found ${tok.type}:${tok.value}`,
        expected: expectedKind ? [`${expectedType}:${expectedKind}`] : [expectedType],
        found: tok.value,
        recoverable: true,
      },
    }
  }
}

/**
 * Match one of several token types
 */
export function tokenOneOf<T extends TokenType>(
  ...types: T[]
): Parser<Token<T>> {
  return function* tokenOneOfParser(stream, depth): Generator<ParseEvent, ParseResult<Token<T>>, void> {
    const pos = getPosition(stream)
    const tok = current(stream)

    yield {
      type: 'enter',
      rule: `tokenOneOf(${types.join('|')})`,
      position: pos,
      data: { input: tok.value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    if (types.includes(tok.type as T)) {
      advance(stream)

      yield {
        type: 'match',
        rule: `tokenOneOf`,
        position: pos,
        data: { matched: tok.value } as MatchEventData,
        timestamp: performance.now(),
        depth,
      }

      yield {
        type: 'exit',
        rule: `tokenOneOf`,
        position: getPosition(stream),
        data: { success: true, consumed: 1, result: tok } as ExitEventData,
        timestamp: performance.now(),
        depth,
      }

      return { success: true, value: tok as Token<T>, consumed: 1 }
    }

    yield {
      type: 'exit',
      rule: `tokenOneOf`,
      position: pos,
      data: { success: false, consumed: 0 } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return {
      success: false,
      consumed: 0,
      error: {
        message: `Expected one of ${types.join(', ')}, found ${tok.type}`,
        expected: types,
        found: tok.value,
        recoverable: true,
      },
    }
  }
}

/**
 * Match a token with a specific value
 */
export function literal(value: string): Parser<Token> {
  return function* literalParser(stream, depth): Generator<ParseEvent, ParseResult<Token>, void> {
    const pos = getPosition(stream)
    const tok = current(stream)

    yield {
      type: 'enter',
      rule: `literal("${value}")`,
      position: pos,
      data: { input: tok.value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    if (tok.value === value) {
      advance(stream)

      yield {
        type: 'match',
        rule: `literal`,
        position: pos,
        data: { matched: value } as MatchEventData,
        timestamp: performance.now(),
        depth,
      }

      yield {
        type: 'exit',
        rule: `literal`,
        position: getPosition(stream),
        data: { success: true, consumed: 1, result: tok } as ExitEventData,
        timestamp: performance.now(),
        depth,
      }

      return { success: true, value: tok, consumed: 1 }
    }

    yield {
      type: 'exit',
      rule: `literal`,
      position: pos,
      data: { success: false, consumed: 0 } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return {
      success: false,
      consumed: 0,
      error: {
        message: `Expected "${value}", found "${tok.value}"`,
        expected: [value],
        found: tok.value,
        recoverable: true,
      },
    }
  }
}

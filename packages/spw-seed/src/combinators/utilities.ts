/**
 * Utility Combinators
 *
 * lazy(), named(), skipWhitespace(), lexeme()
 */

import type {
  ParseEvent,
  ParseResult,
  EnterEventData,
  ExitEventData,
} from '../types'

import type { TokenStream } from './stream'
import { current, advance, getPosition } from './stream'
import type { Parser } from './index'

/**
 * Defer parser creation for recursive grammars
 */
export function lazy<T>(fn: () => Parser<T>): Parser<T> {
  return function* lazyParser(stream, depth): Generator<ParseEvent, ParseResult<T>, void> {
    const parser = fn()
    const gen = parser(stream, depth)
    let step = gen.next()
    while (!step.done) {
      yield step.value
      step = gen.next()
    }
    return step.value
  }
}

/**
 * Give a parser a name for error messages
 */
export function named<T>(name: string, parser: Parser<T>): Parser<T> {
  return function* namedParser(stream, depth): Generator<ParseEvent, ParseResult<T>, void> {
    const pos = getPosition(stream)

    yield {
      type: 'enter',
      rule: name,
      position: pos,
      data: { input: current(stream).value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    const gen = parser(stream, depth + 1)
    let step = gen.next()
    while (!step.done) {
      yield step.value
      step = gen.next()
    }

    yield {
      type: 'exit',
      rule: name,
      position: getPosition(stream),
      data: {
        success: step.value.success,
        consumed: step.value.consumed,
        result: step.value.value,
      } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return step.value
  }
}

/**
 * Skip whitespace tokens
 */
export function skipWhitespace(stream: TokenStream): number {
  let skipped = 0
  while (current(stream).type === 'WHITESPACE' || current(stream).type === 'COMMENT') {
    advance(stream)
    skipped++
  }
  return skipped
}

/**
 * Wrap parser to skip leading whitespace
 */
export function lexeme<T>(parser: Parser<T>): Parser<T> {
  return function* lexemeParser(stream, depth): Generator<ParseEvent, ParseResult<T>, void> {
    skipWhitespace(stream)
    const gen = parser(stream, depth)
    let step = gen.next()
    while (!step.done) {
      yield step.value
      step = gen.next()
    }
    return step.value
  }
}

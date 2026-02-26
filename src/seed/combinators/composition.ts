/**
 * Composition Combinators
 *
 * sequence(), choice(), many(), many1(), optional()
 */

import type {
  ParseEvent,
  ParseResult,
  ErrorEventData,
  EnterEventData,
  ExitEventData,
  BacktrackEventData,
} from '../types'

import {
  current,
  isAtEnd,
  getPosition,
  mark,
  unmark,
  reset,
} from './stream'
import type { Parser } from './index'

// Helper type for sequence
type UnwrapParsers<T extends Parser<unknown>[]> = {
  [K in keyof T]: T[K] extends Parser<infer U> ? U : never
}

/**
 * Match a sequence of parsers, all must succeed
 */
export function sequence<T extends Parser<unknown>[]>(
  ...parsers: T
): Parser<UnwrapParsers<T>> {
  return function* sequenceParser(stream, depth): Generator<ParseEvent, ParseResult<UnwrapParsers<T>>, void> {
    const pos = getPosition(stream)
    const results: unknown[] = []
    let totalConsumed = 0

    yield {
      type: 'enter',
      rule: 'sequence',
      position: pos,
      data: { input: current(stream).value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    mark(stream)

    for (let i = 0; i < parsers.length; i++) {
      const parser = parsers[i]
      const gen = parser(stream, depth + 1)
      let step = gen.next()

      while (!step.done) {
        yield step.value
        step = gen.next()
      }

      const result = step.value
      if (!result.success) {
        reset(stream)

        yield {
          type: 'backtrack',
          rule: 'sequence',
          position: pos,
          data: {
            reason: `Parser ${i} failed`,
            alternatives: [],
            tried: i,
          } as BacktrackEventData,
          timestamp: performance.now(),
          depth,
        }

        yield {
          type: 'exit',
          rule: 'sequence',
          position: pos,
          data: { success: false, consumed: 0 } as ExitEventData,
          timestamp: performance.now(),
          depth,
        }

        return { success: false, consumed: 0, error: result.error }
      }

      results.push(result.value)
      totalConsumed += result.consumed
    }

    unmark(stream)

    yield {
      type: 'exit',
      rule: 'sequence',
      position: getPosition(stream),
      data: { success: true, consumed: totalConsumed, result: results } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return { success: true, value: results as UnwrapParsers<T>, consumed: totalConsumed }
  }
}

/**
 * Try each parser in order, return first success
 */
export function choice<T>(...parsers: Parser<T>[]): Parser<T> {
  return function* choiceParser(stream, depth): Generator<ParseEvent, ParseResult<T>, void> {
    const pos = getPosition(stream)
    const errors: ErrorEventData[] = []

    yield {
      type: 'enter',
      rule: 'choice',
      position: pos,
      data: { input: current(stream).value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    for (let i = 0; i < parsers.length; i++) {
      mark(stream)

      const parser = parsers[i]
      const gen = parser(stream, depth + 1)
      let step = gen.next()

      while (!step.done) {
        yield step.value
        step = gen.next()
      }

      const result = step.value

      if (result.success) {
        unmark(stream)

        yield {
          type: 'exit',
          rule: 'choice',
          position: getPosition(stream),
          data: { success: true, consumed: result.consumed, result: result.value } as ExitEventData,
          timestamp: performance.now(),
          depth,
        }

        return result
      }

      reset(stream)

      if (result.error) {
        errors.push(result.error)
      }

      yield {
        type: 'backtrack',
        rule: 'choice',
        position: pos,
        data: {
          reason: `Alternative ${i} failed`,
          alternatives: parsers.map((_, j) => `alt${j}`),
          tried: i + 1,
        } as BacktrackEventData,
        timestamp: performance.now(),
        depth,
      }
    }

    yield {
      type: 'exit',
      rule: 'choice',
      position: pos,
      data: { success: false, consumed: 0 } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return {
      success: false,
      consumed: 0,
      error: {
        message: `No alternative matched`,
        expected: errors.flatMap(e => e.expected ?? []),
        found: current(stream).value,
        recoverable: true,
      },
    }
  }
}

/**
 * Match zero or more occurrences
 */
export function many<T>(parser: Parser<T>): Parser<T[]> {
  return function* manyParser(stream, depth): Generator<ParseEvent, ParseResult<T[]>, void> {
    const pos = getPosition(stream)
    const results: T[] = []
    let totalConsumed = 0

    yield {
      type: 'enter',
      rule: 'many',
      position: pos,
      data: { input: current(stream).value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    while (!isAtEnd(stream)) {
      mark(stream)

      const gen = parser(stream, depth + 1)
      let step = gen.next()

      while (!step.done) {
        yield step.value
        step = gen.next()
      }

      const result = step.value

      if (!result.success || result.consumed === 0) {
        reset(stream)
        break
      }

      unmark(stream)
      results.push(result.value!)
      totalConsumed += result.consumed
    }

    yield {
      type: 'exit',
      rule: 'many',
      position: getPosition(stream),
      data: { success: true, consumed: totalConsumed, result: results } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return { success: true, value: results, consumed: totalConsumed }
  }
}

/**
 * Match one or more occurrences
 */
export function many1<T>(parser: Parser<T>): Parser<T[]> {
  return function* many1Parser(stream, depth): Generator<ParseEvent, ParseResult<T[]>, void> {
    const pos = getPosition(stream)

    yield {
      type: 'enter',
      rule: 'many1',
      position: pos,
      data: { input: current(stream).value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    // First must succeed
    const firstGen = parser(stream, depth + 1)
    let firstStep = firstGen.next()
    while (!firstStep.done) {
      yield firstStep.value
      firstStep = firstGen.next()
    }

    const firstResult = firstStep.value
    if (!firstResult.success) {
      yield {
        type: 'exit',
        rule: 'many1',
        position: pos,
        data: { success: false, consumed: 0 } as ExitEventData,
        timestamp: performance.now(),
        depth,
      }
      return { success: false, consumed: 0, error: firstResult.error }
    }

    const results: T[] = [firstResult.value!]
    let totalConsumed = firstResult.consumed

    // Rest are optional
    const restGen = many(parser)(stream, depth + 1)
    let restStep = restGen.next()
    while (!restStep.done) {
      yield restStep.value
      restStep = restGen.next()
    }

    const restResult = restStep.value
    if (restResult.success && restResult.value) {
      results.push(...restResult.value)
      totalConsumed += restResult.consumed
    }

    yield {
      type: 'exit',
      rule: 'many1',
      position: getPosition(stream),
      data: { success: true, consumed: totalConsumed, result: results } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return { success: true, value: results, consumed: totalConsumed }
  }
}

/**
 * Match zero or one occurrence
 */
export function optional<T>(parser: Parser<T>): Parser<T | undefined> {
  return function* optionalParser(stream, depth): Generator<ParseEvent, ParseResult<T | undefined>, void> {
    const pos = getPosition(stream)

    yield {
      type: 'enter',
      rule: 'optional',
      position: pos,
      data: { input: current(stream).value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    mark(stream)

    const gen = parser(stream, depth + 1)
    let step = gen.next()
    while (!step.done) {
      yield step.value
      step = gen.next()
    }

    if (step.value.success) {
      unmark(stream)

      yield {
        type: 'exit',
        rule: 'optional',
        position: getPosition(stream),
        data: { success: true, consumed: step.value.consumed, result: step.value.value } as ExitEventData,
        timestamp: performance.now(),
        depth,
      }

      return step.value
    }

    reset(stream)

    yield {
      type: 'exit',
      rule: 'optional',
      position: pos,
      data: { success: true, consumed: 0, result: undefined } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return { success: true, value: undefined, consumed: 0 }
  }
}

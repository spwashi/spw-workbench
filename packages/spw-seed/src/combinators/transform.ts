/**
 * Transform Combinators
 *
 * map(), sepBy(), between()
 */

import type {
  Span,
  ParseEvent,
  ParseResult,
  EnterEventData,
  ExitEventData,
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
import { sequence } from './composition'

/**
 * Transform the result of a parser
 */
export function map<T, U>(parser: Parser<T>, fn: (value: T, span: Span) => U): Parser<U> {
  return function* mapParser(stream, depth): Generator<ParseEvent, ParseResult<U>, void> {
    const startPos = getPosition(stream)

    const gen = parser(stream, depth)
    let step = gen.next()
    while (!step.done) {
      yield step.value
      step = gen.next()
    }

    if (step.value.success) {
      const endPos = getPosition(stream)
      const span: Span = { start: startPos, end: endPos }
      const mapped = fn(step.value.value!, span)
      return { success: true, value: mapped, consumed: step.value.consumed }
    }

    return { success: false, consumed: 0, error: step.value.error }
  }
}

/**
 * Match items separated by a delimiter
 */
export function sepBy<T, S>(
  item: Parser<T>,
  separator: Parser<S>
): Parser<T[]> {
  return function* sepByParser(stream, depth): Generator<ParseEvent, ParseResult<T[]>, void> {
    const pos = getPosition(stream)

    yield {
      type: 'enter',
      rule: 'sepBy',
      position: pos,
      data: { input: current(stream).value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    // Try first item
    mark(stream)
    const firstGen = item(stream, depth + 1)
    let firstStep = firstGen.next()
    while (!firstStep.done) {
      yield firstStep.value
      firstStep = firstGen.next()
    }

    if (!firstStep.value.success) {
      reset(stream)
      yield {
        type: 'exit',
        rule: 'sepBy',
        position: pos,
        data: { success: true, consumed: 0, result: [] } as ExitEventData,
        timestamp: performance.now(),
        depth,
      }
      return { success: true, value: [], consumed: 0 }
    }

    unmark(stream)
    const results: T[] = [firstStep.value.value!]
    let totalConsumed = firstStep.value.consumed

    // Try more items
    while (!isAtEnd(stream)) {
      mark(stream)

      // Try separator
      const sepGen = separator(stream, depth + 1)
      let sepStep = sepGen.next()
      while (!sepStep.done) {
        yield sepStep.value
        sepStep = sepGen.next()
      }

      if (!sepStep.value.success) {
        reset(stream)
        break
      }

      totalConsumed += sepStep.value.consumed

      // Try item
      const itemGen = item(stream, depth + 1)
      let itemStep = itemGen.next()
      while (!itemStep.done) {
        yield itemStep.value
        itemStep = itemGen.next()
      }

      if (!itemStep.value.success) {
        reset(stream)
        break
      }

      unmark(stream)
      results.push(itemStep.value.value!)
      totalConsumed += itemStep.value.consumed
    }

    yield {
      type: 'exit',
      rule: 'sepBy',
      position: getPosition(stream),
      data: { success: true, consumed: totalConsumed, result: results } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return { success: true, value: results, consumed: totalConsumed }
  }
}

/**
 * Match content between opening and closing delimiters
 */
export function between<O, C, T>(
  open: Parser<O>,
  close: Parser<C>,
  content: Parser<T>
): Parser<T> {
  return function* betweenParser(stream, depth): Generator<ParseEvent, ParseResult<T>, void> {
    const pos = getPosition(stream)

    yield {
      type: 'enter',
      rule: 'between',
      position: pos,
      data: { input: current(stream).value } as EnterEventData,
      timestamp: performance.now(),
      depth,
    }

    // Match sequence: open, content, close
    const seqParser = sequence(open, content, close)
    const gen = seqParser(stream, depth + 1)
    let step = gen.next()
    while (!step.done) {
      yield step.value
      step = gen.next()
    }

    if (step.value.success) {
      const [, contentResult] = step.value.value!
      yield {
        type: 'exit',
        rule: 'between',
        position: getPosition(stream),
        data: { success: true, consumed: step.value.consumed, result: contentResult } as ExitEventData,
        timestamp: performance.now(),
        depth,
      }
      return { success: true, value: contentResult, consumed: step.value.consumed }
    }

    yield {
      type: 'exit',
      rule: 'between',
      position: pos,
      data: { success: false, consumed: 0 } as ExitEventData,
      timestamp: performance.now(),
      depth,
    }

    return step.value as ParseResult<T>
  }
}

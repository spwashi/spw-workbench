/**
 * Container Matcher
 *
 * Container delimiters: ( ) [ ] { }
 */

import type { Token, ParseEvent, TokenEventData, ContainerKind } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, peekString } from '../state'

/**
 * Match container delimiters: ( ) [ ] { } plus streaming/n-range/capsule shells
 */
export function* matchContainer(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  const start = getPosition(state)
  const two = peekString(state, 2)
  const char = peek(state)

  // Streaming << >>
  if (two === '<<') {
    advance(state, 2)
    const token: Token<'STREAM_OPEN'> = {
      type: 'STREAM_OPEN',
      value: '<<',
      span: { start, end: getPosition(state) },
      kind: '<<' as ContainerKind,
    }
    yield {
      type: 'token',
      rule: 'streamOpen',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }
  if (two === '>>') {
    advance(state, 2)
    const token: Token<'STREAM_CLOSE'> = {
      type: 'STREAM_CLOSE',
      value: '>>',
      span: { start, end: getPosition(state) },
      kind: '>>' as ContainerKind,
    }
    yield {
      type: 'token',
      rule: 'streamClose',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }

  // N-range (( ))
  if (two === '((') {
    advance(state, 2)
    const token: Token<'NRANGE_OPEN'> = {
      type: 'NRANGE_OPEN',
      value: '((',
      span: { start, end: getPosition(state) },
      kind: '((' as ContainerKind,
    }
    yield {
      type: 'token',
      rule: 'nrangeOpen',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }
  if (two === '))') {
    advance(state, 2)
    const token: Token<'NRANGE_CLOSE'> = {
      type: 'NRANGE_CLOSE',
      value: '))',
      span: { start, end: getPosition(state) },
      kind: '))' as ContainerKind,
    }
    yield {
      type: 'token',
      rule: 'nrangeClose',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }

  // Capsule shell < >
  if (char === '<') {
    advance(state)
    const token: Token<'CAPSULE_OPEN'> = {
      type: 'CAPSULE_OPEN',
      value: '<',
      span: { start, end: getPosition(state) },
      kind: '<' as ContainerKind,
    }
    yield {
      type: 'token',
      rule: 'capsuleOpen',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }
  if (char === '>') {
    advance(state)
    const token: Token<'CAPSULE_CLOSE'> = {
      type: 'CAPSULE_CLOSE',
      value: '>',
      span: { start, end: getPosition(state) },
      kind: '>' as ContainerKind,
    }
    yield {
      type: 'token',
      rule: 'capsuleClose',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }

  const openContainers: Record<string, ContainerKind> = { '(': '(', '[': '[', '{': '{' }
  const closeContainers: Record<string, ContainerKind> = { ')': ')', ']': ']', '}': '}' }

  if (char in openContainers) {
    advance(state)
    const token: Token<'CONTAINER_OPEN'> = {
      type: 'CONTAINER_OPEN',
      value: char,
      span: { start, end: getPosition(state) },
      kind: openContainers[char],
    }
    yield {
      type: 'token',
      rule: 'container',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }

  if (char in closeContainers) {
    advance(state)
    const token: Token<'CONTAINER_CLOSE'> = {
      type: 'CONTAINER_CLOSE',
      value: char,
      span: { start, end: getPosition(state) },
      kind: closeContainers[char],
    }
    yield {
      type: 'token',
      rule: 'container',
      position: start,
      data: { token } as TokenEventData,
      timestamp: performance.now(),
      depth,
    }
    return token
  }

  return null
}

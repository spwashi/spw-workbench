/**
 * Apposition Matcher
 *
 * `~#(nearest neighbor)` and `~#lens(living system)` — a label attached to a
 * container from outside it. `~#name: value` states a datum; an apposition states
 * how to hold the thing beside it, and the parens are the `@` container, so
 * the label is perspectival by construction rather than by convention.
 *
 * The body is taken raw to the matching paren. An apposition carries prose — an
 * apostrophe, a comma, a percent, an arrow — and lexing it as tokens would
 * make ordinary phrasing a syntax error, which is the failure that drove
 * people to comments in the first place.
 */

import type { Token, ParseEvent, TokenEventData, ErrorEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, isAtEnd } from '../state'

/** The label text and name carried by an APPOSITION token. */
export interface AppositionParts {
  /** Declared name, or null when the apposition is anonymous. */
  name: string | null
  /** Raw label text between the parens. */
  body: string
}

/**
 * Split an APPOSITION token's source text into its name and body.
 *
 * Consumers should read an apposition through this rather than re-deriving the
 * split, so the token stays the single description of the form.
 */
export function appositionParts(value: string): AppositionParts {
  const open = value.indexOf('(')
  if (open < 0) return { name: null, body: '' }
  const name = value.slice(2, open)
  const body = value.slice(open + 1, value.lastIndexOf(')'))
  return { name: name.length > 0 ? name : null, body }
}

export function* matchApposition(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peek(state) !== '~' || peek(state, 1) !== '#') return null

  // Look past an optional name to the opening paren without consuming input —
  // `~#name: value` must still reach the annotation matcher untouched.
  let ahead = 2
  while (/[a-zA-Z0-9_-]/.test(peek(state, ahead))) ahead++
  if (peek(state, ahead) !== '(') return null

  const start = getPosition(state)
  let value = ''
  for (let i = 0; i < ahead; i++) {
    value += peek(state)
    advance(state)
  }

  // Consume the balanced paren body as raw text.
  let depthCount = 0
  let closed = false
  while (!isAtEnd(state)) {
    const char = peek(state)
    if (char === '\n') break
    value += char
    advance(state)
    if (char === '(') depthCount++
    else if (char === ')') {
      depthCount--
      if (depthCount === 0) {
        closed = true
        break
      }
    }
  }

  if (!closed) {
    yield {
      type: 'error',
      rule: 'apposition',
      position: start,
      data: {
        message: 'Unterminated apposition',
        expected: [')'],
        found: isAtEnd(state) ? 'end of input' : 'newline',
        recoverable: true,
      } as ErrorEventData,
      timestamp: performance.now(),
      depth,
    }
  }

  const token: Token<'APPOSITION'> = {
    type: 'APPOSITION',
    value,
    span: { start, end: getPosition(state) },
    kind: appositionParts(value).name ? 'named' : 'anonymous',
  }

  yield {
    type: 'token',
    rule: 'apposition',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

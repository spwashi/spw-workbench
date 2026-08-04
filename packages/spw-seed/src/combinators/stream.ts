/**
 * Token Stream
 *
 * State management for the token stream with mark/reset for backtracking.
 */

import type { Token, Position } from '../types'

export interface TokenStream {
  tokens: Token[]
  position: number
  marks: number[]  // Stack of positions for backtracking
  contextMode: 'low' | 'high'
  /**
   * Open `<<` bounds enclosing the cursor. Zero means a `>>` at the start of a
   * line closes nothing and is a stream-entry marker instead.
   */
  streamDepth: number
}

export function createTokenStream(
  tokens: Token[],
  contextMode: 'low' | 'high' = 'low'
): TokenStream {
  return {
    tokens,
    position: 0,
    marks: [],
    contextMode,
    streamDepth: 0,
  }
}

export function current(stream: TokenStream): Token {
  return stream.tokens[stream.position] ?? stream.tokens[stream.tokens.length - 1]
}

export function peek(stream: TokenStream, offset: number = 0): Token | undefined {
  return stream.tokens[stream.position + offset]
}

export function advance(stream: TokenStream): Token {
  const token = current(stream)
  if (stream.position < stream.tokens.length - 1) {
    stream.position++
  }
  return token
}

export function isAtEnd(stream: TokenStream): boolean {
  return current(stream).type === 'EOF'
}

export function mark(stream: TokenStream): void {
  stream.marks.push(stream.position)
}

export function unmark(stream: TokenStream): void {
  stream.marks.pop()
}

export function reset(stream: TokenStream): void {
  const pos = stream.marks.pop()
  if (pos !== undefined) {
    stream.position = pos
  }
}

export function getPosition(stream: TokenStream): Position {
  return current(stream).span.start
}

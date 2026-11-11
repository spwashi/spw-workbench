/**
 * Token Stream
 *
 * State management for the token stream with mark/reset for backtracking.
 */

import type { Token, Position } from '../types'

/** Where a structured read gave up: the token nothing could take, and the form it was inside. */
export interface ParseStop {
  position: Position
  found: string
  value: string
  /** The top-level form the read fell back from. */
  opener: { position: Position; found: string; value: string }
  /** At the end of a surface, the innermost bracket still owed a close. */
  unclosed?: { position: Position; value: string }
}

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
  /**
   * The furthest index any branch reached. Backtracking rewinds `position` but
   * never this, so it names the token nothing could take.
   */
  furthest: number
  /** True while the cursor reads the body of a capsule-led block, `~<rationale>{…}`, where prose may stand. */
  proseGround: boolean
  /** Set when a structured read falls back to prose. */
  stop?: ParseStop
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
    furthest: 0,
    proseGround: false,
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
    if (stream.position > stream.furthest) stream.furthest = stream.position
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

const CLOSERS: Record<string, string> = { '}': '{', ']': '[', ')': '(' }

function innermostUnclosed(tokens: readonly Token[]): Token | undefined {
  const open: Token[] = []
  for (const token of tokens) {
    if (token.type === 'CONTAINER_OPEN') open.push(token)
    else if (token.type === 'CONTAINER_CLOSE' && open.at(-1)?.value === CLOSERS[token.value]) open.pop()
  }
  return open.at(-1)
}

/** Read where structured parsing stopped, from the furthest any branch reached. */
export function readStop(stream: TokenStream, stall: Token): ParseStop {
  let index = stream.furthest
  while (stream.tokens[index]?.type === 'WHITESPACE' || stream.tokens[index]?.type === 'COMMENT') index++
  const deepest = stream.tokens[index] ?? stall
  const unclosed = deepest.type === 'EOF' ? innermostUnclosed(stream.tokens) : undefined
  return {
    position: deepest.span.start,
    found: deepest.type,
    value: deepest.value,
    opener: { position: stall.span.start, found: stall.type, value: stall.value },
    ...(unclosed ? { unclosed: { position: unclosed.span.start, value: unclosed.value } } : {}),
  }
}

/** A stop in words, for the warning a writer reads. */
export function describeStop(stop: ParseStop, subject: string): string {
  if (stop.unclosed) {
    const { position, value } = stop.unclosed
    return `${subject} reached the end of the surface with ${JSON.stringify(value)} from line ${position.line}, column ${position.column} still open; surface degraded to prose.`
  }
  return `${subject} stopped at ${stop.found} ${JSON.stringify(stop.value)} (line ${stop.position.line}, column ${stop.position.column}); surface degraded to prose.`
}

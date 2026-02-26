/**
 * Position Tracking Types
 *
 * Types for tracking locations within source text.
 */

/** Character position within source text */
export interface Position {
  offset: number    // Character offset from start
  line: number      // 1-indexed line number
  column: number    // 1-indexed column number
}

/** Range spanning two positions */
export interface Span {
  start: Position
  end: Position
}

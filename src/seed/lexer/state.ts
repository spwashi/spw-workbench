/**
 * Lexer State Management
 *
 * State tracking and position helpers for the lexer.
 */

import type { Position } from '../types'

// ============================================================================
// Lexer State
// ============================================================================

export interface LexerState {
  input: string
  offset: number
  line: number
  column: number
}

export function createLexerState(input: string): LexerState {
  return {
    input,
    offset: 0,
    line: 1,
    column: 1,
  }
}

// ============================================================================
// Position Helpers
// ============================================================================

export function getPosition(state: LexerState): Position {
  return {
    offset: state.offset,
    line: state.line,
    column: state.column,
  }
}

export function advance(state: LexerState, count: number = 1): void {
  for (let i = 0; i < count && state.offset < state.input.length; i++) {
    if (state.input[state.offset] === '\n') {
      state.line++
      state.column = 1
    } else {
      state.column++
    }
    state.offset++
  }
}

export function peek(state: LexerState, offset: number = 0): string {
  return state.input[state.offset + offset] ?? ''
}

export function peekString(state: LexerState, length: number): string {
  return state.input.slice(state.offset, state.offset + length)
}

export function isAtEnd(state: LexerState): boolean {
  return state.offset >= state.input.length
}

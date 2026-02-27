/**
 * Parser State Types
 *
 * Types for parser state, context, and configuration.
 */

import type { Position } from './position'
import type { Token } from './token'
import type { ParseEvent, ErrorEventData } from './events'
import type { LexProfile } from './lex'

// ============================================================================
// Parser State
// ============================================================================

export interface ParserState {
  input: string
  position: Position
  depth: number
  tokens: Token[]
  errors: ParseEvent<ErrorEventData>[]
}

// ============================================================================
// Parser Context
// ============================================================================

export interface ParserContext {
  state: ParserState
  options: ParserOptions
  emit: (event: Omit<ParseEvent, 'timestamp' | 'depth'>) => void
}

// ============================================================================
// Parser Options
// ============================================================================

export interface ParserOptions {
  includeComments: boolean
  includeWhitespace: boolean
  maxErrors: number
  debug: boolean
  /** Optional lex profile for experimental syntax. */
  lexProfile?: LexProfile | string
}

export const DEFAULT_OPTIONS: ParserOptions = {
  includeComments: true,
  includeWhitespace: true,
  maxErrors: 10,
  debug: false,
  lexProfile: undefined,
}

/**
 * Parser State Types
 *
 * Types for parser state, context, and configuration.
 */

import type { Position } from './position'
import type { Token } from './token'
import type { ParseEvent, ErrorEventData, ParseEventPolicy } from './events'
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

export type ParseContextMode = 'low' | 'high'

export interface ParserOptions {
  includeComments: boolean
  includeWhitespace: boolean
  maxErrors: number
  debug: boolean
  /** Retained event detail; diagnostics remain available in errors/warnings. */
  eventPolicy: ParseEventPolicy
  /** Optional lex profile for experimental syntax. */
  lexProfile?: LexProfile | string
  /**
   * Parsing strictness mode for context-sensitive sugar.
   * low: strict, explicit syntax only
   * high: accepts ergonomic sugar and desugars into canonical forms
   */
  contextMode: ParseContextMode
  /**
   * When true (default), detect Spw dialect from source headers/pragmas and
   * apply dialect metasyntax (e.g. newline-as-space for Spw.l / Spw.q).
   * Set false to disable auto-detection.
   */
  autoDialect?: boolean
  /** Explicit dialect id (Spw.b | Spw.l | …); overrides auto-detection when set. */
  dialect?: string
  /** Optional path for path-based dialect/review defaults (repo-relative preferred). */
  path?: string
}

export const DEFAULT_OPTIONS: ParserOptions = {
  includeComments: true,
  includeWhitespace: true,
  maxErrors: 10,
  debug: false,
  eventPolicy: 'trace',
  lexProfile: undefined,
  contextMode: 'low',
  autoDialect: true,
  dialect: undefined,
  path: undefined,
}

/**
 * Parse Event Types
 *
 * Event types yielded by generators for logging and instrumentation.
 */

import type { Position } from './position'
import type { Token } from './token'

// ============================================================================
// Event Type Enumeration
// ============================================================================

export type ParseEventType =
  | 'token'         // Token produced
  | 'enter'         // Entering a rule/production
  | 'exit'          // Exiting a rule/production
  | 'match'         // Successful match
  | 'backtrack'     // Backtracking on failed alternative
  | 'error'         // Parse error
  | 'warning'       // Non-fatal issue
  | 'debug'         // Debug information

// ============================================================================
// Parse Event Interface
// ============================================================================

export interface ParseEvent<T = unknown> {
  type: ParseEventType
  rule: string              // Name of the grammar rule
  position: Position        // Current position in input
  data: T                   // Event-specific payload
  timestamp: number         // Performance timing
  depth: number             // Nesting depth for logging
}

// ============================================================================
// Event Data Payloads
// ============================================================================

/** Data for 'token' events */
export interface TokenEventData {
  token: Token
}

/** Data for 'enter' events */
export interface EnterEventData {
  input: string             // Preview of upcoming input
}

/** Data for 'exit' events */
export interface ExitEventData {
  success: boolean
  consumed: number          // Characters consumed
  result?: unknown          // Result can be any parsed value
}

/** Data for 'match' events */
export interface MatchEventData {
  matched: string
  expected?: string
}

/** Data for 'backtrack' events */
export interface BacktrackEventData {
  reason: string
  alternatives: string[]
  tried: number
}

/** Data for 'error' events */
export interface ErrorEventData {
  message: string
  expected?: string[]
  found?: string
  recoverable: boolean
}

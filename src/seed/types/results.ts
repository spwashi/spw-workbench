/**
 * Parse Result Types
 *
 * Types for parser results and generator return values.
 */

import type { ParseEvent, ErrorEventData } from './events'
import type { ASTNode } from './ast'

// ============================================================================
// Parse Generator Type
// ============================================================================

export type ParseGenerator<T = ASTNode> = Generator<ParseEvent, ParseResult<T>, void>

// ============================================================================
// Parse Result
// ============================================================================

export interface ParseResult<T = ASTNode> {
  success: boolean
  value?: T
  error?: ErrorEventData
  consumed: number
}

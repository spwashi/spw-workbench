/**
 * Parser Output Types
 *
 * Result types for parser operations.
 */

import type { Token, ParseEvent, SeedNode } from '../types'

/**
 * Result of a parse operation
 */
export interface ParseOutput<T = SeedNode> {
  success: boolean
  ast?: T
  tokens: Token[]
  events: ParseEvent[]
  errors: ParseEvent[]
  warnings: ParseEvent[]
  error?: { message: string, expected?: string[], found?: string }
  duration: number
  lexProfile?: string
}

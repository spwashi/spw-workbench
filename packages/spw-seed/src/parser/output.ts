/**
 * Parser Output Types
 *
 * Result types for parser operations.
 */

import type {
  Token,
  TokenGap,
  ParseEvent,
  ParseEventCounts,
  ParseEventPolicy,
  SeedNode,
} from '../types'

/**
 * Result of a parse operation
 */
export interface ParseOutput<T = SeedNode> {
  success: boolean
  ast?: T
  tokens: Token[]
  gaps: TokenGap[]
  events: ParseEvent[]
  eventPolicy: ParseEventPolicy
  eventCounts: ParseEventCounts
  errors: ParseEvent[]
  warnings: ParseEvent[]
  error?: { message: string, expected?: string[], found?: string }
  duration: number
  lexProfile?: string
  /** Resolved dialect after detection (Spw.b, Spw.l, …). */
  dialect?: string
  /** How dialect was chosen: header | pragma | path | option | default */
  dialectSource?: string
  /** True when newline-as-space (or other) preprocess rewrote the input. */
  dialectPreprocessed?: boolean
  /** Experimental / plan syntax ids cited via =exp[ id: … ] (and known catalog hits). */
  experimentalRefs?: string[]
}

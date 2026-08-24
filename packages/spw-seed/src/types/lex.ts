import type { ParseEvent, ParseEventCounts, ParseEventPolicy } from './events'
import type { TokenGap } from './gaps'
import type { Token } from './token'

/**
 * Lexing Profiles
 *
 * Tunable lexing for experimental syntax and subparsing.
 */

export interface LexProfile {
  id: string
  name: string
  /**
   * Override or extend operator tokens. Keys are literal operator strings.
   * Values are semantic kinds (string) attached to Token.kind.
   */
  operators?: Record<string, string>
  /**
   * Override or extend connector tokens. Keys are literal connector strings.
   * Values are semantic kinds (string) attached to Token.kind.
   */
  connectors?: Record<string, string>
  /** Additional operator tokens to include (kind defaults to token string). */
  extraOperators?: string[]
  /** Additional connector tokens to include (kind defaults to token string). */
  extraConnectors?: string[]
  /** Operator tokens to disable for this profile. */
  disabledOperators?: string[]
  /** Connector tokens to disable for this profile. */
  disabledConnectors?: string[]
  /** Treat unknown characters as text tokens instead of errors. */
  unknownAsText?: boolean
  /** Allowed quote characters for string literals (default: ["\"", "'"]). */
  stringQuotes?: string[]
}

export interface LexOptions {
  profile?: LexProfile | string
  /** Retained event detail; generation counts remain visible for cost accounting. */
  eventPolicy?: ParseEventPolicy
}

export interface LexOutput {
  tokens: Token[]
  gaps: TokenGap[]
  events: ParseEvent[]
  eventPolicy: ParseEventPolicy
  eventCounts: ParseEventCounts
}

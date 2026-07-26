/**
 * Token Types
 *
 * Lexical token definitions for Spw language.
 */

import type { Span } from './position'

// ============================================================================
// Token Kind Types (Spw-specific)
// ============================================================================

/**
 * Spw operators — must stay consistent with OperatorSigil in core/types/branded.ts
 * 12 sigils: ! ^ ~ ? * = @ # . & $ %
 */
export type OperatorKind = '!' | '^' | '~' | '?' | '*' | '=' | '@' | '#' | '.' | '&' | '$' | '%' | '<>'

/** Spw modifiers: valence markers */
export type ModifierKind = 'bone' | 'boon' | 'bane' | 'bonk' | 'honk'

/** Spw connectors: sequence, alternative, parallel, path, mapping */
export type ConnectorKind = '..' | '|' | '/' | '->'

/** Container delimiters */
export type ContainerKind =
  | '(' | ')' | '[' | ']' | '{' | '}'
  | '<<' | '>>'           // streaming boundaries
  | '((' | '))'           // n-range
  | '<' | '>'             // capsule shell

// ============================================================================
// Token Type Enumeration
// ============================================================================

export type TokenType =
  | 'OPERATOR'
  | 'MODIFIER'
  | 'CONNECTOR'
  | 'SPREAD'
  | 'ARROW'
  | 'TEXT'
  | 'DOT'
  | 'CONTAINER_OPEN'
  | 'CONTAINER_CLOSE'
  | 'STREAM_OPEN'
  | 'STREAM_CLOSE'
  | 'NRANGE_OPEN'
  | 'NRANGE_CLOSE'
  | 'CAPSULE_OPEN'
  | 'CAPSULE_CLOSE'
  | 'IDENTIFIER'
  | 'PHRASE'         // `backtick phrase` (canonical string form)
  | 'HOLE'           // _ (unification variable / pattern wildcard)
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'REFERENCE'      // @path
  | 'ANNOTATION'     // ~#identifier (aspect particle; legacy bespoke token)
  | 'GLOSS'          // ~#(phrase) or ~#name(phrase) — a reading laid alongside
  | 'PARTICLE'       // #>name deixis, #:name case — the ⟨stance⟩#⟨aim⟩name lattice
  | 'COMMENT'
  | 'WHITESPACE'
  | 'COLON'
  | 'COMMA'
  | 'COMPARISON'     // == != < > <= >=
  | 'EOF'
  | 'ERROR'

// ============================================================================
// Token Interface
// ============================================================================

export interface Token<T extends TokenType = TokenType> {
  type: T
  value: string
  span: Span
  /** Type-specific metadata (operator kind, modifier kind, etc.) */
  kind?: OperatorKind | ModifierKind | ConnectorKind | ContainerKind | string
}

/**
 * Whether a token carries structure worth scanning — everything but the
 * whitespace and end-of-file padding a token walk almost always drops first.
 *
 * The `tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')` this
 * replaces was written out at a dozen call sites; naming it makes a token scan
 * read as what it is and gives consumers of the kernel one definition of
 * "significant" to share.
 */
export function isSignificantToken(token: Token): boolean {
  return token.type !== 'WHITESPACE' && token.type !== 'EOF'
}

/** The significant tokens of a stream, in order. */
export function significantTokens(tokens: readonly Token[]): Token[] {
  return tokens.filter(isSignificantToken)
}

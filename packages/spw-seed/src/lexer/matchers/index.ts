/**
 * Token Matchers
 *
 * Export all token matchers for the lexer.
 */

import type { Token, ParseEvent } from '../../types'
import type { LexerState } from '../state'

// ============================================================================
// Token Matcher Type
// ============================================================================

export type TokenMatcher = (
  state: LexerState,
  depth: number
) => Generator<ParseEvent, Token | null, void>

// ============================================================================
// Matcher Exports
// ============================================================================

export { matchWhitespace } from './whitespace'
export { matchLineComment, matchBlockComment } from './comments'
export { matchParticle } from './particles'
export { matchOperator, createOperatorMatcher } from './operators'
export { matchConnector, createConnectorMatcher } from './connectors'
export { matchContainer } from './containers'
export { matchModifier } from './modifiers'
export { matchString, createStringMatcher, matchNumber, matchBoolean } from './literals'
export { matchIdentifier, matchAnnotation } from './identifiers'
export { matchPhrase } from './phrases'
export { matchSpread, matchArrow } from './patterns'
export { matchDot, matchColon, matchComma, matchComparison } from './punctuation'

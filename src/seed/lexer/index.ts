/**
 * Spw Lexer
 *
 * Generator-based tokenizer that yields ParseEvents for each token.
 */

export { type LexerState, createLexerState, getPosition, advance, peek, peekString, isAtEnd } from './state'
export { type TokenMatcher } from './matchers'
export * from './matchers'

export { tokenize } from './tokenize'
export { lex } from './lex'
export {
  DEFAULT_LEX_PROFILE,
  PROSE_LEX_PROFILE,
  registerLexProfile,
  resolveLexProfile,
  getLexProfile,
  listLexProfiles,
  buildOperatorMap,
  buildConnectorMap,
} from './profiles'

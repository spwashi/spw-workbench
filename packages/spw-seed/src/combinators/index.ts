/**
 * Spw Parser Combinators
 *
 * Composable generator-based parsing primitives.
 * Each combinator yields ParseEvents and returns ParseResult.
 */

import type { ParseEvent, ParseResult, ASTNode } from '../types'
import type { TokenStream } from './stream'

// Core Parser Type
export type Parser<T = ASTNode> = (
  stream: TokenStream,
  depth: number
) => Generator<ParseEvent, ParseResult<T>, void>

// Re-export stream utilities
export {
  type TokenStream,
  createTokenStream,
  current,
  peek,
  advance,
  isAtEnd,
  mark,
  unmark,
  reset,
  getPosition,
} from './stream'

// Re-export primitives
export { token, tokenOneOf, literal } from './primitives'

// Re-export composition combinators
export { sequence, choice, many, many1, optional } from './composition'

// Re-export transform combinators
export { map, sepBy, sepByOptional, between } from './transform'

// Re-export utilities
export { lazy, named, skipWhitespace, lexeme } from './utilities'

/**
 * The browser-safe slice of seed a reader needs: lexing, parsing, token
 * filters, and the particle tables. Nothing here reaches a node built-in, so
 * the parser release can bundle the editor's reading functions on top of it;
 * the package index stays the full surface for node consumers.
 *
 * @see packages/spw-lsp/src/reader.ts — the reading functions built on it
 */

export { lex } from './lexer/lex'
export { parse, parseExpression } from './parser'
export { significantTokens } from './types/token'
export { deixisTable } from './canonical/particles'
export type { Token } from './types'
export type { ASTNode } from './types/ast'

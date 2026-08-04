/**
 * Literal and Identifier Parsers
 *
 * String, number, boolean literals and identifier nodes.
 */

import type { Token, LiteralNode, IdentifierNode } from '../types'
import { type Parser, choice, map, named } from '../combinators'
import { stringLit, numberLit, booleanLit, phraseLit, identifier } from './tokens'

type LiteralToken = Token<'STRING'> | Token<'NUMBER'> | Token<'BOOLEAN'> | Token<'PHRASE'>

/**
 * Literal node: string, number, boolean, or backtick phrase.
 *
 * PHRASE was lexed but had no grammar rule, so canon that quotes notation in
 * backticks — `` `=[depth]{ deep shallow }` `` — degraded to prose wholesale.
 */
export const literalNode: Parser<LiteralNode> = named('literal',
  map(
    choice<LiteralToken>(
      stringLit as Parser<LiteralToken>,
      numberLit as Parser<LiteralToken>,
      booleanLit as Parser<LiteralToken>,
      phraseLit as Parser<LiteralToken>
    ),
    (tok, span): LiteralNode => ({
      type: 'Literal',
      span,
      token: tok,
    })
  )
)

/**
 * Identifier node
 */
export const identifierNode: Parser<IdentifierNode> = named('identifier',
  map(
    identifier,
    (tok, span): IdentifierNode => ({
      type: 'Identifier',
      span,
      token: tok,
    })
  )
)

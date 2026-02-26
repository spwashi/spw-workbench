/**
 * Literal and Identifier Parsers
 *
 * String, number, boolean literals and identifier nodes.
 */

import type { Token, LiteralNode, IdentifierNode } from '../types'
import { type Parser, choice, map, named } from '../combinators'
import { stringLit, numberLit, booleanLit, identifier } from './tokens'

type LiteralToken = Token<'STRING'> | Token<'NUMBER'> | Token<'BOOLEAN'>

/**
 * Literal node: string, number, or boolean
 */
export const literalNode: Parser<LiteralNode> = named('literal',
  map(
    choice<LiteralToken>(
      stringLit as Parser<LiteralToken>,
      numberLit as Parser<LiteralToken>,
      booleanLit as Parser<LiteralToken>
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

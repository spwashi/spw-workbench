/**
 * Token Parsers
 *
 * Base token matchers wrapped with lexeme for whitespace handling.
 */

import { token, lexeme } from '../combinators'

// Basic token parsers
export const operator = lexeme(token('OPERATOR'))
export const modifier = lexeme(token('MODIFIER'))
export const connector = lexeme(token('CONNECTOR'))
export const spread = lexeme(token('SPREAD'))
export const arrow = lexeme(token('ARROW'))
export const identifier = lexeme(token('IDENTIFIER'))
export const stringLit = lexeme(token('STRING'))
export const numberLit = lexeme(token('NUMBER'))
export const booleanLit = lexeme(token('BOOLEAN'))
export const annotation = lexeme(token('ANNOTATION'))
export const particle = lexeme(token('PARTICLE'))
export const gloss = lexeme(token('GLOSS'))
export const colon = lexeme(token('COLON'))
export const comma = lexeme(token('COMMA'))
export const streamOpen = lexeme(token('STREAM_OPEN'))
export const streamClose = lexeme(token('STREAM_CLOSE'))
export const nrangeOpen = lexeme(token('NRANGE_OPEN'))
export const nrangeClose = lexeme(token('NRANGE_CLOSE'))
export const capsuleOpen = lexeme(token('CAPSULE_OPEN'))
export const capsuleClose = lexeme(token('CAPSULE_CLOSE'))

// Container parsers
export const openParen = lexeme(token('CONTAINER_OPEN', '('))
export const closeParen = lexeme(token('CONTAINER_CLOSE', ')'))
export const openBracket = lexeme(token('CONTAINER_OPEN', '['))
export const closeBracket = lexeme(token('CONTAINER_CLOSE', ']'))
export const openBrace = lexeme(token('CONTAINER_OPEN', '{'))
export const closeBrace = lexeme(token('CONTAINER_CLOSE', '}'))

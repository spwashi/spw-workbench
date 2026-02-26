/**
 * Spw Grammar Rules
 *
 * Generator-based grammar implementation using combinators.
 * Each rule is a composable parser that yields ParseEvents.
 *
 * Grammar (simplified):
 *   seed       ::= annotation* expression
 *   expression ::= term (connector term)*
 *   term       ::= operation | scope | reference | capsule | stream | nrange
 *   operation  ::= modifier_chain? operator frame? body?
 *   scope      ::= "(" (identifier ":")? sequence ")"
 *   frame      ::= "[" content "]"
 *   body       ::= "{" sequence "}"
 */

// Token parsers
export {
  operator,
  modifier,
  connector,
  identifier,
  stringLit,
  numberLit,
  booleanLit,
  annotation,
  colon,
  comma,
  capsuleOpen,
  capsuleClose,
  streamOpen,
  streamClose,
  nrangeOpen,
  nrangeClose,
  openParen,
  closeParen,
  openBracket,
  closeBracket,
  openBrace,
  closeBrace,
} from './tokens'

// Literal and identifier nodes
export { literalNode, identifierNode } from './literals'

// Pattern nodes
export { wildcardNode, spreadNode, patternNode, matchArmNode } from './patterns'

// Reference and annotation nodes
export { referenceNode, annotationNode } from './references'

// Modifier chain
export { modifierChain } from './modifiers'

// Parameter node
export { parameterNode } from './parameters'

// Container nodes (frame, body, scope, capsule, stream, nrange)
export { frameNode, bodyNode, scopeNode, capsuleNode, streamNode, nrangeNode } from './containers'

// Expression and sequence nodes
export {
  expressionNode,
  operationNode,
  termNode,
  sequenceNode,
  expressionImpl,
  sequenceImpl,
} from './expressions'

// Seed node (top-level)
export { seedNode } from './seed'

// Prose node
export { proseNode, proseTextNode } from './prose'

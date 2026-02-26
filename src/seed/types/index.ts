/**
 * Spw Parser Types
 *
 * Central export for all type definitions.
 */

// Position tracking
export type { Position, Span } from './position'

// Token types
export type {
  OperatorKind,
  ModifierKind,
  ConnectorKind,
  ContainerKind,
  TokenType,
  Token,
} from './token'

// Lexing profiles
export type {
  LexProfile,
  LexOptions,
} from './lex'

// Parse events
export type {
  ParseEventType,
  ParseEvent,
  TokenEventData,
  EnterEventData,
  ExitEventData,
  MatchEventData,
  BacktrackEventData,
  ErrorEventData,
} from './events'

// AST types
export type {
  ASTNodeType,
  ASTNode,
  SeedNode,
  ExpressionNode,
  SequenceNode,
  OperationNode,
  CapsuleNode,
  StreamNode,
  NRangeNode,
  ModifierChainNode,
  ScopeNode,
  FrameNode,
  BodyNode,
  ReferenceNode,
  LiteralNode,
  IdentifierNode,
  AnnotationNode,
  ParameterNode,
  ConditionNode,
  ProseNode,
  ProseChunkNode,
} from './ast'
export * from './ast/nodes'

// Parser state and context
export type {
  ParserState,
  ParserContext,
  ParserOptions,
} from './state'
export { DEFAULT_OPTIONS } from './state'

// Parse results
export type {
  ParseGenerator,
  ParseResult,
} from './results'

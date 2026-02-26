/**
 * Spw Parser
 *
 * A generator-based parser for the Spw language.
 * All parsing operations yield ParseEvent objects for unified logging and debugging.
 *
 * @spw:portable - No DOM or app-specific imports allowed
 */

// Core types
export type {
  Position,
  Span,
  Token,
  TokenType,
  OperatorKind,
  ModifierKind,
  ConnectorKind,
  ContainerKind,
  ParseEvent,
  ParseEventType,
  TokenEventData,
  EnterEventData,
  ExitEventData,
  MatchEventData,
  BacktrackEventData,
  ErrorEventData,
  ASTNode,
  ASTNodeType,
  SeedNode,
  ExpressionNode,
  OperationNode,
  ModifierChainNode,
  ScopeNode,
  FrameNode,
  BodyNode,
  SequenceNode,
  ReferenceNode,
  LiteralNode,
  IdentifierNode,
  AnnotationNode,
  ConditionNode,
  ParameterNode,
  ProseNode,
  ProseChunkNode,
  CapsuleNode,
  StreamNode,
  NRangeNode,
  MatchNode,
  MatchArmNode,
  WildcardNode,
  SpreadNode,
  PatternNode,
  ParseGenerator,
  ParseResult,
  ParserOptions,
  LexProfile,
  LexOptions,
} from './types'

export { DEFAULT_OPTIONS } from './types'

// Lexer
export {
  lex,
  tokenize,
  DEFAULT_LEX_PROFILE,
  PROSE_LEX_PROFILE,
  registerLexProfile,
  resolveLexProfile,
  getLexProfile,
  listLexProfiles,
  buildOperatorMap,
  buildConnectorMap,
} from './lexer'

// Combinators
export type { TokenStream, Parser } from './combinators'
export {
  createTokenStream,
  sequence,
  choice,
  many,
  many1,
  optional,
  map,
  sepBy,
  between,
  lazy,
  named,
  token,
} from './combinators'

// Grammar
export {
  seedNode,
  expressionNode,
  operationNode,
  scopeNode,
  frameNode,
  bodyNode,
  sequenceNode,
  referenceNode,
  literalNode,
  annotationNode,
  modifierChain,
  parameterNode,
} from './grammar'

// Parser
export type { ParseOutput, LogFormatter, TraceNode } from './parser'
export {
  parse,
  parseExpression,
  parseStream,
  parseWithLog,
  textFormatter,
  jsonFormatter,
  compactFormatter,
  filterEvents,
  extractTokens,
  extractErrors,
  buildTrace,
  printAST,
} from './parser'

// Instrumentation
export type {
  InstrumentationHooks,
  ASTVisitor,
  AuditItem,
  ASTAuditResult,
  RuleCoverage,
  CoverageReport,
  TimingMetrics,
  RuleTiming,
  EventFilter,
  EventSubscriber,
} from './instrumentation'

export {
  noopHooks,
  createHooks,
  combineHooks,
  processEvent,
  walkAST,
  getNodeChildren,
  findNodes,
  getNodePath,
  getMaxDepth,
  countNodeTypes,
  auditAST,
  CoverageCollector,
  createCoverageHooks,
  MetricsCollector,
  createMetricsHooks,
  EventStream,
  eventFilters,
  createStreamHooks,
} from './instrumentation'

// Canonicalization
export {
  canonicalize,
  hashString,
  type CanonicalOptions,
  type CanonicalResult,
} from './canonical'

// NL preview
export { previewAST } from './instrumentation/preview'

// Sugar/desugar helpers
export { desugar, parseDesugared, type DesugarResult } from './normalize'

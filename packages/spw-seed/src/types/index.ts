export type { Brand } from './brand'
export { castToBrand } from './brand'
export { $register, $frame, $domain, $layer, RegisterId, FrameId, DomainId, LayerId } from './ids'

// Coupling algebra (digraph operator <> + paired boundaries)
export type {
  CouplingKind,
  PairedBoundaryKind,
  CouplingForm,
  BoundarySide,
  CouplingOccupancy,
  CouplingPayload,
  EmptyBoundaryPayload,
  InhabitedBoundaryPayload,
  ActPlacement,
  OperatorCouplingPort,
  BoundaryCouplingPort,
  CouplingPort,
  CouplingDescriptor,
  OperatorCouplingDescriptor,
  BoundaryCouplingDescriptor,
  CouplingFrame,
  OperatorCouplingFrame,
  BoundaryCouplingFrame,
  BoundarySurfaceCoordinate,
  CouplingProfileStatus,
  CouplingDimensionValueType,
  CouplingDimensionDefinition,
  CouplingPortSemantics,
  CouplingDynamicsDefinition,
  CouplingKindSemantics,
  CouplingSemanticsProfile,
  CouplingProfileIssue,
  CouplingSemanticsProjection,
} from './coupling'
export {
  PAIRED_BOUNDARY_KINDS,
  COUPLING_DESCRIPTORS,
  couplingFrame,
  withCoupling,
  occupancyFromArgs,
  classifyPayload,
  couplingDescriptor,
  boundaryCoordinateForSurface,
  boundarySetForProfile,
  validateCouplingSemanticsProfile,
  projectCouplingSemantics,
  isBoundaryCouplingFrame,
  readCouplingFrame,
} from './coupling'

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
  IdentifierTokenData,
} from './token'
export { isSignificantToken, significantTokens } from './token'

// Lexing profiles
export type {
  LexProfile,
  LexOptions,
  LexOutput,
} from './lex'

export type { GapClass, TokenGap } from './gaps'
export { GAP_CLASSES } from './gaps'

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
  ParseEventPolicy,
  ParseEventCounts,
} from './events'
export { PARSE_EVENT_POLICIES, retainsParseEvent } from './events'

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
  AppositionLabel,
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
  ParseContextMode,
  ParserOptions,
} from './state'
export { DEFAULT_OPTIONS } from './state'

// Parse results
export type {
  ParseGenerator,
  ParseResult,
} from './results'

/**
 * AST Node Types
 *
 * Specific node interfaces for each Spw grammar construct.
 */

import type { Token } from '../token'
import type { ASTNode } from './index'

// ============================================================================
// Top-Level Nodes
// ============================================================================

export interface SeedNode extends ASTNode {
  type: 'Seed'
  annotations: AnnotationNode[]
  expression: ExpressionNode | ProseNode
}

export type TermNode = OperationNode | ScopeNode | ReferenceNode | CapsuleNode | StreamNode | NRangeNode | BodyNode | LiteralNode | FrameNode | MatchNode | WildcardNode | SpreadNode

export interface MatchNode extends ASTNode {
  type: 'Match'
  input: ExpressionNode
  arms: MatchArmNode[]
}

export interface MatchArmNode extends ASTNode {
  type: 'MatchArm'
  pattern: PatternNode
  handler: ExpressionNode | BodyNode
}

export type PatternNode =
  | WildcardNode
  | ReferenceNode
  | LiteralNode
  | SpreadNode
  | FrameNode
  | ScopeNode
  | OperationNode

export interface WildcardNode extends ASTNode {
  type: 'Wildcard'
}

export interface SpreadNode extends ASTNode {
  type: 'Spread'
  capture?: ReferenceNode
}

export interface ExpressionNode extends ASTNode {
  type: 'Expression'
  terms: TermNode[]
  connectors: Token<'CONNECTOR'>[]
}

export interface SequenceNode extends ASTNode {
  type: 'Sequence'
  expressions: ExpressionNode[]
}

// ============================================================================
// Operation Nodes
// ============================================================================

export interface ProseNode extends ASTNode {
  type: 'Prose'
  chunks: (ProseChunkNode | ExpressionNode | OperationNode | CapsuleNode | ReferenceNode | ScopeNode | StreamNode | NRangeNode | BodyNode)[]
}

export interface ProseChunkNode extends ASTNode {
  type: 'ProseChunk'
  text: string
}


export interface OperationNode extends ASTNode {
  type: 'Operation'
  position?: 'prefix' | 'postfix'
  modifiers?: ModifierChainNode
  operator: Token<'OPERATOR'>
  operatorLabel?: Token<'IDENTIFIER'>
  frame?: FrameNode
  body?: BodyNode
  subject?: TermNode
  linePayload?: ProseChunkNode
}

export interface CapsuleNode extends ASTNode {
  type: 'Capsule'
  open: Token<'CAPSULE_OPEN'>
  tag?: Token<'IDENTIFIER'>
  frame?: FrameNode
  body?: BodyNode
}

export interface StreamNode extends ASTNode {
  type: 'Stream'
  open: Token<'STREAM_OPEN'>
  sequence: SequenceNode
  close: Token<'STREAM_CLOSE'>
  sink?: ReferenceNode
}

export interface NRangeNode extends ASTNode {
  type: 'NRange'
  expression: ExpressionNode
  open: Token<'NRANGE_OPEN'>
  close: Token<'NRANGE_CLOSE'>
}

export interface ModifierChainNode extends ASTNode {
  type: 'ModifierChain'
  modifiers: Token<'MODIFIER'>[]
}

// ============================================================================
// Container Nodes
// ============================================================================

export interface ScopeNode extends ASTNode {
  type: 'Scope'
  name?: Token<'IDENTIFIER'>
  openLabel?: Token<'IDENTIFIER'>
  closeLabel?: Token<'IDENTIFIER'>
  sequence: SequenceNode
}

export interface FrameNode extends ASTNode {
  type: 'Frame'
  openLabel?: Token<'IDENTIFIER'>
  closeLabel?: Token<'IDENTIFIER'>
  content: (PatternNode | ParameterNode | ConditionNode)[]
}

export interface BodyNode extends ASTNode {
  type: 'Body'
  openLabel?: Token<'IDENTIFIER'>
  closeLabel?: Token<'IDENTIFIER'>
  sequence: SequenceNode
}

// ============================================================================
// Value Nodes
// ============================================================================

export interface ReferenceNode extends ASTNode {
  type: 'Reference'
  path: Token<'IDENTIFIER'>[]
  raw?: string
}

export interface LiteralNode extends ASTNode {
  type: 'Literal'
  token: Token<'STRING'> | Token<'NUMBER'> | Token<'BOOLEAN'>
}

export interface IdentifierNode extends ASTNode {
  type: 'Identifier'
  token: Token<'IDENTIFIER'>
}

// ============================================================================
// Annotation & Parameter Nodes
// ============================================================================

export interface AnnotationNode extends ASTNode {
  type: 'Annotation'
  name: Token<'IDENTIFIER'>
  value?: LiteralNode | ReferenceNode
}

export interface ParameterNode extends ASTNode {
  type: 'Parameter'
  name?: Token<'IDENTIFIER'>
  value: LiteralNode | ReferenceNode | ExpressionNode
}

// ============================================================================
// Condition Node
// ============================================================================

export interface ConditionNode extends ASTNode {
  type: 'Condition'
  left: ExpressionNode
  operator: Token<'COMPARISON'>
  right: ExpressionNode
}

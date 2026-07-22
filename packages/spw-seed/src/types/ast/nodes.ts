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
  expression: ExpressionNode | SequenceNode | ProseNode
}

export type TermNode =
  | BindingNode
  | BulletNode
  | PathRefNode
  | OperationNode
  | ScopeNode
  | ReferenceNode
  | CapsuleNode
  | StreamNode
  | NRangeNode
  | BodyNode
  | FrameNode
  | LiteralNode
  | IdentifierNode
  | AnnotationNode
  | MatchNode
  | WildcardNode
  | SpreadNode

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
// Binding / Bullet / Local Path Reference
// ============================================================================

export interface BindingNode extends ASTNode {
  type: 'Binding'
  key: TermNode
  value: ExpressionNode
}

export interface BulletNode extends ASTNode {
  type: 'Bullet'
  marker: Token<'CONNECTOR'>
  item: ExpressionNode | ProseChunkNode
}

export interface PathRefNode extends ASTNode {
  type: 'PathRef'
  operator: Token<'OPERATOR'>
  tag?: Token<'IDENTIFIER'>
  path: LiteralNode
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

/**
 * Capsule boundary `<…>`.
 *
 * Modes:
 * - **shell** — standalone `<tag>`, `<n>`, `<tag>[…]{…}`
 * - **medial** — composite `left<channel>right` (e.g. `bagel<scent>coffee`, `foo<5>bar`)
 *
 * Channel is the inspectable relation/quality/measure between arms.
 * Identifier channels also populate `tag` for backward-compatible tooling.
 */
export interface CapsuleNode extends ASTNode {
  type: 'Capsule'
  open: Token<'CAPSULE_OPEN'>
  /** Retained close delimiter when parse succeeded with a pair. */
  close?: Token<'CAPSULE_CLOSE'>
  /** Identifier channel (also set when channel is an IdentifierNode). */
  tag?: Token<'IDENTIFIER'>
  /**
   * Atom channel when the interior is a single identifier or literal
   * (numbers for quantitative composites, strings for quoted labels).
   */
  channel?: LiteralNode | IdentifierNode
  frame?: FrameNode
  body?: BodyNode
  /** Left arm of a medial composite (before `<`). */
  left?: TermNode
  /** Right arm of a medial composite (after `>`). */
  right?: TermNode
  /** `shell` default; `medial` when left and/or right arms are bound. */
  placement?: 'shell' | 'medial'
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
  /** Optional interior — empty `(())` is structured empty occupancy. */
  expression?: ExpressionNode
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
  name?: Token<'IDENTIFIER' | 'STRING'>
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
  value?: LiteralNode | ReferenceNode | PathRefNode
}

export interface ParameterNode extends ASTNode {
  type: 'Parameter'
  name?: Token<'IDENTIFIER' | 'STRING'>
  value: LiteralNode | ReferenceNode | PathRefNode | ExpressionNode
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

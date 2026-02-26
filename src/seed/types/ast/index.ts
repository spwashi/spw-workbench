/**
 * AST Base Types
 *
 * Core AST node type and enumeration.
 */

import type { Span } from '../position'

// ============================================================================
// AST Node Type Enumeration
// ============================================================================

export type ASTNodeType =
  | 'Seed'
  | 'Expression'
  | 'Operation'
  | 'Capsule'
  | 'Stream'
  | 'NRange'
  | 'Scope'
  | 'Frame'
  | 'Body'
  | 'Sequence'
  | 'ModifierChain'
  | 'Reference'
  | 'Literal'
  | 'Identifier'
  | 'Annotation'
  | 'Condition'
  | 'Parameter'
  | 'Comment'
  | 'Prose'
  | 'ProseChunk'
  | 'Match'
  | 'MatchArm'
  | 'Wildcard'
  | 'Spread'

// ============================================================================
// Base AST Node Interface
// ============================================================================

export interface ASTNode {
  type: ASTNodeType
  span: Span
  children?: ASTNode[]
}

// Re-export all specific node types
export * from './nodes'

// ONF types (Operator Normal Form)
export type { ONFNode, FrameMap } from './onf'

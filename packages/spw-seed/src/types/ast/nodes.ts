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
  expression: SeedExpressionNode
}

/** The grammar-owned expression surface carried by a seed or standalone parse. */
export type SeedExpressionNode = ExpressionNode | SequenceNode | ProseNode

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
  | ProseChunkNode
  | AnnotationNode
  | ParticleNode
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
  /** Same-line postfix `[…]` on an identifier-led noun. */
  frame?: FrameNode
  /** Same-line postfix `{…}` on an identifier-led noun. */
  body?: BodyNode
  /** Same-line postfix `(…)` on an identifier-led noun. */
  scope?: ScopeNode
  /** Same-line postfix shell `<…>` when not a two-arm medial capsule. */
  capsule?: CapsuleNode
}

/**
 * Sequence of sibling steps.
 *
 * Steps are joined by a separator from one table (`,`, `=>`, and the `;` / `||`
 * schedule pair); `separators[i]` is the mark written between `expressions[i]`
 * and `expressions[i + 1]`, or absent when steps were merely juxtaposed. Plain
 * chain connectors (`..`, `->`, `|`, `/`) are *not* separators — they bind
 * inside a single Expression at chain level. `;` and `||` lex as CONNECTOR but
 * rank here (see grammar/expressions.ts `isScheduleSeparator`).
 */
export interface SequenceNode extends ASTNode {
  type: 'Sequence'
  expressions: ExpressionNode[]
  /** Written separator marks, positionally aligned to the gaps between steps. */
  separators?: (Token<'COMMA'> | Token<'ARROW'> | Token<'CONNECTOR'> | undefined)[]
}

// ============================================================================
// Binding / Bullet / Local Path Reference
// ============================================================================

export interface BindingNode extends ASTNode {
  type: 'Binding'
  key: TermNode
  value: ExpressionNode
}

/**
 * Line-level item: `.. text` or, for plan streams, `>>[stamp] verb — text`.
 *
 * `>>` only marks an entry outside `<<…>>` bounds, where it closes nothing.
 */
export interface BulletNode extends ASTNode {
  type: 'Bullet'
  marker: Token<'CONNECTOR'> | Token<'STREAM_CLOSE'>
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
  /**
   * Full interior sequence when the channel is richer than a single atom
   * (`<X@1>`, `<Module|null>`, `<scheduled Record>`). Set only on the general
   * path; atom capsules keep `tag`/`channel` and leave this undefined.
   */
  interior?: SequenceNode
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
  /** `PHRASE` is the backtick string form — canon writes notation examples in it. */
  token: Token<'STRING'> | Token<'NUMBER'> | Token<'BOOLEAN'> | Token<'PHRASE'>
}

export interface IdentifierNode extends ASTNode {
  type: 'Identifier'
  token: Token<'IDENTIFIER'>
}

// ============================================================================
// Annotation & Parameter Nodes
// ============================================================================

/**
 * A reading laid alongside the thing it reads — `~#(nearest neighbor)` or
 * `~#lens(living system)`.
 *
 * Where `~#name: value` states a datum, an apposition states how to hold what sits
 * beside it, and the parens are the `@` container, so the reading is
 * perspectival by construction. The body is prose the parser keeps whole; an
 * anonymous apposition has no key because its text is its entire meaning.
 */
export interface AppositionLabel {
  /** Raw label text between the parens. */
  body: string
  /** True when no name was declared. */
  anonymous: boolean
}

export interface AnnotationNode extends ASTNode {
  type: 'Annotation'
  name: Token<'IDENTIFIER'>
  value?: LiteralNode | ReferenceNode | PathRefNode
  /** Present when written as `~#(phrase)` or `~#name(phrase)`. */
  apposition?: AppositionLabel
}

export interface ParameterNode extends ASTNode {
  type: 'Parameter'
  name?: Token<'IDENTIFIER' | 'STRING'>
  value: LiteralNode | ReferenceNode | PathRefNode | ExpressionNode
}

/**
 * Particle: the `⟨stance⟩#⟨aim⟩name` lattice on the resonance/metadata plane.
 * A particle binds to the expression that follows it in its sequence —
 * `#>anchor` (deixis) names the node after it; `#:layer` (case) classifies it.
 * The binding is derived, not stored: see canonical/particles.ts.
 */
export interface ParticleNode extends ASTNode {
  type: 'Particle'
  token: Token<'PARTICLE'>
  /** Postfix aim: `>` deixis (points), `:` case (classifies), `!` mood (asserts). */
  aim: '>' | ':' | '!'
  /** The particle's name, e.g. `spw_index` in `#>spw_index`. */
  name: Token<'IDENTIFIER'>
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

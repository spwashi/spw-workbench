/**
 * Spw Query Types
 *
 * Pattern-based selectors using Spw's own structural vocabulary:
 * sigils, braces, modifiers, and wildcards.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type { ASTNode, ASTNodeType, Span, OperatorKind, ModifierKind } from '../types'

// ── Sigil selector ────────────────────────────────────────────

/** Operator sigils that identify node semantic role */
export type SigilSelector = OperatorKind | '*'

// ── Brace selector ───────────────────────────────────────────

/** Container shapes that filter by structural form */
export type BraceSelector = '[]' | '{}' | '()'

// ── Pattern ──────────────────────────────────────────────────

/**
 * A SpwPattern matches AST nodes by structural shape.
 *
 * Patterns mirror Spw's own syntax:
 * - `{ sigil: '!' }` matches any ! operation      ($!_)
 * - `{ sigil: '!', brace: '[]' }` matches ![_]     ($![_])
 * - `{ sigil: '^', brace: '[]', brace2: '{}' }`    ($^[_]{_})
 * - `{ sigil: '~', value: './path' }` matches ~"./path"
 * - `{ modifier: 'boon' }` matches boon-modified nodes
 */
export interface SpwPattern {
  /** Match by operator sigil (!, ~, @, ^, #, ., ?, =, &, *, $, %) */
  sigil?: SigilSelector
  /** Match by concrete AST node type (PathRef, Reference, Operation, Scope, ...) */
  nodeType?: ASTNodeType
  /** Match by primary container shape */
  brace?: BraceSelector
  /** Match by secondary container (e.g. ^[_]{_} has brace=[] brace2={}) */
  brace2?: BraceSelector
  /** Match by modifier valence */
  modifier?: ModifierKind | string
  /** Match by literal content (path target, frame content, identifier) */
  value?: string
  /** Match by tree depth (0 = root) */
  depth?: number
  /** Match by depth range [min, max] inclusive */
  depthRange?: [number, number]
}

// ── Compositional combinators ────────────────────────────────

/**
 * Selector is the union of all matchable forms.
 *
 * Atomic: SpwPattern
 * Composite: and, or, not, descend, sequence
 */
export type SpwSelector =
  | SpwPattern
  | SpwAnd
  | SpwOr
  | SpwNot
  | SpwDescend
  | SpwSequence

export interface SpwAnd {
  and: [SpwSelector, SpwSelector]
}

export interface SpwOr {
  or: [SpwSelector, SpwSelector]
}

export interface SpwNot {
  not: SpwSelector
}

/** Descendant path: parent / child */
export interface SpwDescend {
  descend: [SpwSelector, SpwSelector]
}

/** Sequential siblings: a .. b */
export interface SpwSequence {
  seq: [SpwSelector, SpwSelector]
}

// ── Match result ─────────────────────────────────────────────

/** A matched node with its context */
export interface SpwMatch {
  /** The matched AST node */
  node: ASTNode
  /** Span in source text */
  span: SpwMatchSpan
  /** Path from root to this node */
  path: ASTNode[]
  /** Tree depth (0 = root) */
  depth: number
}

export interface SpwMatchSpan {
  startOffset: number
  endOffset: number
  startLine: number
  startCharacter: number
  endLine: number
  endCharacter: number
}

// ── Type guards ──────────────────────────────────────────────

export function isAnd(s: SpwSelector): s is SpwAnd {
  return 'and' in s
}

export function isOr(s: SpwSelector): s is SpwOr {
  return 'or' in s
}

export function isNot(s: SpwSelector): s is SpwNot {
  return 'not' in s
}

export function isDescend(s: SpwSelector): s is SpwDescend {
  return 'descend' in s
}

export function isSequence(s: SpwSelector): s is SpwSequence {
  return 'seq' in s
}

export function isPattern(s: SpwSelector): s is SpwPattern {
  return !isAnd(s) && !isOr(s) && !isNot(s) && !isDescend(s) && !isSequence(s)
}

// ── Combinator constructors ──────────────────────────────────

export function and(a: SpwSelector, b: SpwSelector): SpwAnd {
  return { and: [a, b] }
}

export function or(a: SpwSelector, b: SpwSelector): SpwOr {
  return { or: [a, b] }
}

export function not(s: SpwSelector): SpwNot {
  return { not: s }
}

export function descend(parent: SpwSelector, child: SpwSelector): SpwDescend {
  return { descend: [parent, child] }
}

export function seq(a: SpwSelector, b: SpwSelector): SpwSequence {
  return { seq: [a, b] }
}

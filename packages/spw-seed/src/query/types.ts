/**
 * Spw Query Types
 *
 * Pattern-based selectors using Spw's own structural vocabulary:
 * sigils, braces, modifiers, and wildcards.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type {
  ASTNode,
  ASTNodeType,
  OperatorKind,
  ModifierKind,
  PairedBoundaryKind,
  CouplingDescriptor,
} from '../types'

// ── Sigil selector ────────────────────────────────────────────

/** Operator sigils that identify node semantic role. `*` remains collapse. */
export type SigilSelector = OperatorKind

// ── Brace selector ───────────────────────────────────────────

/** Legacy three-shape projection for nodes carrying Frame/Body or representing Scope. */
export type BraceSelector = '[]' | '{}' | '()'

/** Canonical six-way paired-boundary identity, including angle and compound forms. */
export type BoundarySelector = PairedBoundaryKind

/** Boundaries the current Operation/Capsule AST can carry directly. */
export type AttachedBoundarySelector = Extract<BoundarySelector, 'frame' | 'body'>

// ── Pattern ──────────────────────────────────────────────────

/**
 * A SpwPattern matches AST nodes by structural shape.
 *
 * Patterns mirror Spw's own syntax:
 * Programmatic patterns omit textual placeholder provenance unless
 * `placeholder: true` is supplied explicitly.
 *
 * - `{ sigil: '!' }` matches any ! node
 * - `{ sigil: '!', brace: '[]' }` matches a ! node carrying a Frame
 * - `{ sigil: '^', brace: '[]', brace2: '{}' }` matches a ^ node carrying both
 * - `{ sigil: '~', value: './path' }` matches ~"./path"
 * - `{ modifier: 'boon' }` matches boon-modified nodes
 */
export interface SpwPattern {
  /** Match by operator sigil (!, ~, @, ^, #, ., ?, =, &, *, $, %, <>) */
  sigil?: SigilSelector
  /** Match by concrete AST node type (PathRef, Reference, Operation, Scope, ...) */
  nodeType?: ASTNodeType
  /** Match by the legacy primary container projection. */
  brace?: BraceSelector
  /** Match by secondary container (e.g. ^[_]{_} has brace=[] brace2={}) */
  brace2?: BraceSelector
  /** Match a boundary constructor itself. */
  boundary?: BoundarySelector
  /** Require boundary products directly carried by an operation or capsule. */
  withBoundaries?: readonly AttachedBoundarySelector[]
  /**
   * Anonymous `_` occurred in this atomic query surface. This is query
   * provenance, not a claim that the matched AST node itself is unoccupied.
   */
  placeholder?: true
  /** Match by modifier valence */
  modifier?: ModifierKind | string
  /**
   * Match an exact scalar: path/reference/literal/identifier value, Operation
   * label, Capsule tag, or the first descendant scalar of a boundary node.
   */
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
  | SpwAny
  | SpwCapture
  | SpwAnd
  | SpwOr
  | SpwNot
  | SpwDescend
  | SpwSequence

/** Explicit wildcard. This is distinct from the `*` collapse operator. */
export interface SpwAny {
  any: true
  /** Present only when the wildcard came from an explicit anonymous `_`. */
  placeholder?: true
}

/** Named participant evidence; `_` remains an anonymous query placeholder. */
export interface SpwCapture {
  capture: {
    name: string
    selector: SpwSelector
  }
}

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

/**
 * Adjacent term slots under one Sequence, or an otherwise-unowned Expression;
 * text spelling is unassigned.
 */
export interface SpwSequence {
  seq: [SpwSelector, SpwSelector, ...SpwSelector[]]
}

// ── Match result ─────────────────────────────────────────────

/** One concrete AST participant in a match group. */
export interface SpwMatchParticipant {
  /** The matched AST node */
  node: ASTNode
  /** Span in source text */
  span: SpwMatchSpan
  /** Ancestors from the root through this node's parent. */
  path: ASTNode[]
  /** Tree depth (0 = root) */
  depth: number
  /**
   * True when the selecting atomic query surface contained anonymous `_`.
   * This does not localize that hole to an AST boundary port.
   */
  placeholder: boolean
  /** Every programmatic capture name assigned to this participant. */
  captureNames: readonly string[]
  /** Ordered-term coordinates for sequence evidence. */
  slot?: SpwTermSlotCoordinate
  /** Structural coupling identity; dynamics remain profile-owned. */
  coupling?: CouplingDescriptor
}

export type SpwSequenceSeparator =
  | { kind: 'expression' }
  | { kind: 'connector'; value: string }

export interface SpwTermSlotCoordinate {
  ownerKind: 'sequence' | 'expression'
  ownerSpan: SpwMatchSpan
  expressionIndex: number
  termIndex: number
  separatorBefore: SpwSequenceSeparator | null
}

export interface SpwMatchEvidence {
  /**
   * Local AST evidence. Transport consumers must project a compact DTO rather
   * than serialize participant nodes and ancestor paths wholesale.
   */
  relation: 'node' | 'adjacent-term-slots'
  envelope: SpwMatchSpan
  participants: [SpwMatchParticipant, ...SpwMatchParticipant[]]
  /** Capture name to participant index. */
  captures: Record<string, number>
}

/** Compatibility aliases point to the first participant in the evidence. */
export interface SpwMatch extends SpwMatchParticipant {
  evidence: SpwMatchEvidence
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

export function isAny(s: SpwSelector): s is SpwAny {
  return 'any' in s
}

export function isCapture(s: SpwSelector): s is SpwCapture {
  return 'capture' in s
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
  return !isAny(s)
    && !isCapture(s)
    && !isAnd(s)
    && !isOr(s)
    && !isNot(s)
    && !isDescend(s)
    && !isSequence(s)
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

export function seq(
  first: SpwSelector,
  second: SpwSelector,
  ...rest: SpwSelector[]
): SpwSequence {
  return { seq: [first, second, ...rest] }
}

export function anyNode(): SpwAny {
  return { any: true }
}

export function capture(name: string, selector: SpwSelector): SpwCapture {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new TypeError('capture name must be an identifier')
  }
  return { capture: { name, selector } }
}

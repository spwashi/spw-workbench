/**
 * Structural Spw query matcher.
 *
 * Atomic selectors match AST nodes. Programmatic `seq(a, b)` matches adjacent
 * parser-owned term slots within one Sequence (or one otherwise-unowned
 * Expression). It never crosses into another nested sequence or source AST.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import {
  COUPLING_DESCRIPTORS,
  type ASTNode,
  type CapsuleNode,
  type ExpressionNode,
  type IdentifierNode,
  type LiteralNode,
  type OperationNode,
  type PairedBoundaryKind,
  type PathRefNode,
  type ReferenceNode,
  type SequenceNode,
  type TermNode,
} from '../types'
import { getNodeChildren, walkAST } from '../instrumentation'
import type {
  SpwMatch,
  SpwMatchEvidence,
  SpwMatchParticipant,
  SpwMatchSpan,
  SpwPattern,
  SpwSelector,
  SpwSequence,
  SpwTermSlotCoordinate,
} from './types'
import {
  isAnd,
  isAny,
  isCapture,
  isDescend,
  isNot,
  isOr,
  isPattern,
  isSequence,
} from './types'
import { assertSpwSelector } from './validate'
import { decodeQuotedToken } from './quoted'

interface NodeCandidate {
  node: ASTNode
  path: ASTNode[]
  depth: number
  slot?: SpwTermSlotCoordinate
}

interface ParticipantDraft {
  candidate: NodeCandidate
  placeholder: boolean
}

interface NodeEvaluation {
  anchor: ParticipantDraft
  captures: Map<string, ParticipantDraft>
}

interface TermSlot extends NodeCandidate {}

function toMatchSpan(node: ASTNode): SpwMatchSpan {
  return {
    startOffset: node.span.start.offset,
    endOffset: node.span.end.offset,
    startLine: Math.max(0, node.span.start.line - 1),
    startCharacter: Math.max(0, node.span.start.column - 1),
    endLine: Math.max(0, node.span.end.line - 1),
    endCharacter: Math.max(0, node.span.end.column - 1),
  }
}

function getNodeSigil(node: ASTNode): string | undefined {
  switch (node.type) {
    case 'Operation':
      return (node as OperationNode).operator.value
    case 'Reference':
      return '@'
    case 'PathRef':
      return '~'
    case 'Annotation':
      return '#'
    default:
      return undefined
  }
}

/** Compatibility projection for the original brace/brace2 fields. */
function getNodeBrace(node: ASTNode): '[]' | '{}' | '()' | undefined {
  const record = node as unknown as Record<string, unknown>
  if (record.frame && isNodeType(record.frame, 'Frame')) return '[]'
  if (record.body && isNodeType(record.body, 'Body')) return '{}'
  if (node.type === 'Scope') return '()'
  return undefined
}

function getNodeBrace2(node: ASTNode): '[]' | '{}' | '()' | undefined {
  const record = node as unknown as Record<string, unknown>
  const primary = getNodeBrace(node)
  if (primary === '[]' && record.body && isNodeType(record.body, 'Body')) return '{}'
  if (primary === '{}' && record.frame && isNodeType(record.frame, 'Frame')) return '[]'
  return undefined
}

function getNodeBoundary(node: ASTNode): PairedBoundaryKind | undefined {
  switch (node.type) {
    case 'Frame': return 'frame'
    case 'Body': return 'body'
    case 'Scope': return 'scope'
    case 'Capsule': return 'capsule'
    case 'Stream': return 'stream'
    case 'NRange': return 'nrange'
    default: return undefined
  }
}

function getAttachedBoundaries(node: ASTNode): PairedBoundaryKind[] {
  if (node.type !== 'Operation' && node.type !== 'Capsule') return []
  const owner = node as OperationNode | CapsuleNode
  const boundaries: PairedBoundaryKind[] = []
  if (owner.frame) boundaries.push('frame')
  if (owner.body) boundaries.push('body')
  return boundaries
}

function getNodeModifier(node: ASTNode): string | undefined {
  if (node.type !== 'Operation') return undefined
  return (node as OperationNode).modifiers?.modifiers?.[0]?.value
}

/**
 * Derive the named Act·Bound product a node normalizes to, read straight from the
 * AST. Mirrors the bound-product stamps in normalize.ts (the canonical source),
 * kept here so selectors can match `{ product: 'bias' }` without normalizing.
 */
function getNodeProduct(node: ASTNode): string | undefined {
  if (node.type !== 'Operation') return undefined
  const op = node as OperationNode
  const sigil = getNodeSigil(node)
  // Bias edge: any `=` carrying a body; anchor (subject) and axis (frame) optional.
  if (sigil === '=' && op.body) return 'bias'
  const hasFrameOnly = Boolean(op.frame && !op.body && !op.subject)
  const hasBodyOnly = Boolean(op.body && !op.frame && !op.subject)
  if (sigil === '.' && hasBodyOnly) return 'facet'
  if (hasFrameOnly && (sigil === '#' || sigil === '&' || sigil === '?')) return 'select'
  return undefined
}

function getNodeValue(node: ASTNode): string | undefined {
  switch (node.type) {
    case 'PathRef': {
      return unquote((node as PathRefNode).path.token.value)
    }
    case 'Reference':
      return (node as ReferenceNode).raw ?? undefined
    case 'Identifier':
      return (node as IdentifierNode).token.value
    case 'Literal':
      return unquote((node as LiteralNode).token.value)
    case 'Operation': {
      return (node as OperationNode).operatorLabel?.value
    }
    case 'Capsule':
      return (node as CapsuleNode).tag?.value
    case 'Frame':
    case 'Body':
    case 'Scope':
    case 'Stream':
    case 'NRange':
      return firstScalarValue(node)
    default:
      return undefined
  }
}

function firstScalarValue(root: ASTNode | undefined): string | undefined {
  if (!root) return undefined
  const queue = [...getNodeChildren(root)]
  while (queue.length > 0) {
    const node = queue.shift()!
    if (node.type === 'Identifier') {
      return (node as IdentifierNode).token.value
    }
    if (node.type === 'Literal') {
      return unquote((node as LiteralNode).token.value)
    }
    if (node.type === 'Reference') return (node as ReferenceNode).raw ?? undefined
    if (node.type === 'PathRef') return unquote((node as PathRefNode).path.token.value)
    queue.push(...getNodeChildren(node))
  }
  return undefined
}

function unquote(value: string): string {
  return decodeQuotedToken(value)
}

function matchPattern(node: ASTNode, pattern: SpwPattern, depth: number): boolean {
  if (pattern.sigil !== undefined && getNodeSigil(node) !== pattern.sigil) return false
  if (pattern.nodeType !== undefined && node.type !== pattern.nodeType) return false
  if (pattern.brace !== undefined && getNodeBrace(node) !== pattern.brace) return false
  if (pattern.brace2 !== undefined && getNodeBrace2(node) !== pattern.brace2) return false
  if (pattern.boundary !== undefined && getNodeBoundary(node) !== pattern.boundary) return false
  if (pattern.withBoundaries !== undefined) {
    const attached = getAttachedBoundaries(node)
    if (!pattern.withBoundaries.every((kind) => attached.includes(kind))) return false
  }
  if (pattern.modifier !== undefined && getNodeModifier(node) !== pattern.modifier) return false
  if (pattern.product !== undefined && getNodeProduct(node) !== pattern.product) return false
  if (pattern.value !== undefined && getNodeValue(node) !== pattern.value) return false
  if (pattern.depth !== undefined && depth !== pattern.depth) return false
  if (pattern.depthRange !== undefined) {
    const [minimum, maximum] = pattern.depthRange
    if (depth < minimum || depth > maximum) return false
  }
  return true
}

function evaluateNode(candidate: NodeCandidate, selector: SpwSelector): NodeEvaluation | null {
  if (isPattern(selector)) {
    return matchPattern(candidate.node, selector, candidate.depth)
      ? evaluation(candidate, selector.placeholder === true)
      : null
  }
  if (isAny(selector)) return evaluation(candidate, selector.placeholder === true)
  if (isCapture(selector)) {
    const inner = evaluateNode(candidate, selector.capture.selector)
    if (!inner) return null
    inner.captures.set(selector.capture.name, inner.anchor)
    return inner
  }
  if (isAnd(selector)) {
    const left = evaluateNode(candidate, selector.and[0])
    if (!left) return null
    const right = evaluateNode(candidate, selector.and[1])
    if (!right) return null
    return mergeEvaluations(left, right)
  }
  if (isOr(selector)) {
    return evaluateNode(candidate, selector.or[0])
      ?? evaluateNode(candidate, selector.or[1])
  }
  if (isNot(selector)) {
    return evaluateNode(candidate, selector.not) ? null : evaluation(candidate, false)
  }
  if (isDescend(selector)) {
    const child = evaluateNode(candidate, selector.descend[1])
    if (!child) return null
    for (let index = candidate.path.length - 1; index >= 0; index -= 1) {
      const ancestor = candidate.path[index]
      const parent = evaluateNode({
        node: ancestor,
        path: candidate.path.slice(0, index),
        depth: index,
      }, selector.descend[0])
      if (parent) return mergeEvaluations(child, parent, child.anchor)
    }
    return null
  }
  if (isSequence(selector)) return null
  return null
}

function evaluation(candidate: NodeCandidate, placeholder: boolean): NodeEvaluation {
  return {
    anchor: { candidate, placeholder },
    captures: new Map<string, ParticipantDraft>(),
  }
}

function mergeEvaluations(
  left: NodeEvaluation,
  right: NodeEvaluation,
  anchor: ParticipantDraft = left.anchor,
): NodeEvaluation {
  return {
    anchor: {
      candidate: anchor.candidate,
      placeholder:
        (sameCandidate(left.anchor.candidate, anchor.candidate) && left.anchor.placeholder)
        || (sameCandidate(right.anchor.candidate, anchor.candidate) && right.anchor.placeholder),
    },
    captures: new Map([...left.captures, ...right.captures]),
  }
}

function sameCandidate(left: NodeCandidate, right: NodeCandidate): boolean {
  return left.node === right.node
    && left.slot?.expressionIndex === right.slot?.expressionIndex
    && left.slot?.termIndex === right.slot?.termIndex
}

function nodeMatch(result: NodeEvaluation): SpwMatch {
  return buildMatch('node', [result.anchor], result.captures)
}

function sequenceMatches(root: ASTNode, selector: SpwSequence): SpwMatch[] {
  const matches: SpwMatch[] = []
  walkAST(root, (node, path) => {
    if (node.type === 'Sequence') {
      matchSlotGroups(termSlotsForSequence(node as SequenceNode, path), selector, matches)
      return
    }
    if (node.type === 'Expression' && path[path.length - 1]?.type !== 'Sequence') {
      matchSlotGroups(termSlotsForExpression(node as ExpressionNode, path), selector, matches)
    }
  })
  return matches.sort((left, right) =>
    left.evidence.envelope.startOffset - right.evidence.envelope.startOffset,
  )
}

function matchSlotGroups(
  slots: TermSlot[],
  selector: SpwSequence,
  matches: SpwMatch[],
): void {
  const width = selector.seq.length
  for (let index = 0; index + width <= slots.length; index += 1) {
    const evaluations: NodeEvaluation[] = []
    for (let offset = 0; offset < width; offset += 1) {
      const result = evaluateNode(slots[index + offset], selector.seq[offset])
      if (!result) break
      evaluations.push(result)
    }
    if (evaluations.length !== width) continue

    matches.push(buildMatch(
      'adjacent-term-slots',
      evaluations.map((result) => result.anchor),
      new Map(evaluations.flatMap((result) => [...result.captures])),
    ))
  }
}

function termSlotsForSequence(sequence: SequenceNode, path: ASTNode[]): TermSlot[] {
  const ownerSpan = toMatchSpan(sequence)
  const slots: TermSlot[] = []
  sequence.expressions.forEach((expression, expressionIndex) => {
    expression.terms.forEach((term, termIndex) => {
      slots.push({
        node: term,
        path: [...path, sequence, expression],
        depth: path.length + 2,
        slot: {
          ownerKind: 'sequence',
          ownerSpan,
          expressionIndex,
          termIndex,
          separatorBefore: separatorBefore(expression, expressionIndex, termIndex),
        },
      })
    })
  })
  return slots
}

function termSlotsForExpression(expression: ExpressionNode, path: ASTNode[]): TermSlot[] {
  const ownerSpan = toMatchSpan(expression)
  return expression.terms.map((term, termIndex) => ({
    node: term,
    path: [...path, expression],
    depth: path.length + 1,
    slot: {
      ownerKind: 'expression',
      ownerSpan,
      expressionIndex: 0,
      termIndex,
      separatorBefore: separatorBefore(expression, 0, termIndex),
    },
  }))
}

function separatorBefore(
  expression: ExpressionNode,
  expressionIndex: number,
  termIndex: number,
): SpwTermSlotCoordinate['separatorBefore'] {
  if (termIndex > 0) {
    const connector = expression.connectors[termIndex - 1]
    return connector ? { kind: 'connector', value: connector.value } : null
  }
  return expressionIndex > 0 ? { kind: 'expression' } : null
}

function buildMatch(
  relation: SpwMatchEvidence['relation'],
  anchors: ParticipantDraft[],
  captureDrafts: Map<string, ParticipantDraft>,
): SpwMatch {
  const drafts = [...anchors]
  for (const captured of captureDrafts.values()) {
    if (!drafts.some((draft) => sameCandidate(draft.candidate, captured.candidate))) {
      drafts.push(captured)
    }
  }

  const captures = Object.fromEntries(
    [...captureDrafts].map(([name, captured]) => [
      name,
      drafts.findIndex((draft) => sameCandidate(draft.candidate, captured.candidate)),
    ]),
  ) as Record<string, number>

  const captureNamesByIndex = new Map<number, string[]>()
  for (const [name, index] of Object.entries(captures)) {
    const names = captureNamesByIndex.get(index) ?? []
    names.push(name)
    captureNamesByIndex.set(index, names)
  }

  const participants = drafts.map((draft, index) => participant(
    draft,
    captureNamesByIndex.get(index),
  )) as [SpwMatchParticipant, ...SpwMatchParticipant[]]
  const envelope = spanEnvelope(drafts.map((draft) => toMatchSpan(draft.candidate.node)))
  const evidence: SpwMatchEvidence = { relation, envelope, participants, captures }
  return { ...participants[0], evidence }
}

function participant(draft: ParticipantDraft, captureNames?: string[]): SpwMatchParticipant {
  const { candidate, placeholder } = draft
  const coupling = couplingForNode(candidate.node)
  return {
    node: candidate.node,
    span: toMatchSpan(candidate.node),
    path: [...candidate.path],
    depth: candidate.depth,
    placeholder,
    captureNames: captureNames ?? [],
    ...(candidate.slot ? { slot: candidate.slot } : {}),
    ...(coupling ? { coupling } : {}),
  }
}

function couplingForNode(node: ASTNode) {
  const boundary = getNodeBoundary(node)
  if (boundary) return COUPLING_DESCRIPTORS[boundary]
  if (node.type === 'Operation' && getNodeSigil(node) === '<>') {
    return COUPLING_DESCRIPTORS.couple
  }
  return undefined
}

function spanEnvelope(spans: SpwMatchSpan[]): SpwMatchSpan {
  return spans.reduce((envelope, span) => ({
    startOffset: Math.min(envelope.startOffset, span.startOffset),
    endOffset: Math.max(envelope.endOffset, span.endOffset),
    startLine: span.startOffset < envelope.startOffset ? span.startLine : envelope.startLine,
    startCharacter: span.startOffset < envelope.startOffset
      ? span.startCharacter
      : envelope.startCharacter,
    endLine: span.endOffset > envelope.endOffset ? span.endLine : envelope.endLine,
    endCharacter: span.endOffset > envelope.endOffset
      ? span.endCharacter
      : envelope.endCharacter,
  }))
}

function isNodeType(value: unknown, type: ASTNode['type']): value is ASTNode {
  return !!value && typeof value === 'object' && (value as { type?: unknown }).type === type
}

/** Find all node or ordered-group matches, sorted by source position. */
export function matchAll(root: ASTNode, selector: SpwSelector): SpwMatch[] {
  assertSpwSelector(selector)
  if (isSequence(selector)) return sequenceMatches(root, selector)

  const matches: SpwMatch[] = []
  walkAST(root, (node, path) => {
    const result = evaluateNode({ node, path: [...path], depth: path.length }, selector)
    if (result) matches.push(nodeMatch(result))
  })
  return matches.sort((left, right) => left.span.startOffset - right.span.startOffset)
}

/** Find the smallest evidence envelope containing a source position. */
export function matchAt(
  root: ASTNode,
  line: number,
  character: number,
  selector: SpwSelector,
): SpwMatch | null {
  const containing = matchAll(root, selector).filter((match) => {
    const span = match.evidence.envelope
    if (line < span.startLine || line > span.endLine) return false
    if (line === span.startLine && character < span.startCharacter) return false
    if (line === span.endLine && character > span.endCharacter) return false
    return true
  })
  containing.sort((left, right) => {
    const leftSpan = left.evidence.envelope
    const rightSpan = right.evidence.envelope
    return (leftSpan.endOffset - leftSpan.startOffset)
      - (rightSpan.endOffset - rightSpan.startOffset)
  })
  return containing[0] ?? null
}

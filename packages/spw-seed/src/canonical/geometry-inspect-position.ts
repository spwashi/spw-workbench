/**
 * Geometry position utilities — map offsets to structural nodes.
 */

import type { ASTNode, Position } from '../types'

const CHILD_PROPS = [
  'expression',
  'expressions',
  'sequence',
  'terms',
  'frame',
  'body',
  'content',
  'annotations',
  'modifiers',
  'key',
  'value',
  'item',
  'input',
  'arms',
  'pattern',
  'handler',
  'subject',
  'linePayload',
  'operatorLabel',
  'operator',
  'tag',
  'channel',
  'left',
  'right',
  'open',
  'close',
  'sink',
  'name',
  'path',
  'chunks',
] as const

function isASTNode(val: unknown): val is ASTNode {
  return Boolean(
    val
    && typeof val === 'object'
    && 'type' in (val as object)
    && 'span' in (val as object),
  )
}

function nodeContainsOffset(node: ASTNode, offset: number): boolean {
  const start = node.span?.start?.offset
  const end = node.span?.end?.offset
  if (typeof start !== 'number' || typeof end !== 'number') return false
  // Half-open [start, end) avoids boundary ties (e.g. `!` end vs label start).
  // Empty nodes and EOF still accept the end offset.
  if (start === end) return offset === start
  if (offset >= start && offset < end) return true
  return false
}

function childCandidates(node: ASTNode): ASTNode[] {
  const out: ASTNode[] = []

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (isASTNode(child)) out.push(child)
    }
  }

  for (const prop of CHILD_PROPS) {
    const value = (node as unknown as Record<string, unknown>)[prop]
    if (!value) continue
    if (Array.isArray(value)) {
      for (const child of value) {
        if (isASTNode(child)) out.push(child)
      }
    } else if (isASTNode(value)) {
      out.push(value)
    }
  }

  return out
}

/**
 * Find the path to the most specific (deepest) node containing the given offset.
 * Returns [root, ..., leaf].
 */
export function findNodePathAtOffset(node: ASTNode, offset: number): ASTNode[] {
  const start = node.span?.start?.offset
  const end = node.span?.end?.offset
  if (typeof start !== 'number' || typeof end !== 'number') return []

  // Root may be queried at EOF (offset === end).
  const inNode = offset >= start && (offset < end || offset === end)
  if (!inNode) return []

  const path = [node]
  const children = childCandidates(node)

  // Prefer the deepest match; later children win shared boundaries.
  for (let i = children.length - 1; i >= 0; i--) {
    const childPath = findNodePathAtOffsetStrict(children[i], offset)
    if (childPath.length > 0) return [...path, ...childPath]
  }

  // If offset is exactly at end and no child claimed it, keep this node.
  return path
}

function findNodePathAtOffsetStrict(node: ASTNode, offset: number): ASTNode[] {
  if (!nodeContainsOffset(node, offset)) return []

  const path = [node]
  const children = childCandidates(node)

  for (let i = children.length - 1; i >= 0; i--) {
    const childPath = findNodePathAtOffsetStrict(children[i], offset)
    if (childPath.length > 0) return [...path, ...childPath]
  }

  return path
}

/**
 * Find the most specific (deepest) node containing the given offset.
 */
export function findNodeAtOffset(node: ASTNode, offset: number): ASTNode | null {
  const path = findNodePathAtOffset(node, offset)
  return path.length > 0 ? path[path.length - 1] : null
}

/**
 * Convert 0-based line/character (LSP-style) to a source offset.
 */
export function positionToOffset(source: string, pos: { line: number; character: number }): number {
  const lines = source.split('\n')
  let offset = 0
  for (let i = 0; i < pos.line && i < lines.length; i++) {
    offset += lines[i].length + 1 // +1 for newline
  }
  return offset + pos.character
}

/**
 * Convert a source offset to 0-based line/character (LSP-style).
 */
export function offsetToPosition(source: string, offset: number): { line: number; character: number } {
  const clamped = Math.max(0, Math.min(offset, source.length))
  const lines = source.split('\n')
  let remaining = clamped
  for (let line = 0; line < lines.length; line++) {
    const lineLen = lines[line].length
    if (remaining <= lineLen) {
      return { line, character: remaining }
    }
    remaining -= lineLen + 1
  }
  const last = Math.max(0, lines.length - 1)
  return { line: last, character: lines[last]?.length ?? 0 }
}

export type { Position }

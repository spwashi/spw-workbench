/**
 * Geometry position utilities — map offsets to structural nodes.
 */

import type { ASTNode, Position } from '../types'

/**
 * Find the path to the most specific (deepest) node containing the given offset.
 * Returns [root, ..., leaf].
 */
export function findNodePathAtOffset(node: ASTNode, offset: number): ASTNode[] {
  if (offset < node.span.start.offset || offset > node.span.end.offset) {
    return []
  }

  const path = [node]

  if (node.children) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const childPath = findNodePathAtOffset(node.children[i], offset)
      if (childPath.length > 0) {
        return [...path, ...childPath]
      }
    }
  }

  const childProps = [
    'expression', 'expressions', 'sequence', 'terms',
    'frame', 'body', 'content', 'annotations', 'modifiers',
    'key', 'value', 'item', 'input', 'arms', 'pattern', 'handler'
  ]

  for (const prop of childProps) {
    const value = (node as any)[prop]
    if (value) {
      if (Array.isArray(value)) {
        for (let i = value.length - 1; i >= 0; i--) {
          const child = value[i]
          if (isASTNode(child)) {
            const childPath = findNodePathAtOffset(child, offset)
            if (childPath.length > 0) {
              return [...path, ...childPath]
            }
          }
        }
      } else if (isASTNode(value)) {
        const childPath = findNodePathAtOffset(value, offset)
        if (childPath.length > 0) {
          return [...path, ...childPath]
        }
      }
    }
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

function isASTNode(val: any): val is ASTNode {
  return val && typeof val === 'object' && 'type' in val && 'span' in val
}

/**
 * Convert line/column to offset.
 */
export function positionToOffset(source: string, pos: { line: number; character: number }): number {
  const lines = source.split('\n')
  let offset = 0
  for (let i = 0; i < pos.line; i++) {
    offset += lines[i].length + 1 // +1 for newline
  }
  return offset + pos.character
}

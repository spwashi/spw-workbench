/**
 * AST Audit Utilities
 *
 * Tools for inspecting, validating, and analyzing AST nodes.
 */

import type { ASTNode, SeedNode, Span } from '../types'

/**
 * AST visitor callback type
 */
export type ASTVisitor = (node: ASTNode, path: ASTNode[]) => void | false

/**
 * Audit warning/info item
 */
export interface AuditItem {
  level: 'info' | 'warning' | 'error'
  message: string
  node: ASTNode
  span: Span
}

/**
 * Result of an AST audit
 */
export interface ASTAuditResult {
  nodeCount: number
  maxDepth: number
  nodeTypes: Map<string, number>
  items: AuditItem[]
}

/**
 * Walk the AST tree, calling visitor for each node
 * Return false from visitor to skip children
 */
export function walkAST(node: ASTNode, visitor: ASTVisitor, path: ASTNode[] = []): void {
  const result = visitor(node, path)
  if (result === false) return

  const newPath = [...path, node]
  const children = getNodeChildren(node)

  for (const child of children) {
    walkAST(child, visitor, newPath)
  }
}

/**
 * Get all child nodes of an AST node
 */
export function getNodeChildren(node: ASTNode): ASTNode[] {
  const children: ASTNode[] = []
  const seen = new Set<ASTNode>()

  const pushChild = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) pushChild(item)
      return
    }

    if (!isAstNode(value) || value === node || seen.has(value)) return
    seen.add(value)
    children.push(value)
  }

  for (const [key, value] of Object.entries(node as unknown as Record<string, unknown>)) {
    if (key === 'type' || key === 'span') continue
    pushChild(value)
  }

  return children
}

function isAstNode(value: unknown): value is ASTNode {
  if (!value || typeof value !== 'object') return false

  const candidate = value as {
    type?: unknown
    span?: {
      start?: unknown
      end?: unknown
    }
  }

  return typeof candidate.type === 'string'
    && candidate.type !== candidate.type.toUpperCase()
    && !!candidate.span
    && typeof candidate.span === 'object'
    && !!candidate.span.start
    && typeof candidate.span.start === 'object'
    && !!candidate.span.end
    && typeof candidate.span.end === 'object'
}

/**
 * Find all nodes matching a predicate
 */
export function findNodes(
  node: ASTNode,
  predicate: (n: ASTNode) => boolean
): ASTNode[] {
  const results: ASTNode[] = []

  walkAST(node, (n) => {
    if (predicate(n)) {
      results.push(n)
    }
  })

  return results
}

/**
 * Find the path from root to a target node
 */
export function getNodePath(root: ASTNode, target: ASTNode): ASTNode[] | null {
  let foundPath: ASTNode[] | null = null

  walkAST(root, (node, path) => {
    if (node === target) {
      foundPath = [...path, node]
      return false // Stop traversal
    }
  })

  return foundPath
}

/**
 * Get the depth of the deepest node
 */
export function getMaxDepth(node: ASTNode, currentDepth: number = 0): number {
  const children = getNodeChildren(node)
  if (children.length === 0) return currentDepth

  return Math.max(...children.map(child => getMaxDepth(child, currentDepth + 1)))
}

/**
 * Count nodes by type
 */
export function countNodeTypes(node: ASTNode): Map<string, number> {
  const counts = new Map<string, number>()

  walkAST(node, (n) => {
    const count = counts.get(n.type) || 0
    counts.set(n.type, count + 1)
  })

  return counts
}

/**
 * Perform a full audit of an AST
 */
export function auditAST(ast: SeedNode): ASTAuditResult {
  const items: AuditItem[] = []
  let nodeCount = 0

  walkAST(ast, (node) => {
    nodeCount++

    // Check for empty sequences
    if (node.type === 'Sequence' && ((node as unknown as Record<string, unknown>).expressions as unknown[] | undefined)?.length === 0) {
      items.push({
        level: 'info',
        message: 'Empty sequence',
        node,
        span: node.span,
      })
    }

    // Check for deeply nested structures
    const children = getNodeChildren(node)
    if (children.length > 10) {
      items.push({
        level: 'warning',
        message: `Node has ${children.length} children, consider simplifying`,
        node,
        span: node.span,
      })
    }

    // Check for operations without frames or bodies
    if (node.type === 'Operation') {
      const op = node as unknown as Record<string, unknown>
      if (!op.frame && !op.body && !op.linePayload) {
        items.push({
          level: 'info',
          message: 'Operation has neither frame nor body',
          node,
          span: node.span,
        })
      }
    }
  })

  return {
    nodeCount,
    maxDepth: getMaxDepth(ast),
    nodeTypes: countNodeTypes(ast),
    items,
  }
}

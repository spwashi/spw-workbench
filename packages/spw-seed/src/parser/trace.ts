/**
 * Trace and Debug Utilities
 *
 * Tools for analyzing parse events and AST.
 */

import type { Token, ParseEvent, ASTNode } from '../types'

function isASTNode(value: unknown): value is ASTNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'span' in value
  )
}

/**
 * Filter events by type
 */
export function filterEvents(
  events: ParseEvent[],
  types: ParseEvent['type'][]
): ParseEvent[] {
  return events.filter(e => types.includes(e.type))
}

/**
 * Get all tokens from events
 */
export function extractTokens(events: ParseEvent[]): Token[] {
  return events
    .filter(e => e.type === 'token')
    .map(e => (e.data as { token: Token }).token)
}

/**
 * Get all errors from events
 */
export function extractErrors(events: ParseEvent[]): ParseEvent[] {
  return events.filter(e => e.type === 'error')
}

/**
 * Trace node for building hierarchical trace tree
 */
export interface TraceNode {
  rule: string
  success?: boolean
  consumed?: number
  children: TraceNode[]
  events: ParseEvent[]
}

/**
 * Build a trace tree from events
 */
export function buildTrace(events: ParseEvent[]): TraceNode {
  const root: TraceNode = { rule: 'root', children: [], events: [] }
  const stack: TraceNode[] = [root]

  for (const event of events) {
    const current = stack[stack.length - 1]

    if (event.type === 'enter') {
      const node: TraceNode = { rule: event.rule, children: [], events: [event] }
      current.children.push(node)
      stack.push(node)
    } else if (event.type === 'exit') {
      const node = stack.pop()!
      if (node !== root) {
        node.events.push(event)
        node.success = (event.data as { success?: boolean }).success
        node.consumed = (event.data as { consumed?: number }).consumed
      }
    } else {
      current.events.push(event)
    }
  }

  return root
}

/**
 * Pretty print AST
 */
export function printAST(node: ASTNode, indent: number = 0): string {
  const prefix = '  '.repeat(indent)
  let output = `${prefix}${node.type}`

  if ('value' in node && typeof (node as unknown as { value?: unknown }).value === 'string') {
    output += `: "${(node as unknown as { value: string }).value}"`
  }

  if ('operator' in node && (node as unknown as { operator?: { value?: string } }).operator) {
    output += ` [${(node as unknown as { operator: { value: string } }).operator.value}]`
  }

  if ('modifiers' in node && (node as unknown as { modifiers?: { modifiers?: Token[] } }).modifiers) {
    const modArray = (node as unknown as { modifiers: { modifiers?: Token[] } }).modifiers.modifiers
    if (modArray) {
      const mods = modArray.map((m: Token) => m.value).join('.')
      output += ` (${mods})`
    }
  }

  output += '\n'

  if (node.children) {
    for (const child of node.children) {
      output += printAST(child, indent + 1)
    }
  }

  // Handle specific node types with named children
  const childProps = [
    'expression', 'expressions', 'sequence', 'terms',
    'frame', 'body', 'content', 'annotations', 'modifiers'
  ]

  for (const prop of childProps) {
    const value = (node as unknown as Record<string, unknown>)[prop]
    if (value) {
      if (Array.isArray(value)) {
        for (const child of value) {
          if (isASTNode(child)) {
            output += printAST(child, indent + 1)
          }
        }
      } else if (isASTNode(value)) {
        output += printAST(value, indent + 1)
      }
    }
  }

  return output
}

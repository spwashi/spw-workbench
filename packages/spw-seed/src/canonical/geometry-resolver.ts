/**
 * Geometry resolver — map AST paths to structural label sites and surfaces.
 */

import type { ASTNode } from '../types'
import type { LabelPosition, LabelSite, LiminalShape } from './form-geometry'
import type { BoundaryLadderId } from './form-ladders'

export interface LabelSurfaceSpan {
  start: number
  end: number
}

export interface ResolvedLabelContext {
  label: string | null
  position: LabelPosition
  /** Inclusive-exclusive source span of the mobility surface for this label site. */
  surface: LabelSurfaceSpan | null
  /** Deepest structural node used for the resolution. */
  node: ASTNode | null
  path: ASTNode[]
}

function isASTNode(val: unknown): val is ASTNode {
  return Boolean(
    val
    && typeof val === 'object'
    && 'type' in (val as object)
    && 'span' in (val as object),
  )
}

function nodeSpan(node: ASTNode | null | undefined): LabelSurfaceSpan | null {
  const start = node?.span?.start?.offset
  const end = node?.span?.end?.offset
  if (typeof start !== 'number' || typeof end !== 'number') return null
  return { start, end }
}

function readIdentifierLabel(node: ASTNode | null | undefined): string | null {
  if (!node) return null
  if (node.type === 'Identifier') {
    const tokenValue = (node as { token?: { value?: string }; value?: string }).token?.value
      ?? (node as { value?: string }).value
    return typeof tokenValue === 'string' && tokenValue.length > 0 ? tokenValue : null
  }
  if ((node as { type?: string }).type === 'IDENTIFIER') {
    const value = (node as { value?: string }).value
    return typeof value === 'string' && value.length > 0 ? value : null
  }
  return null
}

function structuralParent(parents: ASTNode[]): ASTNode | undefined {
  for (let i = parents.length - 1; i >= 0; i--) {
    const p = parents[i]
    if (p.type === 'Expression' || p.type === 'Sequence') continue
    return p
  }
  return undefined
}

function findAncestor(path: ASTNode[], type: string): ASTNode | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    if (path[i].type === type) return path[i]
  }
  return undefined
}

function operatorKind(node: ASTNode | null | undefined): string | null {
  if (!node || node.type !== 'Operation') return null
  const op = (node as { operator?: { kind?: string; value?: string } }).operator
  return op?.kind ?? op?.value ?? null
}

/**
 * For sibling constructs like `@(topic)` / `$(topic)`, the operator and scope
 * are adjacent expressions under one sequence rather than parent/child.
 */
function adjacentPrefixOperator(path: ASTNode[], leaf: ASTNode): string | null {
  for (let i = path.length - 1; i >= 1; i--) {
    const seq = path[i]
    if (seq.type !== 'Sequence') continue
    const expressions = (seq as { expressions?: ASTNode[] }).expressions
    if (!Array.isArray(expressions) || expressions.length < 2) continue

    const leafOffset = leaf.span?.start?.offset
    if (typeof leafOffset !== 'number') continue

    let idx = -1
    for (let e = 0; e < expressions.length; e++) {
      const expr = expressions[e]
      const start = expr.span?.start?.offset
      const end = expr.span?.end?.offset
      if (typeof start !== 'number' || typeof end !== 'number') continue
      if (leafOffset >= start && leafOffset <= end) {
        idx = e
        break
      }
    }
    if (idx <= 0) continue

    const prev = expressions[idx - 1]
    const prevTerms = (prev as { terms?: ASTNode[] }).terms
    const term = Array.isArray(prevTerms) ? prevTerms[0] : prev
    if (isASTNode(term) && term.type === 'Operation') {
      const kind = operatorKind(term)
      if (kind === '@' || kind === '$') return kind
    }
  }
  return null
}

function expandSurfaceForPrefixScope(
  source: string,
  path: ASTNode[],
  leaf: ASTNode,
  prefix: '@' | '$',
): LabelSurfaceSpan | null {
  // Prefer exact surface match around the leaf.
  const leafStart = leaf.span?.start?.offset
  if (typeof leafStart !== 'number') return null

  // Walk left from leaf to find prefix operator in source.
  let at = leafStart - 1
  while (at >= 0 && /\s/.test(source[at] ?? '')) at--
  if (source[at] !== '(') return null
  at--
  while (at >= 0 && /\s/.test(source[at] ?? '')) at--
  if (source[at] !== prefix) return null
  const start = at

  // Walk right from leaf through closing paren.
  let end = leaf.span?.end?.offset ?? leafStart
  while (end < source.length && source[end] !== ')') end++
  if (source[end] === ')') end++

  void path
  return { start, end }
}

function deepestIdentifier(node: ASTNode): ASTNode | null {
  const label = readIdentifierLabel(node)
  if (node.type === 'Identifier' || (node as { type?: string }).type === 'IDENTIFIER') {
    return label ? node : null
  }

  let found: ASTNode | null = null
  const visit = (n: ASTNode) => {
    if (found) return
    if (n.type === 'Identifier' || (n as { type?: string }).type === 'IDENTIFIER') {
      if (readIdentifierLabel(n)) {
        found = n
        return
      }
    }
    for (const key of Object.keys(n)) {
      if (key === 'span' || key === 'token') continue
      const value = (n as unknown as Record<string, unknown>)[key]
      if (Array.isArray(value)) {
        for (const child of value) {
          if (isASTNode(child)) visit(child)
        }
      } else if (isASTNode(value)) {
        visit(value)
      }
    }
  }
  visit(node)
  return found
}

function pathFromAncestor(ancestor: ASTNode, target: ASTNode): ASTNode[] {
  const path: ASTNode[] = []
  let found = false

  const walk = (n: ASTNode): boolean => {
    path.push(n)
    if (n === target) return true
    for (const key of Object.keys(n)) {
      if (key === 'span' || key === 'token') continue
      const value = (n as unknown as Record<string, unknown>)[key]
      if (Array.isArray(value)) {
        for (const child of value) {
          if (isASTNode(child) && walk(child)) return true
        }
      } else if (isASTNode(value)) {
        if (walk(value)) return true
      }
    }
    path.pop()
    return false
  }

  found = walk(ancestor)
  return found ? path : []
}

/**
 * Resolve the structural position of an AST node given its parent chain.
 * Parents are ordered root → immediate parent (excludes `node` itself).
 */
export function resolveLabelPosition(node: ASTNode, parents: ASTNode[]): LabelPosition {
  const depth = parents.length
  const parent = structuralParent(parents)
  const immediate = parents[parents.length - 1]

  const pos: LabelPosition = {
    site: 'free',
    liminal: 'exterior',
    depth,
  }

  // operatorLabel token on Operation (!topic, etc.)
  if (
    (node.type === 'Identifier' || (node as { type?: string }).type === 'IDENTIFIER')
    && immediate?.type === 'Operation'
  ) {
    pos.site = 'operator_adjacent'
    pos.liminal = 'aperture'
    return pos
  }

  if (node.type === 'Identifier' || (node as { type?: string }).type === 'IDENTIFIER') {
    if (parent?.type === 'Parameter' || findAncestor([...parents, node], 'Parameter')) {
      const frame = findAncestor([...parents, node], 'Frame')
      pos.site = 'frame_param'
      pos.liminal = 'chamber'
      if (frame) pos.boundary = 'frame'
      return pos
    }

    if (parent?.type === 'Binding' || immediate?.type === 'Binding') {
      // key vs value: Binding.key points at identifier
      const binding = parent?.type === 'Binding' ? parent : immediate
      const key = (binding as { key?: ASTNode }).key
      if (key && (key === node || readIdentifierLabel(key) === readIdentifierLabel(node))) {
        pos.site = 'facet_key'
        pos.liminal = 'chamber'
        if (findAncestor(parents, 'Body')) pos.boundary = 'body'
        return pos
      }
    }

    if (parent?.type === 'Capsule' || findAncestor(parents, 'Capsule')) {
      const capsule = parent?.type === 'Capsule' ? parent : findAncestor(parents, 'Capsule')
      const tag = (capsule as { tag?: ASTNode } | undefined)?.tag
      if (tag && (tag === node || readIdentifierLabel(tag) === readIdentifierLabel(node))) {
        pos.site = 'capsule_tag'
        pos.liminal = 'membrane'
        pos.boundary = 'capsule'
        return pos
      }
    }

    if (parent?.type === 'Annotation' || findAncestor(parents, 'Annotation')) {
      pos.site = 'register_meta'
      pos.liminal = 'published'
      return pos
    }

    if (parent?.type === 'Reference') {
      pos.site = 'ref_handle'
      pos.liminal = 'published'
      return pos
    }

    if (findAncestor(parents, 'Scope')) {
      const prefix = adjacentPrefixOperator(parents, node)
      if (prefix === '@') {
        pos.site = 'ref_handle'
        pos.liminal = 'published'
        pos.boundary = 'scope'
        return pos
      }
      if (prefix === '$') {
        pos.site = 'register_meta'
        pos.liminal = 'published'
        return pos
      }
    }

    if (parent?.type === 'Operation') {
      pos.site = 'operator_adjacent'
      pos.liminal = 'aperture'
      return pos
    }

    if (parent?.type === 'PathRef' || findAncestor(parents, 'PathRef')) {
      pos.site = 'path_node'
      pos.liminal = 'exterior'
      return pos
    }
  }

  if (node.type === 'Literal') {
    if (parent?.type === 'PathRef' || findAncestor(parents, 'PathRef')) {
      pos.site = 'path_node'
      pos.liminal = 'exterior'
    }
    // header label ^["name"]
    const frame = findAncestor(parents, 'Frame')
    const op = findAncestor(parents, 'Operation')
    if (frame && op && operatorKind(op) === '^') {
      pos.site = 'header'
      pos.liminal = 'published'
      pos.boundary = 'body'
    }
  }

  if (node.type === 'Annotation') {
    pos.site = 'register_meta'
    pos.liminal = 'published'
  } else if (node.type === 'Frame') {
    pos.site = 'frame_param'
    pos.liminal = node.children && node.children.length > 0 ? 'chamber' : 'void'
    pos.boundary = 'frame'
  } else if (node.type === 'Body') {
    pos.site = 'interior_term'
    pos.liminal = node.children && node.children.length > 0 ? 'chamber' : 'void'
    pos.boundary = 'body'
  } else if (node.type === 'Operation' && operatorKind(node)) {
    const label = (node as { operatorLabel?: ASTNode }).operatorLabel
    if (label) {
      pos.site = 'operator_adjacent'
      pos.liminal = 'aperture'
    }
  }

  if ((node as { children?: unknown[] }).children && (node as { children: unknown[] }).children.length > 0) {
    if (pos.liminal === 'void') pos.liminal = 'chamber'
  }

  return pos
}

/**
 * Resolve label site, surface span, and name at a node path.
 */
export function resolveLabelContext(
  path: ASTNode[],
  source: string,
): ResolvedLabelContext {
  if (path.length === 0) {
    return {
      label: null,
      position: { site: 'free', liminal: 'exterior', depth: 0 },
      surface: null,
      node: null,
      path,
    }
  }

  let leaf = path[path.length - 1]
  let parents = path.slice(0, -1)

  // Prefer operatorLabel when hovering the label of !name
  if (leaf.type === 'Operation') {
    const opLabel = (leaf as { operatorLabel?: ASTNode }).operatorLabel
    if (opLabel) {
      const label = readIdentifierLabel(opLabel) ?? (opLabel as { value?: string }).value ?? null
      return {
        label: label ?? null,
        position: {
          site: 'operator_adjacent',
          liminal: 'aperture',
          depth: path.length,
        },
        surface: nodeSpan(leaf),
        node: leaf,
        path,
      }
    }
  }

  // Token leaf OPERATOR on !name — lift to Operation when label is adjacent.
  if ((leaf as { type?: string }).type === 'OPERATOR' || leaf.type === 'Operation') {
    const op = leaf.type === 'Operation' ? leaf : parents[parents.length - 1]
    if (op?.type === 'Operation') {
      const opLabel = (op as { operatorLabel?: ASTNode }).operatorLabel
      if (opLabel) {
        return {
          label: readIdentifierLabel(opLabel) ?? (opLabel as { value?: string }).value ?? null,
          position: {
            site: 'operator_adjacent',
            liminal: 'aperture',
            depth: path.length,
          },
          surface: nodeSpan(op),
          node: op,
          path,
        }
      }
    }
  }

  // Scope leaf for @(name)/$(name): descend to interior identifier.
  if (leaf.type === 'Scope') {
    const interior = deepestIdentifier(leaf)
    if (interior) {
      const innerPath = pathFromAncestor(leaf, interior)
      if (innerPath.length > 0) {
        path = [...parents, ...innerPath]
        parents = path.slice(0, -1)
        leaf = path[path.length - 1]
      }
    }
  }

  let position = resolveLabelPosition(leaf, parents)
  let label = readIdentifierLabel(leaf)
  let surface = nodeSpan(leaf)
  let node: ASTNode | null = leaf

  // Header: literal inside ^["name"] frame
  if (!label && leaf.type === 'Literal') {
    const raw = (leaf as { token?: { value?: string }; value?: string }).token?.value
      ?? (leaf as { value?: string }).value
    if (typeof raw === 'string') {
      label = raw.replace(/^["'`]|["'`]$/g, '')
    }
  }

  // Expand surface to the mobility construct for known sites.
  if (position.site === 'operator_adjacent') {
    const op = leaf.type === 'Operation' ? leaf : findAncestor(path, 'Operation')
    if (op) {
      node = op
      surface = nodeSpan(op)
      if (!label) {
        const opLabel = (op as { operatorLabel?: ASTNode }).operatorLabel
        label = readIdentifierLabel(opLabel) ?? (opLabel as { value?: string } | undefined)?.value ?? null
      }
      position = {
        site: 'operator_adjacent',
        liminal: 'aperture',
        depth: path.length,
      }
    }
  } else if (position.site === 'frame_param') {
    const frame = findAncestor(path, 'Frame') ?? (leaf.type === 'Frame' ? leaf : undefined)
    if (frame) {
      node = frame
      surface = nodeSpan(frame)
      position = {
        ...position,
        site: 'frame_param',
        boundary: 'frame',
        liminal: position.liminal === 'exterior' ? 'chamber' : position.liminal,
      }
    }
  } else if (position.site === 'ref_handle') {
    const expanded = expandSurfaceForPrefixScope(source, path, leaf, '@')
    if (expanded) surface = expanded
    position = {
      site: 'ref_handle',
      liminal: 'published',
      boundary: 'scope',
      depth: path.length,
    }
  } else if (position.site === 'register_meta') {
    const expanded = expandSurfaceForPrefixScope(source, path, leaf, '$')
    if (expanded) surface = expanded
    position = {
      site: 'register_meta',
      liminal: 'published',
      depth: path.length,
    }
  } else if (position.site === 'capsule_tag') {
    const capsule = findAncestor(path, 'Capsule')
    if (capsule) {
      node = capsule
      surface = nodeSpan(capsule)
    }
  } else if (position.site === 'header') {
    const op = findAncestor(path, 'Operation')
    if (op && operatorKind(op) === '^') {
      node = op
      // include body if present
      const body = (op as { body?: ASTNode }).body
      const start = op.span?.start?.offset
      const end = body?.span?.end?.offset ?? op.span?.end?.offset
      if (typeof start === 'number' && typeof end === 'number') {
        surface = { start, end }
      }
    }
  } else if (position.site === 'facet_key') {
    const binding = findAncestor(path, 'Binding')
    const body = findAncestor(path, 'Body')
    const op = findAncestor(path, 'Operation')
    if (op && operatorKind(op) === '.' && body) {
      node = op
      const start = op.span?.start?.offset
      const end = body.span?.end?.offset
      if (typeof start === 'number' && typeof end === 'number') surface = { start, end }
    } else if (binding) {
      node = binding
      surface = nodeSpan(binding)
    }
  } else if (position.site === 'free' && label) {
    // bare identifier surface
    surface = nodeSpan(leaf)
  }

  // Recover prefix-scope sites if structural pass still says free.
  if (position.site === 'free' && label) {
    const prefix = adjacentPrefixOperator(path, leaf)
    if (prefix === '@') {
      position = {
        site: 'ref_handle',
        liminal: 'published',
        boundary: 'scope',
        depth: path.length,
      }
      surface = expandSurfaceForPrefixScope(source, path, leaf, '@') ?? surface
    } else if (prefix === '$') {
      position = {
        site: 'register_meta',
        liminal: 'published',
        depth: path.length,
      }
      surface = expandSurfaceForPrefixScope(source, path, leaf, '$') ?? surface
    }
  }

  return {
    label,
    position,
    surface,
    node,
    path,
  }
}

/**
 * Convenience: resolve label position only (legacy signature).
 */
export type { LabelSite, LiminalShape, BoundaryLadderId }

/**
 * Nest-path form clusters — ordered container geometry over alphabet <>(){}[].
 *
 * Focus: nest paths (`{[]}` ≠ `[]{}`), not brace-count histograms.
 * Labels (open/close, scope name, capsule channel, simple frame params) ride on
 * paths for delta when present — content out of cluster keys for unlabeled form.
 *
 * Couple digraph `<>` and capsule shell share surface glyph `<>` in the alphabet;
 * kind is retained for tooling without teaching the split as original doctrine.
 *
 * @see .agents/plans/canon-rewrite-v2/PLAN.md phase 4b
 * @see packages/spw-seed/src/canonical/brace-projection.ts
 * @see packages/spw-seed/src/types/coupling.ts
 */

import { createHash } from 'node:crypto'
import { parse } from '../parser'
import { getNodeChildren } from '../instrumentation/audit'
import type { ASTNode } from '../types/ast'

export const NEST_PATH_VERSION = 'spw.nest_path/1' as const

/** Encode order for the paired-boundary alphabet (phase 4b). */
export const NEST_PATH_ALPHABET = '<>(){}[]' as const

export type NestPathKind =
  | 'frame'
  | 'body'
  | 'scope'
  | 'capsule'
  | 'stream'
  | 'nrange'
  | 'couple'

export type NestPathGlyph = '[]' | '{}' | '()' | '<>' | '<<>>' | '(())'

export interface NestPathNode {
  kind: NestPathKind
  glyph: NestPathGlyph
  /** Container label when known (openLabel, name, tag/channel, simple frame param). */
  label?: string
  children: NestPathNode[]
}

export interface NestPathLattice {
  version: typeof NEST_PATH_VERSION
  /** Top-level container forest (document order). */
  roots: NestPathNode[]
  /** Unlabeled tree skeleton — form cluster without labels. */
  skeleton: string
  /** Skeleton with labels interpolated where present. */
  labeledSkeleton: string
  /** Root-to-node path species (unlabeled), multiset order = preorder. */
  paths: string[]
  /** Same paths with labels when present. */
  labeledPaths: string[]
  /** Sorted unique labels (for delta multiset). */
  labels: string[]
  /** Unlabeled form cluster key (content-stable). */
  clusterKey: string
  /** Labeled form key — changes when container labels rename. */
  labeledClusterKey: string
  parseOk: boolean
}

export interface NestPathDelta {
  skeletonEqual: boolean
  labeledEqual: boolean
  labelsEqual: boolean
  labelsAdded: string[]
  labelsRemoved: string[]
  beforeSkeleton: string
  afterSkeleton: string
  beforeLabeled: string
  afterLabeled: string
  findings: string[]
}

const KIND_GLYPH: Record<NestPathKind, NestPathGlyph> = {
  frame: '[]',
  body: '{}',
  scope: '()',
  capsule: '<>',
  couple: '<>',
  stream: '<<>>',
  nrange: '(())',
}

function shortHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 12)
}

function tokenValue(tok: unknown): string | undefined {
  if (!tok || typeof tok !== 'object') return undefined
  const v = (tok as { value?: unknown }).value
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function channelLabel(node: ASTNode): string | undefined {
  const n = node as {
    tag?: { value?: string }
    channel?: { type?: string; token?: { value?: string }; value?: string }
  }
  if (n.tag?.value) return n.tag.value
  if (n.channel?.token?.value != null) return String(n.channel.token.value)
  if (typeof n.channel?.value === 'string') return n.channel.value
  return undefined
}

/** Simple first-parameter identifier/string on a Frame — seed[Name]-style. */
function frameParamLabel(node: ASTNode): string | undefined {
  if (node.type !== 'Frame') return undefined
  const content = (node as { content?: unknown[] }).content
  if (!Array.isArray(content) || content.length === 0) return undefined
  const first = content[0] as {
    type?: string
    value?: {
      type?: string
      terms?: Array<{ type?: string; token?: { value?: string } }>
    }
    token?: { value?: string }
  }
  // Parameter wrapping Expression
  if (first?.type === 'Parameter' && first.value?.type === 'Expression') {
    const terms = first.value.terms ?? []
    if (terms.length === 1 && terms[0]?.type === 'Identifier') {
      return tokenValue(terms[0].token)
    }
    if (terms.length === 1 && terms[0]?.type === 'Literal') {
      return tokenValue(terms[0].token)
    }
  }
  return undefined
}

function containerLabel(node: ASTNode, kind: NestPathKind): string | undefined {
  const n = node as {
    openLabel?: { value?: string }
    closeLabel?: { value?: string }
    name?: { value?: string }
  }
  if (n.openLabel?.value) return n.openLabel.value
  if (kind === 'scope' && n.name?.value) return n.name.value
  if (kind === 'capsule') return channelLabel(node)
  if (kind === 'frame') {
    return frameParamLabel(node) ?? (n.closeLabel?.value || undefined)
  }
  if (n.closeLabel?.value) return n.closeLabel.value
  return undefined
}

function asNestNode(node: ASTNode): NestPathNode | null {
  switch (node.type) {
    case 'Frame':
      return {
        kind: 'frame',
        glyph: '[]',
        label: containerLabel(node, 'frame'),
        children: [],
      }
    case 'Body':
      return {
        kind: 'body',
        glyph: '{}',
        label: containerLabel(node, 'body'),
        children: [],
      }
    case 'Scope':
      return {
        kind: 'scope',
        glyph: '()',
        label: containerLabel(node, 'scope'),
        children: [],
      }
    case 'Capsule':
      return {
        kind: 'capsule',
        glyph: '<>',
        label: containerLabel(node, 'capsule'),
        children: [],
      }
    case 'Stream':
      return {
        kind: 'stream',
        glyph: '<<>>',
        label: containerLabel(node, 'stream'),
        children: [],
      }
    case 'NRange':
      return {
        kind: 'nrange',
        glyph: '(())',
        label: containerLabel(node, 'nrange'),
        children: [],
      }
    case 'Operation': {
      const op = node as { operator?: { value?: string } }
      if (op.operator?.value === '<>') {
        return {
          kind: 'couple',
          glyph: '<>',
          children: [],
        }
      }
      return null
    }
    default:
      return null
  }
}

/**
 * Lift containers under `node` into a forest — skip non-containers, nest true children.
 */
function extractForest(node: ASTNode): NestPathNode[] {
  const out: NestPathNode[] = []
  for (const child of getNodeChildren(node)) {
    const nest = asNestNode(child)
    if (nest) {
      nest.children = extractForest(child)
      out.push(nest)
    } else {
      out.push(...extractForest(child))
    }
  }
  return out
}

function openGlyph(g: NestPathGlyph): string {
  switch (g) {
    case '[]':
      return '['
    case '{}':
      return '{'
    case '()':
      return '('
    case '<>':
      return '<'
    case '<<>>':
      return '<<'
    case '(())':
      return '(('
  }
}

function closeGlyph(g: NestPathGlyph): string {
  switch (g) {
    case '[]':
      return ']'
    case '{}':
      return '}'
    case '()':
      return ')'
    case '<>':
      return '>'
    case '<<>>':
      return '>>'
    case '(())':
      return '))'
  }
}

function formatNode(node: NestPathNode, withLabels: boolean): string {
  const open = openGlyph(node.glyph)
  const close = closeGlyph(node.glyph)
  const lab = withLabels && node.label ? node.label : ''
  const inner = node.children.map(c => formatNode(c, withLabels)).join('')
  if (node.glyph === '<>') {
    // <label>inner or <>inner — couple and capsule share glyph in the alphabet
    return `<${lab}>${inner}`
  }
  // e.g. [Demo{…}] — frame param / openLabel rides after open
  if (lab) return `${open}${lab}${inner}${close}`
  return `${open}${inner}${close}`
}

function formatForest(roots: readonly NestPathNode[], withLabels: boolean): string {
  return roots.map(r => formatNode(r, withLabels)).join('')
}

function collectPaths(
  node: NestPathNode,
  prefix: string,
  withLabels: boolean,
  paths: string[],
): void {
  const open = openGlyph(node.glyph)
  const close = closeGlyph(node.glyph)
  let piece: string
  if (node.glyph === '<>') {
    piece = withLabels && node.label ? `<${node.label}>` : '<>'
  } else if (withLabels && node.label) {
    piece = `${open}${node.label}${close}`
  } else {
    piece = `${open}${close}`
  }
  const path = prefix + piece
  paths.push(path)
  for (const c of node.children) {
    collectPaths(c, path, withLabels, paths)
  }
}

function collectLabels(node: NestPathNode, out: string[]): void {
  if (node.label) out.push(node.label)
  for (const c of node.children) collectLabels(c, out)
}

function emptyLattice(parseOk: boolean): NestPathLattice {
  return {
    version: NEST_PATH_VERSION,
    roots: [],
    skeleton: '',
    labeledSkeleton: '',
    paths: [],
    labeledPaths: [],
    labels: [],
    clusterKey: shortHash(''),
    labeledClusterKey: shortHash(''),
    parseOk,
  }
}

/** Scan nest-path forest from source (or AST). */
export function scanNestPaths(sourceOrAst: string | ASTNode | null | undefined): NestPathLattice {
  let root: ASTNode | null | undefined
  let parseOk = true
  if (typeof sourceOrAst === 'string') {
    const result = parse(sourceOrAst)
    root = result.ast ?? null
    parseOk = Boolean(result.success && root)
  } else {
    root = sourceOrAst
    parseOk = root != null
  }
  if (!root) return emptyLattice(false)

  const roots = extractForest(root)
  const skeleton = formatForest(roots, false)
  const labeledSkeleton = formatForest(roots, true)
  const paths: string[] = []
  const labeledPaths: string[] = []
  const labelBag: string[] = []
  for (const r of roots) {
    collectPaths(r, '', false, paths)
    collectPaths(r, '', true, labeledPaths)
    collectLabels(r, labelBag)
  }
  const labels = [...labelBag].sort()

  return {
    version: NEST_PATH_VERSION,
    roots,
    skeleton,
    labeledSkeleton,
    paths,
    labeledPaths,
    labels,
    clusterKey: shortHash(skeleton),
    labeledClusterKey: shortHash(labeledSkeleton),
    parseOk,
  }
}

function multisetDiff(before: string[], after: string[]): { added: string[]; removed: string[] } {
  const a = [...after]
  const removed: string[] = []
  for (const x of before) {
    const i = a.indexOf(x)
    if (i >= 0) a.splice(i, 1)
    else removed.push(x)
  }
  return { added: a, removed }
}

/** Compare two nest-path lattices for delta / layout claims. */
export function nestPathDelta(before: NestPathLattice, after: NestPathLattice): NestPathDelta {
  const skeletonEqual = before.skeleton === after.skeleton
  const labeledEqual = before.labeledSkeleton === after.labeledSkeleton
  const { added: labelsAdded, removed: labelsRemoved } = multisetDiff(before.labels, after.labels)
  const labelsEqual = labelsAdded.length === 0 && labelsRemoved.length === 0
  const findings: string[] = []
  if (skeletonEqual) findings.push('nest skeleton equal')
  else findings.push(`nest skeleton ${before.skeleton || '∅'} → ${after.skeleton || '∅'}`)
  if (!labelsEqual) {
    if (labelsAdded.length) findings.push(`labels +${labelsAdded.join(',')}`)
    if (labelsRemoved.length) findings.push(`labels -${labelsRemoved.join(',')}`)
  } else if (before.labels.length) {
    findings.push('container labels equal')
  }
  if (skeletonEqual && !labeledEqual) {
    findings.push('nest form holds; labeled skeleton moved (container label rename)')
  }
  return {
    skeletonEqual,
    labeledEqual,
    labelsEqual,
    labelsAdded,
    labelsRemoved,
    beforeSkeleton: before.skeleton,
    afterSkeleton: after.skeleton,
    beforeLabeled: before.labeledSkeleton,
    afterLabeled: after.labeledSkeleton,
    findings,
  }
}

/** Spectrum of path species for corpus sense (collate). */
export function nestPathSpectrum(
  lattices: readonly NestPathLattice[],
  top = 24,
): Array<{ path: string; count: number }> {
  const counts = new Map<string, number>()
  for (const lat of lattices) {
    for (const p of lat.paths) {
      counts.set(p, (counts.get(p) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
    .slice(0, top)
}

export function formatNestPathSpw(lat: NestPathLattice): string {
  return [
    `^["nest_path"]{`,
    `  ~#version: ${lat.version}`,
    `  ~#skeleton: "${lat.skeleton.replace(/"/g, '\\"')}"`,
    `  ~#labeled: "${lat.labeledSkeleton.replace(/"/g, '\\"')}"`,
    `  ~#cluster: ${lat.clusterKey}`,
    `  ~#labeledCluster: ${lat.labeledClusterKey}`,
    `  ~#labels: #[ ${lat.labels.map(l => `"${l.replace(/"/g, '\\"')}"`).join(' ; ')} ]`,
    `  ~#parseOk: ${lat.parseOk ? '#yes' : '#no'}`,
    `}`,
  ].join('\n')
}

// Re-export glyph table for tests / docs
export { KIND_GLYPH }

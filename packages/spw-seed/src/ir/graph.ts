/**
 * Interconnect graph — internal model of IR nodes and typed edges.
 *
 * Encourages composition: each stage cites neighbors rather than re-deriving.
 */

import type { IrEdgeKind, IrKind } from './kinds'
import { irRefKey, type IrRef } from './ref'
import type { LensBundle, OptChannel, TraversalEffect } from './lens'

export interface IrNode {
  ref: IrRef
  /** Optional payload (AST slice, table, envelope data). Keep small at graph level. */
  data?: unknown
  /** Human/agent label. */
  label?: string
}

export interface IrEdge {
  kind: IrEdgeKind
  from: string // irRefKey
  to: string
  weight?: number
  note?: string
}

export interface InterconnectGraph {
  /** Schema stamp for evolving wire. */
  schema: 'spw.ir.interconnect/1'
  nodes: Record<string, IrNode>
  edges: IrEdge[]
  /** Active lens/opt state for this graph snapshot. */
  lenses?: LensBundle
  /** Open optimization channels at snapshot time. */
  optChannels?: OptChannel[]
  /** Pending traversal effects (applied by runtime walkers). */
  effects?: TraversalEffect[]
}

export function emptyInterconnect(lenses?: LensBundle): InterconnectGraph {
  return {
    schema: 'spw.ir.interconnect/1',
    nodes: {},
    edges: [],
    lenses,
    optChannels: lenses?.optChannels ? [...lenses.optChannels] : undefined,
    effects: lenses?.effects ? [...lenses.effects] : undefined,
  }
}

export function putNode(graph: InterconnectGraph, node: IrNode): string {
  const key = irRefKey(node.ref)
  graph.nodes[key] = node
  return key
}

export function link(
  graph: InterconnectGraph,
  kind: IrEdgeKind,
  from: IrRef | string,
  to: IrRef | string,
  extra?: { weight?: number; note?: string },
): IrEdge {
  const fromKey = typeof from === 'string' ? from : irRefKey(from)
  const toKey = typeof to === 'string' ? to : irRefKey(to)
  const edge: IrEdge = { kind, from: fromKey, to: toKey, ...extra }
  graph.edges.push(edge)
  return edge
}

/** Neighbors along one edge kind (out or in). */
export function neighbors(
  graph: InterconnectGraph,
  key: string,
  edgeKind?: IrEdgeKind,
  direction: 'out' | 'in' | 'both' = 'out',
): IrNode[] {
  const out: IrNode[] = []
  for (const e of graph.edges) {
    if (edgeKind && e.kind !== edgeKind) continue
    if (direction !== 'in' && e.from === key && graph.nodes[e.to]) {
      out.push(graph.nodes[e.to]!)
    }
    if (direction !== 'out' && e.to === key && graph.nodes[e.from]) {
      out.push(graph.nodes[e.from]!)
    }
  }
  return out
}

/** Enable an opt channel on the graph (unique optimization surface). */
export function enableOpt(graph: InterconnectGraph, channel: OptChannel): void {
  const list = graph.optChannels ? [...graph.optChannels] : []
  const i = list.findIndex(c => c.id === channel.id)
  if (i >= 0) list[i] = { ...channel, enabled: true }
  else list.push({ ...channel, enabled: true })
  graph.optChannels = list
}

export function pushEffect(graph: InterconnectGraph, effect: TraversalEffect): void {
  graph.effects = [...(graph.effects ?? []), effect]
}

/** Summarize kinds present — agent-facing interconnect density. */
export function interconnectSummary(graph: InterconnectGraph): {
  nodeCount: number
  edgeCount: number
  kinds: Partial<Record<IrKind, number>>
  edgeKinds: Partial<Record<IrEdgeKind, number>>
  openOpts: string[]
} {
  const kinds: Partial<Record<IrKind, number>> = {}
  for (const n of Object.values(graph.nodes)) {
    kinds[n.ref.kind] = (kinds[n.ref.kind] ?? 0) + 1
  }
  const edgeKinds: Partial<Record<IrEdgeKind, number>> = {}
  for (const e of graph.edges) {
    edgeKinds[e.kind] = (edgeKinds[e.kind] ?? 0) + 1
  }
  return {
    nodeCount: Object.keys(graph.nodes).length,
    edgeCount: graph.edges.length,
    kinds,
    edgeKinds,
    openOpts: (graph.optChannels ?? []).filter(c => c.enabled).map(c => c.id),
  }
}

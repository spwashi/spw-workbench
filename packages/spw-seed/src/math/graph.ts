/**
 * Directed graph probes — portable modeling substrate for Spw relations.
 *
 * Spw mapping (interpretive → testable):
 *   nodes ≈ frames / registers / path targets
 *   edges ≈ ~path, @root hops, & confluence, <> couple
 *   cycles ≈ forbidden selector graphs / bad promote loops
 *
 * @see docs/theory/spw/math-modeling.spw
 */

export interface GraphEdge {
  from: string
  to: string
  /** Optional non-negative weight (default 1) */
  weight?: number
  /** Optional label (e.g. operator sigil, relation name) */
  label?: string
}

export interface DirectedGraph {
  nodes: string[]
  edges: GraphEdge[]
}

export function graphFromEdges(edges: GraphEdge[], extraNodes: string[] = []): DirectedGraph {
  const set = new Set<string>(extraNodes)
  for (const e of edges) {
    set.add(e.from)
    set.add(e.to)
  }
  return { nodes: [...set].sort(), edges: [...edges] }
}

export function adjacencyList(g: DirectedGraph): Map<string, GraphEdge[]> {
  const m = new Map<string, GraphEdge[]>()
  for (const n of g.nodes) m.set(n, [])
  for (const e of g.edges) {
    const list = m.get(e.from) ?? []
    list.push(e)
    m.set(e.from, list)
  }
  return m
}

/** Adjacency matrix over sorted node order; missing edge = Infinity, self = 0. */
export function adjacencyMatrix(g: DirectedGraph): {
  order: string[]
  matrix: number[][]
} {
  const order = [...g.nodes].sort()
  const idx = new Map(order.map((n, i) => [n, i]))
  const n = order.length
  const matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : Number.POSITIVE_INFINITY)),
  )
  for (const e of g.edges) {
    const i = idx.get(e.from)
    const j = idx.get(e.to)
    if (i == null || j == null) continue
    const w = e.weight ?? 1
    matrix[i]![j] = Math.min(matrix[i]![j]!, w)
  }
  return { order, matrix }
}

export interface CycleReport {
  cyclic: boolean
  /** One witness cycle if found (node ids) */
  cycle?: string[]
}

/**
 * DFS cycle detection. Returns whether a directed cycle exists.
 */
export function detectCycle(g: DirectedGraph): CycleReport {
  const adj = adjacencyList(g)
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  for (const n of g.nodes) color.set(n, WHITE)
  const parent = new Map<string, string | null>()
  let found: string[] | undefined

  function dfs(u: string): boolean {
    color.set(u, GRAY)
    for (const e of adj.get(u) ?? []) {
      const v = e.to
      const c = color.get(v) ?? WHITE
      if (c === GRAY) {
        // reconstruct cycle u → v → … → u
        const cycle = [v]
        let x: string | null | undefined = u
        while (x && x !== v) {
          cycle.push(x)
          x = parent.get(x) ?? null
        }
        cycle.push(v)
        cycle.reverse()
        found = cycle
        return true
      }
      if (c === WHITE) {
        parent.set(v, u)
        if (dfs(v)) return true
      }
    }
    color.set(u, BLACK)
    return false
  }

  for (const n of g.nodes) {
    if ((color.get(n) ?? WHITE) === WHITE) {
      parent.set(n, null)
      if (dfs(n)) return { cyclic: true, cycle: found }
    }
  }
  return { cyclic: false }
}

/**
 * Kahn topological sort. Throws if cyclic.
 */
export function topologicalSort(g: DirectedGraph): string[] {
  const adj = adjacencyList(g)
  const indeg = new Map<string, number>()
  for (const n of g.nodes) indeg.set(n, 0)
  for (const e of g.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)

  const q: string[] = []
  for (const [n, d] of indeg) if (d === 0) q.push(n)
  q.sort()
  const out: string[] = []
  while (q.length) {
    const u = q.shift()!
    out.push(u)
    for (const e of adj.get(u) ?? []) {
      const d = (indeg.get(e.to) ?? 0) - 1
      indeg.set(e.to, d)
      if (d === 0) {
        q.push(e.to)
        q.sort()
      }
    }
  }
  if (out.length !== g.nodes.length) {
    throw new Error('topologicalSort: graph has a cycle')
  }
  return out
}

/**
 * Bounded BFS/DFS walk from start (BFS by default via queue).
 */
export function walkGraph(
  g: DirectedGraph,
  start: string,
  opts: { maxSteps?: number; mode?: 'bfs' | 'dfs' } = {},
): { path: string[]; truncated: boolean } {
  const maxSteps = opts.maxSteps ?? 64
  const mode = opts.mode ?? 'bfs'
  if (!g.nodes.includes(start)) return { path: [], truncated: false }

  const adj = adjacencyList(g)
  const seen = new Set<string>([start])
  const path: string[] = [start]
  const q: string[] = [start]

  while (q.length && path.length < maxSteps) {
    const u = mode === 'bfs' ? q.shift()! : q.pop()!
    for (const e of adj.get(u) ?? []) {
      if (seen.has(e.to)) continue
      seen.add(e.to)
      path.push(e.to)
      q.push(e.to)
      if (path.length >= maxSteps) break
    }
  }
  const reachable = g.nodes.filter(n => !seen.has(n) && hasPath(g, start, n))
  return { path, truncated: path.length >= maxSteps || reachable.length > 0 }
}

function hasPath(g: DirectedGraph, from: string, to: string): boolean {
  const adj = adjacencyList(g)
  const seen = new Set<string>()
  const q = [from]
  while (q.length) {
    const u = q.pop()!
    if (u === to) return true
    if (seen.has(u)) continue
    seen.add(u)
    for (const e of adj.get(u) ?? []) q.push(e.to)
  }
  return false
}

/**
 * Dijkstra shortest path (non-negative weights).
 */
export function shortestPath(
  g: DirectedGraph,
  source: string,
  target: string,
): { distance: number; path: string[] } | null {
  if (!g.nodes.includes(source) || !g.nodes.includes(target)) return null
  const adj = adjacencyList(g)
  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()
  for (const n of g.nodes) {
    dist.set(n, Number.POSITIVE_INFINITY)
    prev.set(n, null)
  }
  dist.set(source, 0)
  const open = new Set(g.nodes)

  while (open.size) {
    let u: string | null = null
    let best = Number.POSITIVE_INFINITY
    for (const n of open) {
      const d = dist.get(n) ?? Number.POSITIVE_INFINITY
      if (d < best) {
        best = d
        u = n
      }
    }
    if (u == null || best === Number.POSITIVE_INFINITY) break
    open.delete(u)
    if (u === target) break
    for (const e of adj.get(u) ?? []) {
      const w = e.weight ?? 1
      if (w < 0) throw new Error('shortestPath: negative weights not supported')
      const alt = best + w
      if (alt < (dist.get(e.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(e.to, alt)
        prev.set(e.to, u)
      }
    }
  }

  const d = dist.get(target) ?? Number.POSITIVE_INFINITY
  if (!Number.isFinite(d)) return null
  const path: string[] = []
  let cur: string | null = target
  while (cur) {
    path.push(cur)
    cur = prev.get(cur) ?? null
  }
  path.reverse()
  return { distance: d, path }
}

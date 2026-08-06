/**
 * Corpus topography & familiarity — learn relationship interplay in a file set.
 *
 * Domain-agnostic: works for business/academic model packs and for novel
 * codebases that still share strands (path refs, roots, frames, sigils).
 *
 * @see docs/theory/spw/relationship-topography.spw
 */

import {
  detectCycle,
  graphFromEdges,
  topologicalSort,
  type DirectedGraph,
  type GraphEdge,
} from './graph'

export type RelationKind = 'path' | 'root' | 'frame' | 'other'

export interface CorpusLink {
  from: string
  to: string
  kind: RelationKind
  /** Optional line for navigation */
  line?: number
  label?: string
}

export interface CorpusFileSignals {
  file: string
  /** Operator sigil counts (prefix chars seen in source heuristically or from AST) */
  sigils: Record<string, number>
  pathRefCount: number
  rootRefCount: number
  frameCount: number
  annotationHints: number
  lineCount: number
}

export interface HubScore {
  id: string
  inDegree: number
  outDegree: number
  total: number
}

export interface FamiliarityStrand {
  id: string
  score: number
  detail: string
}

export interface TopographyReport {
  files: number
  links: number
  graph: DirectedGraph
  cyclic: boolean
  cycleWitness?: string[]
  /** Topo layers if DAG; empty if cyclic */
  layers: string[][]
  hubs: HubScore[]
  orphans: string[]
  brokenTargets: string[]
  /** Shared path basenames / frame names / sigil mix */
  strands: FamiliarityStrand[]
  sigilHistogram: Record<string, number>
}

export interface FamiliarityCompare {
  sharedStrands: FamiliarityStrand[]
  onlyA: string[]
  onlyB: string[]
  cosineSigils: number
  pathOverlap: number
  frameOverlap: number
}

/** Build directed graph from corpus links (nodes = files or logical ids). */
export function graphFromLinks(links: CorpusLink[], extraNodes: string[] = []): DirectedGraph {
  const edges: GraphEdge[] = links.map(l => ({
    from: l.from,
    to: l.to,
    label: l.kind,
    weight: 1,
  }))
  return graphFromEdges(edges, extraNodes)
}

export function degreeHubs(g: DirectedGraph, top = 12): HubScore[] {
  const inn = new Map<string, number>()
  const out = new Map<string, number>()
  for (const n of g.nodes) {
    inn.set(n, 0)
    out.set(n, 0)
  }
  for (const e of g.edges) {
    out.set(e.from, (out.get(e.from) ?? 0) + 1)
    inn.set(e.to, (inn.get(e.to) ?? 0) + 1)
  }
  return g.nodes
    .map(id => ({
      id,
      inDegree: inn.get(id) ?? 0,
      outDegree: out.get(id) ?? 0,
      total: (inn.get(id) ?? 0) + (out.get(id) ?? 0),
    }))
    .filter(h => h.total > 0)
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id))
    .slice(0, top)
}

/** Layers from topo sort: successive freelist removals (Kahn layers). */
export function topoLayers(g: DirectedGraph): string[][] {
  const indeg = new Map<string, number>()
  const outs = new Map<string, string[]>()
  for (const n of g.nodes) {
    indeg.set(n, 0)
    outs.set(n, [])
  }
  for (const e of g.edges) {
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)
    outs.get(e.from)!.push(e.to)
  }
  const layers: string[][] = []
  let frontier = g.nodes.filter(n => (indeg.get(n) ?? 0) === 0).sort()
  const seen = new Set<string>()
  while (frontier.length) {
    layers.push(frontier)
    for (const u of frontier) seen.add(u)
    const next: string[] = []
    for (const u of frontier) {
      for (const v of outs.get(u) ?? []) {
        const d = (indeg.get(v) ?? 0) - 1
        indeg.set(v, d)
        if (d === 0 && !seen.has(v)) next.push(v)
      }
    }
    frontier = [...new Set(next)].sort()
  }
  return layers
}

export function basename(p: string): string {
  const s = p.replace(/\\/g, '/')
  const i = s.lastIndexOf('/')
  return i >= 0 ? s.slice(i + 1) : s
}

export function stem(p: string): string {
  const b = basename(p)
  const i = b.lastIndexOf('.')
  return i > 0 ? b.slice(0, i) : b
}

/**
 * Aggregate topography from links + optional per-file signals.
 * `knownFiles` used to flag broken targets (edges to missing files).
 */
export function analyzeTopography(
  links: CorpusLink[],
  opts: {
    knownFiles?: Set<string>
    signals?: CorpusFileSignals[]
    hubTop?: number
  } = {},
): TopographyReport {
  const known = opts.knownFiles
  const fileNodes = new Set<string>()
  for (const l of links) {
    fileNodes.add(l.from)
    fileNodes.add(l.to)
  }
  if (known) for (const f of known) fileNodes.add(f)

  const graph = graphFromLinks(links, [...fileNodes])
  const cycle = detectCycle(graph)
  let layers: string[][] = []
  if (!cycle.cyclic) {
    try {
      // verify full sort; layers separate
      topologicalSort(graph)
      layers = topoLayers(graph)
    } catch {
      layers = []
    }
  }

  const hubs = degreeHubs(graph, opts.hubTop ?? 12)
  const withEdges = new Set<string>()
  for (const e of graph.edges) {
    withEdges.add(e.from)
    withEdges.add(e.to)
  }
  const orphans = graph.nodes.filter(n => !withEdges.has(n)).sort()

  const brokenTargets: string[] = []
  if (known) {
    const seen = new Set<string>()
    for (const l of links) {
      if (l.kind === 'path' && !known.has(l.to) && !seen.has(l.to)) {
        // only flag if looks like a file path
        if (l.to.includes('/') || l.to.endsWith('.spw')) {
          seen.add(l.to)
          brokenTargets.push(l.to)
        }
      }
    }
    brokenTargets.sort()
  }

  const sigilHistogram: Record<string, number> = {}
  if (opts.signals) {
    for (const s of opts.signals) {
      for (const [k, v] of Object.entries(s.sigils)) {
        sigilHistogram[k] = (sigilHistogram[k] ?? 0) + v
      }
    }
  }

  const strands = buildStrands(links, opts.signals ?? [], sigilHistogram)

  return {
    files: known?.size ?? new Set(links.map(l => l.from)).size,
    links: links.length,
    graph,
    cyclic: cycle.cyclic,
    cycleWitness: cycle.cycle,
    layers,
    hubs,
    orphans,
    brokenTargets,
    strands,
    sigilHistogram,
  }
}

function buildStrands(
  links: CorpusLink[],
  signals: CorpusFileSignals[],
  sigils: Record<string, number>,
): FamiliarityStrand[] {
  const strands: FamiliarityStrand[] = []

  // Path basenames as shared vocabulary
  const baseCount = new Map<string, number>()
  for (const l of links) {
    if (l.kind !== 'path') continue
    const b = basename(l.to)
    baseCount.set(b, (baseCount.get(b) ?? 0) + 1)
  }
  const topBases = [...baseCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  if (topBases.length) {
    strands.push({
      id: 'shared_path_basenames',
      score: topBases[0]![1] / Math.max(1, links.length),
      detail: topBases.map(([b, c]) => `${b}×${c}`).join(', '),
    })
  }

  // Sigil mix — strand of operator familiarity
  const sigEntries = Object.entries(sigils).sort((a, b) => b[1] - a[1]).slice(0, 8)
  if (sigEntries.length) {
    const total = sigEntries.reduce((a, [, v]) => a + v, 0)
    strands.push({
      id: 'sigil_rhythm',
      score: total > 0 ? (sigEntries[0]![1] / total) : 0,
      detail: sigEntries.map(([k, v]) => `${k}:${v}`).join(' '),
    })
  }

  // Frame density
  if (signals.length) {
    const frames = signals.reduce((a, s) => a + s.frameCount, 0)
    const lines = signals.reduce((a, s) => a + s.lineCount, 0)
    strands.push({
      id: 'frame_density',
      score: lines > 0 ? frames / lines : 0,
      detail: `${frames} frames / ${lines} lines`,
    })
    const paths = signals.reduce((a, s) => a + s.pathRefCount, 0)
    strands.push({
      id: 'path_ref_density',
      score: lines > 0 ? paths / lines : 0,
      detail: `${paths} path refs across ${signals.length} files`,
    })
  }

  // Root ref names as shelves
  const roots = new Map<string, number>()
  for (const l of links) {
    if (l.kind !== 'root') continue
    const root = l.to.split('/')[0] || l.to
    roots.set(root, (roots.get(root) ?? 0) + 1)
  }
  if (roots.size) {
    const top = [...roots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    strands.push({
      id: 'root_shelves',
      score: top[0]![1] / Math.max(1, links.length),
      detail: top.map(([r, c]) => `@${r}×${c}`).join(', '),
    })
  }

  return strands
}

/** Compare two corpora for shared familiarity strands. */
export function compareFamiliarity(
  a: TopographyReport,
  b: TopographyReport,
): FamiliarityCompare {
  const basesA = new Set(
    a.graph.edges.filter(e => e.label === 'path').map(e => basename(e.to)),
  )
  const basesB = new Set(
    b.graph.edges.filter(e => e.label === 'path').map(e => basename(e.to)),
  )
  // Also from hub ids stems
  for (const h of a.hubs) basesA.add(stem(h.id))
  for (const h of b.hubs) basesB.add(stem(h.id))

  const sharedBases = [...basesA].filter(x => basesB.has(x))
  const onlyA = [...basesA].filter(x => !basesB.has(x)).sort()
  const onlyB = [...basesB].filter(x => !basesA.has(x)).sort()
  const pathOverlap =
    basesA.size + basesB.size === 0
      ? 0
      : (2 * sharedBases.length) / (basesA.size + basesB.size)

  const keys = new Set([...Object.keys(a.sigilHistogram), ...Object.keys(b.sigilHistogram)])
  const va: number[] = []
  const vb: number[] = []
  for (const k of [...keys].sort()) {
    va.push(a.sigilHistogram[k] ?? 0)
    vb.push(b.sigilHistogram[k] ?? 0)
  }
  const cosineSigils = cosine(va, vb)

  const framesA = a.strands.find(s => s.id === 'frame_density')?.score ?? 0
  const framesB = b.strands.find(s => s.id === 'frame_density')?.score ?? 0
  const frameOverlap =
    framesA + framesB === 0 ? 0 : 1 - Math.abs(framesA - framesB) / Math.max(framesA, framesB, 1e-9)

  const sharedStrands: FamiliarityStrand[] = [
    {
      id: 'path_basename_jaccard',
      score: pathOverlap,
      detail: sharedBases.slice(0, 12).join(', ') || '(none)',
    },
    {
      id: 'sigil_cosine',
      score: cosineSigils,
      detail: `cos=${cosineSigils.toFixed(3)}`,
    },
    {
      id: 'frame_density_affinity',
      score: frameOverlap,
      detail: `A=${framesA.toFixed(4)} B=${framesB.toFixed(4)}`,
    },
  ]

  return { sharedStrands, onlyA: onlyA.slice(0, 40), onlyB: onlyB.slice(0, 40), cosineSigils, pathOverlap, frameOverlap }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/** Cheap sigil histogram from source text (strand-of-familiarity, not full parse). */
export function heuristicSigilHistogram(source: string): Record<string, number> {
  const sigils = ['~', '#', '@', '^', '&', '%', '$', '?', '!', '*', '=', '.'] as const
  const out: Record<string, number> = {}
  for (const s of sigils) out[s] = 0
  // Avoid counting inside obvious strings roughly: strip quoted spans
  const stripped = source.replace(/`[^`]*`/g, ' ').replace(/"[^"]*"/g, ' ').replace(/'[^']*'/g, ' ')
  for (const ch of stripped) {
    if (out[ch] != null) out[ch]++
  }
  return out
}

/** Count ^"frame" headers heuristically. */
export function heuristicFrameCount(source: string): number {
  return (source.match(/^\s*\^\[?"/gm) ?? []).length
}

export function heuristicAnnotationHints(source: string): number {
  return (source.match(/#:[A-Za-z_]|#![\w]|#>/g) ?? []).length
}

// ── Population product (census IR) + corpus product envelope ────
// Portable: no filesystem. CLI walk + memo attaches fingerprint/roots.

export const CORPUS_PRODUCT_VERSION = 'spw.corpus/1' as const
export const CORPUS_PRODUCT_SCHEMA = 'spw.corpus/1' as const

export type PopulationRole = 'hub' | 'orphan' | 'leaf' | 'source' | 'node' | 'broken-target'

/** One row of the population product (multi-file census IR). */
export interface PopulationRow {
  file: string
  lines: number
  pathRefs: number
  rootRefs: number
  frames: number
  annotations: number
  sigilTop: string
  role: PopulationRole
  inDegree: number
  outDegree: number
}

export interface PopulationStats {
  files: number
  lines: number
  pathRefs: number
  rootRefs: number
  frames: number
  byRole: Record<string, number>
}

/**
 * Durable collate product: topography + population + link/signal evidence.
 * Sources (file text) stay outside — re-read or process-memo them separately.
 */
export interface CorpusProduct {
  version: typeof CORPUS_PRODUCT_VERSION
  schema: typeof CORPUS_PRODUCT_SCHEMA
  /** Content-address of scan inputs (roots + options + file mtime/size digests). */
  fingerprint: string
  roots: string[]
  hubTop: number
  resolvePaths: boolean
  indexDepth: string
  scannedAt: string
  links: CorpusLink[]
  signals: CorpusFileSignals[]
  topography: TopographyReport
  population: PopulationRow[]
  stats: PopulationStats
  /** Set when rehydrated from memo. */
  memoHit?: boolean
  memoPlane?: 'memory' | 'disk' | 'fresh'
}

export function topSigils(sigils: Record<string, number>, n = 3): string {
  return Object.entries(sigils)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k, v]) => `${k}${v}`)
    .join(' ')
}

function degreeMapsFromTopo(topo: TopographyReport): {
  inDegree: Map<string, number>
  outDegree: Map<string, number>
} {
  const inDegree = new Map<string, number>()
  const outDegree = new Map<string, number>()
  for (const node of topo.graph.nodes) {
    inDegree.set(node, 0)
    outDegree.set(node, 0)
  }
  for (const edge of topo.graph.edges) {
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1)
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
  }
  for (const hub of topo.hubs) {
    inDegree.set(hub.id, hub.inDegree)
    outDegree.set(hub.id, hub.outDegree)
  }
  return { inDegree, outDegree }
}

export function populationRoleOf(
  file: string,
  hubs: Set<string>,
  orphans: Set<string>,
  inDegree: number,
  outDegree: number,
): PopulationRole {
  if (hubs.has(file)) return 'hub'
  if (orphans.has(file)) return 'orphan'
  if (outDegree === 0 && inDegree > 0) return 'leaf'
  if (inDegree === 0 && outDegree > 0) return 'source'
  return 'node'
}

/** Build population rows from signals + topography (pure). */
export function buildPopulation(
  signals: CorpusFileSignals[],
  topo: TopographyReport,
): PopulationRow[] {
  const hubSet = new Set(topo.hubs.map(h => h.id))
  const orphanSet = new Set(topo.orphans)
  const degree = degreeMapsFromTopo(topo)

  return signals
    .map((signal): PopulationRow => {
      const inDegree = degree.inDegree.get(signal.file) ?? 0
      const outDegree = degree.outDegree.get(signal.file) ?? 0
      return {
        file: signal.file,
        lines: signal.lineCount,
        pathRefs: signal.pathRefCount,
        rootRefs: signal.rootRefCount,
        frames: signal.frameCount,
        annotations: signal.annotationHints,
        sigilTop: topSigils(signal.sigils, 3),
        role: populationRoleOf(signal.file, hubSet, orphanSet, inDegree, outDegree),
        inDegree,
        outDegree,
      }
    })
    .sort((a, b) => a.file.localeCompare(b.file))
}

export function populationStats(rows: readonly PopulationRow[]): PopulationStats {
  const byRole: Record<string, number> = {}
  let lines = 0
  let pathRefs = 0
  let rootRefs = 0
  let frames = 0
  for (const row of rows) {
    lines += row.lines
    pathRefs += row.pathRefs
    rootRefs += row.rootRefs
    frames += row.frames
    byRole[row.role] = (byRole[row.role] ?? 0) + 1
  }
  return { files: rows.length, lines, pathRefs, rootRefs, frames, byRole }
}

export function sortPopulation(
  rows: PopulationRow[],
  key: 'file' | 'lines' | 'refs' | 'frames' | 'sigils' | 'degree',
): PopulationRow[] {
  const copy = [...rows]
  const refCount = (row: PopulationRow) => row.pathRefs + row.rootRefs
  const degreeSum = (row: PopulationRow) => row.inDegree + row.outDegree
  copy.sort((a, b) => {
    switch (key) {
      case 'lines':
        return b.lines - a.lines || a.file.localeCompare(b.file)
      case 'refs':
        return refCount(b) - refCount(a) || a.file.localeCompare(b.file)
      case 'frames':
        return b.frames - a.frames || a.file.localeCompare(b.file)
      case 'sigils':
        return b.sigilTop.length - a.sigilTop.length || a.file.localeCompare(b.file)
      case 'degree':
        return degreeSum(b) - degreeSum(a) || a.file.localeCompare(b.file)
      default:
        return a.file.localeCompare(b.file)
    }
  })
  return copy
}

export function filterPopulation(
  rows: PopulationRow[],
  role: PopulationRole | 'all' | undefined,
): PopulationRow[] {
  if (!role || role === 'all') return rows
  return rows.filter(row => row.role === role)
}

/** Assemble corpus product from scan evidence (no sources). */
export function buildCorpusProduct(input: {
  fingerprint: string
  roots: string[]
  hubTop: number
  resolvePaths: boolean
  indexDepth: string
  links: CorpusLink[]
  signals: CorpusFileSignals[]
  topography: TopographyReport
  population?: PopulationRow[]
  scannedAt?: string
  memoHit?: boolean
  memoPlane?: CorpusProduct['memoPlane']
}): CorpusProduct {
  const population = input.population ?? buildPopulation(input.signals, input.topography)
  return {
    version: CORPUS_PRODUCT_VERSION,
    schema: CORPUS_PRODUCT_SCHEMA,
    fingerprint: input.fingerprint,
    roots: [...input.roots],
    hubTop: input.hubTop,
    resolvePaths: input.resolvePaths,
    indexDepth: input.indexDepth,
    scannedAt: input.scannedAt ?? new Date().toISOString(),
    links: input.links,
    signals: input.signals,
    topography: input.topography,
    population,
    stats: populationStats(population),
    memoHit: input.memoHit,
    memoPlane: input.memoPlane ?? 'fresh',
  }
}

// Dual-read formatters live in canonical/corpus-disclosure.ts (formatSpwCard).
// Product construction stays here — math must not import disclosure emitters.

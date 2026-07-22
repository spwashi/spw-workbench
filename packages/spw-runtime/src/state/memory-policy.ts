/**
 * Register-bank memory pressure scoring and eviction plans.
 *
 * Policy (from types + ocean cache contract):
 *   - Evict early phase facets first when envelope.evictable
 *   - Prefer local/low-frequency/low-coupling cells for full cell drop
 *   - Protect focus, default `"`, and history registers 0–9
 *   - Cost ~ magnitude + facet weight + provenance depth
 */

import type {
  Liminality,
  RegisterEntry,
  RegisterId,
  RegisterPhase,
} from './types'
import { LIMINALITY_ORDER, PHASE_ORDER } from './types'

export interface MemoryBudget {
  /** Soft cap on total estimated cost units (not bytes). */
  maxCost: number
  /** Soft cap on cell count (excluding protected). Default unlimited. */
  maxCells?: number
  /** When true, strip early facets before dropping cells. Default true. */
  preferFacetEviction?: boolean
  /** Liminality ceiling for full cell eviction (cells above are kept). */
  maxEvictLiminality?: Liminality
}

export interface MemoryPressureReport {
  cells: number
  estimatedCost: number
  budget: MemoryBudget | null
  overBudget: boolean
  costRatio: number
  byLiminality: Record<Liminality, number>
  facetTotal: number
  evictableFacetCells: number
}

export interface FacetEviction {
  key: RegisterId
  removedPhases: RegisterPhase[]
  keptPhase: RegisterPhase
}

export interface CellEviction {
  key: RegisterId
  cost: number
  score: number
  liminality: Liminality
}

export interface EvictionPlan {
  facetEvictions: FacetEviction[]
  cellEvictions: CellEviction[]
  projectedCost: number
  projectedCells: number
}

export interface ScoredCell {
  key: RegisterId
  entry: RegisterEntry
  cost: number
  /** Higher = more likely to evict */
  score: number
  liminality: Liminality
  protected: boolean
}

const PROTECTED_KEYS = new Set<string>(['"', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '@'])

export function isProtectedKey(key: RegisterId, focusKey?: RegisterId): boolean {
  if (PROTECTED_KEYS.has(key)) return true
  if (focusKey && key === focusKey) return true
  if (key.startsWith('mark:')) return true
  return false
}

export function liminalityRank(l: Liminality | undefined): number {
  const idx = LIMINALITY_ORDER.indexOf(l ?? 'local')
  return idx >= 0 ? idx : 0
}

/**
 * Rough cost units for a cell — guides pressure, not byte-accurate GC.
 */
export function estimateCellCost(entry: RegisterEntry): number {
  let cost = 1
  cost += valueMagnitude(entry.value)
  const facets = entry.meta.phases?.facets?.length ?? 0
  if (facets > 0) {
    const weights = entry.meta.phases!.facets.map(
      f => f.memoryWeight ?? (PHASE_ORDER.indexOf(f.phase) + 1) / PHASE_ORDER.length,
    )
    cost += weights.reduce((a, b) => a + b, 0) * 4
  }
  cost += Math.min(8, (entry.meta.provenance?.length ?? 0) * 0.25)
  cost += (entry.meta.lenses?.length ?? 0) * 0.5
  cost += (entry.meta.measureDepth ?? 0) * 0.25
  // Global cells are "heavier" residency (harder placement), not higher evict score
  cost *= 1 + liminalityRank(entry.meta.liminality) * 0.15
  return cost
}

function valueMagnitude(value: unknown): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return Math.min(32, Math.abs(value))
  if (typeof value === 'string') return Math.min(64, value.length / 8)
  if (typeof value === 'boolean') return value ? 1 : 0
  if (Array.isArray(value)) return Math.min(64, value.length)
  if (typeof value === 'object') return Math.min(64, Object.keys(value as object).length)
  return 1
}

/**
 * Eviction score: higher = better candidate to drop.
 * Local, cold (old lastUsed), low frequency, low coupling, low measure depth.
 */
export function evictionScore(entry: RegisterEntry, nowMs: number): number {
  const lim = liminalityRank(entry.meta.liminality)
  const freq = entry.meta.frequency ?? 0
  const coupling = entry.meta.coupling ?? 0
  const measure = entry.meta.measureDepth ?? 0
  const last = Date.parse(entry.meta.lastUsedAt)
  const ageSec = Number.isFinite(last) ? Math.max(0, (nowMs - last) / 1000) : 60
  const ageFactor = Math.min(10, Math.log1p(ageSec))
  // Inverse protection from liminality / heat / coupling
  const protect = 1 + lim * 2 + freq + coupling * 3 + measure * 0.5
  return (ageFactor * (1 + estimateCellCost(entry) * 0.1)) / protect
}

export function scoreCells(
  entries: Iterable<[RegisterId, RegisterEntry]>,
  focusKey: RegisterId,
  nowMs: number = Date.now(),
): ScoredCell[] {
  const out: ScoredCell[] = []
  for (const [key, entry] of entries) {
    out.push({
      key,
      entry,
      cost: estimateCellCost(entry),
      score: evictionScore(entry, nowMs),
      liminality: entry.meta.liminality ?? 'local',
      protected: isProtectedKey(key, focusKey),
    })
  }
  return out
}

export function reportMemoryPressure(
  entries: Iterable<[RegisterId, RegisterEntry]>,
  budget: MemoryBudget | null,
  focusKey: RegisterId,
): MemoryPressureReport {
  const byLiminality: Record<Liminality, number> = {
    local: 0,
    liminal: 0,
    visible: 0,
    global: 0,
  }
  let estimatedCost = 0
  let cells = 0
  let facetTotal = 0
  let evictableFacetCells = 0

  for (const [, entry] of entries) {
    cells++
    estimatedCost += estimateCellCost(entry)
    const lim = entry.meta.liminality ?? 'local'
    byLiminality[lim] = (byLiminality[lim] ?? 0) + 1
    const facets = entry.meta.phases?.facets?.length ?? 0
    facetTotal += facets
    if (entry.meta.phases?.evictable && facets > 1) evictableFacetCells++
  }

  const maxCost = budget?.maxCost ?? Infinity
  const costRatio = Number.isFinite(maxCost) && maxCost > 0 ? estimatedCost / maxCost : 0
  const overBudget =
    budget != null &&
    (estimatedCost > budget.maxCost ||
      (budget.maxCells != null && cells > budget.maxCells + countProtected(entries, focusKey)))

  return {
    cells,
    estimatedCost,
    budget,
    overBudget,
    costRatio: Number.isFinite(costRatio) ? costRatio : 0,
    byLiminality,
    facetTotal,
    evictableFacetCells,
  }
}

function countProtected(
  entries: Iterable<[RegisterId, RegisterEntry]>,
  focusKey: RegisterId,
): number {
  let n = 0
  for (const [key] of entries) {
    if (isProtectedKey(key, focusKey)) n++
  }
  return n
}

/**
 * Plan facet strip + cell drops to bring estimated cost under budget.
 */
export function planEviction(
  entries: Map<RegisterId, RegisterEntry>,
  budget: MemoryBudget,
  focusKey: RegisterId,
  nowMs: number = Date.now(),
): EvictionPlan {
  const preferFacets = budget.preferFacetEviction !== false
  const maxLim = budget.maxEvictLiminality ?? 'visible'
  const maxLimRank = liminalityRank(maxLim)

  const facetEvictions: FacetEviction[] = []
  let projectedCost = 0
  for (const [, entry] of entries) {
    projectedCost += estimateCellCost(entry)
  }
  let projectedCells = entries.size

  // Clone costs mentally: after facet strip, cost drops
  if (preferFacets) {
    for (const [key, entry] of entries) {
      const phases = entry.meta.phases
      if (!phases?.evictable || phases.facets.length <= 1) continue
      if (projectedCost <= budget.maxCost && (budget.maxCells == null || projectedCells <= budget.maxCells)) {
        break
      }
      const removed = phases.facets.slice(0, -1).map(f => f.phase)
      const kept = phases.facets[phases.facets.length - 1]!
      facetEvictions.push({
        key,
        removedPhases: removed,
        keptPhase: kept.phase,
      })
      // Approximate cost reduction
      projectedCost -= removed.length * 2
    }
  }

  const cellEvictions: CellEviction[] = []
  if (
    projectedCost > budget.maxCost ||
    (budget.maxCells != null && projectedCells > budget.maxCells)
  ) {
    const scored = scoreCells(entries, focusKey, nowMs)
      .filter(s => !s.protected && liminalityRank(s.liminality) <= maxLimRank)
      .sort((a, b) => b.score - a.score || b.cost - a.cost)

    for (const s of scored) {
      if (
        projectedCost <= budget.maxCost &&
        (budget.maxCells == null || projectedCells <= budget.maxCells)
      ) {
        break
      }
      // Skip if already facet-only target? still may need full drop
      cellEvictions.push({
        key: s.key,
        cost: s.cost,
        score: s.score,
        liminality: s.liminality,
      })
      projectedCost -= s.cost
      projectedCells -= 1
    }
  }

  return {
    facetEvictions,
    cellEvictions,
    projectedCost: Math.max(0, projectedCost),
    projectedCells: Math.max(0, projectedCells),
  }
}

/** Apply facet eviction to a phase envelope → keep latest facet only. */
export function stripEarlyFacets<T extends { phases?: { current: RegisterPhase; facets: Array<{ phase: RegisterPhase; enrichedAt: string; source?: string; data?: Record<string, unknown>; memoryWeight?: number }>; lineage?: RegisterId[]; evictable?: boolean } }>(
  meta: T,
): { removed: RegisterPhase[]; meta: T } {
  const phases = meta.phases
  if (!phases || !phases.evictable || phases.facets.length <= 1) {
    return { removed: [], meta }
  }
  const removed = phases.facets.slice(0, -1).map(f => f.phase)
  const kept = phases.facets[phases.facets.length - 1]!
  return {
    removed,
    meta: {
      ...meta,
      phases: {
        ...phases,
        current: kept.phase,
        facets: [{ ...kept }],
      },
    },
  }
}

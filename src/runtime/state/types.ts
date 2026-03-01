export type RegisterAccessMode =
  | 'kinetic'
  | 'structural'
  | 'deferred'
  | 'conditional'
  | 'resolved'
  | 'property'
  | 'perspective'
  | 'category'
  | 'confluent'
  | 'material'
  | 'ratio'
  | 'context'

export type ContainerAffinity =
  | 'void'
  | 'promote'
  | 'block'
  | 'conditional'
  | 'value'
  | 'property'
  | 'perspective'
  | 'category'
  | 'merge'
  | 'meta'
  | 'scalar'
  | 'stream'
  | 'capsule'

export interface RegisterDescriptor {
  name: string
  accessMode: RegisterAccessMode
  containerAffinity: ContainerAffinity
}

export type RuntimeScalar = string | number | boolean | null

export interface RuntimeRecord {
  [key: string]: RuntimeValue
}

export interface ScopeFrame {
  observer: string
  value: RuntimeValue
  capturedAt: string
}

export interface RuntimePacket {
  kind: 'selection' | 'node' | 'landmark' | 'html' | 'operator' | 'runtime'
  concept?: string
  scene?: string
  mode?: string
  definition?: string
  sourceRef?: string
  payload?: RuntimeValue
  tags?: string[]
}

export type RuntimeValue = RuntimeScalar | RuntimeRecord | RuntimeValue[] | RuntimePacket | ScopeFrame | undefined

// ── Phase-enrichment model ────────────────────────────────────

/**
 * Pipeline phase — coarse buckets for this increment.
 * Each phase progressively enriches the register cell.
 *
 * Serialization: maps 1:1 to Spw modifier tags:
 *   lex → !lex[], parse → !parse[], sem → !sem[], opt → !opt[], prag → !prag[]
 */
export type RegisterPhase =
  | 'lex'   // tokenization: character → token
  | 'parse' // structure: token → AST node
  | 'sem'   // semantics: meaning, type resolution, relations
  | 'opt'   // optimization: dead-code, constant folding
  | 'prag'  // pragmatics: runtime context, effects, output

/**
 * Ordered phase progression — used for comparison, serialization, and eviction priority.
 * Earlier phases are cheaper to recompute and evict first under memory pressure.
 */
export const PHASE_ORDER: readonly RegisterPhase[] = ['lex', 'parse', 'sem', 'opt', 'prag'] as const

// ── Liminality model ──────────────────────────────────────────

/**
 * Liminality — scope-awareness level for memory management.
 * Controls GC policy and hardware-aligned memory placement.
 *
 *   0 = local   (stack, GC on block exit)
 *   1 = liminal (heap, GC on scope exit, aware of peers)
 *   2 = visible (pinned, GC on navigate-away)
 *   3 = global  (persistent, survives session)
 */
export type Liminality = 0 | 1 | 2 | 3

export const LIMINALITY_LABELS: Record<Liminality, string> = {
  0: 'local',
  1: 'liminal',
  2: 'visible',
  3: 'global',
} as const

/**
 * Per-phase metadata produced when a cell is enriched.
 * Facets are additive — the cell keeps all its earlier facets.
 */
export interface PhaseFacet {
  phase: RegisterPhase
  /** ISO timestamp of enrichment */
  enrichedAt: string
  /** Source/agent that produced this facet */
  source?: string
  /** Arbitrary per-phase payload (type-narrowed downstream) */
  data?: Record<string, unknown>
  /**
   * Memory weight hint (0–1). Higher = more expensive to recompute.
   * Guides eviction: lex facets (~0.1) evict before sem facets (~0.7).
   * Default: derived from PHASE_ORDER index / length.
   */
  memoryWeight?: number
}

/**
 * Additive enrichment wrapper — tracks the cell's journey
 * from dumb value to rich semantics.
 */
export interface PhaseEnvelope {
  /** Current (highest) phase */
  current: RegisterPhase
  /** Ordered facets — each phase adds one */
  facets: PhaseFacet[]
  /** Optional lineage edge: which cell contributed to this enrichment */
  lineage?: string[]
  /**
   * Memory management: if true, earlier facets can be evicted under pressure.
   * When evicted, only the latest facet + current phase are kept.
   */
  evictable?: boolean
}

/**
 * Typed register address — replaces bare string keys
 * with operator-typed, phase-aware addresses.
 */
export interface RegisterAddress {
  /** Register key (e.g., '"', '0', 'result') */
  key: string
  /** Operator that produced this address */
  operator?: string
  /** Phase at which this address was created */
  phase?: RegisterPhase
}

export interface RegisterMeta {
  key: string
  descriptor: RegisterDescriptor
  writes: number
  lastUsedAt: string
  immutable: boolean
  provenance: string[]
  lenses: string[]
  /** Phase enrichment envelope — undefined for legacy/uninstrumented cells */
  phases?: PhaseEnvelope
  /** Typed address — undefined for legacy cells created with bare string keys */
  address?: RegisterAddress

  // ── Acoustic fields ───────────────────────────────────────

  /** Liminality — scope-awareness level (0=local … 3=global) */
  liminality?: Liminality
  /** Acoustic frequency — writes/sec over sliding window */
  frequency?: number
  /** Coupling — normalized inter-register reference density (0–1) */
  coupling?: number
  /** Measure depth — count of %[] observations applied to this cell */
  measureDepth?: number
}

export interface RegisterEntry {
  key: string
  value: RuntimeValue
  meta: RegisterMeta
}

export interface RegisterWriteOptions {
  source?: string
  immutable?: boolean
  descriptor?: Partial<RegisterDescriptor>
  force?: boolean
  /** Phase annotation for this write */
  phase?: RegisterPhase
}

export interface RegisterSnapshot {
  focusKey: string
  entries: Record<string, RegisterEntry>
  lensIndex: Record<string, string[]>
}

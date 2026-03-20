import type { ModifierKind, OperatorKind, RegisterId } from '@spw/seed'
export type { RegisterId }

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

export type RuntimeValence = ModifierKind

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
 *   lex → !lex[], parse → !parse[], semantic → !semantic[],
 *   optimize → !optimize[], pragmatic → !pragmatic[]
 */
export const PHASE_ORDER = ['lex', 'parse', 'semantic', 'optimize', 'pragmatic'] as const

export type RegisterPhase =
  typeof PHASE_ORDER[number]

export type RegisterPhaseAlias =
  | 'sem'
  | 'opt'
  | 'prag'

export type RegisterPhaseInput =
  | RegisterPhase
  | RegisterPhaseAlias

/**
 * Ordered phase progression — used for comparison, serialization, and eviction priority.
 * Earlier phases are cheaper to recompute and evict first under memory pressure.
 */
export function normalizeRegisterPhase(phase: RegisterPhaseInput): RegisterPhase {
  switch (phase) {
    case 'sem':
      return 'semantic'
    case 'opt':
      return 'optimize'
    case 'prag':
      return 'pragmatic'
    default:
      return phase
  }
}

/**
 * Liminality — scope-awareness level for memory management.
 * Controls GC policy and hardware-aligned memory placement.
 */
export const LIMINALITY_ORDER = ['local', 'liminal', 'visible', 'global'] as const

export type Liminality =
  typeof LIMINALITY_ORDER[number]

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
  lineage?: RegisterId[]
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
  key: RegisterId
  /** Operator that produced this address */
  operator?: string
  /** Phase at which this address was created */
  phase?: RegisterPhase
}

export interface RegisterMeta {
  key: RegisterId
  descriptor: RegisterDescriptor
  writes: number
  lastUsedAt: string
  immutable: boolean
  provenance: string[]
  lenses: string[]
  valence: RuntimeValence[]
  operator?: OperatorKind
  registerRole?: string
  semanticFrames?: Record<string, unknown>
  /** Phase enrichment envelope — undefined for legacy/uninstrumented cells */
  phases?: PhaseEnvelope
  /** Typed address — undefined for legacy cells created with bare string keys */
  address?: RegisterAddress

  // ── Acoustic fields ───────────────────────────────────────

  /** Liminality — scope-awareness level */
  liminality?: Liminality
  /** Acoustic frequency — writes/sec over sliding window */
  frequency?: number
  /** Coupling — normalized inter-register reference density (0–1) */
  coupling?: number
  /** Measure depth — count of %[] observations applied to this cell */
  measureDepth?: number
}

export interface RegisterEntry {
  key: RegisterId
  value: RuntimeValue
  meta: RegisterMeta
}

export interface RegisterWriteOptions {
  source?: string
  immutable?: boolean
  descriptor?: Partial<RegisterDescriptor>
  force?: boolean
  operator?: OperatorKind
  valence?: RuntimeValence[]
  registerRole?: string
  semanticFrames?: Record<string, unknown>
  /** Phase annotation for this write */
  phase?: RegisterPhaseInput
}

export interface RegisterSnapshot {
  focusKey: RegisterId
  entries: Record<RegisterId, RegisterEntry>
  lensIndex: Record<string, RegisterId[]>
}

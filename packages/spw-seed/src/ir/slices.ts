/**
 * Typed IR slice payloads — light shapes stages may attach to IrNode.data.
 * Prefer extending these over inventing parallel ad-hoc objects per command.
 */

import type { IrRef } from './ref'
import type { FlowProtocolModule } from '../canonical/flow-protocol'
import type { GeometricResonanceReport } from '../canonical/geometric-resonance'

/** Glob/list/stdin selection of surfaces (and optional AST node pin). */
export interface SelectionIR {
  uris: string[]
  contentHashes?: Record<string, string>
  globs?: string[]
  stdin?: boolean
  /** Optional selector id or AST dump ref. */
  selector?: string
  /** Byte span when selection is range-addressed (pairs with Patch). */
  span?: { start: number; end: number }
  /** Nest-path skeleton pin from scanNestPaths. */
  nestSkeleton?: string
}

/** Multi-axis stack (dialect × review × format × …). */
export interface StackIR {
  dialect: string
  dialectSource?: string
  review?: string
  format?: string
  mutation?: string
  reading?: string
  domain?: string
  contextMode?: string
  lex?: string
  metasyntax?: Record<string, boolean>
}

/** Form geometry summary (not full GeometryReport). */
export interface FormIR {
  maxDepth: number
  braceKinds: string[]
  topOps: Array<{ op: string; count: number }>
  lessons?: string[]
  method?: 'ast' | 'scan' | 'auto'
  /** Content hash of intermediate geometry bytecode when available. */
  contentHash?: string
}

/**
 * Intermediate geometry bytecode citation — cache key + dense vectors for
 * later opt / workspace merge without retaining full GeometryReport.
 */
export interface GeometryBytecodeIR {
  version: 'spw.geometry.bc/1'
  contentHash: string
  maxDepth: number
  unitCount: number
  scheduleCount?: number
  /** Optional cosine peer uris from field pass. */
  similar?: string[]
}

/**
 * Weighted geometric resonance edges (post-scheme).
 * Features allow reweight without re-scan (agent / thrift schemes).
 */
export interface ResonanceIR {
  scheme: string
  edges: Array<{
    type: string
    ends: [string, string]
    strength: number
    features?: Record<string, number>
    uri?: string
    line?: number
  }>
}

/** Graph neighborhood / corpus topo slice. */
export interface GraphIR {
  hubs?: string[]
  orphans?: string[]
  edges?: Array<{ from: string; to: string; kind?: string }>
  ego?: { center: string; depth: number; neighbors: string[] }
}

/** Attention prior for multi-file crawls. */
export interface AttentionIR {
  focusUri?: string
  probeHeat?: number
  editRecency?: number
  hubPull?: number
  order?: string[]
}

/**
 * Measure family observation / reconcile slice.
 * Family id comes from Spw registry (mass = thrift specialization).
 */
export interface MeasureIR {
  family: string
  /** Operator+identifier product, e.g. %mass */
  product?: string
  scheme?: string
  plane?: string
  scopeKind?: string
  algorithm?: string
  form?: string
  verdicts?: Array<{ key: string; verdict: string; declared?: number; observed?: number }>
  missing?: string[]
  /** Attentional scope target when known. */
  scopeTarget?: string
}

/** Stream window / ordered items. */
export interface StreamIR {
  items: unknown[]
  cursor?: number
  dialect?: string
  window?: number
}

/** Cache tier stats / entry citation. */
export interface CacheIR {
  key: string
  tier?: 'hot' | 'warm' | 'cold'
  hit?: boolean
  stats?: { size: number; hits: number; misses: number }
}

/** Precipitate citation (stage fallout without full payload). */
export interface PrecipitateCite {
  stage: string
  delta: string
  at?: string
  /** Ref to full precipitate if stored. */
  ref?: IrRef
}

/** Envelope meta block for CLI/LSP v2-style disclosure. */
export interface EnvelopeMeta {
  ir?: IrRef[]
  cache?: CacheIR
  channel?: string
  lens?: string
  optChannels?: string[]
  interconnect?: { nodeCount: number; edgeCount: number; openOpts: string[] }
}

/** Bundle often returned by surface/hot inspect. */
export interface SurfaceCardIR {
  uri?: string
  stack: StackIR
  form?: FormIR
  graph?: GraphIR
  phrases?: Record<string, number>
  flow?: FlowProtocolModule
  geometric?: GeometricResonanceReport
  probeSummary?: string
  experimental?: { known: string[]; unknown: string[] }
  attention?: AttentionIR
  cache?: CacheIR
}

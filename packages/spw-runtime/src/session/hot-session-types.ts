/**
 * Hot session product types and pure helpers (no session state).
 *
 * Split from hot-session.ts for craft (file budget + single responsibility).
 */

import { createHash } from 'node:crypto'
import {
  parse,
  scanFlowProtocol,
  type DialectId,
  type GeometricResonanceReport,
  type GeometryBytecode,
  type Granularity,
  type IrRef,
  type ResolveGranularityInput,
  type ParseEventPolicy,
} from '@spwashi/spw-seed'
import type { BeatCache, CacheTier } from '../state/memory-cache'
import type { RunSpwResult } from '../pipeline/types'
import type { StabilityChannel } from './channels'
import type { ConsumerContext } from './consumer'
import type { PreparedSource } from './prepare'
import type { PhraseHit, FixityKind } from './phrases'
import type { RuntimeMedium } from './medium-matrix'
import type { DialectRuntimePolicy } from './dialect-policy'
import type { ProbeMeasureReport } from './probe-measure'
import type { RuntimeTracePolicy } from '../interpreter/types'

export interface HotSessionOptions {
  channel?: StabilityChannel | string
  consumer?: ConsumerContext
  cacheMaxEntries?: number
  defaultTier?: CacheTier
  /** Session id for substrate naming. */
  id?: string
}

export interface HotEvalOptions {
  path?: string
  dialect?: DialectId | string
  autoDialect?: boolean
  desugar?: boolean
  parseEventPolicy?: ParseEventPolicy
  runtimeTracePolicy?: RuntimeTracePolicy
  /** @deprecated Prefer runtimeTracePolicy. */
  captureTrace?: boolean
  /** Force recompute even on cache hit. */
  recompute?: boolean
  /** Cache tier for this entry. */
  tier?: CacheTier
  /** Override resonance scheme (else dialect policy / grain). */
  resonanceScheme?: string
  /** Granularity overrides (depth/plane/follow/disclose). */
  grain?: Partial<ResolveGranularityInput>
}

/** In-memory handle for bytecode / surface cites (point arm). */
export interface HotCiteHandle {
  ref: IrRef
  /** Spw dual-read pointer form. */
  pointer: string
  grain: Granularity
  source: string
  path?: string
  inspect?: HotInspectRecord
  evaluate?: HotEvalRecord
}

export interface HotEvalRecord {
  /** Hash of prepared source bytes (post-dialect cut). */
  contentHash: string
  prepared: PreparedSource
  result: RunSpwResult
  phrases: PhraseHit[]
  phraseCounts: Record<string, number>
  cacheHit: boolean
  atBeat: number
  dialectPolicy?: string
}

export interface HotInspectRecord {
  /** Hash of prepared source bytes (post-dialect cut). */
  contentHash: string
  prepared: PreparedSource
  parse: ReturnType<typeof parse>
  phrases: PhraseHit[]
  phraseCounts: Record<string, number>
  /** Act placement histogram — potentiation dual-read. */
  fixityCounts: Record<FixityKind, number>
  /** phrase×fixity opt keys for combinator caches. */
  phraseKeys: string[]
  /** Resolved channel×dialect medium (agency wall + form medium). */
  medium: RuntimeMedium
  experimentalRefs: string[]
  flow: ReturnType<typeof scanFlowProtocol>
  geometric: GeometricResonanceReport
  probeMeasure: ProbeMeasureReport
  channel: StabilityChannel
  cache: ReturnType<BeatCache<unknown>['stats']>
  dialectPolicy: DialectRuntimePolicy
  bytecode: GeometryBytecode
  cacheHit: boolean
  atBeat: number
}

export function hashContent(source: string): string {
  return createHash('sha256').update(source).digest('hex').slice(0, 16)
}

/** Prefer path receipt preparedHash when present (same algorithm as prepare). */
export function productHash(prepared: PreparedSource): string {
  return prepared.pathReceipt?.preparedHash ?? hashContent(prepared.source)
}

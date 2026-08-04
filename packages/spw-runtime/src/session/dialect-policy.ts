/**
 * Dialect as primary subject — cache, opt handles, resonance, index bias.
 *
 * Channel is a *wall* (who may run); dialect is the *subject* of the work
 * (what form we are learning / optimizing). Cache keys already include both;
 * this table says how long to keep products and which opt handles open.
 *
 * Expertise reward: different dialects train different muscles — plan streams,
 * flow glyphs, hot measure loops, query envelopes — without one flat tier.
 *
 * @see packages/spw-seed/src/dialect/types.ts
 * @see packages/spw-runtime/src/session/channels.ts
 */

import type { CacheTier } from '../state/memory-cache'

export type DialectSubjectId =
  | 'Spw.b'
  | 'Spw.l'
  | 'Spw.m'
  | 'Spw.x'
  | 'Spw.q'
  | 'Spw.f'
  | 'Spw.p'
  | 'Spw.t'
  | 'Spw.o'
  | string

/** Named opt handles — labels and operator biases as optimization levers. */
export type OptHandleId =
  | 'parse_reuse'
  | 'phrase_opt'
  | 'path_memo'
  | 'label_opt' // pipe / frame labels as rewrite anchors
  | 'bias_rank' // =bias axes reorder attention
  | 'schedule_opt' // <<>> slots (flow)
  | 'probe_opt' // probe↔measure (hot / thrift)
  | 'precipitate_cite'

export interface DialectRuntimePolicy {
  dialect: string
  /** One-line subject — what this dialect is *about* in the stack. */
  subject: string
  /** BeatCache tier for evaluate / inspect products. */
  cacheTier: CacheTier
  /** Geometric resonance weight scheme id. */
  resonanceScheme: 'default' | 'agent' | 'thrift' | string
  /** Default opt handles when building interconnect for this dialect. */
  optHandles: readonly OptHandleId[]
  /** Index depth bias when hosts walk corpora. */
  indexDepth: 'minimal' | 'standard' | 'full'
  /** Keep inspect cards in-memory (second BeatCache plane). */
  inspectMemory: boolean
  /** Prefer dimensional handles (labels, bias axes) in field index. */
  dimensionalIndex: boolean
  /** Learning note — CS literacy this dialect exercises. */
  literacy: string
  note: string
}

/**
 * Mindful per-dialect policy table.
 * Prefer editing here over scattering dialect ifs in HotSession / CLI / LSP.
 */
export const DIALECT_RUNTIME_POLICIES: Record<string, DialectRuntimePolicy> = {
  'Spw.b': {
    dialect: 'Spw.b',
    subject: 'block author geometry — default living surface',
    cacheTier: 'warm',
    resonanceScheme: 'default',
    optHandles: ['parse_reuse', 'phrase_opt', 'label_opt'],
    indexDepth: 'standard',
    inspectMemory: true,
    dimensionalIndex: true,
    literacy: 'structure, nesting, dual-read of frames and facets',
    note: 'Author default; balanced cache; labels as navigate/opt anchors',
  },
  'Spw.l': {
    dialect: 'Spw.l',
    subject: 'line compact — newline≈space, dense one-liners',
    cacheTier: 'warm',
    resonanceScheme: 'default',
    optHandles: ['parse_reuse', 'path_memo'],
    indexDepth: 'minimal',
    inspectMemory: true,
    dimensionalIndex: false,
    literacy: 'tokenization vs whitespace, compact encodings',
    note: 'Cheap preprocess; minimal geometry index',
  },
  'Spw.m': {
    dialect: 'Spw.m',
    subject: 'machine / ONF-leaning — soft lint, layout format',
    cacheTier: 'warm',
    resonanceScheme: 'thrift',
    optHandles: ['parse_reuse', 'phrase_opt', 'precipitate_cite'],
    indexDepth: 'full',
    inspectMemory: true,
    dimensionalIndex: true,
    literacy: 'IRs, normal forms, lint as static analysis',
    note: 'Fuller index for product/ONF; thrift resonance',
  },
  'Spw.x': {
    dialect: 'Spw.x',
    subject: 'executable / hot — measure-first evolution loops',
    cacheTier: 'hot',
    resonanceScheme: 'thrift',
    optHandles: ['parse_reuse', 'phrase_opt', 'probe_opt', 'bias_rank', 'label_opt'],
    indexDepth: 'standard',
    inspectMemory: true,
    dimensionalIndex: true,
    literacy: 'caches, TTLs, evaluation, optimization handles',
    note: 'Hot tier; probe/measure + bias_rank; never silent tree write',
  },
  'Spw.q': {
    dialect: 'Spw.q',
    subject: 'query / selector — address language',
    cacheTier: 'warm',
    resonanceScheme: 'default',
    optHandles: ['parse_reuse', 'path_memo', 'label_opt'],
    indexDepth: 'standard',
    inspectMemory: true,
    dimensionalIndex: true,
    literacy: 'query languages, selection, envelopes',
    note: 'Path memo + labels; highContext metasyntax',
  },
  'Spw.f': {
    dialect: 'Spw.f',
    subject: 'flow / mutation-CA — schedules and sigil roles',
    cacheTier: 'warm',
    resonanceScheme: 'agent',
    optHandles: ['parse_reuse', 'schedule_opt', 'bias_rank', 'phrase_opt'],
    indexDepth: 'standard',
    inspectMemory: true,
    dimensionalIndex: true,
    literacy: 'concurrency metaphors, streams, cellular automata schedules',
    note: 'Agent scheme; schedule + bias as primary opt handles',
  },
  'Spw.p': {
    dialect: 'Spw.p',
    subject: 'plan / agent stream — wip memory model',
    cacheTier: 'cold',
    resonanceScheme: 'agent',
    optHandles: ['parse_reuse', 'path_memo', 'label_opt'],
    indexDepth: 'standard',
    inspectMemory: false,
    dimensionalIndex: true,
    literacy: 'planning, provenance, episode structure',
    note: 'Cold cache (streams churn); agent resonance; no heavy inspect mem',
  },
  'Spw.t': {
    dialect: 'Spw.t',
    subject: 'template / expand lineage — slots and projection',
    cacheTier: 'cold',
    resonanceScheme: 'default',
    optHandles: ['parse_reuse', 'phrase_opt'],
    indexDepth: 'minimal',
    inspectMemory: false,
    dimensionalIndex: false,
    literacy: 'macros, hygiene, derived surfaces vs source',
    note: 'Derived .expanded.spw lives beside; never index as canon',
  },
  'Spw.o': {
    dialect: 'Spw.o',
    subject: 'ocean regional dense — channel-gated experiment',
    cacheTier: 'cold',
    resonanceScheme: 'agent',
    optHandles: ['parse_reuse'],
    indexDepth: 'minimal',
    inspectMemory: false,
    dimensionalIndex: false,
    literacy: 'regional dialects, experimental channels',
    note: 'Only under ocean|experimental|trial channels',
  },
}

const FALLBACK: DialectRuntimePolicy = DIALECT_RUNTIME_POLICIES['Spw.b']!

export function resolveDialectPolicy(dialect: string | undefined): DialectRuntimePolicy {
  if (!dialect) return FALLBACK
  return DIALECT_RUNTIME_POLICIES[dialect] ?? FALLBACK
}

/** Tier when channel and dialect disagree: prefer hotter of the two for live/x. */
export function resolveProductCacheTier(
  dialectTier: CacheTier,
  channelTier: CacheTier,
): CacheTier {
  const rank = { hot: 0, warm: 1, cold: 2 }
  return rank[dialectTier] <= rank[channelTier] ? dialectTier : channelTier
}

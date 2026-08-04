/**
 * Configurable granularity — depth × plane × follow × disclose.
 *
 * Product of axes (same law as dimensional address): not a new flag per feature.
 * Resolves from dialect + channel + optional overrides; drives HotSession cite/follow,
 * CLI disclosure, and index depth bias.
 *
 * @see docs/theory/spw/reference-deref-geometry.spw
 */

import type { IndexDepth } from '../canonical/index-config'

/** How much work / how far from source. */
export type GranularityDepth = 'skim' | 'card' | 'field' | 'full'

/** Which intermediate plane may materialize. */
export type GranularityPlane =
  | 'source'
  | 'bytecode'
  | 'resonance'
  | 'interconnect'
  | 'eval'

/**
 * Point vs follow strength (ref/deref dual-read).
 * point = cite only; soft = resonance couples; hard = resolve/collapse under channel.
 */
export type GranularityFollow = 'point' | 'soft' | 'hard'

/** How results leave the session — Spw dual-read preferred. */
export type GranularityDisclose = 'spw' | 'envelope' | 'silent'

export interface Granularity {
  version: 'spw.granularity/1'
  depth: GranularityDepth
  plane: GranularityPlane
  follow: GranularityFollow
  disclose: GranularityDisclose
  /** Resonance edge cap (physics + readability). */
  resonanceLimit: number
  /** Weight scheme when plane includes resonance. */
  resonanceScheme: string
  /** Index depth bias for corpus walks. */
  indexDepth: IndexDepth
  /** Beat demotion pressure 0..1 — higher = more volatile session memory. */
  volatility: number
}

export interface ResolveGranularityInput {
  dialect?: string
  channel?: string
  /** Consumer mode when known. */
  consumerMode?: 'canonical' | 'mounted-consumer' | 'biome-regional'
  /** Explicit overrides (CLI / LSP). */
  depth?: GranularityDepth
  plane?: GranularityPlane
  follow?: GranularityFollow
  disclose?: GranularityDisclose
  resonanceScheme?: string
  resonanceLimit?: number
}

const DEPTH_RANK: Record<GranularityDepth, number> = {
  skim: 0,
  card: 1,
  field: 2,
  full: 3,
}

const PLANE_RANK: Record<GranularityPlane, number> = {
  source: 0,
  bytecode: 1,
  resonance: 2,
  interconnect: 3,
  eval: 4,
}

/**
 * Dialect defaults — form subject drives depth/scheme/volatility.
 * Resonance & session volatility are products of language physics here.
 */
const DIALECT_GRAIN: Record<
  string,
  Pick<Granularity, 'depth' | 'plane' | 'follow' | 'resonanceScheme' | 'indexDepth' | 'volatility' | 'resonanceLimit'>
> = {
  'Spw.b': {
    depth: 'card',
    plane: 'resonance',
    follow: 'soft',
    resonanceScheme: 'default',
    indexDepth: 'standard',
    volatility: 0.25,
    resonanceLimit: 32,
  },
  'Spw.l': {
    depth: 'skim',
    plane: 'bytecode',
    follow: 'point',
    resonanceScheme: 'default',
    indexDepth: 'minimal',
    volatility: 0.35,
    resonanceLimit: 16,
  },
  'Spw.m': {
    depth: 'full',
    plane: 'interconnect',
    follow: 'soft',
    resonanceScheme: 'thrift',
    indexDepth: 'full',
    volatility: 0.2,
    resonanceLimit: 40,
  },
  'Spw.x': {
    depth: 'card',
    plane: 'eval',
    follow: 'hard',
    resonanceScheme: 'thrift',
    indexDepth: 'standard',
    volatility: 0.55,
    resonanceLimit: 40,
  },
  'Spw.q': {
    depth: 'skim',
    plane: 'bytecode',
    follow: 'hard',
    resonanceScheme: 'default',
    indexDepth: 'standard',
    volatility: 0.3,
    resonanceLimit: 16,
  },
  'Spw.f': {
    depth: 'card',
    plane: 'resonance',
    follow: 'soft',
    resonanceScheme: 'agent',
    indexDepth: 'standard',
    volatility: 0.4,
    resonanceLimit: 36,
  },
  'Spw.p': {
    depth: 'card',
    plane: 'resonance',
    follow: 'soft',
    resonanceScheme: 'agent',
    indexDepth: 'standard',
    volatility: 0.7,
    resonanceLimit: 24,
  },
  'Spw.t': {
    depth: 'skim',
    plane: 'source',
    follow: 'point',
    resonanceScheme: 'default',
    indexDepth: 'minimal',
    volatility: 0.6,
    resonanceLimit: 12,
  },
}

const CHANNEL_VOLATILITY: Record<string, number> = {
  stable: 0.15,
  trial: 0.35,
  draft: 0.5,
  live: 0.45,
  experimental: 0.75,
  consumer: 0.25,
  ocean: 0.8,
}

const FALLBACK = DIALECT_GRAIN['Spw.b']!

export function resolveGranularity(input: ResolveGranularityInput = {}): Granularity {
  const d = DIALECT_GRAIN[input.dialect ?? ''] ?? FALLBACK
  const chVol = CHANNEL_VOLATILITY[input.channel ?? ''] ?? 0.3

  let follow = input.follow ?? d.follow
  // Mounted consumer: never default hard follow outside explicit override
  if (input.consumerMode === 'mounted-consumer' && !input.follow && follow === 'hard') {
    follow = 'soft'
  }
  // Live/experimental may promote hard when dialect is Spw.x|q
  if (
    !input.follow
    && (input.channel === 'live' || input.channel === 'experimental')
    && (input.dialect === 'Spw.x' || input.dialect === 'Spw.q')
  ) {
    follow = 'hard'
  }

  let plane = input.plane ?? d.plane
  let depth = input.depth ?? d.depth

  // Depth must be able to host the plane
  if (plane === 'eval' && DEPTH_RANK[depth] < DEPTH_RANK.card) depth = 'card'
  if (plane === 'field' as GranularityPlane) depth = 'field'
  if (plane === 'resonance' && DEPTH_RANK[depth] < DEPTH_RANK.card) depth = 'card'

  // Skim never materializes resonance/eval unless forced
  if (depth === 'skim' && !input.plane) {
    plane = 'bytecode'
  }

  const volatility = Math.min(
    1,
    Math.max(0, (input.depth ? d.volatility : d.volatility) * 0.6 + chVol * 0.4),
  )

  // Higher volatility → fewer edges retained (physics pressure)
  const baseLimit = input.resonanceLimit ?? d.resonanceLimit
  const resonanceLimit = Math.max(
    8,
    Math.round(baseLimit * (1 - volatility * 0.35)),
  )

  let disclose: GranularityDisclose = input.disclose ?? 'spw'
  if (input.consumerMode === 'biome-regional' && !input.disclose) disclose = 'spw'

  return {
    version: 'spw.granularity/1',
    depth,
    plane,
    follow,
    disclose,
    resonanceLimit,
    resonanceScheme: input.resonanceScheme ?? d.resonanceScheme,
    indexDepth: d.indexDepth,
    volatility,
  }
}

/** Whether this grain materializes geometric resonance. */
export function grainWantsResonance(g: Granularity): boolean {
  return (
    PLANE_RANK[g.plane] >= PLANE_RANK.resonance
    && DEPTH_RANK[g.depth] >= DEPTH_RANK.card
  )
}

/** Whether this grain runs interpret/evaluate. */
export function grainWantsEval(g: Granularity): boolean {
  return g.plane === 'eval' || g.depth === 'full'
}

/** Whether interconnect graph is built. */
export function grainWantsInterconnect(g: Granularity): boolean {
  return PLANE_RANK[g.plane] >= PLANE_RANK.interconnect || g.depth === 'full'
}

/** Spw-native one-liner for cards. */
export function formatGranularityAsSpw(g: Granularity): string {
  return (
    `^["granularity"]{ depth: ${g.depth}, plane: ${g.plane}, follow: ${g.follow}, ` +
    `disclose: ${g.disclose}, scheme: ${g.resonanceScheme}, limit: ${g.resonanceLimit}, ` +
    `volatility: ${g.volatility.toFixed(2)} }`
  )
}

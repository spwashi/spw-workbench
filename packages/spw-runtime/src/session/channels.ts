/**
 * Stability / effect channels — permission walls orthogonal to dialect geometry.
 *
 * Channel decides what may be parsed, crawled, and discharged; dialect decides
 * how source is shaped. Cache keys must include both.
 *
 * @see docs/theory/spw/brace-charge-crawl.spw
 * @see .spw/biome/ocean/algos/cache.spw
 */

import type { CacheTier } from '../state/memory-cache'

/** Named stability / consumer / regional walls. */
export type StabilityChannel =
  | 'stable'
  | 'trial'
  | 'draft'
  | 'live'
  | 'experimental'
  | 'consumer'
  | 'ocean'

/** Effect ceiling labels (plan → host). Soft enum for greenfield. */
export type EffectCeiling = 'l0' | 'l1' | 'l2' | 'none'

export interface ChannelPolicy {
  id: StabilityChannel
  /** Dialects allowed to drive preprocess/parse under this channel. */
  allowDialects: readonly string[]
  /** Crawl verbs permitted (empty = all). */
  allowCrawlVerbs: readonly string[]
  /** Max effect grade for discharge / host write. */
  effectCeiling: EffectCeiling
  /** Default BeatCache tier for products under this channel. */
  cacheDefaultTier: CacheTier
  /** Human note for doctor / help. */
  note: string
}

const ALL_CORE_DIALECTS = [
  'Spw.b',
  'Spw.l',
  'Spw.m',
  'Spw.x',
  'Spw.q',
  'Spw.f',
  'Spw.p',
  'Spw.t',
] as const

/** Regional ocean dense tag — not a core dialect id until graduated. */
export const REGIONAL_OCEAN_DIALECT = 'Spw.o'

const ALL_CRAWL = [
  'potentiate',
  'accumulate',
  'distribute',
  'confluence',
  'collate',
  'discharge',
] as const

/**
 * Greenfield policy table. Prefer editing here over scattering if/else in CLI.
 * Not frozen — consumer packs may overlay via resolveChannelPolicy later.
 */
export const CHANNEL_POLICIES: Record<StabilityChannel, ChannelPolicy> = {
  stable: {
    id: 'stable',
    allowDialects: [...ALL_CORE_DIALECTS],
    allowCrawlVerbs: [...ALL_CRAWL],
    effectCeiling: 'l1',
    cacheDefaultTier: 'warm',
    note: 'Default authoring; full core dialects; no regional Spw.o',
  },
  trial: {
    id: 'trial',
    allowDialects: [...ALL_CORE_DIALECTS, REGIONAL_OCEAN_DIALECT],
    allowCrawlVerbs: [...ALL_CRAWL],
    effectCeiling: 'l0',
    cacheDefaultTier: 'warm',
    note: 'Trial syntax + regional; plan-only discharge',
  },
  draft: {
    id: 'draft',
    allowDialects: [...ALL_CORE_DIALECTS, REGIONAL_OCEAN_DIALECT],
    allowCrawlVerbs: ['potentiate', 'accumulate', 'collate', 'confluence'],
    effectCeiling: 'none',
    cacheDefaultTier: 'cold',
    note: 'Sense-only; no discharge',
  },
  live: {
    id: 'live',
    allowDialects: ['Spw.x', 'Spw.l', 'Spw.q', 'Spw.b'],
    allowCrawlVerbs: [...ALL_CRAWL],
    effectCeiling: 'l2',
    cacheDefaultTier: 'hot',
    note: 'Hot interpretation; tight dialect set; host ceiling allowed',
  },
  experimental: {
    id: 'experimental',
    allowDialects: [...ALL_CORE_DIALECTS, REGIONAL_OCEAN_DIALECT],
    allowCrawlVerbs: [...ALL_CRAWL],
    effectCeiling: 'l0',
    cacheDefaultTier: 'cold',
    note: 'Biome / =exp surfaces; low hit-rate cache',
  },
  consumer: {
    id: 'consumer',
    allowDialects: [...ALL_CORE_DIALECTS],
    allowCrawlVerbs: [...ALL_CRAWL],
    effectCeiling: 'l1',
    cacheDefaultTier: 'warm',
    note: 'Mounted consumer authority; no workbench write',
  },
  ocean: {
    id: 'ocean',
    allowDialects: [...ALL_CORE_DIALECTS, REGIONAL_OCEAN_DIALECT],
    allowCrawlVerbs: [...ALL_CRAWL],
    effectCeiling: 'l0',
    cacheDefaultTier: 'cold',
    note: 'Ocean biome regional channel',
  },
}

export function isStabilityChannel(value: string): value is StabilityChannel {
  return Object.prototype.hasOwnProperty.call(CHANNEL_POLICIES, value)
}

export function resolveChannelPolicy(
  channel: StabilityChannel | string | undefined,
  fallback: StabilityChannel = 'stable',
): ChannelPolicy {
  if (channel && isStabilityChannel(channel)) return CHANNEL_POLICIES[channel]
  return CHANNEL_POLICIES[fallback]
}

export function channelAllowsDialect(policy: ChannelPolicy, dialect: string): boolean {
  return policy.allowDialects.includes(dialect)
}

export function channelAllowsCrawlVerb(policy: ChannelPolicy, verb: string): boolean {
  if (policy.allowCrawlVerbs.length === 0) return true
  return policy.allowCrawlVerbs.includes(verb)
}

/** Extend cacheKey parts with channel (and optional lens). */
export function channelCacheParts(parts: {
  channel?: StabilityChannel | string
  lens?: string
  dialect?: string
  fileHash?: string
  extra?: string
}): {
  channel?: string
  dialect?: string
  fileHash?: string
  extra?: string
} {
  const extra = [parts.lens ? `lens:${parts.lens}` : '', parts.extra ?? '']
    .filter(Boolean)
    .join('|')
  return {
    channel: parts.channel,
    dialect: parts.dialect,
    fileHash: parts.fileHash,
    extra: extra || undefined,
  }
}

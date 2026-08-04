/**
 * Crawl verbs and mutating lenses — field maneuvers over SelectionIR regions.
 *
 * @see docs/theory/spw/brace-charge-crawl.spw
 */

import type { ChargePacket, ChargeState } from './charge'
import type { StabilityChannel } from './channels'
import { channelAllowsCrawlVerb, resolveChannelPolicy } from './channels'

/** Charge-motion verbs for multi-file / multi-depth walks. */
export type CrawlVerb =
  | 'potentiate'
  | 'accumulate'
  | 'distribute'
  | 'confluence'
  | 'collate'
  | 'discharge'

/** Depth level at which a lens may mutate what identifiers mean. */
export type CrawlLensLevel = 'file' | 'frame' | 'body' | 'reg' | 'graph'

export interface CrawlLens {
  level: CrawlLensLevel
  /** Opaque lens id for cache keys (e.g. stack hash, bias axis). */
  id: string
  /** Optional operator/valence labels that mutated the lens. */
  labels?: readonly string[]
  /** Bias axis if present. */
  biasAxis?: string
}

export interface CrawlStep {
  depth: number
  uri?: string
  verb: CrawlVerb
  lens: CrawlLens
  /** Local identifier cache key used at this step. */
  localIdCacheKey: string
  chargeIn: ChargeState
  chargeOut: ChargeState
  /** Channel at step time. */
  channel: StabilityChannel
  note?: string
}

export interface CrawlPlan {
  verb: CrawlVerb
  channel: StabilityChannel
  seed: readonly string[]
  steps: CrawlStep[]
}

export interface LocalIdCacheEntry {
  id: string
  locus: string
  lensId: string
  region: string
}

/** Build a stable local-id cache key; lens mutation must change this. */
export function localIdCacheKey(parts: {
  region: string
  dialect?: string
  channel: string
  lensId: string
  contentHash?: string
}): string {
  return [
    `reg:${parts.region}`,
    parts.dialect ? `d:${parts.dialect}` : '',
    `ch:${parts.channel}`,
    `lens:${parts.lensId}`,
    parts.contentHash ? `hash:${parts.contentHash}` : '',
  ]
    .filter(Boolean)
    .join('|')
}

const VERB_STATE: Record<CrawlVerb, { from: ChargeState[]; to: ChargeState }> = {
  potentiate: { from: ['latent', 'shielded', 'potentiated'], to: 'potentiated' },
  accumulate: { from: ['potentiated', 'bound', 'mobile'], to: 'bound' },
  distribute: { from: ['bound', 'mobile', 'potentiated'], to: 'mobile' },
  confluence: { from: ['bound', 'mobile'], to: 'bound' },
  collate: { from: ['potentiated', 'bound', 'mobile'], to: 'bound' },
  discharge: { from: ['bound', 'mobile', 'potentiated'], to: 'discharged' },
}

export function applyCrawlVerbToState(verb: CrawlVerb, state: ChargeState): ChargeState {
  const rule = VERB_STATE[verb]
  if (state === 'shielded' && verb !== 'potentiate') return 'shielded'
  if (!rule.from.includes(state) && state !== rule.to) {
    // Soft allow: still transition to target for greenfield exploration
    return rule.to
  }
  return rule.to
}

export function assertCrawlAllowed(
  channel: StabilityChannel | string,
  verb: CrawlVerb,
): { ok: true } | { ok: false; reason: string } {
  const policy = resolveChannelPolicy(channel)
  if (!channelAllowsCrawlVerb(policy, verb)) {
    return {
      ok: false,
      reason: `channel ${policy.id} forbids crawl verb ${verb} (ceiling ${policy.effectCeiling})`,
    }
  }
  if (verb === 'discharge' && policy.effectCeiling === 'none') {
    return { ok: false, reason: `channel ${policy.id} has effectCeiling none — no discharge` }
  }
  return { ok: true }
}

/**
 * Plan a simple linear crawl: one step per seed uri, same verb, mutating lens by depth index.
 */
export function planLinearCrawl(options: {
  verb: CrawlVerb
  channel: StabilityChannel
  seeds: readonly string[]
  dialect?: string
  baseLensId?: string
  labels?: readonly string[]
}): CrawlPlan | { error: string } {
  const gate = assertCrawlAllowed(options.channel, options.verb)
  if (!gate.ok) return { error: gate.reason }

  const levels: CrawlLensLevel[] = ['file', 'frame', 'body', 'reg', 'graph']
  const steps: CrawlStep[] = []
  let charge: ChargeState = 'latent'

  options.seeds.forEach((uri, depth) => {
    const level = levels[Math.min(depth, levels.length - 1)]!
    const lens: CrawlLens = {
      level,
      id: `${options.baseLensId ?? 'default'}:${level}:${depth}`,
      labels: options.labels,
    }
    const chargeIn = charge
    charge = applyCrawlVerbToState(options.verb, chargeIn)
    steps.push({
      depth,
      uri,
      verb: options.verb,
      lens,
      localIdCacheKey: localIdCacheKey({
        region: uri,
        dialect: options.dialect,
        channel: options.channel,
        lensId: lens.id,
      }),
      chargeIn,
      chargeOut: charge,
      channel: options.channel,
    })
  })

  return {
    verb: options.verb,
    channel: options.channel,
    seed: [...options.seeds],
    steps,
  }
}

/** Apply verb to a charge packet (state only; value motion is caller’s job). */
export function stepCharge(packet: ChargePacket, verb: CrawlVerb): ChargePacket {
  return {
    ...packet,
    state: applyCrawlVerbToState(verb, packet.state),
  }
}

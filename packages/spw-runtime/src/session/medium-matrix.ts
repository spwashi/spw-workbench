/**
 * Channel × dialect medium matrix — intentional agency wall meets form medium.
 *
 * Dialect = geometry / metasyntax of the cut (subject).
 * Channel = who may run / discharge (wall).
 * Grain defaults = how much intermediate materializes (aperture).
 *
 * @see packages/spw-runtime/src/session/channels.ts
 * @see packages/spw-runtime/src/session/dialect-policy.ts
 * @see packages/spw-seed/src/ir/granularity.ts
 * @see docs/theory/spw/operational-field.spw
 */

import {
  resolveGranularity,
  type Granularity,
  type GranularityDepth,
  type GranularityFollow,
  type GranularityPlane,
} from '@spwashi/spw-seed'
import {
  channelAllowsDialect,
  resolveChannelPolicy,
  type EffectCeiling,
  type StabilityChannel,
} from './channels'
import {
  resolveDialectPolicy,
  resolveProductCacheTier,
  type DialectRuntimePolicy,
} from './dialect-policy'
import type { CacheTier } from '../state/memory-cache'

export const MEDIUM_MATRIX_VERSION = 'spw.medium_matrix/1' as const

/** Resolved runtime medium for one (channel, dialect) pair. */
export interface RuntimeMedium {
  version: typeof MEDIUM_MATRIX_VERSION
  channel: StabilityChannel
  dialect: string
  /** Channel permits this dialect for prepare/parse. */
  dialectAllowed: boolean
  effectCeiling: EffectCeiling
  /** Combined product retention bias. */
  productCacheTier: CacheTier
  dialectPolicy: DialectRuntimePolicy
  /** Default aperture for inspect/cite when callers omit grain. */
  defaultGrain: Granularity
  /**
   * Hardest follow this medium may use without an explicit override.
   * draft → never hard; consumer → soft max unless overridden; live+x → hard ok.
   */
  maxFollowDefault: GranularityFollow
  /** Highest plane the medium tends to open by default. */
  defaultPlane: GranularityPlane
  defaultDepth: GranularityDepth
  /** Plan-only: effectCeiling is l0 or none. */
  collateOnly: boolean
  note: string
}

const FOLLOW_RANK: Record<GranularityFollow, number> = {
  point: 0,
  soft: 1,
  hard: 2,
}

function minFollow(a: GranularityFollow, b: GranularityFollow): GranularityFollow {
  return FOLLOW_RANK[a] <= FOLLOW_RANK[b] ? a : b
}

/**
 * Resolve the medium for a channel + dialect.
 * Does not parse source — pure policy composition.
 */
export function resolveRuntimeMedium(
  channel: StabilityChannel | string = 'stable',
  dialect: string = 'Spw.b',
): RuntimeMedium {
  const ch = resolveChannelPolicy(channel)
  const dialectPolicy = resolveDialectPolicy(dialect)
  const dialectAllowed = channelAllowsDialect(ch, dialect)
  const defaultGrain = resolveGranularity({
    dialect,
    channel: ch.id,
  })

  // Agency wall softens follow defaults
  let maxFollowDefault: GranularityFollow = defaultGrain.follow
  if (ch.effectCeiling === 'none') {
    maxFollowDefault = minFollow(maxFollowDefault, 'point')
  } else if (ch.effectCeiling === 'l0') {
    maxFollowDefault = minFollow(maxFollowDefault, 'soft')
  }
  if (ch.id === 'draft') {
    maxFollowDefault = 'point'
  }
  if (ch.id === 'consumer' && maxFollowDefault === 'hard') {
    maxFollowDefault = 'soft'
  }

  const grain: Granularity = {
    ...defaultGrain,
    follow: maxFollowDefault,
  }

  const collateOnly = ch.effectCeiling === 'l0' || ch.effectCeiling === 'none'

  return {
    version: MEDIUM_MATRIX_VERSION,
    channel: ch.id,
    dialect: dialectPolicy.dialect,
    dialectAllowed,
    effectCeiling: ch.effectCeiling,
    productCacheTier: resolveProductCacheTier(dialectPolicy.cacheTier, ch.cacheDefaultTier),
    dialectPolicy,
    defaultGrain: grain,
    maxFollowDefault,
    defaultPlane: grain.plane,
    defaultDepth: grain.depth,
    collateOnly,
    note: [
      ch.note,
      dialectPolicy.note,
      collateOnly ? 'collate-only medium (no host discharge)' : 'discharge possible under ceiling',
      dialectAllowed ? '' : `dialect ${dialect} forbidden on channel ${ch.id}`,
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

/** Compact table of core dialects × channels for doctor / docs. */
export function mediumMatrixSnapshot(
  channels: readonly StabilityChannel[] = [
    'stable',
    'trial',
    'draft',
    'live',
    'experimental',
    'consumer',
  ],
  dialects: readonly string[] = [
    'Spw.b',
    'Spw.l',
    'Spw.m',
    'Spw.x',
    'Spw.q',
    'Spw.f',
    'Spw.p',
    'Spw.t',
  ],
): RuntimeMedium[] {
  const out: RuntimeMedium[] = []
  for (const ch of channels) {
    for (const d of dialects) {
      out.push(resolveRuntimeMedium(ch, d))
    }
  }
  return out
}

/** Spw dual-read card for one medium cell. */
export function formatRuntimeMediumSpw(m: RuntimeMedium): string {
  return [
    `^["medium"]{`,
    `  ~#channel: ${m.channel}`,
    `  ~#dialect: ${m.dialect}`,
    `  ~#allowed: ${m.dialectAllowed ? '#yes' : '#no'}`,
    `  ~#ceiling: ${m.effectCeiling}`,
    `  ~#collateOnly: ${m.collateOnly ? '#yes' : '#no'}`,
    `  ~#depth: ${m.defaultDepth}`,
    `  ~#plane: ${m.defaultPlane}`,
    `  ~#follow: ${m.maxFollowDefault}`,
    `  ~#cacheTier: ${m.productCacheTier}`,
    `  ~#scheme: ${m.defaultGrain.resonanceScheme}`,
    `}`,
  ].join('\n')
}

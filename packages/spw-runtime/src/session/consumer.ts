/**
 * Consumer-facing session context — mount-aware roots for subject resolve.
 *
 * @see packages/spw-runtime/src/site-install.ts
 * @see docs/theory/spw/brace-charge-crawl.spw
 */

import type { StabilityChannel } from './channels'
import type { SpwMountResolution } from '../site-install'

export type ConsumerMode = 'canonical' | 'mounted-consumer' | 'biome-regional'

export interface ConsumerContext {
  mode: ConsumerMode
  /** Authority root for consumer-owned .spw */
  consumerRoot: string
  /** Workbench / infrastructure root when mounted (read-only for consumer channel). */
  workbenchRoot?: string
  /** Active stability channel. */
  channel: StabilityChannel
  /** Optional regional biome name (ocean, consumer pack id). */
  biome?: string
  /** Engaged surface ids from mount when present. */
  engagedSurfaces?: readonly string[]
}

export function consumerContextFromMount(
  mount: SpwMountResolution,
  channel: StabilityChannel = 'consumer',
): ConsumerContext {
  return {
    mode: 'mounted-consumer',
    consumerRoot: mount.siteRoot,
    workbenchRoot: mount.workbenchRoot,
    channel,
    engagedSurfaces: mount.engagedSurfaces,
  }
}

export function consumerContextCanonical(
  root: string,
  channel: StabilityChannel = 'stable',
): ConsumerContext {
  return {
    mode: 'canonical',
    consumerRoot: root,
    channel,
  }
}

export function consumerContextOcean(
  workbenchRoot: string,
  channel: StabilityChannel = 'ocean',
): ConsumerContext {
  return {
    mode: 'biome-regional',
    consumerRoot: workbenchRoot,
    workbenchRoot,
    channel,
    biome: 'ocean',
  }
}

/**
 * Whether a write path is infrastructure (refused under consumer channel).
 * Soft heuristic: path under workbenchRoot but not under consumerRoot.
 */
export function isInfrastructurePath(ctx: ConsumerContext, absPath: string): boolean {
  if (ctx.mode !== 'mounted-consumer' || !ctx.workbenchRoot) return false
  const wb = ctx.workbenchRoot.replace(/\/$/, '')
  const cr = ctx.consumerRoot.replace(/\/$/, '')
  if (absPath === cr || absPath.startsWith(`${cr}/`)) return false
  return absPath === wb || absPath.startsWith(`${wb}/`)
}

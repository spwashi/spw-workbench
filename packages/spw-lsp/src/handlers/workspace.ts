/**
 * Workspace handlers — URI-first manifest evidence and retention-tier temperature.
 */

import { particleMixTotal, type ParticleMix } from '@spwashi/spw-seed'
import {
  resolveWorkspaceAuthority,
  resolveWorkspacePathIdentity,
} from '../workspace-authority'
import {
  SPW_WORKSPACE_MANIFEST_SCHEMA_VERSION,
  SPW_WORKSPACE_MANIFEST_SURFACE,
  type SpwWorkspaceManifestV1,
} from '../workspace-protocol'
import type { HandlerDeps } from '../types'
import {
  formatWorkspaceTemperatureSpw,
  type WorkspaceTemperatureEnvelope,
} from './corpus-disclose'

/**
 * How much of a surface is deferred state — the share of its marks that are
 * `~#` aspect. Aspect names content that expires, so a surface thick with it
 * is one whose cached reads go stale on their own.
 */
export type Volatility = 'volatile' | 'settled' | 'durable'

/** Document retention + access age — tier is retention class, not temperature product. */
export interface WorkspaceTemperatureEntry {
  uri: string
  /** Internal retention class (hot|warm|cold) — eviction policy only. */
  tier: string
  /** requestEpoch − lastAccessEpoch */
  accessAgeRequests: number
  writeCount: number
  /** What the surface is made of, independent of when it was last read. */
  volatility: Volatility
  /** Aspect marks as a share of all particle marks, 0–1. */
  aspectShare: number
}

// ── Handlers ───────────────────────────────────────────────────

export async function workspaceManifestV1(deps: HandlerDeps): Promise<SpwWorkspaceManifestV1> {
  const authority = await resolveWorkspaceAuthority({
    startPath: deps.workspaceRoot || deps.serverIndex.getWorkspaceRoot(),
    uriFromPath: deps.uriFromPath,
    readOpenDocument: (uri) => findOpenWorkspaceDocument(uri, deps),
  })

  return {
    schemaVersion: SPW_WORKSPACE_MANIFEST_SCHEMA_VERSION,
    surface: SPW_WORKSPACE_MANIFEST_SURFACE,
    ...authority,
  }
}

/**
 * Two thirds deferred state is a working surface; a third is a settled one
 * still under revision. Below that the marks are durable canon.
 */
const VOLATILE_SHARE = 0.6
const SETTLED_SHARE = 0.3

/**
 * Marks that commit rather than report. `~#taste` names a standard the surface
 * holds itself to and `~#goal` names what it is for — neither expires, so
 * neither is evidence of churn. Counting them as deferred state made declaring
 * a standard on a canon surface read as though the surface had destabilized,
 * which is backwards: a commitment is what makes content keep.
 */
const COMMITMENT_MARKS = /~#(taste|goal|intent|purpose|contract|invariant|rule|policy)\b/g

/**
 * Read a surface's cache stance from its particle mix.
 *
 * The seed measures the material and this decides the policy — caching is the
 * server's concern, not the parser's. A surface with no marks at all has
 * nothing to go stale, so it reads as durable.
 *
 * Pass the source to discount commitment marks. Without it every `~#` counts
 * as deferred state, because the mix alone cannot tell a standard from a
 * status readout — they share the sigil.
 */
export function volatilityOf(
  mix: ParticleMix,
  source = '',
): { volatility: Volatility; aspectShare: number } {
  const total = particleMixTotal(mix)
  if (total === 0) return { volatility: 'durable', aspectShare: 0 }

  const commitments = (source.match(COMMITMENT_MARKS) ?? []).length
  const deferred = Math.max(0, mix.aspect - commitments)
  const aspectShare = deferred / total
  const volatility: Volatility =
    aspectShare >= VOLATILE_SHARE ? 'volatile'
      : aspectShare >= SETTLED_SHARE ? 'settled'
        : 'durable'

  return { volatility, aspectShare }
}

/**
 * The workspace's cache picture on two independent axes: `tier` is how
 * recently a surface was read, `volatility` is whether its content keeps.
 * Crossing them is what makes the reading actionable — a cold durable surface
 * is safe to keep cached, while a hot volatile one must be re-read on change.
 *
 * Always returns `{ entries, dualReadSpw }` — no bare-array shape.
 */
export function workspaceTemperature(deps: HandlerDeps): WorkspaceTemperatureEnvelope {
  const { serverIndex } = deps
  const epoch = serverIndex.getCurrentRequestEpoch()
  const entries: WorkspaceTemperatureEntry[] = []

  for (const [uri, doc] of serverIndex.allDocuments()) {
    const accessAgeRequests = epoch - doc.lastAccessEpoch
    entries.push({
      uri,
      tier: doc.tier,
      accessAgeRequests,
      writeCount: doc.writeCount,
      ...volatilityOf(doc.mix, doc.text),
    })
  }

  entries.sort((a, b) => a.accessAgeRequests - b.accessAgeRequests)
  return {
    entries,
    dualReadSpw: formatWorkspaceTemperatureSpw(entries),
  }
}

async function findOpenWorkspaceDocument(
  uri: string,
  deps: HandlerDeps,
): Promise<{ text: string; version: number } | null> {
  const exact = deps.serverIndex.getDocument(uri)
  if (exact) return { text: exact.text, version: exact.version }

  const requestedPath = deps.pathFromUri(uri)
  if (requestedPath === null) return null
  const requestedIdentity = await resolveWorkspacePathIdentity(requestedPath)
  for (const [, document] of deps.serverIndex.allDocuments()) {
    if (await resolveWorkspacePathIdentity(document.filePath) === requestedIdentity) {
      return { text: document.text, version: document.version }
    }
  }
  return null
}

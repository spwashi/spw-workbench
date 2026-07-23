/**
 * Workspace handlers expose a URI-first v1 evidence surface and a quarantined
 * legacy adapter for clients that still consume process-local path strings.
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

// ── Legacy response types ──────────────────────────────────────

/** @deprecated Use SpwWorkspaceManifestV1 and URI identity. */
export interface WorkspaceRootEntry {
  sigil: string
  resolvedPath: string
  uri: string
}

/** @deprecated Projection declarations will move to a versioned evidence endpoint. */
export interface WorkspaceProjectionEntry {
  name: string
  root: string
  source: string
  specOwner: string
  status: string
}

/**
 * How much of a surface is deferred state — the share of its marks that are
 * `~#` aspect. Aspect names content that expires, so a surface thick with it
 * is one whose cached reads go stale on their own.
 */
export type Volatility = 'volatile' | 'settled' | 'durable'

export interface WorkspaceTemperatureEntry {
  uri: string
  tier: string
  beatAge: number
  writeCount: number
  /** What the surface is made of, independent of when it was last read. */
  volatility: Volatility
  /** Aspect marks as a share of all particle marks, 0–1. */
  aspectShare: number
}

/** @deprecated Use SpwWorkspaceManifestV1. */
export interface WorkspaceManifestResult {
  rootSource: 'manifest' | 'inferred'
  manifestUri: string | null
  roots: WorkspaceRootEntry[]
  projections: WorkspaceProjectionEntry[]
}

export class WorkspaceAuthorityBlockedError extends Error {
  readonly code = 'SPW_WORKSPACE_AUTHORITY_BLOCKED'

  constructor(readonly status: 'invalid' | 'unreadable') {
    super('Workspace manifest authority is blocked.')
    this.name = 'WorkspaceAuthorityBlockedError'
  }
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
 * Compatibility adapter for the existing editor client.
 *
 * Invalid and unreadable manifests remain blocked: this adapter never revives
 * inferred roots after the v1 authority layer has refused them.
 */
export async function workspaceManifest(deps: HandlerDeps): Promise<WorkspaceManifestResult> {
  const evidence = await workspaceManifestV1(deps)
  if (evidence.rootSource === 'blocked') {
    throw new WorkspaceAuthorityBlockedError(evidence.manifest.status)
  }
  return {
    rootSource: evidence.rootSource === 'manifest' ? 'manifest' : 'inferred',
    manifestUri: evidence.manifest.status === 'valid' ? evidence.manifest.uri : null,
    roots: evidence.roots.map((root) => ({
      sigil: root.sigil,
      uri: root.uri,
      resolvedPath: legacyPathFromUri(root.uri, deps),
    })),
    projections: workspaceProjections(deps),
  }
}

/**
 * Two thirds deferred state is a working surface; a third is a settled one
 * still under revision. Below that the marks are durable canon.
 */
const VOLATILE_SHARE = 0.6
const SETTLED_SHARE = 0.3

/**
 * Read a surface's cache stance from its particle mix.
 *
 * The seed measures the material and this decides the policy — caching is the
 * server's concern, not the parser's. A surface with no marks at all has
 * nothing to go stale, so it reads as durable.
 */
export function volatilityOf(mix: ParticleMix): { volatility: Volatility; aspectShare: number } {
  const total = particleMixTotal(mix)
  if (total === 0) return { volatility: 'durable', aspectShare: 0 }

  const aspectShare = mix.aspect / total
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
 */
export function workspaceTemperature(deps: HandlerDeps): WorkspaceTemperatureEntry[] {
  const { serverIndex } = deps
  const beat = serverIndex.getCurrentBeat()
  const entries: WorkspaceTemperatureEntry[] = []

  for (const [uri, doc] of serverIndex.allDocuments()) {
    entries.push({
      uri,
      tier: doc.tier,
      beatAge: beat - doc.lastAccessBeat,
      writeCount: doc.writeCount,
      ...volatilityOf(doc.mix),
    })
  }

  return entries.sort((a, b) => a.beatAge - b.beatAge)
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

function workspaceProjections(deps: HandlerDeps): WorkspaceProjectionEntry[] {
  return deps.serverIndex.getProjections().map((projection) => ({
    name: projection.name,
    root: projection.root,
    source: projection.source,
    specOwner: projection.specOwner,
    status: projection.status,
  }))
}

function legacyPathFromUri(uri: string, deps: HandlerDeps): string {
  const filePath = deps.pathFromUri(uri)
  if (filePath === null) {
    throw new Error('Legacy workspace clients require local file URI roots.')
  }
  return filePath
}

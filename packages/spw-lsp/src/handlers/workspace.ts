/**
 * Workspace handlers expose a URI-first v1 evidence surface and a quarantined
 * legacy adapter for clients that still consume process-local path strings.
 */

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

export interface WorkspaceTemperatureEntry {
  uri: string
  tier: string
  beatAge: number
  writeCount: number
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

/**
 * Workspace Handler
 *
 * Handles `spw/workspaceManifest` and `spw/workspaceTemperature` custom requests.
 * Atlas roots come from `.spw/workspace.spw` when available, otherwise they fall
 * back to index-derived shelves. Behavioral observations come from the live index.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parseWorkspaceRootDeclarations } from '@spwashi/spw-seed'
import type { HandlerDeps } from '../types'

// ── Response types ───────────────────────────────────────────────

export interface WorkspaceRootEntry {
  sigil: string
  resolvedPath: string
  uri: string
}

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

export interface WorkspaceManifestResult {
  rootSource: 'manifest' | 'inferred'
  manifestUri: string | null
  roots: WorkspaceRootEntry[]
  projections: WorkspaceProjectionEntry[]
}

// ── Handlers ─────────────────────────────────────────────────────

export async function workspaceManifest(deps: HandlerDeps): Promise<WorkspaceManifestResult> {
  const { serverIndex, uriFromPath } = deps
  const workspaceRoot = serverIndex.getWorkspaceRoot()
  const manifestPath = path.join(workspaceRoot, '.spw', 'workspace.spw')
  const manifestUri = uriFromPath(manifestPath)
  const manifestText = await readWorkspaceManifestText(deps, manifestPath, manifestUri)

  const roots = manifestText
    ? parseManifestRoots(manifestPath, manifestText, uriFromPath)
    : inferRootsFromShelves(serverIndex.getShelfRoots(), uriFromPath)

  const projections: WorkspaceProjectionEntry[] = serverIndex.getProjections().map(p => ({
    name: p.name,
    root: p.root,
    source: p.source,
    specOwner: p.specOwner,
    status: p.status,
  }))

  return {
    rootSource: manifestText ? 'manifest' : 'inferred',
    manifestUri: manifestText ? manifestUri : null,
    roots,
    projections,
  }
}

export function workspaceTemperature(deps: HandlerDeps): WorkspaceTemperatureEntry[] {
  const { serverIndex, uriFromPath } = deps
  const beat = serverIndex.getCurrentBeat()
  const entries: WorkspaceTemperatureEntry[] = []

  for (const [uri, doc] of serverIndex.allDocuments()) {
    entries.push({
      uri: uriFromPath ? uriFromPath(doc.filePath) : uri,
      tier: doc.tier,
      beatAge: beat - doc.lastAccessBeat,
      writeCount: doc.writeCount,
    })
  }

  // Hottest first
  return entries.sort((a, b) => a.beatAge - b.beatAge)
}

async function readWorkspaceManifestText(
  deps: HandlerDeps,
  manifestPath: string,
  manifestUri: string,
): Promise<string | null> {
  const openDoc = deps.serverIndex.getDocument(manifestUri)
  if (openDoc) {
    return openDoc.text
  }

  try {
    return await fs.readFile(manifestPath, 'utf8')
  } catch {
    return null
  }
}

function inferRootsFromShelves(
  shelves: Map<string, string>,
  uriFromPath: HandlerDeps['uriFromPath'],
): WorkspaceRootEntry[] {
  const roots: WorkspaceRootEntry[] = []
  for (const [sigil, resolvedPath] of shelves) {
    roots.push({ sigil, resolvedPath, uri: uriFromPath(resolvedPath) })
  }
  return roots
}

function parseManifestRoots(
  manifestPath: string,
  text: string,
  uriFromPath: HandlerDeps['uriFromPath'],
): WorkspaceRootEntry[] {
  const manifestDir = path.dirname(manifestPath)
  return parseWorkspaceRootDeclarations(text).map(({ sigil, relativePath }) => {
    const resolvedPath = path.resolve(manifestDir, relativePath)
    return {
      sigil,
      resolvedPath,
      uri: uriFromPath(resolvedPath),
    }
  })
}

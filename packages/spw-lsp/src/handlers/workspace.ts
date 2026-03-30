/**
 * Workspace Handler
 *
 * Handles `spw/workspaceManifest` and `spw/workspaceTemperature` custom requests.
 * Atlas roots come from `.spw/workspace.spw` when available, otherwise they fall
 * back to index-derived shelves. Behavioral observations come from the live index.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parse, type Token } from '@spwashi/spw-seed'
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
  const { tokens } = parse(text)
  const significant = tokens.filter((token) => token.type !== 'WHITESPACE' && token.type !== 'EOF')
  const manifestDir = path.dirname(manifestPath)

  for (let i = 0; i < significant.length; i++) {
    const frame = matchFrameHeader(significant, i)
    if (!frame || frame.name !== 'roots') continue

    const bodyTokens: Token[] = []
    let depth = 1
    i = frame.bodyStartIndex

    while (++i < significant.length && depth > 0) {
      const token = significant[i]
      if (token.type === 'CONTAINER_OPEN' && token.kind === '{') {
        depth++
      } else if (token.type === 'CONTAINER_CLOSE' && token.kind === '}') {
        depth--
        if (depth === 0) break
      }
      bodyTokens.push(token)
    }

    return parseRootEntries(bodyTokens, manifestDir, uriFromPath)
  }

  return []
}

function parseRootEntries(
  tokens: Token[],
  manifestDir: string,
  uriFromPath: HandlerDeps['uriFromPath'],
): WorkspaceRootEntry[] {
  const roots: WorkspaceRootEntry[] = []

  for (let i = 0; i < tokens.length; i++) {
    const at = tokens[i]
    const name = tokens[i + 1]
    const colon = tokens[i + 2]
    const tilde = tokens[i + 3]
    const pathToken = tokens[i + 4]

    if (
      at?.type !== 'OPERATOR' || at.kind !== '@' ||
      name?.type !== 'IDENTIFIER' ||
      colon?.type !== 'COLON' ||
      tilde?.type !== 'OPERATOR' || tilde.kind !== '~' ||
      pathToken?.type !== 'STRING'
    ) {
      continue
    }

    const relativePath = unquote(pathToken.value)
    const resolvedPath = path.resolve(manifestDir, relativePath)
    roots.push({
      sigil: name.value,
      resolvedPath,
      uri: uriFromPath(resolvedPath),
    })
    i += 4
  }

  return roots
}

function matchFrameHeader(
  tokens: Token[],
  index: number,
): { name: string; bodyStartIndex: number } | null {
  const caret = tokens[index]
  if (caret?.type !== 'OPERATOR' || caret.kind !== '^') {
    return null
  }

  const next = tokens[index + 1]
  if (!next) return null

  if (next.type === 'STRING') {
    const brace = tokens[index + 2]
    if (brace?.type === 'CONTAINER_OPEN' && brace.kind === '{') {
      return { name: unquote(next.value), bodyStartIndex: index + 2 }
    }
    return null
  }

  if (next.type === 'CONTAINER_OPEN' && next.kind === '[') {
    const label = tokens[index + 2]
    const close = tokens[index + 3]
    const brace = tokens[index + 4]
    if (
      (label?.type === 'STRING' || label?.type === 'IDENTIFIER') &&
      close?.type === 'CONTAINER_CLOSE' && close.kind === ']' &&
      brace?.type === 'CONTAINER_OPEN' && brace.kind === '{'
    ) {
      return { name: unquote(label.value), bodyStartIndex: index + 4 }
    }
  }

  return null
}

function unquote(value: string): string {
  return value.replace(/^["'`]|["'`]$/g, '')
}

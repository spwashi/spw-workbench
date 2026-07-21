import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  analyzeWorkspaceRootManifest,
  type WorkspaceRootManifestDiagnostic,
} from '@spwashi/spw-seed'

export type WorkspacePathKind = 'directory' | 'file' | 'missing'
export type WorkspaceRootRole = 'consumer' | 'canonical' | 'infrastructure' | 'external'

export interface ResolvedWorkspaceRoot {
  sigil: string
  absolutePath: string
  relativePath: string
  role: WorkspaceRootRole
  kind: WorkspacePathKind
}

export interface SpwWorkspace {
  mode: 'canonical' | 'mounted-consumer'
  consumerRoot: string
  spwRoot: string
  workbenchRoot: string
  manifestPath: string
  rootSource: 'manifest' | 'fallback'
  roots: ResolvedWorkspaceRoot[]
}

export class SpwWorkspaceNotFoundError extends Error {
  readonly code = 'SPW_WORKSPACE_NOT_FOUND'

  constructor(startPath: string) {
    super(`No .spw/mount.spw found from ${startPath}`)
    this.name = 'SpwWorkspaceNotFoundError'
  }
}

export class SpwWorkspaceManifestError extends Error {
  readonly code = 'SPW_WORKSPACE_MANIFEST_INVALID'

  constructor(message: string) {
    super(message)
    this.name = 'SpwWorkspaceManifestError'
  }
}

interface AuthorizedWorkspacePath {
  target: string
  authorityRoot: string
  declaredRoot: ResolvedWorkspaceRoot | null
}

/**
 * Discover the consumer authority for a path.
 *
 * A mounted workbench is itself a valid canonical checkout with its own mount
 * file. When it lives at `<consumer>/.spw/_workbench`, the enclosing consumer
 * remains authoritative for commands invoked anywhere inside that mount.
 */
export async function discoverSpwWorkspace(startPath: string = process.cwd()): Promise<SpwWorkspace> {
  const start = path.resolve(startPath)
  const startStat = await statOrNull(start)
  let cursor = startStat?.isFile() ? path.dirname(start) : start
  const candidates: string[] = []

  while (true) {
    if (await pathExists(path.join(cursor, '.spw', 'mount.spw'))) {
      candidates.push(cursor)
    }
    const parent = path.dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }

  if (candidates.length === 0) {
    throw new SpwWorkspaceNotFoundError(start)
  }

  const realStart = await realPathOrResolved(start)
  for (const candidate of candidates) {
    const mountedWorkbench = path.join(candidate, '.spw', '_workbench')
    if (
      await pathExists(mountedWorkbench) &&
      isWithin(await realPathOrResolved(mountedWorkbench), realStart)
    ) {
      return loadSpwWorkspace(candidate)
    }
  }

  return loadSpwWorkspace(candidates[0])
}

/** Return null only when no workspace exists; malformed authority propagates. */
export async function tryDiscoverSpwWorkspace(startPath: string = process.cwd()): Promise<SpwWorkspace | null> {
  try {
    return await discoverSpwWorkspace(startPath)
  } catch (error) {
    if (error instanceof SpwWorkspaceNotFoundError) return null
    throw error
  }
}

export async function loadSpwWorkspace(consumerRoot: string): Promise<SpwWorkspace> {
  const normalizedRoot = path.resolve(consumerRoot)
  const spwRoot = path.join(normalizedRoot, '.spw')
  const manifestPath = path.join(spwRoot, 'workspace.spw')
  const canonicalWorkbench = await isCanonicalWorkbench(normalizedRoot, spwRoot)
  const mode: SpwWorkspace['mode'] = canonicalWorkbench ? 'canonical' : 'mounted-consumer'
  const workbenchRoot = canonicalWorkbench ? normalizedRoot : path.join(spwRoot, '_workbench')
  const manifest = await readOptionalManifest(manifestPath)

  let rootSource: SpwWorkspace['rootSource']
  let declared: Array<{ sigil: string; absolutePath: string }>
  if (manifest === null) {
    rootSource = 'fallback'
    declared = [{ sigil: 'spw', absolutePath: spwRoot }]
  } else {
    const analysis = analyzeWorkspaceRootManifest(manifest)
    if (analysis.status === 'invalid') {
      throw invalidManifest(manifestPath, analysis.diagnostics)
    }
    rootSource = 'manifest'
    declared = analysis.declarations.map(({ sigil, relativePath }) => ({
      sigil,
      absolutePath: path.resolve(spwRoot, relativePath),
    }))
  }

  const declaredWorkbench = declared.find(({ sigil }) => sigil === 'workbench')
  if (
    mode === 'mounted-consumer' &&
    declaredWorkbench &&
    path.resolve(declaredWorkbench.absolutePath) !== path.resolve(workbenchRoot)
  ) {
    throw new SpwWorkspaceManifestError(
      `Invalid workspace manifest ${manifestPath}: @workbench must resolve to .spw/_workbench.`,
    )
  }

  const roots = await Promise.all(
    declared.map((root) =>
      resolveRoot(root.sigil, root.absolutePath, normalizedRoot, workbenchRoot, mode),
    ),
  )

  if (mode === 'mounted-consumer' && !declaredWorkbench) {
    roots.push(await resolveRoot('workbench', workbenchRoot, normalizedRoot, workbenchRoot, mode))
  }

  return {
    mode,
    consumerRoot: normalizedRoot,
    spwRoot,
    workbenchRoot,
    manifestPath,
    rootSource,
    roots,
  }
}

async function isCanonicalWorkbench(consumerRoot: string, spwRoot: string): Promise<boolean> {
  // An attached workbench relation is stronger evidence than coincidental
  // package topology in a consumer monorepo.
  if (await pathEntryExists(path.join(spwRoot, '_workbench'))) return false

  try {
    const manifest = JSON.parse(await fs.readFile(path.join(consumerRoot, 'package.json'), 'utf8')) as {
      name?: unknown
    }
    return manifest.name === 'spw-workbench' &&
      await pathExists(path.join(consumerRoot, 'packages', 'spw-cli', 'package.json'))
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR' || error instanceof SyntaxError) return false
    throw error
  }
}

export function findWorkspaceRoot(workspace: SpwWorkspace, selector: string): ResolvedWorkspaceRoot | null {
  if (!selector.startsWith('@')) return null
  const sigil = selector.slice(1).split(/[\\/]/, 1)[0]
  return workspace.roots.find((root) => root.sigil === sigil) ?? null
}

/**
 * Resolve a readable path under explicit workspace authority.
 *
 * Relative and absolute paths must remain in the consumer. `@root` and
 * `@root/suffix` are explicit manifest authority, so declared external roots
 * are readable while traversal beyond that root is rejected. Existing paths
 * are realpath-checked so an undeclared symlink cannot escape its authority.
 */
export async function resolveWorkspacePath(workspace: SpwWorkspace, selector: string): Promise<string> {
  const resolved = authorizeWorkspacePath(workspace, selector)
  const [realAuthorityRoot, realTarget] = await Promise.all([
    realPathOrResolved(resolved.authorityRoot),
    realPathOrResolved(resolved.target),
  ])

  if (!isWithin(realAuthorityRoot, realTarget)) {
    const authority = resolved.declaredRoot ? `@${resolved.declaredRoot.sigil}` : 'the consumer root'
    throw new Error(`Path resolves outside ${authority}: ${selector}`)
  }

  return resolved.target
}

export function relativeToConsumer(workspace: SpwWorkspace, target: string): string {
  const relative = path.relative(workspace.consumerRoot, target)
  return relative || '.'
}

export function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function authorizeWorkspacePath(workspace: SpwWorkspace, selector: string): AuthorizedWorkspacePath {
  if (selector.startsWith('@')) {
    const match = selector.match(/^@([^/\\]+)(?:[/\\](.*))?$/)
    if (!match) throw new Error(`Invalid workspace root selector: ${selector}`)

    const [, sigil, suffix = ''] = match
    const root = workspace.roots.find((candidate) => candidate.sigil === sigil)
    if (!root) throw new Error(`Unknown workspace root @${sigil}`)
    if (suffix && root.kind === 'file') {
      throw new Error(`Workspace root @${sigil} is a file and cannot contain ${suffix}`)
    }

    const target = path.resolve(root.absolutePath, suffix || '.')
    if (!isWithin(root.absolutePath, target)) {
      throw new Error(`Path is outside workspace root @${sigil}: ${selector}`)
    }
    return { target, authorityRoot: root.absolutePath, declaredRoot: root }
  }

  const target = path.resolve(workspace.consumerRoot, selector)
  if (!isWithin(workspace.consumerRoot, target)) {
    throw new Error(`Path is outside the consumer root: ${selector}`)
  }
  return { target, authorityRoot: workspace.consumerRoot, declaredRoot: null }
}

async function resolveRoot(
  sigil: string,
  absolutePath: string,
  consumerRoot: string,
  workbenchRoot: string,
  mode: SpwWorkspace['mode'],
): Promise<ResolvedWorkspaceRoot> {
  const [comparisonPath, comparisonConsumer, comparisonWorkbench] = await Promise.all([
    realPathOrResolved(absolutePath),
    realPathOrResolved(consumerRoot),
    realPathOrResolved(workbenchRoot),
  ])
  const insideConsumer = isWithin(comparisonConsumer, comparisonPath)
  const role: WorkspaceRootRole = !insideConsumer
    ? 'external'
    : mode === 'canonical'
      ? 'canonical'
      : isWithin(comparisonWorkbench, comparisonPath)
        ? 'infrastructure'
        : 'consumer'

  return {
    sigil,
    absolutePath,
    relativePath: path.relative(consumerRoot, absolutePath) || '.',
    role,
    kind: await pathKind(absolutePath),
  }
}

function invalidManifest(
  manifestPath: string,
  diagnostics: WorkspaceRootManifestDiagnostic[],
): SpwWorkspaceManifestError {
  const detail = diagnostics.map(({ code, message }) => `[${code}] ${message}`).join(' ')
  return new SpwWorkspaceManifestError(`Invalid workspace manifest ${manifestPath}: ${detail}`)
}

async function readOptionalManifest(manifestPath: string): Promise<string | null> {
  try {
    return await fs.readFile(manifestPath, 'utf8')
  } catch (error) {
    if (nodeErrorCode(error) === 'ENOENT' && !(await pathEntryExists(manifestPath))) return null
    throw new SpwWorkspaceManifestError(
      `Unable to read workspace manifest ${manifestPath}: ${errorMessage(error)}`,
    )
  }
}

async function pathKind(target: string): Promise<WorkspacePathKind> {
  const stat = await statOrNull(target)
  if (!stat) return 'missing'
  if (stat.isDirectory()) return 'directory'
  if (stat.isFile()) return 'file'
  return 'missing'
}

async function statOrNull(target: string) {
  try {
    return await fs.stat(target)
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return null
    throw error
  }
}

async function pathExists(target: string): Promise<boolean> {
  return (await statOrNull(target)) !== null
}

async function pathEntryExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target)
    return true
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return false
    throw error
  }
}

async function realPathIfPresent(target: string): Promise<string | null> {
  try {
    return await fs.realpath(target)
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return null
    throw error
  }
}

async function realPathOrResolved(target: string): Promise<string> {
  let cursor = path.resolve(target)
  const missingSuffix: string[] = []

  while (true) {
    const realPath = await realPathIfPresent(cursor)
    if (realPath) return path.resolve(realPath, ...missingSuffix)

    const parent = path.dirname(cursor)
    if (parent === cursor) return path.resolve(target)
    missingSuffix.unshift(path.basename(cursor))
    cursor = parent
  }
}

function nodeErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

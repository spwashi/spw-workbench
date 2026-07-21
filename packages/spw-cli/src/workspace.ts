import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseWorkspaceRootDeclarations } from '@spwashi/spw-seed'

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

export async function discoverSpwWorkspace(startPath: string = process.cwd()): Promise<SpwWorkspace> {
  const start = path.resolve(startPath)
  const startStat = await fs.stat(start).catch(() => null)
  let cursor = startStat?.isFile() ? path.dirname(start) : start

  while (true) {
    if (await exists(path.join(cursor, '.spw', 'mount.spw'))) {
      return loadSpwWorkspace(cursor)
    }
    const parent = path.dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }

  throw new Error(`No .spw/mount.spw found from ${start}`)
}

export async function tryDiscoverSpwWorkspace(startPath: string = process.cwd()): Promise<SpwWorkspace | null> {
  return discoverSpwWorkspace(startPath).catch(() => null)
}

export async function loadSpwWorkspace(consumerRoot: string): Promise<SpwWorkspace> {
  const normalizedRoot = path.resolve(consumerRoot)
  const spwRoot = path.join(normalizedRoot, '.spw')
  const manifestPath = path.join(spwRoot, 'workspace.spw')
  const canonicalWorkbench = await exists(path.join(normalizedRoot, 'packages', 'spw-cli', 'package.json'))
  const mode: SpwWorkspace['mode'] = canonicalWorkbench ? 'canonical' : 'mounted-consumer'
  const workbenchRoot = canonicalWorkbench ? normalizedRoot : path.join(spwRoot, '_workbench')
  const manifest = await fs.readFile(manifestPath, 'utf8').catch(() => null)
  const declarations = manifest ? parseWorkspaceRootDeclarations(manifest) : []
  const rootSource = declarations.length > 0 ? 'manifest' : 'fallback'
  const declared = declarations.length > 0
    ? declarations.map(({ sigil, relativePath }) => ({
        sigil,
        absolutePath: path.resolve(spwRoot, relativePath),
      }))
    : [{ sigil: 'spw', absolutePath: spwRoot }]

  const roots: ResolvedWorkspaceRoot[] = []
  const seen = new Set<string>()
  for (const root of declared) {
    if (seen.has(root.sigil)) continue
    seen.add(root.sigil)
    roots.push(await resolveRoot(root.sigil, root.absolutePath, normalizedRoot, workbenchRoot, mode))
  }

  if (mode === 'mounted-consumer' && !seen.has('workbench')) {
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

export function findWorkspaceRoot(workspace: SpwWorkspace, selector: string): ResolvedWorkspaceRoot | null {
  const sigil = selector.replace(/^@/, '')
  return workspace.roots.find((root) => root.sigil === sigil) ?? null
}

export function resolveWorkspacePath(workspace: SpwWorkspace, selector: string): string {
  const root = selector.startsWith('@') ? findWorkspaceRoot(workspace, selector) : null
  if (root) return root.absolutePath

  const target = path.resolve(workspace.consumerRoot, selector)
  if (!isWithin(workspace.consumerRoot, target)) {
    throw new Error(`Path is outside the consumer root: ${selector}`)
  }
  return target
}

export function relativeToConsumer(workspace: SpwWorkspace, target: string): string {
  const relative = path.relative(workspace.consumerRoot, target)
  return relative || '.'
}

export function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

async function resolveRoot(
  sigil: string,
  absolutePath: string,
  consumerRoot: string,
  workbenchRoot: string,
  mode: SpwWorkspace['mode'],
): Promise<ResolvedWorkspaceRoot> {
  const role: WorkspaceRootRole = mode === 'canonical'
    ? 'canonical'
    : isWithin(workbenchRoot, absolutePath)
      ? 'infrastructure'
      : isWithin(consumerRoot, absolutePath)
        ? 'consumer'
        : 'external'

  return {
    sigil,
    absolutePath,
    relativePath: path.relative(consumerRoot, absolutePath) || '.',
    role,
    kind: await pathKind(absolutePath),
  }
}

async function pathKind(target: string): Promise<WorkspacePathKind> {
  const stat = await fs.stat(target).catch(() => null)
  if (!stat) return 'missing'
  if (stat.isDirectory()) return 'directory'
  if (stat.isFile()) return 'file'
  return 'missing'
}

async function exists(target: string): Promise<boolean> {
  return (await fs.access(target).then(() => true).catch(() => false))
}

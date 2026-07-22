import { promises as fs } from 'node:fs'
import type { Stats } from 'node:fs'
import path from 'node:path'
import {
  analyzeWorkspaceRootManifest,
  type WorkspaceRootManifestDiagnostic,
} from '@spwashi/spw-seed'
import type {
  SpwWorkspaceAuthorityEvidence,
  SpwWorkspaceFilesystemDiagnostic,
  SpwWorkspaceInvalidManifestDiagnostic,
  SpwWorkspaceManifestReadSource,
  SpwWorkspaceMode,
  SpwWorkspacePathKind,
  SpwWorkspaceIdentity,
  SpwWorkspaceRootEvidence,
  SpwWorkspaceRootRole,
} from './workspace-protocol'

export interface WorkspaceAuthorityFileSystem {
  readText(filePath: string): Promise<string>
  stat(filePath: string): Promise<Stats>
  lstat(filePath: string): Promise<Stats>
  realpath(filePath: string): Promise<string>
}

export interface ResolveWorkspaceAuthorityOptions {
  startPath: string
  uriFromPath(filePath: string): string
  readOpenDocument?(uri: string): OpenWorkspaceDocument | null | Promise<OpenWorkspaceDocument | null>
  fileSystem?: Partial<WorkspaceAuthorityFileSystem>
}

export interface OpenWorkspaceDocument {
  text: string
  version: number
}

interface ManifestTextAbsent {
  status: 'absent'
}

interface ManifestTextPresent {
  status: 'present'
  readFrom: SpwWorkspaceManifestReadSource
  text: string
}

interface ManifestTextUnreadable {
  status: 'unreadable'
}

type ManifestTextEvidence = ManifestTextAbsent | ManifestTextPresent | ManifestTextUnreadable

interface DeclaredRoot {
  sigil: string
  absolutePath: string
}

const NODE_FILE_SYSTEM: WorkspaceAuthorityFileSystem = {
  readText: (filePath) => fs.readFile(filePath, 'utf8'),
  stat: (filePath) => fs.stat(filePath),
  lstat: (filePath) => fs.lstat(filePath),
  realpath: (filePath) => fs.realpath(filePath),
}

/**
 * Resolve the consumer that owns an LSP start path and describe its declared
 * roots without exposing process-local path strings in the returned contract.
 */
export async function resolveWorkspaceAuthority(
  options: ResolveWorkspaceAuthorityOptions,
): Promise<SpwWorkspaceAuthorityEvidence> {
  const io = { ...NODE_FILE_SYSTEM, ...options.fileSystem }
  const consumerRoot = await discoverWorkspaceConsumerPath(options.startPath, io)
  const spwRoot = path.join(consumerRoot, '.spw')
  const manifestPath = path.join(spwRoot, 'workspace.spw')
  const manifestUri = options.uriFromPath(manifestPath)
  const mode = await resolveWorkspaceMode(consumerRoot, spwRoot, io)
  const workbenchRoot = mode === 'canonical'
    ? consumerRoot
    : mode === 'mounted-consumer'
      ? path.join(spwRoot, '_workbench')
      : null
  const workspace = workspaceIdentity(mode, consumerRoot, spwRoot, workbenchRoot, options)

  const manifestText = await readManifestText(manifestPath, manifestUri, options, io)
  if (manifestText.status === 'unreadable') {
    return {
      workspace,
      manifest: {
        status: 'unreadable',
        uri: manifestUri,
        readFrom: { kind: 'filesystem' },
        diagnostics: [manifestUnreadableDiagnostic()],
      },
      rootSource: 'blocked',
      roots: [],
    }
  }

  if (manifestText.status === 'absent') {
    const fallback: [DeclaredRoot, ...DeclaredRoot[]] = [
      { sigil: 'spw', absolutePath: spwRoot },
    ]
    if (mode === 'mounted-consumer') {
      if (workbenchRoot === null) {
        throw new Error('Mounted workspace evidence requires a workbench path.')
      }
      fallback.push({ sigil: 'workbench', absolutePath: workbenchRoot })
    }

    return {
      workspace,
      manifest: {
        status: 'absent',
        uri: manifestUri,
        readFrom: { kind: 'filesystem' },
        diagnostics: [],
      },
      rootSource: 'fallback',
      roots: await resolveRoots(fallback, consumerRoot, workbenchRoot, mode, options, io),
    }
  }

  const analysis = analyzeWorkspaceRootManifest(manifestText.text)
  const diagnostics: SpwWorkspaceInvalidManifestDiagnostic[] = analysis.diagnostics.map(parserDiagnostic)
  const declared = analysis.declarations.map(({ sigil, relativePath }) => ({
    sigil,
    absolutePath: path.resolve(spwRoot, relativePath),
  }))
  const declaredWorkbench = declared.find(({ sigil }) => sigil === 'workbench')

  if (
    mode === 'mounted-consumer' &&
    workbenchRoot !== null &&
    declaredWorkbench &&
    path.resolve(declaredWorkbench.absolutePath) !== path.resolve(workbenchRoot)
  ) {
    diagnostics.push({
      source: 'authority',
      code: 'invalid_workbench_root',
      message: 'Mounted consumers must bind @workbench to .spw/_workbench.',
      sigil: 'workbench',
    })
  }

  if (analysis.status === 'invalid' || diagnostics.length > 0) {
    return {
      workspace,
      manifest: {
        status: 'invalid',
        uri: manifestUri,
        readFrom: manifestText.readFrom,
        diagnostics: nonEmptyDiagnostics(diagnostics),
      },
      rootSource: 'blocked',
      roots: [],
    }
  }

  if (mode === 'mounted-consumer' && !declaredWorkbench) {
    if (workbenchRoot === null) {
      throw new Error('Mounted workspace evidence requires a workbench path.')
    }
    declared.push({ sigil: 'workbench', absolutePath: workbenchRoot })
  }

  return {
    workspace,
    manifest: {
      status: 'valid',
      uri: manifestUri,
      readFrom: manifestText.readFrom,
      diagnostics: [],
    },
    rootSource: 'manifest',
    roots: await resolveRoots(
      nonEmptyDeclaredRoots(declared),
      consumerRoot,
      workbenchRoot,
      mode,
      options,
      io,
    ),
  }
}

export async function discoverWorkspaceConsumerPath(
  startPath: string,
  fileSystem: Partial<WorkspaceAuthorityFileSystem> = {},
): Promise<string> {
  const io = { ...NODE_FILE_SYSTEM, ...fileSystem }
  const start = path.resolve(startPath)
  const startStat = await statOrNull(start, io)
  const requestedRoot = startStat?.isFile() ? path.dirname(start) : start
  let cursor = requestedRoot
  const candidates: string[] = []
  while (true) {
    if (await pathExists(path.join(cursor, '.spw', 'mount.spw'), io)) {
      candidates.push(cursor)
    }
    const parent = path.dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }

  if (candidates.length === 0) return requestedRoot

  const realStart = await resolveWorkspacePathIdentity(start, io)
  for (const candidate of candidates) {
    const mountedWorkbench = path.join(candidate, '.spw', '_workbench')
    if (
      await pathEntryExists(mountedWorkbench, io) &&
      isWithin(await resolveWorkspacePathIdentity(mountedWorkbench, io), realStart)
    ) {
      return candidate
    }
  }

  return requestedRoot
}

async function resolveWorkspaceMode(
  consumerRoot: string,
  spwRoot: string,
  io: WorkspaceAuthorityFileSystem,
): Promise<SpwWorkspaceMode> {
  if (await pathEntryExists(path.join(spwRoot, '_workbench'), io)) return 'mounted-consumer'

  try {
    const manifest = JSON.parse(await io.readText(path.join(consumerRoot, 'package.json'))) as {
      name?: unknown
    }
    const hasCliPackage = await pathExists(
      path.join(consumerRoot, 'packages', 'spw-cli', 'package.json'),
      io,
    )
    return manifest.name === 'spw-workbench' && hasCliPackage
      ? 'canonical'
      : 'standalone-consumer'
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR' || error instanceof SyntaxError) {
      return 'standalone-consumer'
    }
    throw error
  }
}

async function readManifestText(
  manifestPath: string,
  manifestUri: string,
  options: ResolveWorkspaceAuthorityOptions,
  io: WorkspaceAuthorityFileSystem,
): Promise<ManifestTextEvidence> {
  const openDocument = await options.readOpenDocument?.(manifestUri)
  if (openDocument !== undefined && openDocument !== null) {
    return {
      status: 'present',
      readFrom: { kind: 'open-document', version: openDocument.version },
      text: openDocument.text,
    }
  }

  try {
    return {
      status: 'present',
      readFrom: { kind: 'filesystem' },
      text: await io.readText(manifestPath),
    }
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT') {
      try {
        if (!(await pathEntryExists(manifestPath, io))) return { status: 'absent' }
      } catch {
        return { status: 'unreadable' }
      }
    }
    return { status: 'unreadable' }
  }
}

async function resolveRoots(
  declared: [DeclaredRoot, ...DeclaredRoot[]],
  consumerRoot: string,
  workbenchRoot: string | null,
  mode: SpwWorkspaceMode,
  options: ResolveWorkspaceAuthorityOptions,
  io: WorkspaceAuthorityFileSystem,
): Promise<[SpwWorkspaceRootEvidence, ...SpwWorkspaceRootEvidence[]]> {
  const [first, ...rest] = declared
  return [
    await resolveRoot(first, consumerRoot, workbenchRoot, mode, options, io),
    ...await Promise.all(rest.map((root) =>
      resolveRoot(root, consumerRoot, workbenchRoot, mode, options, io),
    )),
  ]
}

async function resolveRoot(
  { sigil, absolutePath }: DeclaredRoot,
  consumerRoot: string,
  workbenchRoot: string | null,
  mode: SpwWorkspaceMode,
  options: ResolveWorkspaceAuthorityOptions,
  io: WorkspaceAuthorityFileSystem,
): Promise<SpwWorkspaceRootEvidence> {
  return {
    sigil,
    uri: options.uriFromPath(absolutePath),
    role: await rootRole(absolutePath, consumerRoot, workbenchRoot, mode, io),
    kind: await pathKind(absolutePath, io),
  }
}

async function rootRole(
  absolutePath: string,
  consumerRoot: string,
  workbenchRoot: string | null,
  mode: SpwWorkspaceMode,
  io: WorkspaceAuthorityFileSystem,
): Promise<SpwWorkspaceRootRole> {
  const [comparisonPath, comparisonConsumer, comparisonWorkbench] = await Promise.all([
    resolveWorkspacePathIdentity(absolutePath, io),
    resolveWorkspacePathIdentity(consumerRoot, io),
    workbenchRoot === null ? Promise.resolve(null) : resolveWorkspacePathIdentity(workbenchRoot, io),
  ])

  if (
    mode === 'mounted-consumer' &&
    comparisonWorkbench !== null &&
    isWithin(comparisonWorkbench, comparisonPath)
  ) {
    return 'infrastructure'
  }
  if (!isWithin(comparisonConsumer, comparisonPath)) return 'external'
  if (mode === 'canonical') return 'canonical'
  return 'consumer'
}

function workspaceIdentity(
  mode: SpwWorkspaceMode,
  consumerRoot: string,
  spwRoot: string,
  workbenchRoot: string | null,
  options: ResolveWorkspaceAuthorityOptions,
): SpwWorkspaceIdentity {
  const base = {
    consumerUri: options.uriFromPath(consumerRoot),
    spwUri: options.uriFromPath(spwRoot),
  }
  if (mode === 'standalone-consumer') {
    return { ...base, mode, workbenchUri: null }
  }
  if (workbenchRoot === null) {
    throw new Error('Managed workspace evidence requires a workbench path.')
  }
  return { ...base, mode, workbenchUri: options.uriFromPath(workbenchRoot) }
}

async function pathKind(
  target: string,
  io: WorkspaceAuthorityFileSystem,
): Promise<SpwWorkspacePathKind> {
  try {
    const stat = await io.stat(target)
    if (stat.isDirectory()) return 'directory'
    if (stat.isFile()) return 'file'
    return 'other'
  } catch (error) {
    const code = nodeErrorCode(error)
    return code === 'ENOENT' || code === 'ENOTDIR' ? 'missing' : 'unreadable'
  }
}

function parserDiagnostic(
  diagnostic: WorkspaceRootManifestDiagnostic,
): SpwWorkspaceInvalidManifestDiagnostic {
  return {
    source: 'parser',
    code: diagnostic.code,
    message: diagnostic.message,
    ...(diagnostic.sigil ? { sigil: diagnostic.sigil } : {}),
  }
}

function manifestUnreadableDiagnostic(): SpwWorkspaceFilesystemDiagnostic {
  return {
    source: 'filesystem',
    code: 'manifest_unreadable',
    message: 'Workspace manifest exists but could not be read.',
  }
}

function nonEmptyDiagnostics(
  diagnostics: SpwWorkspaceInvalidManifestDiagnostic[],
): [SpwWorkspaceInvalidManifestDiagnostic, ...SpwWorkspaceInvalidManifestDiagnostic[]] {
  const [first, ...rest] = diagnostics
  if (!first) {
    throw new Error('Invalid workspace evidence requires at least one diagnostic.')
  }
  return [first, ...rest]
}

function nonEmptyDeclaredRoots(
  roots: DeclaredRoot[],
): [DeclaredRoot, ...DeclaredRoot[]] {
  const [first, ...rest] = roots
  if (!first) {
    throw new Error('Valid workspace evidence requires at least one root.')
  }
  return [first, ...rest]
}

async function statOrNull(target: string, io: WorkspaceAuthorityFileSystem): Promise<Stats | null> {
  try {
    return await io.stat(target)
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return null
    throw error
  }
}

async function pathExists(target: string, io: WorkspaceAuthorityFileSystem): Promise<boolean> {
  return (await statOrNull(target, io)) !== null
}

async function pathEntryExists(target: string, io: WorkspaceAuthorityFileSystem): Promise<boolean> {
  try {
    await io.lstat(target)
    return true
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return false
    throw error
  }
}

async function realPathIfPresent(
  target: string,
  io: WorkspaceAuthorityFileSystem,
): Promise<string | null> {
  try {
    return await io.realpath(target)
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return null
    throw error
  }
}

export async function resolveWorkspacePathIdentity(
  target: string,
  fileSystem: Partial<WorkspaceAuthorityFileSystem> = {},
): Promise<string> {
  const io = { ...NODE_FILE_SYSTEM, ...fileSystem }
  let cursor = path.resolve(target)
  const missingSuffix: string[] = []

  while (true) {
    const realPath = await realPathIfPresent(cursor, io)
    if (realPath) return path.resolve(realPath, ...missingSuffix)

    const parent = path.dirname(cursor)
    if (parent === cursor) return path.resolve(target)
    missingSuffix.unshift(path.basename(cursor))
    cursor = parent
  }
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function nodeErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined
}

import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface SpwMountResolution {
  siteRoot: string
  spwRoot: string
  mountFile: string
  trackedVersion: string | null
  workbenchRoot: string
  specRoot: string | null
  cliRoot: string | null
  lspRoot: string | null
  engagedSurfaces: string[]
  resolutionPaths: string[]
}

const DEFAULT_WORKBENCH_REL = './_workbench'
const DEFAULT_VERSION = '0.3.0'

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

function ascendDirs(startDir: string): string[] {
  const dirs: string[] = []
  let current = path.resolve(startDir)

  while (true) {
    dirs.push(current)
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return dirs
}

function stripTrailingSlash(value: string): string {
  return value.replace(/[\\/]+$/, '')
}

function parsePathValue(source: string, key: string): string | null {
  const match = source.match(new RegExp(`@${key}:\\s*~"([^"]+)"`))
  return match?.[1] ?? null
}

function parseStringValue(source: string, key: string): string | null {
  const match = source.match(new RegExp(`(?:~#)?${key}:\\s*"([^"]+)"`))
  return match?.[1] ?? null
}

function parseStringArray(source: string, key: string): string[] {
  const match = source.match(new RegExp(`(?:~#)?${key}:\\s*\\[([\\s\\S]*?)\\]`))
  if (!match) return []
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1])
}

function parsePathArray(source: string, key: string): string[] {
  const match = source.match(new RegExp(`(?:~#)?${key}:\\s*\\[([\\s\\S]*?)\\]`))
  if (!match) return []
  return [...match[1].matchAll(/~"([^"]+)"/g)].map((entry) => entry[1])
}

function extractVersionFromSpecPath(specRef: string | null): string | null {
  if (!specRef) return null
  const match = specRef.match(/spw-v([^/"']+)/)
  return match?.[1] ?? null
}

function buildDefaultRelative(baseRel: string, segments: string[]): string {
  return `${stripTrailingSlash(baseRel)}/${segments.join('/')}/`
}

function resolveFromMountDir(mountDir: string, target: string | null): string | null {
  if (!target) return null
  return path.resolve(mountDir, target)
}

function unique(items: Array<string | null | undefined>): string[] {
  return [...new Set(items.filter((item): item is string => typeof item === 'string' && item.length > 0))]
}

export async function findSpwSiteRoot(startDir: string): Promise<string | null> {
  for (const current of ascendDirs(startDir)) {
    if (await exists(path.join(current, '.spw', 'mount.spw'))) {
      return current
    }

    if (path.basename(current) === '.spw' && await exists(path.join(current, 'mount.spw'))) {
      return path.dirname(current)
    }

    if (path.basename(current) === '_workbench') {
      const spwRoot = path.dirname(current)
      if (path.basename(spwRoot) === '.spw' && await exists(path.join(spwRoot, 'mount.spw'))) {
        return path.dirname(spwRoot)
      }
    }
  }

  return null
}

export async function loadSpwMountResolution(siteRoot: string): Promise<SpwMountResolution | null> {
  const resolvedSiteRoot = path.resolve(siteRoot)
  const spwRoot = path.join(resolvedSiteRoot, '.spw')
  const mountFile = path.join(spwRoot, 'mount.spw')

  if (!await exists(mountFile)) {
    return null
  }

  const source = await fs.readFile(mountFile, 'utf8')
  const mountDir = path.dirname(mountFile)
  const workbenchRef = parsePathValue(source, 'root') ?? DEFAULT_WORKBENCH_REL
  const explicitSpecRef = parsePathValue(source, 'spec')
  const trackedVersion = parseStringValue(source, 'version')
    ?? extractVersionFromSpecPath(explicitSpecRef)
    ?? DEFAULT_VERSION
  const specRef = explicitSpecRef ?? buildDefaultRelative(workbenchRef, ['lib', `spw-v${trackedVersion}`])
  const cliRef = parsePathValue(source, 'cli') ?? buildDefaultRelative(workbenchRef, ['packages', 'spw-cli'])
  const lspRef = parsePathValue(source, 'lsp') ?? buildDefaultRelative(workbenchRef, ['packages', 'spw-lsp'])
  const resolutionRefs = parsePathArray(source, 'paths')
  const resolutionPaths = unique(
    (resolutionRefs.length > 0 ? resolutionRefs : [specRef, cliRef, lspRef]).map((entry) => resolveFromMountDir(mountDir, entry)),
  )

  return {
    siteRoot: resolvedSiteRoot,
    spwRoot,
    mountFile,
    trackedVersion,
    workbenchRoot: resolveFromMountDir(mountDir, workbenchRef) ?? path.join(spwRoot, '_workbench'),
    specRoot: resolveFromMountDir(mountDir, specRef),
    cliRoot: resolveFromMountDir(mountDir, cliRef),
    lspRoot: resolveFromMountDir(mountDir, lspRef),
    engagedSurfaces: parseStringArray(source, 'surfaces'),
    resolutionPaths,
  }
}

export async function discoverSpwMountResolution(startDir: string): Promise<SpwMountResolution | null> {
  const siteRoot = await findSpwSiteRoot(startDir)
  if (!siteRoot) return null
  return loadSpwMountResolution(siteRoot)
}

export function deriveMountRoots(mount: SpwMountResolution): Record<string, string> {
  const roots: Record<string, string> = {
    workbench: mount.workbenchRoot,
  }

  if (mount.specRoot) roots.spec = mount.specRoot
  if (mount.cliRoot) roots.cli = mount.cliRoot
  if (mount.lspRoot) roots.lsp = mount.lspRoot

  return roots
}

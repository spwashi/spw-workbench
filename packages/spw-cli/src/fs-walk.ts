/**
 * Shared .spw file-tree walker. Single source of truth for directory
 * exclusions and traversal so query/tree/mount/dev/invent/map can't drift.
 *
 * Skips derived `*.expanded.spw` and everything under `.spw/gen/` (corpus
 * authority stays on authored sources).
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { shouldSkipCorpusSurface } from '@spwashi/spw-seed'

/** Derived / mounted trees a consumer walk should skip unless asked. */
export const INFRASTRUCTURE_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'release',
  'build',
  '_workbench',
])

export const DEFAULT_IGNORED_DIRS: ReadonlySet<string> = new Set([
  '.git',
  ...INFRASTRUCTURE_DIRS,
])

/**
 * Dot directories that hold authored surfaces: the canon root and the agent
 * plans. Every other dot entry (.git, .claude worktrees, editor state) is skipped.
 */
export const AUTHORED_DOT_DIRS: ReadonlySet<string> = new Set(['.spw', '.agents'])

export interface CollectSpwFilesOptions {
  /** Directory basenames to skip entirely. Defaults to DEFAULT_IGNORED_DIRS. */
  ignore?: ReadonlySet<string>
  /**
   * Walk node_modules, dist, build, release, and _workbench.
   * `.git` stays skipped. Ignored when `ignore` is passed explicitly.
   */
  includeInfrastructure?: boolean
}

/**
 * Recursively collect .spw file paths under `root`, fanning out directory
 * reads and recursion concurrently rather than one entry at a time.
 */
export async function collectSpwFiles(
  root: string,
  options: CollectSpwFilesOptions = {},
): Promise<string[]> {
  const ignore = options.ignore
    ?? (options.includeInfrastructure ? new Set(['.git']) : DEFAULT_IGNORED_DIRS)
  const abs = path.resolve(root)
  const stat = await fs.stat(abs).catch(() => null)
  if (!stat) return []
  if (stat.isFile()) {
    if (!abs.endsWith('.spw')) return []
    if (shouldSkipCorpusSurface(abs) || shouldSkipCorpusSurface(path.basename(abs))) return []
    return [abs]
  }
  if (!stat.isDirectory()) return []

  const out = await walk(abs, ignore, isCorpusSpw)
  return out.sort()
}

/** Whether a file is an authored .spw surface the corpus walks. */
function isCorpusSpw(name: string, full: string): boolean {
  return name.endsWith('.spw') && !shouldSkipCorpusSurface(name) && !shouldSkipCorpusSurface(full)
}

/**
 * Collect files with any of `extensions` under `root`, skipping the same
 * directories the .spw walk skips. For files the parser does not own
 * (Markdown, HTML) that a refactor still needs to look at.
 */
export async function collectFilesByExtension(
  root: string,
  extensions: readonly string[],
  options: CollectSpwFilesOptions = {},
): Promise<string[]> {
  const ignore = options.ignore
    ?? (options.includeInfrastructure ? new Set(['.git']) : DEFAULT_IGNORED_DIRS)
  const accept = (name: string): boolean => extensions.some(ext => name.toLowerCase().endsWith(ext))
  const abs = path.resolve(root)
  const stat = await fs.stat(abs).catch(() => null)
  if (!stat) return []
  if (stat.isFile()) return accept(path.basename(abs)) ? [abs] : []
  if (!stat.isDirectory()) return []
  return (await walk(abs, ignore, accept)).sort()
}

/** Skip `.spw/gen` wholesale when walking under a `.spw` tree. */
function skipDirectory(dir: string, entryName: string, ignore: ReadonlySet<string>): boolean {
  if (ignore.has(entryName)) return true
  // Corpus must not invent/map gen dumps
  if (entryName === 'gen' && path.basename(dir) === '.spw') return true
  return false
}

async function walk(
  dir: string,
  ignore: ReadonlySet<string>,
  accept: (name: string, full: string) => boolean,
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])

  const results = await Promise.all(
    entries.map(async entry => {
      if (entry.name.startsWith('.') && !AUTHORED_DOT_DIRS.has(entry.name)) return []
      if (entry.isDirectory()) {
        if (skipDirectory(dir, entry.name, ignore)) return []
        return walk(path.join(dir, entry.name), ignore, accept)
      }
      if (entry.isFile()) {
        const full = path.join(dir, entry.name)
        return accept(entry.name, full) ? [full] : []
      }
      return []
    }),
  )

  return results.flat()
}

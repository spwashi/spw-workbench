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

export const DEFAULT_IGNORED_DIRS: ReadonlySet<string> = new Set([
  '.git',
  'node_modules',
  'dist',
  'release',
])

export interface CollectSpwFilesOptions {
  /** Directory basenames to skip entirely. Defaults to DEFAULT_IGNORED_DIRS. */
  ignore?: ReadonlySet<string>
}

/**
 * Recursively collect .spw file paths under `root`, fanning out directory
 * reads and recursion concurrently rather than one entry at a time.
 */
export async function collectSpwFiles(
  root: string,
  options: CollectSpwFilesOptions = {},
): Promise<string[]> {
  const ignore = options.ignore ?? DEFAULT_IGNORED_DIRS
  const abs = path.resolve(root)
  const stat = await fs.stat(abs).catch(() => null)
  if (!stat) return []
  if (stat.isFile()) {
    if (!abs.endsWith('.spw')) return []
    if (shouldSkipCorpusSurface(abs) || shouldSkipCorpusSurface(path.basename(abs))) return []
    return [abs]
  }
  if (!stat.isDirectory()) return []

  const out = await walk(abs, ignore)
  return out.sort()
}

/** Skip `.spw/gen` wholesale when walking under a `.spw` tree. */
function skipDirectory(dir: string, entryName: string, ignore: ReadonlySet<string>): boolean {
  if (ignore.has(entryName)) return true
  // Corpus must not invent/map gen dumps
  if (entryName === 'gen' && path.basename(dir) === '.spw') return true
  return false
}

async function walk(dir: string, ignore: ReadonlySet<string>): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])

  const results = await Promise.all(
    entries.map(async entry => {
      if (entry.name.startsWith('.') && entry.name !== '.spw') return []
      if (entry.isDirectory()) {
        if (skipDirectory(dir, entry.name, ignore)) return []
        return walk(path.join(dir, entry.name), ignore)
      }
      if (entry.isFile() && entry.name.endsWith('.spw')) {
        const full = path.join(dir, entry.name)
        if (shouldSkipCorpusSurface(entry.name) || shouldSkipCorpusSurface(full)) return []
        return [full]
      }
      return []
    }),
  )

  return results.flat()
}

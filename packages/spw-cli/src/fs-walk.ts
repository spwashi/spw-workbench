/**
 * Shared .spw file-tree walker. Single source of truth for directory
 * exclusions and traversal so query/tree/mount/dev can't drift out of sync
 * (previously each reimplemented this with a different ignore-list).
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

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
  if (stat.isFile()) return abs.endsWith('.spw') ? [abs] : []
  if (!stat.isDirectory()) return []

  const out = await walk(abs, ignore)
  return out.sort()
}

async function walk(dir: string, ignore: ReadonlySet<string>): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])

  const results = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith('.') && entry.name !== '.spw') return []
      if (entry.isDirectory()) {
        if (ignore.has(entry.name)) return []
        return walk(path.join(dir, entry.name), ignore)
      }
      if (entry.isFile() && entry.name.endsWith('.spw')) {
        return [path.join(dir, entry.name)]
      }
      return []
    }),
  )

  return results.flat()
}

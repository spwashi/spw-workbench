/**
 * Corpus scan memo — retention plane for population/topography products.
 *
 * Planes (docs/theory/spw/cache-field.spw):
 *   memory — process-local full scan (sources + product)
 *   disk   — CorpusProduct only under .spw/gen/session/corpus-memo/
 *
 * Fingerprint = options + per-file mtime/size (not full content hash).
 * Invalidation is deterministic: any mtime/size change forces fresh scan.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { CorpusProduct } from '@spwashi/spw-seed'
import { formatCorpusProductSpw } from '@spwashi/spw-seed'
import type { CorpusScanResult } from './corpus-scan'

export const CORPUS_MEMO_SCHEMA = 'spw.corpus_memo/1' as const

export interface CorpusMemoKeyParts {
  cwd: string
  roots: string[]
  hubTop: number
  resolvePaths: boolean
  indexDepth: string
  maxFiles: number
  /** rel → "mtimeMs:size" */
  fileStats: Record<string, string>
}

export interface CorpusMemoStats {
  memoryEntries: number
  memoryHits: number
  memoryMisses: number
  diskHits: number
  diskMisses: number
  diskWrites: number
  lastFingerprint?: string
  lastPlane?: 'memory' | 'disk' | 'fresh'
}

const stats: CorpusMemoStats = {
  memoryEntries: 0,
  memoryHits: 0,
  memoryMisses: 0,
  diskHits: 0,
  diskMisses: 0,
  diskWrites: 0,
}

interface MemoryEntry {
  fingerprint: string
  result: CorpusScanResult
  product: CorpusProduct
  at: number
}

const memoryByFingerprint = new Map<string, MemoryEntry>()

export function corpusMemoDir(cwd: string = process.cwd()): string {
  return path.join(cwd, '.spw', 'gen', 'session', 'corpus-memo')
}

export function fingerprintCorpusKey(parts: CorpusMemoKeyParts): string {
  const payload = JSON.stringify({
    roots: [...parts.roots].sort(),
    hubTop: parts.hubTop,
    resolvePaths: parts.resolvePaths,
    indexDepth: parts.indexDepth,
    maxFiles: parts.maxFiles,
    files: Object.keys(parts.fileStats)
      .sort()
      .map(k => [k, parts.fileStats[k]]),
  })
  return createHash('sha256').update(payload).digest('hex').slice(0, 24)
}

export function getCorpusMemoStats(): CorpusMemoStats {
  return {
    ...stats,
    memoryEntries: memoryByFingerprint.size,
  }
}

export function resetCorpusMemo(options: { disk?: boolean; cwd?: string } = {}): number {
  const n = memoryByFingerprint.size
  memoryByFingerprint.clear()
  stats.memoryHits = 0
  stats.memoryMisses = 0
  stats.diskHits = 0
  stats.diskMisses = 0
  stats.diskWrites = 0
  stats.lastFingerprint = undefined
  stats.lastPlane = undefined
  if (options.disk) {
    const dir = corpusMemoDir(options.cwd)
    if (existsSync(dir)) {
      for (const name of readdirSync(dir)) {
        rmSync(path.join(dir, name), { force: true, recursive: true })
      }
    }
  }
  return n
}

export function getMemoryCorpusMemo(fingerprint: string): MemoryEntry | undefined {
  const hit = memoryByFingerprint.get(fingerprint)
  if (hit) {
    stats.memoryHits += 1
    stats.lastFingerprint = fingerprint
    stats.lastPlane = 'memory'
    return hit
  }
  stats.memoryMisses += 1
  return undefined
}

export function setMemoryCorpusMemo(
  fingerprint: string,
  result: CorpusScanResult,
  product: CorpusProduct,
): void {
  memoryByFingerprint.set(fingerprint, {
    fingerprint,
    result,
    product: { ...product, memoPlane: 'memory', memoHit: false },
    at: Date.now(),
  })
  // Cap process memo
  if (memoryByFingerprint.size > 16) {
    const oldest = [...memoryByFingerprint.entries()].sort((a, b) => a[1].at - b[1].at)[0]
    if (oldest) memoryByFingerprint.delete(oldest[0])
  }
  stats.memoryEntries = memoryByFingerprint.size
  stats.lastFingerprint = fingerprint
  stats.lastPlane = 'fresh'
}

function diskPaths(cwd: string, fingerprint: string): { product: string; dual: string } {
  const dir = corpusMemoDir(cwd)
  return {
    product: path.join(dir, `${fingerprint}.product.json`),
    dual: path.join(dir, `${fingerprint}.spw`),
  }
}

export function getDiskCorpusProduct(
  fingerprint: string,
  cwd: string = process.cwd(),
): CorpusProduct | undefined {
  const { product: p } = diskPaths(cwd, fingerprint)
  if (!existsSync(p)) {
    stats.diskMisses += 1
    return undefined
  }
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8')) as CorpusProduct
    if (raw.fingerprint !== fingerprint || raw.schema !== 'spw.corpus/1') {
      stats.diskMisses += 1
      return undefined
    }
    stats.diskHits += 1
    stats.lastFingerprint = fingerprint
    stats.lastPlane = 'disk'
    return { ...raw, memoHit: true, memoPlane: 'disk' }
  } catch {
    stats.diskMisses += 1
    return undefined
  }
}

export function setDiskCorpusProduct(
  product: CorpusProduct,
  cwd: string = process.cwd(),
): void {
  const dir = corpusMemoDir(cwd)
  mkdirSync(dir, { recursive: true })
  const paths = diskPaths(cwd, product.fingerprint)
  const toWrite: CorpusProduct = {
    ...product,
    memoHit: false,
    memoPlane: 'fresh',
  }
  writeFileSync(paths.product, JSON.stringify(toWrite, null, 2) + '\n', 'utf8')
  writeFileSync(paths.dual, formatCorpusProductSpw(product) + '\n', 'utf8')
  stats.diskWrites += 1
}

export function listDiskCorpusMemos(cwd: string = process.cwd()): Array<{
  fingerprint: string
  files?: number
  scannedAt?: string
}> {
  const dir = corpusMemoDir(cwd)
  if (!existsSync(dir)) return []
  const out: Array<{ fingerprint: string; files?: number; scannedAt?: string }> = []
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.product.json')) continue
    const fp = name.replace(/\.product\.json$/, '')
    try {
      const raw = JSON.parse(readFileSync(path.join(dir, name), 'utf8')) as CorpusProduct
      out.push({
        fingerprint: fp,
        files: raw.stats?.files,
        scannedAt: raw.scannedAt,
      })
    } catch {
      out.push({ fingerprint: fp })
    }
  }
  return out.sort((a, b) => (b.scannedAt ?? '').localeCompare(a.scannedAt ?? ''))
}

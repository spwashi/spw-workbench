/**
 * Shared corpus scan for census / graph / formula / density.
 * One walk → CorpusProduct (population + topography) + optional sources.
 *
 * Memo plane: process memory + .spw/gen/session/corpus-memo/ (product only).
 * @see docs/theory/spw/cache-field.spw
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spwq } from '@spwashi/spw-seed'
import {
  analyzeTopography,
  buildCorpusProduct,
  buildPopulation,
  filterPopulation,
  heuristicAnnotationHints,
  heuristicFrameCount,
  heuristicSigilHistogram,
  populationStats,
  resolveIndexConfig,
  sortPopulation,
  type CorpusFileSignals,
  type CorpusLink,
  type CorpusProduct,
  type HubScore,
  type IndexConfig,
  type IndexDepth,
  type PopulationRole,
  type PopulationRow,
  type TopographyReport,
} from '@spwashi/spw-seed'
import { PATH_REFS, REFERENCES } from '@spwashi/spw-seed'
import {
  fingerprintCorpusKey,
  getDiskCorpusProduct,
  getMemoryCorpusMemo,
  setDiskCorpusProduct,
  setMemoryCorpusMemo,
  type CorpusMemoKeyParts,
} from './corpus-memo'
import { collectSpwFiles, DEFAULT_IGNORED_DIRS } from './fs-walk'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace, type SpwWorkspace } from './workspace'

export const CORPUS_IGNORED = new Set([...DEFAULT_IGNORED_DIRS, '_workbench', '.agents'])

/** @deprecated Prefer PopulationRole from seed */
export type InventoryRole = PopulationRole
/** @deprecated Prefer PopulationRow from seed */
export type InventoryRow = PopulationRow

export interface CorpusScanResult {
  cwd: string
  filesAbs: string[]
  /** relative paths (posix) → source */
  sources: Map<string, string>
  links: CorpusLink[]
  signals: CorpusFileSignals[]
  topography: TopographyReport
  /** Population product rows (census IR). */
  inventory: PopulationRow[]
  /** Portable collate product (no sources). */
  product: CorpusProduct
  workspace: SpwWorkspace | null
  memoPlane: 'memory' | 'disk' | 'fresh'
}

export interface ScanOptions {
  roots: string[]
  resolvePaths?: boolean
  hubTop?: number
  ignore?: ReadonlySet<string>
  /** Perf <-> completeness dial (see canonical/index-config.ts). Default 'standard'. */
  index?: IndexDepth | Partial<IndexConfig>
  /** Skip memo (force fresh). */
  noMemo?: boolean
  /** Persist product to disk memo (default true). */
  persistMemo?: boolean
}

export async function scanCorpus(opts: ScanOptions): Promise<CorpusScanResult> {
  const resolvePaths = opts.resolvePaths !== false
  const hubTop = opts.hubTop ?? 24
  const ignore = opts.ignore ?? CORPUS_IGNORED
  const indexDepth: IndexDepth =
    typeof opts.index === 'string'
      ? parseIndexDepth(opts.index)
      : 'standard'
  const indexConfig = resolveIndexConfig(opts.index)

  const workspace = await tryDiscoverSpwWorkspace()
  const absRoots = await Promise.all(
    opts.roots.map(async r => (workspace ? resolveWorkspacePath(workspace, r) : path.resolve(r))),
  )
  const fileLists = await Promise.all(absRoots.map(r => collectSpwFiles(r, { ignore })))
  let filesAbs = [...new Set(fileLists.flat())].sort()
  if (indexConfig.maxFiles > 0 && filesAbs.length > indexConfig.maxFiles) {
    filesAbs = filesAbs.slice(0, indexConfig.maxFiles)
  }
  const cwd = workspace?.consumerRoot ?? process.cwd()

  // Cheap fingerprint from mtime/size before reading bodies
  const fileStats: Record<string, string> = {}
  await Promise.all(
    filesAbs.map(async abs => {
      const rel = normalizeRel(path.relative(cwd, abs))
      try {
        const st = await fs.stat(abs)
        fileStats[rel] = `${st.mtimeMs}:${st.size}`
      } catch {
        fileStats[rel] = 'missing'
      }
    }),
  )

  const keyParts: CorpusMemoKeyParts = {
    cwd,
    roots: absRoots.map(r => normalizeRel(path.relative(cwd, r) || r)),
    hubTop,
    resolvePaths,
    indexDepth,
    maxFiles: indexConfig.maxFiles,
    fileStats,
  }

  const fingerprint = fingerprintCorpusKey(keyParts)

  if (!opts.noMemo) {
    const mem = getMemoryCorpusMemo(fingerprint)
    if (mem) {
      return {
        ...mem.result,
        product: { ...mem.product, memoHit: true, memoPlane: 'memory' },
        memoPlane: 'memory',
      }
    }

    const diskProduct = getDiskCorpusProduct(fingerprint, cwd)
    if (diskProduct) {
      // Re-read sources only (skip selector/topo recompute)
      const sources = new Map<string, string>()
      const filesFromProduct = diskProduct.signals.map(s => path.resolve(cwd, s.file))
      await Promise.all(
        filesFromProduct.map(async abs => {
          const rel = normalizeRel(path.relative(cwd, abs))
          try {
            sources.set(rel, await fs.readFile(abs, 'utf8'))
          } catch {
            /* skip */
          }
        }),
      )
      const result: CorpusScanResult = {
        cwd,
        filesAbs: filesFromProduct,
        sources,
        links: diskProduct.links,
        signals: diskProduct.signals,
        topography: diskProduct.topography,
        inventory: diskProduct.population,
        product: diskProduct,
        workspace,
        memoPlane: 'disk',
      }
      setMemoryCorpusMemo(fingerprint, result, diskProduct)
      return result
    }
  }

  // Fresh scan
  const links: CorpusLink[] = []
  const signals: CorpusFileSignals[] = []
  const knownRel = new Set<string>()
  const sources = new Map<string, string>()

  const perFile = await Promise.all(
    filesAbs.map(async abs => {
      const rel = normalizeRel(path.relative(cwd, abs))
      let source: string
      try {
        source = await fs.readFile(abs, 'utf8')
      } catch {
        return null
      }

      const sigils = indexConfig.operatorCensus ? heuristicSigilHistogram(source) : {}
      const fileLinks: CorpusLink[] = []
      let pathRefCount = 0
      let rootRefCount = 0

      try {
        const pathMatches = spwq.fromSource(source, PATH_REFS)
        for (const match of pathMatches) {
          pathRefCount++
          const raw =
            (match.node as { path?: { token?: { value?: string } } }).path?.token?.value ?? ''
          const targetRaw = unquote(raw)
          const resolved = resolvePaths
            ? normalizeRel(path.relative(cwd, path.resolve(path.dirname(abs), targetRaw)))
            : targetRaw
          fileLinks.push({
            from: rel,
            to: resolved,
            kind: 'path',
            line: match.span.startLine + 1,
            label: targetRaw,
          })
        }
      } catch {
        /* parse-partial OK */
      }

      try {
        const refMatches = spwq.fromSource(source, REFERENCES)
        for (const match of refMatches) {
          const raw = (match.node as { raw?: string }).raw ?? ''
          if (!raw) continue
          rootRefCount++
          fileLinks.push({
            from: rel,
            to: raw,
            kind: 'root',
            line: match.span.startLine + 1,
            label: `@${raw}`,
          })
        }
      } catch {
        /* ignore */
      }

      const signal: CorpusFileSignals = {
        file: rel,
        sigils,
        pathRefCount,
        rootRefCount,
        frameCount: heuristicFrameCount(source),
        annotationHints: indexConfig.annotations ? heuristicAnnotationHints(source) : 0,
        lineCount: source.split(/\r?\n/).length,
      }

      return { rel, source, links: fileLinks, signal }
    }),
  )

  for (const entry of perFile) {
    if (!entry) continue
    knownRel.add(entry.rel)
    sources.set(entry.rel, entry.source)
    links.push(...entry.links)
    signals.push(entry.signal)
  }

  const topography = analyzeTopography(links, {
    knownFiles: knownRel,
    signals,
    hubTop,
  })

  if (resolvePaths && topography.brokenTargets.length) {
    const missing = await Promise.all(
      topography.brokenTargets.map(async target => {
        try {
          await fs.access(path.resolve(cwd, target))
          return null
        } catch {
          return target
        }
      }),
    )
    topography.brokenTargets = missing.filter((t): t is string => t !== null)
  }

  const inventory = buildPopulation(signals, topography)
  const product = buildCorpusProduct({
    fingerprint,
    roots: keyParts.roots,
    hubTop,
    resolvePaths,
    indexDepth: keyParts.indexDepth,
    links,
    signals,
    topography,
    population: inventory,
    memoPlane: 'fresh',
  })

  const result: CorpusScanResult = {
    cwd,
    filesAbs,
    sources,
    links,
    signals,
    topography,
    inventory,
    product,
    workspace,
    memoPlane: 'fresh',
  }

  if (!opts.noMemo) {
    setMemoryCorpusMemo(fingerprint, result, product)
    if (opts.persistMemo !== false) {
      setDiskCorpusProduct(product, cwd)
    }
  }

  return result
}

/** @deprecated Use buildPopulation from seed */
export function buildInventory(
  signals: CorpusFileSignals[],
  topo: TopographyReport,
): PopulationRow[] {
  return buildPopulation(signals, topo)
}

export function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith('`') && value.endsWith('`')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

export function normalizeRel(p: string): string {
  return p.split(path.sep).join('/')
}

export const sortInventory = sortPopulation
export const filterInventory = filterPopulation
export const inventoryStats = populationStats

/** Parse a --depth flag value; falls back to 'standard' for anything unrecognized. */
export function parseIndexDepth(raw: string | undefined): IndexDepth {
  return raw === 'minimal' || raw === 'standard' || raw === 'full' ? raw : 'standard'
}

export type { HubScore, TopographyReport, IndexConfig, IndexDepth, CorpusProduct, PopulationRow }

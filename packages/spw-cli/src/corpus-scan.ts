/**
 * Shared corpus scan for map / invent / formula / analyze.
 * One walk, one parse pass per file → links + signals + source index.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spwq } from '@spwashi/spw-seed'
import {
  analyzeTopography,
  heuristicAnnotationHints,
  heuristicFrameCount,
  heuristicSigilHistogram,
  type CorpusFileSignals,
  type CorpusLink,
  type HubScore,
  type TopographyReport,
} from '@spwashi/spw-seed'
import { PATH_REFS, REFERENCES } from '@spwashi/spw-seed'
import { collectSpwFiles, DEFAULT_IGNORED_DIRS } from './fs-walk'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace, type SpwWorkspace } from './workspace'

export const CORPUS_IGNORED = new Set([...DEFAULT_IGNORED_DIRS, '_workbench', '.agents'])

export type InventoryRole = 'hub' | 'orphan' | 'leaf' | 'source' | 'node' | 'broken-target'

export interface InventoryRow {
  file: string
  lines: number
  pathRefs: number
  rootRefs: number
  frames: number
  annotations: number
  sigilTop: string
  role: InventoryRole
  inDegree: number
  outDegree: number
}

export interface CorpusScanResult {
  cwd: string
  filesAbs: string[]
  /** relative paths (posix) → source */
  sources: Map<string, string>
  links: CorpusLink[]
  signals: CorpusFileSignals[]
  topography: TopographyReport
  inventory: InventoryRow[]
  workspace: SpwWorkspace | null
}

export interface ScanOptions {
  roots: string[]
  resolvePaths?: boolean
  hubTop?: number
  ignore?: ReadonlySet<string>
}

export async function scanCorpus(opts: ScanOptions): Promise<CorpusScanResult> {
  const resolvePaths = opts.resolvePaths !== false
  const hubTop = opts.hubTop ?? 24
  const ignore = opts.ignore ?? CORPUS_IGNORED

  const workspace = await tryDiscoverSpwWorkspace()
  const absRoots = await Promise.all(
    opts.roots.map(async r => (workspace ? resolveWorkspacePath(workspace, r) : path.resolve(r))),
  )
  const fileLists = await Promise.all(absRoots.map(r => collectSpwFiles(r, { ignore })))
  const filesAbs = [...new Set(fileLists.flat())].sort()
  const cwd = workspace?.consumerRoot ?? process.cwd()

  const links: CorpusLink[] = []
  const signals: CorpusFileSignals[] = []
  const knownRel = new Set<string>()
  const sources = new Map<string, string>()

  const perFile = await Promise.all(
    filesAbs.map(async (abs) => {
      const rel = normalizeRel(path.relative(cwd, abs))
      let source: string
      try {
        source = await fs.readFile(abs, 'utf8')
      } catch {
        return null
      }

      const sigils = heuristicSigilHistogram(source)
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
        annotationHints: heuristicAnnotationHints(source),
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

  const inventory = buildInventory(signals, topography)

  return {
    cwd,
    filesAbs,
    sources,
    links,
    signals,
    topography,
    inventory,
    workspace,
  }
}

export function buildInventory(
  signals: CorpusFileSignals[],
  topo: TopographyReport,
): InventoryRow[] {
  const hubSet = new Set(topo.hubs.map(h => h.id))
  const orphanSet = new Set(topo.orphans)
  const degree = degreeMaps(topo)

  return signals
    .map((signal): InventoryRow => {
      const inDegree = degree.inDegree.get(signal.file) ?? 0
      const outDegree = degree.outDegree.get(signal.file) ?? 0
      return {
        file: signal.file,
        lines: signal.lineCount,
        pathRefs: signal.pathRefCount,
        rootRefs: signal.rootRefCount,
        frames: signal.frameCount,
        annotations: signal.annotationHints,
        sigilTop: topSigils(signal.sigils, 3),
        role: roleOf(signal.file, hubSet, orphanSet, inDegree, outDegree),
        inDegree,
        outDegree,
      }
    })
    .sort((a, b) => a.file.localeCompare(b.file))
}

function roleOf(
  file: string,
  hubs: Set<string>,
  orphans: Set<string>,
  inDegree: number,
  outDegree: number,
): InventoryRole {
  if (hubs.has(file)) return 'hub'
  if (orphans.has(file)) return 'orphan'
  if (outDegree === 0 && inDegree > 0) return 'leaf'
  if (inDegree === 0 && outDegree > 0) return 'source'
  return 'node'
}

function degreeMaps(topo: TopographyReport): {
  inDegree: Map<string, number>
  outDegree: Map<string, number>
} {
  const inDegree = new Map<string, number>()
  const outDegree = new Map<string, number>()
  for (const node of topo.graph.nodes) {
    inDegree.set(node, 0)
    outDegree.set(node, 0)
  }
  for (const edge of topo.graph.edges) {
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1)
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
  }
  // Prefer hub scores when available for known files
  for (const hub of topo.hubs) {
    inDegree.set(hub.id, hub.inDegree)
    outDegree.set(hub.id, hub.outDegree)
  }
  return { inDegree, outDegree }
}

function topSigils(sigils: Record<string, number>, n: number): string {
  return Object.entries(sigils)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k, v]) => `${k}${v}`)
    .join(' ')
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

export function sortInventory(
  rows: InventoryRow[],
  key: 'file' | 'lines' | 'refs' | 'frames' | 'sigils' | 'degree',
): InventoryRow[] {
  const copy = [...rows]
  const refCount = (row: InventoryRow) => row.pathRefs + row.rootRefs
  const degreeSum = (row: InventoryRow) => row.inDegree + row.outDegree
  copy.sort((a, b) => {
    switch (key) {
      case 'lines':
        return b.lines - a.lines || a.file.localeCompare(b.file)
      case 'refs':
        return refCount(b) - refCount(a) || a.file.localeCompare(b.file)
      case 'frames':
        return b.frames - a.frames || a.file.localeCompare(b.file)
      case 'sigils':
        return b.sigilTop.length - a.sigilTop.length || a.file.localeCompare(b.file)
      case 'degree':
        return degreeSum(b) - degreeSum(a) || a.file.localeCompare(b.file)
      default:
        return a.file.localeCompare(b.file)
    }
  })
  return copy
}

export function filterInventory(
  rows: InventoryRow[],
  role: InventoryRole | 'all' | undefined,
): InventoryRow[] {
  if (!role || role === 'all') return rows
  return rows.filter(row => row.role === role)
}

export function inventoryStats(rows: InventoryRow[]): {
  files: number
  lines: number
  pathRefs: number
  rootRefs: number
  frames: number
  byRole: Record<string, number>
} {
  const byRole: Record<string, number> = {}
  let lines = 0
  let pathRefs = 0
  let rootRefs = 0
  let frames = 0
  for (const row of rows) {
    lines += row.lines
    pathRefs += row.pathRefs
    rootRefs += row.rootRefs
    frames += row.frames
    byRole[row.role] = (byRole[row.role] ?? 0) + 1
  }
  return { files: rows.length, lines, pathRefs, rootRefs, frames, byRole }
}

export type { HubScore, TopographyReport }

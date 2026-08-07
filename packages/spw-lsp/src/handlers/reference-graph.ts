/**
 * Reference graph — which surfaces point at which.
 *
 * Outbound references are cheap and already known per document. The reverse
 * direction is the one that says something about a surface's standing: how
 * many other surfaces depend on it. A surface a dozen others point at is
 * load-bearing, and one nothing points at is either an entry point or adrift.
 *
 * Resolution goes through the same path resolver navigation uses, so a hub
 * count means the same thing as a working Ctrl+Click. That costs filesystem
 * work proportional to the corpus, so this is built on request rather than
 * maintained continuously, and cached until the workspace is edited.
 */

import { promises as fs } from 'node:fs'
import { selectPathRefs } from '../spw-selector'
import { stripAnchor } from '../helpers'
import type { HandlerDeps } from '../types'
import {
  formatReferenceGraphSpw,
  type ReferenceGraphEnvelope,
} from './corpus-disclose'

export interface ReferenceGraphEntry {
  /** Workspace-relative path. */
  path: string
  inbound: number
  outbound: number
  /** Surfaces that point here, workspace-relative. */
  referrers: string[]
}

export interface ReferenceGraphReport {
  surfaces: number
  /** Surface-to-surface edges. */
  edges: number
  /** Most-referenced surfaces first. */
  hubs: ReferenceGraphEntry[]
  /**
   * Live surfaces nothing points at. Archived surfaces are left out: being
   * unreferenced is the normal condition of something already retired, so
   * listing them would bury the orphans worth knowing about.
   */
  orphans: string[]
  /** References that resolve outside the surface set — source, docs, directories. */
  external: number
  /** References that resolve to nothing at all — dangling, not orphaned. */
  unresolved: number
}

/**
 * Surfaces that are not expected to be pointed at.
 *
 * An orphan is only interesting where reachability was the intent. Retired
 * surfaces have been deliberately cut loose, and agent working surfaces —
 * plans, streams — are written to be read directly rather than linked from
 * canon. Counting them as orphans buries the ones that indicate real drift.
 */
function expectsReferrers(relativePath: string): boolean {
  return !relativePath.includes('_archive/') && !relativePath.startsWith('.agents/')
}

interface CachedGraph {
  root: string
  builtAtBeat: number
  report: ReferenceGraphReport
}

let cache: CachedGraph | null = null

/** Beats a graph stays usable before the corpus is assumed to have moved. */
const GRAPH_TTL = 40

const HUB_LIMIT = 15
const ORPHAN_LIMIT = 25

export function invalidateReferenceGraph(): void {
  cache = null
}

async function readSource(filePath: string, deps: HandlerDeps): Promise<string | null> {
  // Prefer the open buffer: an edit that has not been saved still counts.
  const open = deps.serverIndex.getDocument(deps.uriFromPath(filePath))
  if (open) return open.text
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

export async function buildReferenceGraph(
  deps: HandlerDeps,
): Promise<ReferenceGraphEnvelope> {
  const beat = deps.serverIndex.getCurrentBeat()
  if (cache && cache.root === deps.workspaceRoot && beat - cache.builtAtBeat < GRAPH_TTL) {
    return {
      ...cache.report,
      dualReadSpw: formatReferenceGraphSpw(cache.report),
    }
  }

  const files = await deps.getWorkspaceSpwFiles()
  const relative = (filePath: string): string =>
    filePath.startsWith(deps.workspaceRoot)
      ? filePath.slice(deps.workspaceRoot.length).replace(/^[\\/]/, '')
      : filePath

  const inbound = new Map<string, Set<string>>()
  const outbound = new Map<string, number>()
  let unresolved = 0
  let external = 0

  // The nodes are the surfaces themselves. A reference to source, prose, or a
  // directory is a real edge in the workspace but not one between surfaces,
  // and letting those become nodes would put files with no marks in a report
  // about how surfaces depend on each other.
  const isSurface = new Set(files.map(relative))
  for (const surface of isSurface) inbound.set(surface, new Set())

  const resolved = await deps.mapWithConcurrency(files, 8, async (file) => {
    const source = await readSource(file, deps)
    if (source === null) return null

    const targets: string[] = []
    for (const hit of selectPathRefs(source)) {
      // A fragment addresses a node inside a surface; the edge is to the file.
      // Directories resolve as navigation resolves them, so a hub count and a
      // working Ctrl+Click agree.
      const target = await deps.resolveReferencePath(
        { ...hit, target: stripAnchor(hit.target) },
        source,
        file,
        { allowDirectory: true },
      )
      if (target === null) {
        unresolved += 1
        continue
      }
      targets.push(target)
    }
    return { file, targets }
  })

  let edges = 0
  for (const entry of resolved) {
    if (!entry) continue
    const from = relative(entry.file)
    let surfaceTargets = 0

    for (const target of entry.targets) {
      const to = relative(target)
      if (!isSurface.has(to)) {
        external += 1
        continue
      }
      // A surface referring to itself says nothing about its standing.
      if (to === from) continue
      inbound.get(to)!.add(from)
      surfaceTargets += 1
      edges += 1
    }

    outbound.set(from, surfaceTargets)
  }

  const entries: ReferenceGraphEntry[] = [...inbound.entries()].map(([surface, referrers]) => ({
    path: surface,
    inbound: referrers.size,
    outbound: outbound.get(surface) ?? 0,
    referrers: [...referrers].sort(),
  }))

  const report: ReferenceGraphReport = {
    surfaces: entries.length,
    edges,
    hubs: entries
      .filter((e) => e.inbound > 0)
      .sort((a, b) => b.inbound - a.inbound || a.path.localeCompare(b.path))
      .slice(0, HUB_LIMIT),
    orphans: entries
      .filter((e) => e.inbound === 0 && expectsReferrers(e.path))
      .map((e) => e.path)
      .sort()
      .slice(0, ORPHAN_LIMIT),
    external,
    unresolved,
  }

  cache = { root: deps.workspaceRoot, builtAtBeat: beat, report }
  return {
    ...report,
    dualReadSpw: formatReferenceGraphSpw(report),
  }
}

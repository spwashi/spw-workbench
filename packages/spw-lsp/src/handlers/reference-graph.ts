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
 *
 * The same build keeps every citation it resolved, by the surface it lands
 * in and by the `#key` it names there, so a code lens can say who cites a
 * file without a second walk. A lens cannot wait for a build, so it reads
 * the cache synchronously and starts a build in the background when the
 * cache is cold or an edit has outdated it.
 */

import { promises as fs } from 'node:fs'
import { selectPathRefs, type SpwSelectorHit } from '../spw-selector'
import { fragmentOf, stripAnchor } from '../helpers'
import type { HandlerDeps, LspRange } from '../types'
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

/** Where one citation is written. */
export interface CitationSite {
  /** The citing surface, absolute. */
  file: string
  range: LspRange
}

/** The citations that name one surface, or one key inside it. */
export interface CitationCount {
  /** Surfaces that cite; the cited surface itself is never among them. */
  files: number
  citations: number
  sites: readonly CitationSite[]
}

export interface InboundCitations extends CitationCount {
  /** Citations that name a `#key` in this surface, by key. */
  fragments: ReadonlyMap<string, CitationCount>
}

const NO_CITATIONS: InboundCitations = { files: 0, citations: 0, sites: [], fragments: new Map() }

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
  /** Absolute surface path → who cites it. */
  citations: ReadonlyMap<string, InboundCitations>
}

let cache: CachedGraph | null = null
/** An edit outdated the cache; it stays readable until the next build replaces it. */
let stale = false
/** Bumped by every edit, so a build that started before one knows it is already behind. */
let generation = 0
let inFlight: Promise<CachedGraph> | null = null
/** Called once when the build in flight lands; the latest caller wins. */
let onLanding: (() => void) | null = null

/** Beats a graph stays usable before the corpus is assumed to have moved. */
const GRAPH_TTL = 40

const HUB_LIMIT = 15
const ORPHAN_LIMIT = 25

/**
 * A save or a file event can add or remove a citation. The cache keeps
 * answering lenses until the rebuild lands, so counts never blink out.
 */
export function invalidateReferenceGraph(): void {
  stale = true
  generation += 1
}

/** Forget the cache and any build in flight, so a test starts cold. */
export function resetReferenceGraph(): void {
  cache = null
  stale = false
  inFlight = null
  onLanding = null
}

interface CitedSource {
  source: string
  hits: SpwSelectorHit[]
}

/**
 * A surface's text and citations. The open buffer wins — an edit that has not
 * been saved still counts — and a closed file's citations come from the
 * index's scan memo, so a graph rebuild does not parse the corpus again.
 */
async function readCitations(filePath: string, deps: HandlerDeps): Promise<CitedSource | null> {
  const open = deps.serverIndex.getDocument(deps.uriFromPath(filePath))
  if (open) return { source: open.text, hits: open.selectorHits ?? selectPathRefs(open.text) }
  let source: string
  try {
    source = await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
  return { source, hits: deps.serverIndex.citationsFor?.(filePath, source) ?? selectPathRefs(source) }
}

/** Sites gathered for one surface, or one key, while the build walks. */
class CitationTally {
  readonly sites: CitationSite[] = []
  private readonly referrers = new Set<string>()

  add(site: CitationSite): void {
    this.sites.push(site)
    this.referrers.add(site.file)
  }

  count(): CitationCount {
    return { files: this.referrers.size, citations: this.sites.length, sites: this.sites }
  }
}

function siteOf(file: string, hit: SpwSelectorHit): CitationSite {
  return {
    file,
    range: {
      start: { line: hit.span.startLine, character: hit.span.startCharacter },
      end: { line: hit.span.endLine, character: hit.span.endCharacter },
    },
  }
}

async function computeGraph(deps: HandlerDeps): Promise<CachedGraph> {
  const root = deps.workspaceRoot
  // The scan's parses are the build's memo: started together, both would
  // parse the whole corpus. Once memoized, a rebuild is reads and stats.
  await deps.serverIndex.scanSettled?.()
  const builtAtBeat = deps.serverIndex.getCurrentBeat()
  // The index's scope, so a mounted workbench, release copies and .tmp
  // neither cite nor get cited, just as they repeat no anchor names.
  const files = (await deps.getWorkspaceSpwFiles())
    .filter((file) => deps.serverIndex.inIndexScope?.(file) ?? true)
  const relative = (filePath: string): string =>
    filePath.startsWith(root)
      ? filePath.slice(root.length).replace(/^[\\/]/, '')
      : filePath

  const inbound = new Map<string, Set<string>>()
  const outbound = new Map<string, number>()
  const byTarget = new Map<string, { file: CitationTally; fragments: Map<string, CitationTally> }>()
  let unresolved = 0
  let external = 0

  // The nodes are the surfaces themselves. A reference to source, prose, or a
  // directory is a real edge in the workspace but not one between surfaces,
  // and letting those become nodes would put files with no marks in a report
  // about how surfaces depend on each other.
  const isSurface = new Set(files.map(relative))
  for (const surface of isSurface) inbound.set(surface, new Set())

  const resolved = await deps.mapWithConcurrency(files, 8, async (file) => {
    const cited = await readCitations(file, deps)
    if (cited === null) return null
    const { source, hits } = cited

    const targets: Array<{ target: string; hit: SpwSelectorHit }> = []
    for (const hit of hits) {
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
      targets.push({ target, hit })
    }
    return { file, targets }
  })

  let edges = 0
  for (const entry of resolved) {
    if (!entry) continue
    const from = relative(entry.file)
    let surfaceTargets = 0

    for (const { target, hit } of entry.targets) {
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

      let tally = byTarget.get(target)
      if (!tally) {
        tally = { file: new CitationTally(), fragments: new Map() }
        byTarget.set(target, tally)
      }
      const site = siteOf(entry.file, hit)
      tally.file.add(site)
      const key = fragmentOf(hit.target)
      if (key) {
        let keyed = tally.fragments.get(key)
        if (!keyed) tally.fragments.set(key, keyed = new CitationTally())
        keyed.add(site)
      }
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

  const citations = new Map<string, InboundCitations>()
  for (const [target, tally] of byTarget) {
    const fragments = new Map<string, CitationCount>()
    for (const [key, keyed] of tally.fragments) fragments.set(key, keyed.count())
    citations.set(target, { ...tally.file.count(), fragments })
  }

  return { root, builtAtBeat, report, citations }
}

/**
 * One build at a time: a lens and a graph request that ask together share
 * it. The cache is marked fresh only when no edit arrived while it ran.
 */
function build(deps: HandlerDeps): Promise<CachedGraph> {
  if (inFlight) return inFlight
  const startedAt = generation
  const running: Promise<CachedGraph> = computeGraph(deps).then((graph) => {
    // A reset while this ran (tests) leaves the cache to whoever builds next.
    if (inFlight !== running) return graph
    cache = graph
    if (generation === startedAt) stale = false
    return graph
  })
  inFlight = running
  // Only a build that landed asks for fresh lenses: a failed one would have
  // the refresh request it again, and again.
  const settle = (landed: boolean): void => {
    if (inFlight !== running) return
    inFlight = null
    const notify = onLanding
    onLanding = null
    if (landed) notify?.()
  }
  running.then(() => settle(true), (error: unknown) => {
    deps.log(`reference graph build failed: ${error instanceof Error ? error.message : String(error)}`)
    settle(false)
  })
  return running
}

export async function buildReferenceGraph(
  deps: HandlerDeps,
): Promise<ReferenceGraphEnvelope> {
  const beat = deps.serverIndex.getCurrentBeat()
  const fresh = cache && cache.root === deps.workspaceRoot && !stale && beat - cache.builtAtBeat < GRAPH_TTL
  const graph = fresh ? cache! : await build(deps)
  return {
    ...graph.report,
    dualReadSpw: formatReferenceGraphSpw(graph.report),
  }
}

/**
 * Who cites a surface, from the last build: zero counts for a surface
 * nothing cites, and null while no build has landed, since a cold index
 * knows nothing and must not read as "no one points here".
 */
export function inboundCitationsFor(filePath: string, workspaceRoot: string): InboundCitations | null {
  if (!cache || cache.root !== workspaceRoot) return null
  return cache.citations.get(filePath) ?? NO_CITATIONS
}

/**
 * Start a build when there is no cache for this workspace or an edit has
 * outdated it, and call `onBuilt` once it lands. Never awaited: a lens
 * answers with what is cached and asks its client to come back. The beat
 * TTL does not apply here — an index nobody edited is still true.
 */
export function warmCitationIndex(deps: HandlerDeps, onBuilt?: () => void): void {
  if (cache && cache.root === deps.workspaceRoot && !stale) return
  if (onBuilt) onLanding = onBuilt
  void build(deps).catch(() => { /* logged where the build settles */ })
}

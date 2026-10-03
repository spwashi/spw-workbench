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
import {
  analyzeTopography,
  buildCorpusProduct,
  buildPopulation,
  classifyCitation,
  CORPUS_PRODUCT_VERSION,
  filterPopulation,
  heuristicAnnotationHints,
  heuristicFrameCount,
  heuristicSigilHistogram,
  parse,
  parseWorkspaceRootDeclarations,
  PATH_REFS,
  populationStats,
  REFERENCES,
  resolveIndexConfig,
  rootShelfName,
  sortPopulation,
  spwq,
  type ClassifiedCitation,
  type CorpusFileSignals,
  type CorpusLink,
  type CorpusProduct,
  type HubScore,
  type IndexConfig,
  type IndexDepth,
  type PopulationRole,
  type PopulationRow,
  type SpwMatch,
  type TopographyReport,
} from '@spwashi/spw-seed'
import { citationCandidates } from './citation-candidates'
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
  const registry = await loadRootRegistry(workspace)

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
    productVersion: CORPUS_PRODUCT_VERSION,
    rootRegistry: [...registry]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, bases]) => [name, bases.map(base => normalizeRel(path.relative(cwd, base)) || '.')]),
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
  const resolver = createTargetResolver(cwd, resolvePaths, filesAbs, registry)

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
      const missingRootTargets: string[] = []
      const shelves: string[] = []
      let pathRefCount = 0
      let rootRefCount = 0
      let externalRefCount = 0

      let pathMatches: SpwMatch[] = []
      let refMatches: SpwMatch[] = []
      try {
        const ast = parse(source).ast
        if (ast) {
          pathMatches = spwq(ast, PATH_REFS)
          refMatches = spwq(ast, REFERENCES)
        }
      } catch {
        /* parse-partial OK */
      }

      for (const match of pathMatches) {
        pathRefCount++
        const written = unquote(pathRefValue(match.node))
        const citation = classifyCitation(written)
        // External refs make no edge but stay counted: prose written as a path
        // (`~"Note: …"`) reads as a URI scheme and lands here.
        if (citation.kind === 'external') externalRefCount++
        const target = await resolver.resolve(abs, citation)
        if (!target) continue
        fileLinks.push({
          from: rel,
          to: target.to,
          kind: 'path',
          line: match.span.startLine + 1,
          label: written,
          ...(target.anchor ? { anchor: target.anchor } : {}),
        })
      }

      const localRoots = collectLocalRoots(refMatches)
      for (const match of refMatches) {
        const raw = (match.node as { raw?: string }).raw ?? ''
        if (!raw) continue
        rootRefCount++
        // `@name: ~"…"` declares a root; the PathRef in its value is already an edge.
        if (isRootDeclaration(match)) continue
        // Shelf usage counts every root ref as written, resolved or not.
        shelves.push(rootShelfName(raw))
        const line = match.span.startLine + 1
        const label = `@${raw}`
        if (!resolvePaths) {
          fileLinks.push({ from: rel, to: raw, kind: 'root', line, label })
          continue
        }
        // A root this file declares wins, and a missing target under it is a
        // break. Otherwise the workspace registry (manifest, then
        // .spw/shelves.spw) is a fallback that only ever adds an edge to a file
        // on disk: shelf names also stand for concepts (`@biome/trace`). A name
        // declared nowhere makes no node — it would only rank as a pseudo-hub.
        const declared = localRoots.get(splitRootRef(raw).name)
        let target: ResolvedTarget | null
        if (declared === undefined) {
          target = await resolver.resolveRegistered(raw)
        } else {
          // A declaration whose own path is missing is reported once, through
          // its PathRef; refs made through it add no break of their own.
          const base = await resolver.resolve(abs, classifyCitation(declared))
          if (!base?.exists) continue
          target = await resolver.resolve(abs, classifyCitation(expandLocalRoot(raw, declared)))
        }
        if (!target) continue
        if (target.exists === false) missingRootTargets.push(target.to)
        fileLinks.push({
          from: rel,
          to: target.to,
          kind: 'root',
          line,
          label,
          ...(target.anchor ? { anchor: target.anchor } : {}),
        })
      }

      const signal: CorpusFileSignals = {
        file: rel,
        sigils,
        pathRefCount,
        rootRefCount,
        ...(externalRefCount ? { externalRefCount } : {}),
        frameCount: heuristicFrameCount(source),
        annotationHints: indexConfig.annotations ? heuristicAnnotationHints(source) : 0,
        lineCount: source.split(/\r?\n/).length,
      }

      return { rel, source, links: fileLinks, signal, missingRootTargets, shelves }
    }),
  )

  const rootShelves = new Map<string, number>()
  const missingRootTargets = new Set<string>()
  for (const entry of perFile) {
    if (!entry) continue
    knownRel.add(entry.rel)
    sources.set(entry.rel, entry.source)
    links.push(...entry.links)
    signals.push(entry.signal)
    for (const shelf of entry.shelves) rootShelves.set(shelf, (rootShelves.get(shelf) ?? 0) + 1)
    for (const target of entry.missingRootTargets) missingRootTargets.add(target)
  }

  const topography = analyzeTopography(links, {
    knownFiles: knownRel,
    signals,
    hubTop,
    rootShelves: Object.fromEntries(rootShelves),
  })

  // A root that is declared but names a missing file is a break like any path.
  if (missingRootTargets.size) {
    topography.brokenTargets = [...new Set([...topography.brokenTargets, ...missingRootTargets])].sort()
  }

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

interface ResolvedTarget {
  /** Consumer-relative node id: the file alone, never `file#anchor`. */
  to: string
  anchor: string | null
  /** Whether the target is on disk; null when paths are left unresolved. */
  exists: boolean | null
}

interface TargetResolver {
  resolve(citingAbs: string, citation: ClassifiedCitation): Promise<ResolvedTarget | null>
  /** `@name/rest` through the workspace registry; null unless `name` is registered and the target is a file on disk. */
  resolveRegistered(raw: string): Promise<ResolvedTarget | null>
}

/** Root name → candidate absolute bases, in the order to try them. */
type RootRegistry = ReadonlyMap<string, readonly string[]>

/**
 * The workspace's root registry: the manifest roots (`workspace.roots`), then
 * `.spw/shelves.spw` — the shelf table the LSP also reads — for the same name
 * or names the manifest leaves out. The manifest is tried first ("Root refs
 * resolve through this manifest before fallback heuristics").
 */
async function loadRootRegistry(workspace: SpwWorkspace | null): Promise<RootRegistry> {
  const registry = new Map<string, string[]>()
  if (!workspace) return registry
  const add = (name: string, base: string): void => {
    const bases = registry.get(name) ?? []
    if (!bases.includes(base)) bases.push(base)
    registry.set(name, bases)
  }
  for (const root of workspace.roots) add(root.sigil, root.absolutePath)
  try {
    const shelves = await fs.readFile(path.join(workspace.spwRoot, 'shelves.spw'), 'utf8')
    for (const { sigil, relativePath } of parseWorkspaceRootDeclarations(shelves)) {
      add(sigil, path.resolve(workspace.spwRoot, relativePath))
    }
  } catch {
    /* no shelves table: the manifest alone */
  }
  return registry
}

/**
 * Resolve citation targets in the order `spw resolve` uses (shared
 * `citationCandidates`): split the fragment off, then try the citing file's
 * directory before the consumer root. A target found under neither keeps its
 * file-relative form, so the break is reported where the author wrote it.
 * Returns null for citations that name no corpus file: same-file fragments
 * (`#x`), external URIs, and malformed text.
 */
function createTargetResolver(
  consumerRoot: string,
  resolvePaths: boolean,
  filesAbs: readonly string[],
  registry: RootRegistry,
): TargetResolver {
  const scanned = new Set(filesAbs)
  const statCache = new Map<string, Promise<'file' | 'dir' | null>>()
  const kindOf = (abs: string): Promise<'file' | 'dir' | null> => {
    if (scanned.has(abs)) return Promise.resolve('file')
    let hit = statCache.get(abs)
    if (!hit) {
      hit = fs.stat(abs).then(st => (st.isDirectory() ? 'dir' : 'file'), () => null)
      statCache.set(abs, hit)
    }
    return hit
  }
  const toRel = (abs: string): string => normalizeRel(path.relative(consumerRoot, abs)) || '.'

  /** First candidate on disk; `filesOnly` skips directories. */
  const firstOnDisk = async (
    candidates: readonly string[],
    anchor: string | null,
    filesOnly = false,
  ): Promise<ResolvedTarget> => {
    for (const candidate of candidates) {
      const kind = await kindOf(candidate)
      if (kind === 'file' || (kind === 'dir' && !filesOnly)) {
        return { to: toRel(candidate), anchor, exists: true }
      }
    }
    return { to: toRel(candidates[0]!), anchor, exists: false }
  }

  return {
    async resolve(citingAbs, citation) {
      if (citation.kind === 'malformed' || citation.kind === 'external') return null
      const anchor = citation.fragment
      if (!resolvePaths) return { to: citation.targetPath, anchor, exists: null }
      const candidates = citationCandidates(citation, path.dirname(citingAbs), consumerRoot)
      return firstOnDisk(candidates.map(([, candidate]) => candidate), anchor)
    },
    async resolveRegistered(raw) {
      const { name, rest } = splitRootRef(raw)
      const bases = registry.get(name)
      if (!bases?.length) return null
      const citation = classifyCitation(rest || '.')
      if (citation.kind === 'malformed' || citation.kind === 'external') return null
      const suffix = citation.targetPath.replace(/^\/+/, '')
      // Files only: a bare `@spw` or `@biome` names a shelf, and an edge to its
      // directory would rank that directory as a pseudo-hub.
      const hit = await firstOnDisk(bases.map(base => path.resolve(base, suffix)), citation.fragment, true)
      return hit.exists ? hit : null
    },
  }
}

/** `name/rest` → `{ name, rest }`; `rest` is '' for a bare `@name`. */
function splitRootRef(raw: string): { name: string; rest: string } {
  const slash = raw.indexOf('/')
  return slash < 0 ? { name: raw, rest: '' } : { name: raw.slice(0, slash), rest: raw.slice(slash + 1) }
}

interface BindingLike {
  type?: string
  key?: unknown
  value?: unknown
}

function pathRefValue(node: unknown): string {
  return (node as { path?: { token?: { value?: string } } }).path?.token?.value ?? ''
}

/** `@name: value` — a Reference in a Binding's key slot declares a root; it cites nothing. */
function isRootDeclaration(match: SpwMatch): boolean {
  const parent = match.path[match.path.length - 1] as BindingLike | undefined
  return parent?.type === 'Binding' && parent.key === match.node
}

/**
 * The file's own root table: `@name: ~"path"` declarations, the scope
 * reference-conventions.spw gives `^[roots]{}`. Roots are not inherited from a
 * parent index. The first declaration of a name wins.
 */
function collectLocalRoots(refMatches: readonly SpwMatch[]): Map<string, string> {
  const roots = new Map<string, string>()
  for (const match of refMatches) {
    if (!isRootDeclaration(match)) continue
    const name = (match.node as { raw?: string }).raw
    if (!name || roots.has(name)) continue
    const binding = match.path[match.path.length - 1] as BindingLike
    const value = binding.value as { type?: string; terms?: unknown[] } | undefined
    const pathRef = value?.type === 'PathRef'
      ? value
      : value?.terms?.find(term => (term as { type?: string }).type === 'PathRef')
    if (pathRef) roots.set(name, unquote(pathRefValue(pathRef)))
  }
  return roots
}

/** `@name/rest` → the path `@name` declares, joined with `rest`. */
function expandLocalRoot(raw: string, declared: string): string {
  const { rest } = splitRootRef(raw)
  if (!rest) return declared
  return path.posix.join(classifyCitation(declared).targetPath || declared, rest)
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

/**
 * Path refs that made no edge because they classify as external — a URI, or
 * prose written as a path (`~"Note: …"`) that reads as one. Shown beside the
 * broken count so such authoring slips are not silently dropped.
 */
export function externalRefTotal(signals: readonly CorpusFileSignals[]): number {
  return signals.reduce((sum, signal) => sum + (signal.externalRefCount ?? 0), 0)
}

export const sortInventory = sortPopulation
export const filterInventory = filterPopulation
export const inventoryStats = populationStats

/** Parse a --depth flag value; falls back to 'standard' for anything unrecognized. */
export function parseIndexDepth(raw: string | undefined): IndexDepth {
  return raw === 'minimal' || raw === 'standard' || raw === 'full' ? raw : 'standard'
}

export type { HubScore, TopographyReport, IndexConfig, IndexDepth, CorpusProduct, PopulationRow }

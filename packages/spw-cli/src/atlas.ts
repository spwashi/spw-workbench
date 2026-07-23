/**
 * spw atlas — measure a workspace's material properties, and watch them develop.
 *
 * A `.spw` corpus has properties you can measure without reading it: the
 * dialect of each region (how much of it is deferred state versus settled
 * canon), how its surfaces depend on each other, how dense its anchor
 * namespace is. This crawls the workspace into a WorkspaceSnapshot — one
 * moment's measurements — and can save snapshots over time so the graph and
 * the file tree can be watched as they grow.
 *
 * The crawl is a pure function of the files it is given, so it tests without a
 * filesystem and a snapshot from any point (a git revision, a saved history
 * entry) is comparable to any other.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execSync } from 'node:child_process'
import { parse, particleMix, deixisTable, spwq, type ParticleMix } from '@spwashi/spw-seed'
import { collectSpwFiles } from './fs-walk'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace, type SpwWorkspace } from './workspace'

/** One surface, addressed the way the rest of the workspace addresses it. */
export interface CrawlInput {
  /** Workspace-relative path, e.g. `.spw/index.spw`. */
  path: string
  source: string
}

export interface RegionDialect extends ParticleMix {
  region: string
  files: number
  /** Aspect marks as a share of all particle marks — the volatility reading. */
  aspectShare: number
  volatility: 'volatile' | 'settled' | 'durable'
}

export interface HubEntry { path: string; inbound: number }
export interface DanglingRef { from: string; target: string; fragment: string }

/** Everything the crawl measures at one moment. */
export interface WorkspaceSnapshot {
  at: string
  ref: string
  surfaces: number
  anchors: number
  edges: number
  fragRefs: number
  danglingRefs: number
  orphanCount: number
  regions: RegionDialect[]
  namespace: Array<{ group: string; count: number }>
  hubs: HubEntry[]
  orphans: string[]
  dangling: DanglingRef[]
}

const VOLATILE_SHARE = 0.6
const SETTLED_SHARE = 0.3

function volatilityOf(aspectShare: number): RegionDialect['volatility'] {
  return aspectShare >= VOLATILE_SHARE ? 'volatile' : aspectShare >= SETTLED_SHARE ? 'settled' : 'durable'
}

/** First path segment, or `(root)` for a surface that sits at the workspace root. */
function regionOf(relPath: string): string {
  const slash = relPath.indexOf('/')
  return slash < 0 ? '(root)' : relPath.slice(0, slash)
}

/** The `#fragment` of a path-ref value, and the file half, unquoted. */
function splitTarget(rawValue: string): { file: string; fragment: string | null } {
  const value = rawValue.replace(/^["'`]|["'`]$/g, '')
  const hash = value.indexOf('#')
  if (hash < 0) return { file: value, fragment: null }
  return { file: value.slice(0, hash), fragment: value.slice(hash + 1) }
}

/** The leading `[a-z]+` of an anchor name — its implicit family (`wonder`, `spw`, …). */
function nameGroup(anchor: string): string {
  return anchor.match(/^([a-z]+)/)?.[1] ?? 'other'
}

/**
 * Measure a set of surfaces. Pure over its input so a snapshot is reproducible
 * and two snapshots — now and earlier — are directly comparable.
 */
export function crawlWorkspace(
  inputs: readonly CrawlInput[],
  meta: { at: string; ref: string },
): WorkspaceSnapshot {
  const regions = new Map<string, ParticleMix & { files: number }>()
  const anchorHome = new Map<string, string[]>()
  const anchorsInFile = new Map<string, Set<string>>()
  const inbound = new Map<string, Set<string>>()
  const fragTargets: Array<{ from: string; file: string; fragment: string }> = []

  const known = new Set(inputs.map((i) => i.path))
  for (const input of inputs) inbound.set(input.path, new Set())

  for (const input of inputs) {
    const ast = parse(input.source).ast
    if (!ast) continue

    const region = regionOf(input.path)
    const bucket = regions.get(region) ?? { deixis: 0, case: 0, mood: 0, aspect: 0, files: 0 }
    const mix = particleMix(ast, input.source)
    bucket.deixis += mix.deixis
    bucket.case += mix.case
    bucket.mood += mix.mood
    bucket.aspect += mix.aspect
    bucket.files += 1
    regions.set(region, bucket)

    const anchors = new Set(deixisTable(ast).keys())
    anchorsInFile.set(input.path, anchors)
    for (const anchor of anchors) {
      ;(anchorHome.get(anchor) ?? anchorHome.set(anchor, []).get(anchor)!).push(input.path)
    }

    const baseDir = path.dirname(input.path)
    for (const hit of spwq.fromSource(input.source, { nodeType: 'PathRef' })) {
      const raw = (hit as { value?: string; node?: { path?: { token?: { value?: string } } } })
      const rawValue = raw.value ?? raw.node?.path?.token?.value ?? ''
      const { file, fragment } = splitTarget(rawValue)
      if (!file || file.startsWith('@')) continue

      const resolved = path.normalize(path.join(baseDir, file.replace(/^\.\//, '')))
      const target = known.has(resolved)
        ? resolved
        : inputs.find((i) => i.path.endsWith(`/${path.basename(resolved)}`))?.path ?? null

      if (target && target !== input.path) inbound.get(target)!.add(input.path)
      if (fragment) fragTargets.push({ from: input.path, file: resolved, fragment })
    }
  }

  // Dangling: a fragment whose target surface lacks that anchor.
  const dangling: DanglingRef[] = []
  for (const ref of fragTargets) {
    const targetFile = known.has(ref.file)
      ? ref.file
      : inputs.find((i) => i.path.endsWith(`/${path.basename(ref.file)}`))?.path ?? null
    const anchors = targetFile ? anchorsInFile.get(targetFile) : null
    if (!anchors || !anchors.has(ref.fragment)) {
      dangling.push({ from: ref.from, target: ref.file, fragment: ref.fragment })
    }
  }

  const regionList: RegionDialect[] = [...regions.entries()]
    .map(([region, m]) => {
      const total = m.deixis + m.case + m.mood + m.aspect
      const aspectShare = total > 0 ? m.aspect / total : 0
      return { region, files: m.files, deixis: m.deixis, case: m.case, mood: m.mood, aspect: m.aspect, aspectShare, volatility: volatilityOf(aspectShare) }
    })
    .sort((a, b) => b.aspectShare - a.aspectShare)

  const groups = new Map<string, number>()
  for (const anchor of anchorHome.keys()) {
    const g = nameGroup(anchor)
    groups.set(g, (groups.get(g) ?? 0) + 1)
  }

  const hubs: HubEntry[] = [...inbound.entries()]
    .map(([p, refs]) => ({ path: p, inbound: refs.size }))
    .filter((h) => h.inbound > 0)
    .sort((a, b) => b.inbound - a.inbound || a.path.localeCompare(b.path))
    .slice(0, 12)

  // Orphans that were meant to be reached — canon, not archived or agent scratch.
  const orphans = [...inbound.entries()]
    .filter(([p, refs]) => refs.size === 0 && !p.includes('_archive/') && !p.startsWith('.agents/'))
    .map(([p]) => p)
    .sort()

  const edges = [...inbound.values()].reduce((sum, refs) => sum + refs.size, 0)
  const anchorTotal = [...anchorHome.values()].reduce((sum, homes) => sum + homes.length, 0)

  return {
    at: meta.at,
    ref: meta.ref,
    surfaces: inputs.length,
    anchors: anchorTotal,
    edges,
    fragRefs: fragTargets.length,
    danglingRefs: dangling.length,
    orphanCount: orphans.length,
    regions: regionList,
    namespace: [...groups.entries()].map(([group, count]) => ({ group, count })).sort((a, b) => b.count - a.count),
    hubs,
    orphans: orphans.slice(0, 25),
    dangling,
  }
}

// ── CLI ─────────────────────────────────────────────────────────

const HISTORY_REL = path.join('.spw', 'gen', 'atlas-history.jsonl')

interface AtlasArgs {
  targets: string[]
  json: boolean
  save: boolean
  trend: boolean
  help: boolean
}

function currentRef(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'nogit'
  }
}

export async function runSpwAtlasCli(argv: string[] = process.argv): Promise<void> {
  const rest = argv.slice(2)
  const args = parseAtlasArgs(rest[0] === 'atlas' ? rest.slice(1) : rest)

  if (args.help) {
    printAtlasHelp()
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()

  if (args.trend) {
    await showTrend(workspace)
    return
  }

  const inputs = await collectInputs(args.targets, workspace)
  const snapshot = crawlWorkspace(inputs, { at: new Date().toISOString(), ref: currentRef() })

  if (args.save) {
    await saveSnapshot(snapshot, workspace)
    console.log(`spw atlas: saved snapshot ${snapshot.ref} (${snapshot.surfaces} surfaces, ${snapshot.anchors} anchors)`)
    return
  }

  if (args.json) {
    console.log(JSON.stringify(snapshot, null, 2))
    return
  }

  printSummary(snapshot)
}

async function collectInputs(targets: string[], workspace: SpwWorkspace | null): Promise<CrawlInput[]> {
  const roots = targets.length > 0 ? targets : ['.']
  const base = workspace?.consumerRoot ?? process.cwd()
  const seen = new Set<string>()
  const inputs: CrawlInput[] = []

  for (const root of roots) {
    const resolved = workspace ? await resolveWorkspacePath(workspace, root) : path.resolve(root)
    for (const file of await collectSpwFiles(resolved)) {
      const rel = path.relative(base, file)
      // The archive and init templates are noise in a map of the live workspace.
      if (rel.includes('_archive/') || rel.includes('templates/init/') || seen.has(rel)) continue
      seen.add(rel)
      inputs.push({ path: rel, source: await fs.readFile(file, 'utf8') })
    }
  }
  return inputs.sort((a, b) => a.path.localeCompare(b.path))
}

async function saveSnapshot(snapshot: WorkspaceSnapshot, workspace: SpwWorkspace | null): Promise<void> {
  const base = workspace?.consumerRoot ?? process.cwd()
  const historyPath = path.join(base, HISTORY_REL)
  await fs.mkdir(path.dirname(historyPath), { recursive: true })
  // One JSON line per snapshot — appendable, greppable, diffable.
  const line = JSON.stringify(trendRecord(snapshot))
  await fs.appendFile(historyPath, line + '\n', 'utf8')
}

/** The compact per-snapshot record kept in history — the properties worth trending. */
function trendRecord(s: WorkspaceSnapshot) {
  return {
    at: s.at,
    ref: s.ref,
    surfaces: s.surfaces,
    anchors: s.anchors,
    edges: s.edges,
    fragRefs: s.fragRefs,
    danglingRefs: s.danglingRefs,
    orphanCount: s.orphanCount,
    regions: s.regions.map((r) => ({ region: r.region, files: r.files, aspectShare: Number(r.aspectShare.toFixed(3)) })),
  }
}

type TrendRecord = ReturnType<typeof trendRecord>

async function showTrend(workspace: SpwWorkspace | null): Promise<void> {
  const base = workspace?.consumerRoot ?? process.cwd()
  const historyPath = path.join(base, HISTORY_REL)
  let raw: string
  try {
    raw = await fs.readFile(historyPath, 'utf8')
  } catch {
    console.error(`spw atlas: no history yet — run \`spw atlas --save\` to record the first snapshot (${HISTORY_REL})`)
    process.exitCode = 1
    return
  }

  const records = raw.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as TrendRecord)
  if (records.length === 0) {
    console.error('spw atlas: history is empty')
    process.exitCode = 1
    return
  }

  console.log(`spw atlas trend — ${records.length} snapshot${records.length === 1 ? '' : 's'}\n`)
  const cols: Array<[string, (r: TrendRecord) => number]> = [
    ['surfaces', (r) => r.surfaces],
    ['anchors', (r) => r.anchors],
    ['edges', (r) => r.edges],
    ['orphans', (r) => r.orphanCount],
    ['dangling', (r) => r.danglingRefs],
  ]
  const header = ['snapshot'.padEnd(20), ...cols.map(([n]) => n.padStart(10))].join(' ')
  console.log(header)
  console.log('─'.repeat(header.length))
  records.forEach((r, i) => {
    const prev = records[i - 1]
    const stamp = `${r.ref} ${r.at.slice(5, 10)}`.padEnd(20)
    const cells = cols.map(([, get]) => {
      const v = get(r)
      const delta = prev ? v - get(prev) : 0
      const arrow = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : ''
      return `${String(v).padStart(6)}${arrow.padStart(4)}`
    })
    console.log([stamp, ...cells].join(' '))
  })
}

function bar(share: number, width = 18): string {
  const filled = Math.round(share * width)
  return '█'.repeat(filled) + '·'.repeat(width - filled)
}

function printSummary(s: WorkspaceSnapshot): void {
  console.log(`spw atlas — ${s.surfaces} surfaces · ${s.anchors} anchors · ${s.edges} edges · ref ${s.ref}\n`)

  console.log('dialect by region  (aspect share → volatility)')
  for (const r of s.regions) {
    const label = `${r.region}`.padEnd(12)
    const vol = r.volatility.padEnd(8)
    console.log(`  ${label} ${bar(r.aspectShare)} ${String(Math.round(r.aspectShare * 100)).padStart(3)}%  ${vol} ${r.files} files`)
  }

  console.log('\nload-bearing (top hubs)')
  for (const h of s.hubs.slice(0, 6)) {
    console.log(`  ${String(h.inbound).padStart(3)} ←  ${h.path}`)
  }

  console.log(`\nadrift: ${s.orphanCount} surfaces nothing points at`)
  const orphanIndexes = s.orphans.filter((o) => o.endsWith('/index.spw') || o === 'index.spw')
  if (orphanIndexes.length > 0) {
    console.log(`  ${orphanIndexes.length} of them are index.spw — entry points nothing links to:`)
    for (const o of orphanIndexes.slice(0, 5)) console.log(`    ${o}`)
  }

  console.log(`\nanchor namespace: ${s.anchors} named, ${s.fragRefs} deep-links used, ${s.danglingRefs} dangling`)
  for (const g of s.namespace.slice(0, 4)) {
    console.log(`  ${g.group.padEnd(10)} ${String(g.count).padStart(4)}`)
  }
  if (s.dangling.length > 0) {
    console.log('  dangling deep-links:')
    for (const d of s.dangling.slice(0, 5)) console.log(`    ${d.from} → #${d.fragment}`)
  }
}

function parseAtlasArgs(rest: string[]): AtlasArgs {
  const args: AtlasArgs = { targets: [], json: false, save: false, trend: false, help: false }
  for (const arg of rest) {
    if (arg === '--help' || arg === '-h') args.help = true
    else if (arg === '--json') args.json = true
    else if (arg === '--save') args.save = true
    else if (arg === '--trend') args.trend = true
    else if (!arg.startsWith('-')) args.targets.push(arg)
  }
  return args
}

export function printAtlasHelp(): void {
  console.log(`spw atlas — measure a workspace's material properties, and watch them develop

Usage:
  spw atlas [roots...]        summary: dialect by region, hubs, adrift, namespace
  spw atlas --json            emit the full snapshot as JSON
  spw atlas --save            append a snapshot to ${HISTORY_REL}
  spw atlas --trend           show how the measured properties changed across saved snapshots

The crawl measures each region's dialect (aspect share → volatility), the
surface reference graph (hubs and adrift surfaces), and the anchor namespace
(families, deep-links, dangling). Saving snapshots over time — by hand, or from
a hook — turns the map into a record of how the graph and tree develop.

Flags:
  -h, --help   this help`)
}

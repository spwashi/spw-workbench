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
import { tokenize, type ParticleMix, type Token } from '@spwashi/spw-seed'
import { collectSpwFiles } from './fs-walk'
import { renderAtlasHtml } from './atlas-html'
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
/** An anchor name that lives in more than one surface — an ambiguous `#anchor`. */
export interface AmbiguousAnchor { name: string; files: string[] }

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
  /** Anchor names that appear in more than one surface — ambiguous deep-link targets. */
  ambiguousAnchors: AmbiguousAnchor[]
  /** Every surface path, sorted — the roster a diff compares for add/remove. */
  paths: string[]
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
 * Drain the lexer to its token list. The atlas reads a surface at the token
 * level — particles and path refs are both visible there — which parses ~20×
 * faster than building the tree it does not need.
 */
function lex(source: string): Token[] {
  try {
    const gen = tokenize(source)
    let result = gen.next()
    while (!result.done) result = gen.next()
    return result.value ?? []
  } catch {
    return []
  }
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

  const ASPECT_MARK = /~#[A-Za-z_]/g
  for (const input of inputs) {
    const tokens = lex(input.source)

    const region = regionOf(input.path)
    const bucket = regions.get(region) ?? { deixis: 0, case: 0, mood: 0, aspect: 0, files: 0 }
    const anchors = new Set<string>()
    const baseDir = path.dirname(input.path)

    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i]!
      if (tok.type === 'PARTICLE') {
        // `#>name` / `#:name` / `#!name`; kind is the aim, value the whole mark.
        if (tok.kind === '>') { bucket.deixis += 1; anchors.add(tok.value.slice(2)) }
        else if (tok.kind === ':') bucket.case += 1
        else if (tok.kind === '!') bucket.mood += 1
        continue
      }
      // A quoted path ref lexes as `~` then a STRING; `~#aspect` is its own
      // ANNOTATION token and never trips this.
      if (tok.type === 'OPERATOR' && tok.kind === '~' && tokens[i + 1]?.type === 'STRING') {
        const { file, fragment } = splitTarget(tokens[i + 1]!.value)
        if (!file || file.startsWith('@')) continue
        const resolved = path.normalize(path.join(baseDir, file.replace(/^\.\//, '')))
        const target = known.has(resolved)
          ? resolved
          : inputs.find((f) => f.path.endsWith(`/${path.basename(resolved)}`))?.path ?? null
        if (target && target !== input.path) inbound.get(target)!.add(input.path)
        if (fragment) fragTargets.push({ from: input.path, file: resolved, fragment })
      }
    }

    bucket.aspect += (input.source.match(ASPECT_MARK) ?? []).length
    bucket.files += 1
    regions.set(region, bucket)

    anchorsInFile.set(input.path, anchors)
    for (const anchor of anchors) {
      ;(anchorHome.get(anchor) ?? anchorHome.set(anchor, []).get(anchor)!).push(input.path)
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

  // The same anchor name in two surfaces makes `~"file#name"` ambiguous when a
  // reader drops the file — worth flagging, but init-template copies share
  // names by design, so those are already filtered out of the crawl.
  const ambiguousAnchors: AmbiguousAnchor[] = [...anchorHome.entries()]
    .filter(([, homes]) => new Set(homes).size > 1)
    .map(([name, homes]) => ({ name, files: [...new Set(homes)].sort() }))
    .sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name))

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
    ambiguousAnchors,
    paths: inputs.map((i) => i.path).sort(),
  }
}

// ── Reading a git revision ──────────────────────────────────────

/**
 * Whether a surface is scaffolding rather than a workspace's own content: the
 * archive, init-template files, and — the one that matters for a mounting
 * consumer — the workbench itself, mounted at `.spw/_workbench`. A consumer
 * runs these tools to measure their surfaces, not the machinery they mounted.
 */
export function isScaffolding(rel: string): boolean {
  return rel.includes('_archive/') || rel.includes('templates/init/') || rel.includes('_workbench/')
}
const SKIP = isScaffolding

/**
 * Read every `.spw` surface as it stood at a git revision.
 *
 * The crawl is pure over the files it's given, so a snapshot at any commit is
 * comparable to any other. Blobs are read in one `cat-file --batch` process
 * rather than a `git show` per file — the difference between one subprocess and
 * a few hundred. Paths that share content share a blob, so entries are zipped
 * to the batch output by order, which stays aligned even then.
 */
function crawlAtRef(ref: string, cwd: string): WorkspaceSnapshot {
  // No `*.spw` pathspec: a git glob does not cross `/`, so it would miss every
  // nested surface. List the whole tree and filter by extension in the loop.
  const listing = execSync(`git ls-tree -r ${ref}`, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const entries: Array<{ path: string; sha: string }> = []
  for (const line of listing.split('\n')) {
    // <mode> blob <sha>\t<path>
    const m = line.match(/^\S+ blob (\S+)\t(.+)$/)
    if (!m) continue
    const rel = m[2]!
    if (!rel.endsWith('.spw') || SKIP(rel)) continue
    entries.push({ path: rel, sha: m[1]! })
  }
  if (entries.length === 0) {
    throw new Error(`no .spw surfaces found at ${ref}`)
  }

  const out = execSync('git cat-file --batch', {
    cwd,
    input: entries.map((e) => e.sha).join('\n') + '\n',
    maxBuffer: 256 * 1024 * 1024,
  })

  const inputs: CrawlInput[] = []
  let p = 0
  for (const entry of entries) {
    const nl = out.indexOf(0x0a, p)
    if (nl < 0) break
    // header: <sha> blob <size>
    const header = out.toString('utf8', p, nl)
    const size = Number(header.split(' ')[2] ?? '0')
    const start = nl + 1
    inputs.push({ path: entry.path, source: out.toString('utf8', start, start + size) })
    p = start + size + 1 // skip content and its trailing newline
  }

  const at = execSync(`git show -s --format=%cI ${ref}`, { cwd, encoding: 'utf8' }).trim()
  const shortRef = execSync(`git rev-parse --short ${ref}`, { cwd, encoding: 'utf8' }).trim()
  return crawlWorkspace(inputs.sort((a, b) => a.path.localeCompare(b.path)), { at, ref: shortRef })
}

// ── CLI ─────────────────────────────────────────────────────────

const HISTORY_REL = path.join('.spw', 'gen', 'atlas-history.jsonl')

interface AtlasArgs {
  targets: string[]
  json: boolean
  save: boolean
  trend: boolean
  advice: boolean
  help: boolean
  /** Diff mode: crawl `from` (and `to`, default working tree) and show deltas. */
  from: string | null
  to: string | null
  /** HTML mode: write the visual atlas to this path (empty string = default). */
  html: string | null
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
  const base = workspace?.consumerRoot ?? process.cwd()

  if (args.trend) {
    await showTrend(workspace)
    return
  }

  if (args.from !== null) {
    await diffRevisions(args.from, args.to, args.targets, workspace, base)
    return
  }

  const inputs = await collectInputs(args.targets, workspace)
  const snapshot = crawlWorkspace(inputs, { at: new Date().toISOString(), ref: currentRef() })

  if (args.advice) {
    printAdvice(snapshot)
    return
  }

  if (args.html !== null) {
    const target = args.html || path.join(base, '.spw', 'gen', 'atlas.html')
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, renderAtlasHtml(snapshot), 'utf8')
    console.log(`spw atlas: wrote ${path.relative(base, target)} (${snapshot.surfaces} surfaces)`)
    return
  }

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
  const base = workspace?.consumerRoot ?? process.cwd()

  // No target: the whole tracked repository, so a working-tree crawl scopes the
  // same way as a git-revision crawl (git ls-tree) and a diff compares like for
  // like. Untracked scratch is not development, so it stays out.
  if (targets.length === 0) return collectTrackedInputs(base)

  const seen = new Set<string>()
  const inputs: CrawlInput[] = []
  for (const root of targets) {
    const resolved = workspace ? await resolveWorkspacePath(workspace, root) : path.resolve(root)
    for (const file of await collectSpwFiles(resolved)) {
      const rel = path.relative(base, file)
      if (SKIP(rel) || seen.has(rel)) continue
      seen.add(rel)
      inputs.push({ path: rel, source: await fs.readFile(file, 'utf8') })
    }
  }
  return inputs.sort((a, b) => a.path.localeCompare(b.path))
}

/** Every tracked `.spw` surface, read from the working tree. */
async function collectTrackedInputs(base: string): Promise<CrawlInput[]> {
  const listing = execSync('git ls-files', { cwd: base, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const inputs: CrawlInput[] = []
  for (const rel of listing.split('\n')) {
    if (!rel.endsWith('.spw') || SKIP(rel)) continue
    try {
      inputs.push({ path: rel, source: await fs.readFile(path.join(base, rel), 'utf8') })
    } catch {
      // listed but gone from disk — skip
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

/**
 * Crawl two revisions and show how the workspace's properties moved between
 * them. `to` defaults to the working tree, so `--from HEAD~20` reads as "what
 * has changed since twenty commits ago".
 */
async function diffRevisions(
  from: string,
  to: string | null,
  targets: string[],
  workspace: SpwWorkspace | null,
  base: string,
): Promise<void> {
  let before: WorkspaceSnapshot
  let after: WorkspaceSnapshot
  try {
    before = crawlAtRef(from, base)
    after = to ? crawlAtRef(to, base) : await crawlWorkingTree(targets, workspace)
  } catch (error) {
    console.error(`spw atlas: ${(error as Error).message}`)
    process.exitCode = 1
    return
  }

  const toLabel = to ?? 'working tree'
  console.log(`spw atlas diff — ${before.ref} → ${after.ref === before.ref ? toLabel : after.ref}\n`)

  const metric = (label: string, a: number, b: number): void => {
    const d = b - a
    const arrow = d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : '  ='
    console.log(`  ${label.padEnd(12)} ${String(a).padStart(5)} → ${String(b).padStart(5)}   ${arrow}`)
  }
  metric('surfaces', before.surfaces, after.surfaces)
  metric('anchors', before.anchors, after.anchors)
  metric('edges', before.edges, after.edges)
  metric('adrift', before.orphanCount, after.orphanCount)
  metric('dangling', before.danglingRefs, after.danglingRefs)

  // Surfaces that came and went.
  const added = diffSets(after.paths, before.paths)
  const removed = diffSets(before.paths, after.paths)
  if (added.length > 0) {
    console.log(`\n  + ${added.length} surface${added.length === 1 ? '' : 's'} added`)
    for (const p of added.slice(0, 8)) console.log(`      ${p}`)
  }
  if (removed.length > 0) {
    console.log(`\n  − ${removed.length} surface${removed.length === 1 ? '' : 's'} removed`)
    for (const p of removed.slice(0, 8)) console.log(`      ${p}`)
  }

  // Regions whose volatility crossed a threshold.
  const beforeVol = new Map(before.regions.map((r) => [r.region, r]))
  const shifts: string[] = []
  for (const r of after.regions) {
    const b = beforeVol.get(r.region)
    if (b && b.volatility !== r.volatility) {
      shifts.push(`      ${r.region}: ${b.volatility} → ${r.volatility}  (${Math.round(b.aspectShare * 100)}% → ${Math.round(r.aspectShare * 100)}% aspect)`)
    }
  }
  if (shifts.length > 0) {
    console.log(`\n  ~ region volatility shifts`)
    shifts.forEach((s) => console.log(s))
  }

  // Newly-broken and newly-fixed deep links.
  const key = (d: DanglingRef): string => `${d.from}#${d.fragment}`
  const beforeDang = new Set(before.dangling.map(key))
  const afterDang = new Set(after.dangling.map(key))
  const newlyBroken = after.dangling.filter((d) => !beforeDang.has(key(d)))
  const newlyFixed = before.dangling.filter((d) => !afterDang.has(key(d)))
  if (newlyBroken.length > 0) {
    console.log(`\n  ! ${newlyBroken.length} deep-link${newlyBroken.length === 1 ? '' : 's'} newly dangling`)
    for (const d of newlyBroken.slice(0, 6)) console.log(`      ${d.from} → #${d.fragment}`)
  }
  if (newlyFixed.length > 0) {
    console.log(`\n  ✓ ${newlyFixed.length} deep-link${newlyFixed.length === 1 ? '' : 's'} resolved`)
  }
}

function diffSets(a: string[], b: string[]): string[] {
  const bset = new Set(b)
  return a.filter((x) => !bset.has(x)).sort()
}

async function crawlWorkingTree(targets: string[], workspace: SpwWorkspace | null): Promise<WorkspaceSnapshot> {
  const inputs = await collectInputs(targets, workspace)
  return crawlWorkspace(inputs, { at: new Date().toISOString(), ref: currentRef() })
}

/**
 * Turn the measured properties into teachable advice.
 *
 * The atlas measures; this reads the measurements as convention adherence and
 * says what to do about the gaps — the layer a mounting consumer learns Spw
 * from. Each finding names the convention, points at where it's unmet, and
 * where a tool can fix it, names the tool.
 */
function printAdvice(s: WorkspaceSnapshot): void {
  const findings: Array<{ head: string; why: string; items: string[]; fix?: string }> = []

  const orphanIndexes = s.orphans.filter((o) => o.endsWith('/index.spw') || o === 'index.spw')
  if (orphanIndexes.length > 0) {
    findings.push({
      head: `${orphanIndexes.length} index surface${orphanIndexes.length === 1 ? '' : 's'} nothing links to`,
      why: 'An index is written to be arrived at. One nothing points at is unreachable by navigation — link it from its parent surface with a ~"…" ref.',
      items: orphanIndexes.slice(0, 8),
    })
  }

  if (s.dangling.length > 0) {
    findings.push({
      head: `${s.dangling.length} deep-link${s.dangling.length === 1 ? '' : 's'} target an anchor that isn't there`,
      why: 'A ~"file#anchor" resolves to a #>anchor inside the target. When the anchor is gone the link dangles — fix the name or add the anchor.',
      items: s.dangling.slice(0, 8).map((d) => `${d.from} → #${d.fragment}`),
    })
  }

  if (s.ambiguousAnchors.length > 0) {
    findings.push({
      head: `${s.ambiguousAnchors.length} anchor name${s.ambiguousAnchors.length === 1 ? '' : 's'} live in more than one surface`,
      why: 'Anchor names are the workspace\'s addresses. When two surfaces share one, ~"…#name" is ambiguous and reverse lookups collide — give each a distinct name.',
      items: s.ambiguousAnchors.slice(0, 8).map((a) => `${a.name} — in ${a.files.length}: ${a.files.slice(0, 3).map((f) => f.split('/').pop()).join(', ')}${a.files.length > 3 ? ', …' : ''}`),
      fix: 'spw refactor anchor:<name>=<new-name>',
    })
  }

  console.log(`spw atlas advice — ${s.surfaces} surfaces measured, ref ${s.ref}\n`)
  if (findings.length === 0) {
    console.log('  nothing to flag: no orphan indexes, no dangling links, no ambiguous anchors.')
    return
  }
  findings.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.head}`)
    console.log(`     ${f.why}`)
    for (const item of f.items) console.log(`       · ${item}`)
    if (f.fix) console.log(`     fix: ${f.fix}`)
    console.log('')
  })
}

function parseAtlasArgs(rest: string[]): AtlasArgs {
  const args: AtlasArgs = { targets: [], json: false, save: false, trend: false, advice: false, help: false, from: null, to: null, html: null }
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i]!
    if (arg === '--help' || arg === '-h') args.help = true
    else if (arg === '--json') args.json = true
    else if (arg === '--save') args.save = true
    else if (arg === '--trend') args.trend = true
    else if (arg === '--advice') args.advice = true
    else if (arg === '--from') args.from = rest[++i] ?? null
    else if (arg.startsWith('--from=')) args.from = arg.slice('--from='.length)
    else if (arg === '--to') args.to = rest[++i] ?? null
    else if (arg.startsWith('--to=')) args.to = arg.slice('--to='.length)
    else if (arg === '--html') { const n = rest[i + 1]; args.html = n && !n.startsWith('-') ? (i++, n) : '' }
    else if (arg.startsWith('--html=')) args.html = arg.slice('--html='.length)
    else if (!arg.startsWith('-')) args.targets.push(arg)
  }
  return args
}

export function printAtlasHelp(): void {
  console.log(`spw atlas — measure a workspace's material properties, and watch them develop

Usage:
  spw atlas [roots...]        summary: dialect by region, hubs, adrift, namespace
  spw atlas --json            emit the full snapshot as JSON
  spw atlas --advice          convention findings: orphan indexes, dangling links, ambiguous anchors
  spw atlas --html [path]     write the visual atlas (default ${path.join('.spw', 'gen', 'atlas.html')})
  spw atlas --save            append a snapshot to ${HISTORY_REL}
  spw atlas --trend           show how the measured properties changed across saved snapshots
  spw atlas --from <ref>      diff a revision against the working tree
  spw atlas --from A --to B   diff two revisions — surfaces, edges, volatility shifts, dangling

The crawl measures each region's dialect (aspect share → volatility), the
surface reference graph (hubs and adrift surfaces), and the anchor namespace
(families, deep-links, dangling). Saving snapshots over time — by hand, or from
a hook — turns the map into a record of how the graph and tree develop.

Flags:
  -h, --help   this help`)
}

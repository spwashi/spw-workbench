/**
 * plan-index — derive the flat plan index from each plan's card.
 *
 * Every plan's wip.spw opens with a card: a frame whose operator is the plan's
 * lane glyph (`![card]` execution, `?[card]` research, `@[card]` projection …)
 * and whose bindings are the few facts a reader or tool needs first — phase,
 * gist, touched code regions, entry file, next move. This script reads those
 * cards with the seed parser and projects them into `.agents/plans/index.spw`:
 * one flat routing table over a nested directory.
 *
 * Only derived frames (one per phase, plus touches, kin, drift) are rewritten;
 * authored frames above them (legend, doors) are preserved. The card is the
 * source; the index is its cache.
 *
 * @see .agents/plans/_schema/wip.spw — CARD, EDGES, PHASES, LANES
 * @see .agents/plans/index.spw — the projection this writes
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { lex, parse, significantTokens } from '@spwashi/spw-seed'

const REPO = path.resolve(import.meta.dirname, '../..')
const PLANS_DIR = '.agents/plans'
const INDEX_PATH = `${PLANS_DIR}/index.spw`

const PHASES = ['active', 'review', 'landed', 'planning', 'seed', 'dormant', 'stranded', 'done'] as const
/** Phases a wanderer may reheat: valid, unfinished, not currently moving. */
const RESTING = new Set(['planning', 'seed', 'dormant', 'landed'])
/** Lane glyphs in reading order; mirrors plan-ecology-clustering ^"cluster_operator_map". */
const LANES = new Map([
  ['!', 'execution_truth'],
  ['@', 'projection_feedback'],
  ['?', 'public_interest_research'],
  ['~', 'curriculum_formation'],
  ['^', 'principal_engineering'],
  ['.', 'rewrite_recovery'],
])
const EDGE_KINDS = ['needs', 'feeds', 'shares', 'supersedes'] as const
const GENERATED = new Set<string>([...PHASES, 'touches', 'kin', 'drift'])
/** Cooling: an active/review plan whose stream trails the ecology's newest entry by this many days. */
const COOLING_DAYS = 30
const KIN_PER_PLAN = 3
/** A plan naming more siblings than this is a hub; its mentions are doctrine, not kinship. */
const HUB_MENTIONS = 12
/** A plan named by more than this share of siblings is a reference point (the ecology map), not kin. */
const HUB_CITED_SHARE = 0.2
/** Lifecycle order for comparing a free-form ~#status against card.phase. */
const LIFECYCLE = ['seed', 'planning', 'active', 'review', 'landed', 'done']
const STATUS_WORDS: Array<[RegExp, string]> = [
  [/^(done|complete|implemented)/, 'done'],
  [/landed/, 'landed'],
  [/(review|verif|ready_for)/, 'review'],
  [/(active|implement|execution|follow)/, 'active'],
  [/(planning|pre-flight)/, 'planning'],
]
const ECOLOGY = `${PLANS_DIR}/plan-ecology-clustering/plan-ecology-clustering.spw`
/** Stream entry heads, timed or date-only, quoted or bare — mirrors seed latestTimestamp. */
const STAMP = />>\[\s*"?(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?)/g

interface Card {
  slug: string
  id: string
  glyph: string
  phase: string
  gist: string
  touches: string[]
  /** Paths the plan will create; findable by --touch and kin, promoted to touches once they exist. */
  willTouch: string[]
  entry: string | null
  next: string | null
  edges: Record<string, string[]>
  lastStream: string | null
  open: string[]
  /** The cache's free-form ~#status, kept for comparison with phase. */
  status: string | null
  /** Sibling slugs named anywhere in PLAN.md or wip.spw. */
  mentions: string[]
  text: string
  problems: string[]
}

type Node = { type?: string; [key: string]: unknown }
interface Region { operator: string; label: string; start: number; end: number }

// ── Locating frames ─────────────────────────────────────────────

/**
 * Top-level `<op>["label"]{}` / `<op>"label"{}` / `<op>label{}` frames, found
 * from tokens. Lexing a plan is ~20× cheaper than parsing it, and the plan
 * dialect keeps stream entries (with their stray braces) inside one TEXT
 * token — so brace matching over tokens is exact where a character scan is not.
 */
function frameRegions(source: string): Region[] {
  const sig = significantTokens(lex(source, { planStream: true }).tokens)
  const regions: Region[] = []
  let depth = 0
  for (let i = 0; i < sig.length; i += 1) {
    const tok = sig[i]!
    if (tok.type === 'CONTAINER_OPEN') { depth += 1; continue }
    if (tok.type === 'CONTAINER_CLOSE') { depth -= 1; continue }
    if (depth !== 0 || tok.type !== 'OPERATOR') continue

    let j = i + 1
    const bracketed = sig[j]?.type === 'CONTAINER_OPEN' && sig[j]?.kind === '['
    if (bracketed) j += 1
    const name = sig[j]
    if (!name || (name.type !== 'STRING' && name.type !== 'IDENTIFIER')) continue
    j += 1
    if (bracketed) {
      if (sig[j]?.type !== 'CONTAINER_CLOSE') continue
      j += 1
    }
    if (!(sig[j]?.type === 'CONTAINER_OPEN' && sig[j]?.kind === '{')) continue

    let inner = 0
    for (let k = j; k < sig.length; k += 1) {
      const t = sig[k]!
      if (t.type === 'CONTAINER_OPEN') inner += 1
      else if (t.type === 'CONTAINER_CLOSE' && --inner === 0) {
        regions.push({ operator: String(tok.kind ?? tok.value), label: unquote(name.value), start: tok.span.start.offset, end: t.span.end.offset })
        i = k
        break
      }
    }
  }
  return regions
}

// ── Reading cards ───────────────────────────────────────────────

const unquote = (raw: string): string => raw.replace(/^["'`]|["'`]$/g, '').replace(/\\"/g, '"')
const tokenText = (node: unknown): string | null =>
  (node as { token?: { value?: string } } | undefined)?.token?.value ?? null
const slugId = (slug: string): string => slug.replace(/-/g, '_')

/** Flatten one binding value into strings: tags, literals, and path refs alike. */
function values(node: unknown): string[] {
  if (!node || typeof node !== 'object') return []
  const n = node as Node
  switch (n.type) {
    case 'Expression': return (n.terms as unknown[] ?? []).flatMap(values)
    case 'Parameter': return values(n.value)
    case 'Frame': return (n.content as unknown[] ?? []).flatMap(values)
    case 'PathRef': return values(n.path)
    case 'Literal': return [unquote(tokenText(n) ?? '')]
    case 'Reference': return [String(n.raw ?? '')]
    case 'Operation': {
      const label = (n.operatorLabel as { value?: string } | undefined)?.value
      return label ? [label] : []
    }
    default: return []
  }
}

/** Parse one frame's source slice and read its bindings as flattened values. */
function frameBindings(slice: string, rel: string): { map: Map<string, string[]>; errors: number } {
  const result = parse(slice, { path: rel })
  const root = (result.ast as unknown as Node).expression as Node | undefined
  const exprs = (root?.type === 'Sequence' ? root.expressions : [root]) as Node[]
  const map = new Map<string, string[]>()
  const operation = exprs.flatMap(e => (e?.terms ?? []) as Node[]).find(t => t.type === 'Operation' && t.body)
  const body = (operation?.body as Node | undefined)?.sequence as Node | undefined
  for (const expr of (body?.expressions ?? []) as Node[]) {
    for (const term of (expr.terms ?? []) as Node[]) {
      if (term.type !== 'Binding') continue
      const key = tokenText(term.key) ?? String((term.key as Node).raw ?? '')
      if (key) map.set(key, values(term.value))
    }
  }
  return { map, errors: result.errors.length }
}

const normalizeRegion = (p: string): string => p.replace(/^\.\//, '').replace(/\/+$/, '')

/** Resolve an edge ref (`../<slug>/wip.spw`) to a plan slug, or null when it is not a plan. */
function edgeSlug(planDir: string, ref: string): string | null {
  const rel = path.relative(path.join(REPO, PLANS_DIR), path.resolve(planDir, ref)).split(path.sep)
  if (rel[0] === '..' || rel.length < 2) return null
  return rel[0] === '_archive' ? `_archive/${rel[1]}` : rel[0]!
}

async function readCard(slug: string): Promise<Card> {
  const dir = path.join(REPO, PLANS_DIR, slug)
  const rel = `${PLANS_DIR}/${slug}/wip.spw`
  const card: Card = {
    slug, id: slugId(slug), glyph: '', phase: '', gist: '', touches: [], willTouch: [], entry: null, next: null,
    edges: {}, lastStream: null, open: [], status: null, mentions: [], text: '', problems: [],
  }
  if (!existsSync(path.join(dir, 'wip.spw'))) {
    card.problems.push('missing wip.spw')
    return card
  }
  const source = await fs.readFile(path.join(dir, 'wip.spw'), 'utf8')
  const frames = frameRegions(source)
  const region = (f: Region | undefined): string => (f ? source.slice(f.start, f.end) : '')
  const planMd = path.join(dir, 'PLAN.md')
  card.text = source + (existsSync(planMd) ? await fs.readFile(planMd, 'utf8') : '')
  card.status = region(frames.find(f => f.label === 'cache')).match(/~#status:\s*"([^"]*)"/)?.[1] ?? null

  const stamps = [...region(frames.find(f => f.label === 'stream')).matchAll(STAMP)].map(m => m[1]!.replace('T', ' '))
  card.lastStream = stamps.sort().at(-1) ?? null
  for (const m of region(frames.find(f => f.label === 'open')).matchAll(/^[ \t]*\?\[([^\]]+)\]:\s*"(.*)"\s*$/gm)) {
    card.open.push(`?[${m[1]}]: ${m[2]}`)
  }
  if (!new RegExp(`#>plan_${card.id}\\b`).test(source)) card.problems.push(`missing anchor #>plan_${card.id}`)

  const cardFrame = frames.find(f => f.label === 'card')
  if (!cardFrame) {
    card.problems.push('missing card')
    return card
  }
  const { map: b, errors } = frameBindings(region(cardFrame), rel)
  if (errors > 0) card.problems.push(`card parse: ${errors} error(s)`)
  card.glyph = cardFrame.operator
  card.phase = b.get('phase')?.[0] ?? ''
  card.gist = b.get('gist')?.[0] ?? ''
  card.touches = (b.get('touches') ?? []).map(normalizeRegion)
  card.willTouch = (b.get('will_touch') ?? []).map(normalizeRegion)
  card.entry = b.get('entry')?.[0] ?? null
  card.next = b.get('next')?.[0] ?? null

  if (!LANES.has(card.glyph)) card.problems.push(`unknown lane glyph ${card.glyph}`)
  if (!(PHASES as readonly string[]).includes(card.phase)) card.problems.push(`unknown phase #${card.phase}`)
  if (!card.gist) card.problems.push('empty gist')
  if (card.touches.length === 0) card.problems.push('no touches')
  for (const t of card.touches) if (!existsSync(path.join(REPO, t))) card.problems.push(`missing touch ${t}`)
  for (const t of card.willTouch) if (existsSync(path.join(REPO, t))) card.problems.push(`will_touch ${t} now exists — move it to touches`)
  if (card.entry && !existsSync(path.resolve(dir, card.entry.split('#')[0]!))) card.problems.push(`missing entry ${card.entry}`)

  const edgeFrame = frames.find(f => f.label === 'edges')
  if (edgeFrame) {
    const e = frameBindings(region(edgeFrame), rel).map
    for (const kind of EDGE_KINDS) {
      const slugs: string[] = []
      for (const ref of e.get(kind) ?? []) {
        const target = edgeSlug(dir, ref.split('#')[0]!)
        if (!target || !existsSync(path.resolve(dir, ref.split('#')[0]!))) card.problems.push(`unresolved ${kind} edge ${ref}`)
        else slugs.push(target)
      }
      if (slugs.length > 0) card.edges[kind] = slugs
    }
  }
  return card
}

async function readCards(): Promise<Card[]> {
  const entries = await fs.readdir(path.join(REPO, PLANS_DIR), { withFileTypes: true })
  const slugs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .filter(e => existsSync(path.join(REPO, PLANS_DIR, e.name, 'wip.spw')) || existsSync(path.join(REPO, PLANS_DIR, e.name, 'PLAN.md')))
    .map(e => e.name)
    .sort()
  const cards = await Promise.all(slugs.map(readCard))
  for (const c of cards) {
    c.mentions = slugs.filter(s => s !== c.slug && new RegExp(`(?<![\\w-])${s}(?![\\w-])`).test(c.text))
  }
  return cards
}

// ── Derived relations ───────────────────────────────────────────

/** Everything a card claims in code: what it touches now and what it will create. */
const reach = (c: Card): string[] => [...c.touches, ...c.willTouch]
const within = (a: string, b: string): boolean => a === b || a.startsWith(`${b}/`)
const overlaps = (a: string, b: string): boolean => within(a, b) || within(b, a)
const depth = (p: string): number => p.split('/').length

/** The package-sized region a touch belongs to: its first two segments. */
const regionOf = (p: string): string => p.split('/').slice(0, 2).join('/')

function daysBetween(a: string, b: string): number {
  return Math.floor((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000)
}

/**
 * Plans related in fact but not on paper: overlapping touches, or one naming the
 * other, with no declared edge either way. A prompt to compare, not a claim.
 */
function kinOf(cards: Card[]): Map<string, Array<{ id: string; at: string }>> {
  const declared = (a: Card, b: Card): boolean =>
    Object.values(a.edges).some(list => list.includes(b.slug)) || Object.values(b.edges).some(list => list.includes(a.slug))
  const live = cards.filter(c => c.phase && c.phase !== 'done' && c.phase !== 'stranded')
  const cited = (b: Card): number => cards.filter(c => c.mentions.includes(b.slug)).length
  const reference = new Set(cards.filter(b => cited(b) > cards.length * HUB_CITED_SHARE).map(b => b.slug))
  const names = (a: Card, b: Card): boolean =>
    a.mentions.length <= HUB_MENTIONS && !reference.has(b.slug) && a.mentions.includes(b.slug)
  const kin = new Map<string, Array<{ id: string; at: string }>>()
  for (const a of live) {
    const found: Array<{ id: string; at: string; score: number }> = []
    for (const b of live) {
      if (a === b || declared(a, b)) continue
      let shared = ''
      for (const ta of reach(a)) for (const tb of reach(b)) {
        if (!overlaps(ta, tb)) continue
        const region = ta.length <= tb.length ? ta : tb
        if (depth(region) >= 2 && (!shared || depth(region) > depth(shared))) shared = region
      }
      const mentioned = names(a, b) || names(b, a)
      const score = (shared ? depth(shared) : 0) + (mentioned ? 3 : 0)
      if (score > 0) found.push({ id: b.id, at: shared || 'mentioned', score })
    }
    found.sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
    if (found.length > 0) kin.set(a.id, found.slice(0, KIN_PER_PLAN))
  }
  return kin
}

/** A cache ~#status whose lifecycle stage trails the card's phase — the cache stopped moving. */
function statusLags(c: Card): boolean {
  const word = c.status?.toLowerCase() ?? ''
  const mapped = STATUS_WORDS.find(([re]) => re.test(word))?.[1]
  return Boolean(mapped) && LIFECYCLE.indexOf(mapped!) >= 0 && LIFECYCLE.indexOf(c.phase) > LIFECYCLE.indexOf(mapped!)
}

/** Glyph each plan holds in the ecology's ^"plan_map", keyed by plan id. */
async function planMapGlyphs(): Promise<Map<string, string>> {
  const file = path.join(REPO, ECOLOGY)
  const glyphs = new Map<string, string>()
  if (!existsSync(file)) return glyphs
  const source = await fs.readFile(file, 'utf8')
  const map = frameRegions(source).find(f => f.label === 'plan_map')
  let glyph = ''
  for (const line of (map ? source.slice(map.start, map.end) : '').split('\n')) {
    const group = line.match(/^ '(.)': \{/)
    if (group) glyph = group[1]!
    const row = line.match(/^  ([a-z0-9_]+): \.\{/)
    if (row && glyph) glyphs.set(row[1]!, glyph)
  }
  return glyphs
}

function cooling(cards: Card[]): Card[] {
  const newest = cards.map(c => c.lastStream ?? '').sort().at(-1)
  if (!newest) return []
  return cards.filter(c => (c.phase === 'active' || c.phase === 'review')
    && (!c.lastStream || daysBetween(c.lastStream, newest) > COOLING_DAYS))
}

// ── Rendering ───────────────────────────────────────────────────

const quote = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

function renderGenerated(cards: Card[], mapGlyphs: Map<string, string>): string {
  const carded = cards.filter(c => c.glyph && c.phase)
  const out: string[] = []
  for (const phase of PHASES) {
    const rows = carded.filter(c => c.phase === phase)
    if (rows.length === 0) continue
    out.push(`^["${phase}"]{`)
    for (const glyph of LANES.keys()) {
      const lane = rows.filter(c => c.glyph === glyph)
      if (lane.length === 0) continue
      out.push(` '${glyph}': {`)
      for (const c of lane) out.push(`  @${c.id}: ~"./${c.slug}/wip.spw" ${quote(c.gist)}`)
      out.push(' }')
    }
    out.push('}', '')
  }

  const regions = new Map<string, Set<string>>()
  for (const c of carded) for (const t of reach(c)) {
    const r = regionOf(t)
    if (!regions.has(r)) regions.set(r, new Set())
    regions.get(r)!.add(c.id)
  }
  out.push('^["touches"]{')
  out.push(' // package-sized regions → plans; `npm run spw:plan:index -- --touch <path>` answers finer paths')
  for (const r of [...regions.keys()].sort()) out.push(` ~"${r}": [${[...regions.get(r)!].sort().map(id => `@${id}`).join(', ')}]`)
  out.push('}', '')

  out.push('^["kin"]{')
  out.push(' // computed: live plans that overlap in code or name each other, with no declared edge — a prompt to compare, not a claim')
  for (const [id, list] of [...kinOf(carded)].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(` ${id}: [${list.map(k => `@${k.id}`).join(', ')}]`)
  }
  out.push('}', '')

  const missing = cards.filter(c => c.problems.includes('missing card')).map(c => quote(c.slug))
  const broken = cards.filter(c => !c.problems.includes('missing card') && c.problems.length > 0)
    .flatMap(c => c.problems.map(p => quote(`${c.slug}: ${p}`)))
  const cold = cooling(carded).map(c => `@${c.id}`)
  const lagging = carded.filter(statusLags).map(c => `@${c.id}`)
  const offMap = carded.filter(c => mapGlyphs.has(c.id) && mapGlyphs.get(c.id) !== c.glyph)
    .map(c => quote(`${c.slug}: card ${c.glyph} · plan_map ${mapGlyphs.get(c.id)}`))
  out.push('^["drift"]{')
  if (missing.length + broken.length === 0) out.push(' ok: "every card parses; every touch, entry, and edge resolves"')
  if (missing.length > 0) out.push(` missing_card: [${missing.join(', ')}]`)
  if (broken.length > 0) out.push(` problems: [\n  ${broken.join(',\n  ')},\n ]`)
  out.push(' // advisories below never fail --check; they name where attention has drifted')
  if (cold.length > 0) out.push(` cooling: [${cold.join(', ')}] // active or review, stream ${COOLING_DAYS}+ days behind the ecology's newest entry`)
  if (lagging.length > 0) out.push(` status_lags_phase: [${lagging.join(', ')}] // cache ~#status names an earlier stage than card.phase`)
  if (offMap.length > 0) out.push(` glyph_vs_plan_map: [${offMap.join(', ')}] // the card is authoritative; update the map or the card`)
  const mapped = carded.filter(c => mapGlyphs.has(c.id)).length
  if (mapGlyphs.size > 0) out.push(` plan_map_coverage: "${mapped} of ${carded.length} cards appear in plan-ecology-clustering ^plan_map"`)
  out.push('}')
  return out.join('\n')
}

const DEFAULT_HEADER = `# Plans — flat index\n#\n# Derived frames below are rewritten by \`npm run spw:plan:index -- --write\`.\n\n#>plans_index\n#:index #!plans\n\n`

/** Replace derived frames in place; authored frames keep their text and position ahead of them. */
function mergeIndex(existing: string | null, generated: string): string {
  if (!existing) return `${DEFAULT_HEADER}${generated}\n`
  const frames = frameRegions(existing)
  const derived = frames.filter(f => GENERATED.has(f.label))
  if (derived.length === 0) return `${existing.trimEnd()}\n\n${generated}\n`
  const first = derived[0]!.start
  const last = derived.at(-1)!.end
  const strays = frames
    .filter(f => !GENERATED.has(f.label) && f.start > first && f.end < last)
    .map(f => existing.slice(f.start, f.end))
  const tail = existing.slice(last).trim()
  return [existing.slice(0, first).trimEnd(), '', generated, ...strays.flatMap(s => ['', s]), ...(tail ? ['', tail] : [])].join('\n') + '\n'
}

// ── Commands ────────────────────────────────────────────────────

function printTable(cards: Card[], newest: string): void {
  for (const phase of PHASES) {
    for (const c of cards.filter(x => x.phase === phase)) {
      const age = c.lastStream ? `${daysBetween(c.lastStream, newest)}d` : '—'
      console.log(`${phase.padEnd(9)} ${c.glyph} ${c.slug.padEnd(34)} ${age.padStart(5)}  ${c.gist}`)
    }
  }
  const uncarded = cards.filter(c => !c.phase)
  if (uncarded.length > 0) console.log(`\nno card: ${uncarded.map(c => c.slug).join(', ')}`)
}

function printCard(c: Card, kin: Array<{ id: string; at: string }> = []): void {
  console.log(`${c.glyph} ${c.slug}  #${c.phase}  ${LANES.get(c.glyph) ?? ''}  last stream ${c.lastStream ?? '—'}`)
  console.log(`  ${c.gist}`)
  if (c.next) console.log(`  next: ${c.next}`)
  console.log(`  entry: ${PLANS_DIR}/${c.slug}/${(c.entry ?? './PLAN.md').replace(/^\.\//, '')}`)
  console.log(`  touches: ${reach(c).join(', ')}`)
  if (c.open.length > 0) console.log(`  open: ${c.open[Math.floor(Math.random() * c.open.length)]}`)
  if (kin.length > 0) console.log(`  kin: ${kin.map(k => `${k.id} (${k.at})`).join(', ')}`)
}

function flag(argv: string[], name: string): string | null {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] ?? null : null
}

async function main(argv: string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log([
      'plan-index — flat projection of plan cards',
      '',
      '  (no flags)           table: phase, lane glyph, slug, stream age, gist',
      '  --write              refresh derived frames in .agents/plans/index.spw',
      '  --check              exit 1 if cards have problems or index.spw is stale',
      '  --touch <path>       plans whose cards touch a path (either containing it or within it)',
      '  --wander             one resting plan, one of its open questions, its kin',
      '  --slug a,b           restrict table/json/problems to these plans',
      '  --phase p  --lane g  filter the table',
      '  --json               cards as JSON',
    ].join('\n'))
    return 0
  }
  let cards = await readCards()
  const newest = cards.map(c => c.lastStream ?? '').sort().at(-1) ?? ''
  const only = flag(argv, '--slug')?.split(',')
  if (only) cards = cards.filter(c => only.includes(c.slug))

  if (argv.includes('--write') || argv.includes('--check')) {
    const indexFile = path.join(REPO, INDEX_PATH)
    const existing = existsSync(indexFile) ? await fs.readFile(indexFile, 'utf8') : null
    const problems = cards.flatMap(c => c.problems.map(p => `${c.slug}: ${p}`))
    if (only) {
      for (const p of problems) console.log(p)
      console.log(problems.length === 0 ? `${cards.length} card(s) ok` : `${problems.length} problem(s)`)
      return problems.length === 0 ? 0 : 1
    }
    const next = mergeIndex(existing, renderGenerated(cards, await planMapGlyphs()))
    if (argv.includes('--write')) {
      if (next !== existing) await fs.writeFile(indexFile, next, 'utf8')
      console.log(`${INDEX_PATH}: ${next === existing ? 'unchanged' : 'written'} (${cards.length} plans, ${problems.length} problem(s))`)
      return 0
    }
    for (const p of problems) console.log(p)
    if (next !== existing) console.log(`${INDEX_PATH} is stale — run npm run spw:plan:index -- --write`)
    return problems.length === 0 && next === existing ? 0 : 1
  }

  if (argv.includes('--json')) {
    console.log(JSON.stringify(cards.map(({ text: _text, ...card }) => card), null, 2))
    return 0
  }

  const touch = flag(argv, '--touch')
  if (touch) {
    const target = normalizeRegion(path.relative(REPO, path.resolve(process.cwd(), touch)))
    for (const c of cards) {
      const hit = reach(c).filter(t => overlaps(t, target)).sort((a, b) => depth(b) - depth(a))[0]
      if (hit) console.log(`${c.glyph} ${c.slug.padEnd(34)} #${c.phase.padEnd(8)} ${hit}  — ${c.gist}`)
    }
    return 0
  }

  if (argv.includes('--wander')) {
    const pool = cards.filter(c => RESTING.has(c.phase))
    const pick = pool.filter(c => c.open.length > 0).length > 0 ? pool.filter(c => c.open.length > 0) : pool
    const c = pick[Math.floor(Math.random() * pick.length)]
    if (!c) return 1
    printCard(c, kinOf(cards).get(c.id))
    return 0
  }

  const phase = flag(argv, '--phase')
  const lane = flag(argv, '--lane')
  printTable(cards.filter(c => (!phase || c.phase === phase) && (!lane || c.glyph === lane || LANES.get(c.glyph) === lane)), newest)
  return 0
}

process.exitCode = await main(process.argv.slice(2))

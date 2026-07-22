/**
 * Abstract composition model — loci, strands, claims, slots, masks.
 *
 * Domain-agnostic building blocks for:
 *   - knowledge-base development (topic surfaces + purpose claims)
 *   - codebase modeling (file loci + path strands + hub roles)
 *   - feature planning (intent claims, open slots, hot loci)
 *
 * Not industry-specific: same algebra for theory packs, agent KB, plans, packages.
 *
 * @see docs/theory/spw/composition-tools.spw
 * @see docs/runtime/md/sense-loop.md
 */

import type { CorpusLink, CorpusFileSignals, HubScore } from './corpus'
import type { FormulaHit } from './formula-scan'

/** A place that can hold material or attention. */
export type LocusKind = 'surface' | 'pack' | 'index' | 'claim' | 'slot'

/** How two loci relate. */
export type StrandKind = 'path' | 'root' | 'claim' | 'slot' | 'affinity' | 'formula'

export type LocusRole = 'hub' | 'orphan' | 'leaf' | 'source' | 'node'

export interface Locus {
  id: string
  kind: LocusKind
  /** Attention weight (lines, degree, or claim count) */
  weight: number
  role?: LocusRole
  tags: string[]
  meta?: Record<string, string | number | boolean>
}

export interface Strand {
  from: string
  to: string
  kind: StrandKind
  strength: number
  label?: string
}

export interface Claim {
  id: string
  locus: string
  text: string
  line?: number
  /** Abstract valence bucket when detectable */
  valence?: 'boon' | 'bane' | 'bone' | 'bonk' | 'honk' | 'neutral'
  pattern?: string
}

export interface Slot {
  id: string
  locus?: string
  text: string
  line?: number
  /** open | filled | deferred */
  status: 'open' | 'filled' | 'deferred'
}

export interface Mask {
  id: string
  description: string
  /** Tag or id include globs (substring match) */
  include: string[]
  exclude: string[]
}

export interface CompositionModel {
  version: 'spw.compose/1'
  /** Optional lens id: kb | code | plan | free */
  lens: string
  loci: Locus[]
  strands: Strand[]
  claims: Claim[]
  slots: Slot[]
  masks: Mask[]
  summary: CompositionSummary
}

export interface CompositionSummary {
  loci: number
  strands: number
  claims: number
  slots: number
  hubs: string[]
  openSlots: number
  density: number
  topTags: Array<{ tag: string; count: number }>
}

export interface ComposeInput {
  /** Relative file paths with signals */
  signals: CorpusFileSignals[]
  links: CorpusLink[]
  hubs?: HubScore[]
  orphans?: string[]
  /** file → source text for claim/slot extraction */
  sources?: Map<string, string> | Record<string, string>
  formulaHits?: Array<FormulaHit & { file: string }>
  lens?: string
  /** Extra seed masks */
  masks?: Mask[]
}

const DEFAULT_MASKS: Mask[] = [
  {
    id: 'warm',
    description: 'Hubs and high-weight loci only',
    include: ['role:hub'],
    exclude: ['role:orphan'],
  },
  {
    id: 'cold',
    description: 'Orphans and zero-strand surfaces',
    include: ['role:orphan'],
    exclude: [],
  },
  {
    id: 'claims',
    description: 'Loci that carry extracted claims',
    include: ['has:claim'],
    exclude: [],
  },
  {
    id: 'open_work',
    description: 'Open slots and unresolved probes',
    include: ['has:slot', 'status:open'],
    exclude: [],
  },
]

/**
 * Build a composition model from topography signals + optional sources.
 */
export function buildComposition(input: ComposeInput): CompositionModel {
  const sources = asMap(input.sources)
  const hubSet = new Set((input.hubs ?? []).map(h => h.id))
  const orphanSet = new Set(input.orphans ?? [])
  const degree = degreesFromLinks(input.links)

  const loci: Locus[] = []
  const claims: Claim[] = []
  const slots: Slot[] = []
  const strands: Strand[] = []

  for (const s of input.signals) {
    const inn = degree.in.get(s.file) ?? 0
    const out = degree.out.get(s.file) ?? 0
    const role = roleOf(s.file, hubSet, orphanSet, inn, out)
    const tags = [
      `role:${role}`,
      ...topSigilTags(s.sigils, 4),
      ...(s.pathRefCount > 0 ? ['has:path'] : []),
      ...(s.rootRefCount > 0 ? ['has:root'] : []),
      ...(s.frameCount > 0 ? ['has:frame'] : []),
    ]

    const src = sources.get(s.file)
    if (src) {
      const extracted = extractClaimsAndSlots(s.file, src)
      for (const c of extracted.claims) claims.push(c)
      for (const sl of extracted.slots) slots.push(sl)
      if (extracted.claims.length) tags.push('has:claim')
      if (extracted.slots.some(x => x.status === 'open')) {
        tags.push('has:slot', 'status:open')
      }
      for (const t of extracted.tags) {
        if (!tags.includes(t)) tags.push(t)
      }
    }

    loci.push({
      id: s.file,
      kind: kindForPath(s.file),
      weight: s.lineCount + (inn + out) * 2,
      role,
      tags,
      meta: {
        lines: s.lineCount,
        pathRefs: s.pathRefCount,
        rootRefs: s.rootRefCount,
        frames: s.frameCount,
        inDegree: inn,
        outDegree: out,
      },
    })
  }

  for (const l of input.links) {
    strands.push({
      from: l.from,
      to: l.to,
      kind: l.kind === 'root' ? 'root' : 'path',
      strength: 1,
      label: l.label,
    })
  }

  // Claim → locus strands
  for (const c of claims) {
    strands.push({
      from: c.locus,
      to: c.id,
      kind: 'claim',
      strength: 0.8,
      label: c.pattern,
    })
    if (!loci.some(x => x.id === c.id)) {
      loci.push({
        id: c.id,
        kind: 'claim',
        weight: 1,
        tags: ['kind:claim', c.valence ? `valence:${c.valence}` : 'valence:neutral'],
      })
    }
  }

  for (const sl of slots) {
    if (sl.locus) {
      strands.push({
        from: sl.locus,
        to: sl.id,
        kind: 'slot',
        strength: sl.status === 'open' ? 1 : 0.4,
      })
    }
    if (!loci.some(x => x.id === sl.id)) {
      loci.push({
        id: sl.id,
        kind: 'slot',
        weight: sl.status === 'open' ? 2 : 1,
        tags: [`status:${sl.status}`, 'kind:slot'],
      })
    }
  }

  // Formula affinity strands (file → pattern family)
  if (input.formulaHits?.length) {
    for (const h of input.formulaHits) {
      const famId = `formula:${h.family}`
      strands.push({
        from: h.file,
        to: famId,
        kind: 'formula',
        strength: h.score,
        label: h.patternId,
      })
      if (!loci.some(x => x.id === famId)) {
        loci.push({
          id: famId,
          kind: 'pack',
          weight: 1,
          tags: ['kind:formula', `family:${h.family}`],
        })
      }
      const loc = loci.find(x => x.id === h.file)
      if (loc && !loc.tags.includes('has:formula')) loc.tags.push('has:formula')
    }
  }

  const masks = [...DEFAULT_MASKS, ...(input.masks ?? [])]
  const summary = summarizeComposition(loci, strands, claims, slots)

  return {
    version: 'spw.compose/1',
    lens: input.lens ?? 'free',
    loci,
    strands,
    claims,
    slots,
    masks,
    summary,
  }
}

/** Apply a named or custom mask → filtered model (loci + incident strands). */
export function applyMask(model: CompositionModel, maskIdOrMask: string | Mask): CompositionModel {
  const mask =
    typeof maskIdOrMask === 'string'
      ? model.masks.find(m => m.id === maskIdOrMask)
      : maskIdOrMask
  if (!mask) {
    throw new Error(`unknown mask: ${typeof maskIdOrMask === 'string' ? maskIdOrMask : maskIdOrMask.id}`)
  }

  const loci = model.loci.filter(l => matchesMask(l, mask))
  const ids = new Set(loci.map(l => l.id))
  const strands = model.strands.filter(s => ids.has(s.from) || ids.has(s.to))
  // Include endpoints referenced by kept strands
  for (const s of strands) {
    for (const end of [s.from, s.to]) {
      if (!ids.has(end)) {
        const extra = model.loci.find(l => l.id === end)
        if (extra) {
          loci.push(extra)
          ids.add(end)
        }
      }
    }
  }
  const claims = model.claims.filter(c => ids.has(c.locus) || ids.has(c.id))
  const slots = model.slots.filter(s => !s.locus || ids.has(s.locus) || ids.has(s.id))

  return {
    ...model,
    loci,
    strands,
    claims,
    slots,
    summary: summarizeComposition(loci, strands, claims, slots),
  }
}

export function summarizeComposition(
  loci: Locus[],
  strands: Strand[],
  claims: Claim[],
  slots: Slot[],
): CompositionSummary {
  const hubs = loci
    .filter(l => l.role === 'hub' || l.tags.includes('role:hub'))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12)
    .map(l => l.id)

  const tagCount = new Map<string, number>()
  for (const l of loci) {
    for (const t of l.tags) {
      if (t.startsWith('role:') || t.startsWith('has:') || t.startsWith('status:')) continue
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1)
    }
  }
  const topTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }))

  const surfaceCount = loci.filter(l => l.kind === 'surface' || l.kind === 'index' || l.kind === 'pack').length
  const density = surfaceCount > 0 ? strands.length / surfaceCount : 0

  return {
    loci: loci.length,
    strands: strands.length,
    claims: claims.length,
    slots: slots.length,
    hubs,
    openSlots: slots.filter(s => s.status === 'open').length,
    density,
    topTags,
  }
}

/** Planning brief: abstract next-actions from a model (no domain nouns required). */
export function compositionBrief(model: CompositionModel): {
  lens: string
  hubs: string[]
  openSlots: Array<{ id: string; text: string; locus?: string }>
  claimSamples: Array<{ id: string; text: string; locus: string }>
  warmLoci: string[]
  coldLoci: string[]
  next: string[]
} {
  const warm = model.loci
    .filter(l => l.role === 'hub' || (l.weight > 0 && (l.meta?.outDegree as number) > 5))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map(l => l.id)

  const cold = model.loci
    .filter(l => l.role === 'orphan' && l.kind === 'surface')
    .slice(0, 8)
    .map(l => l.id)

  const openSlots = model.slots
    .filter(s => s.status === 'open')
    .slice(0, 12)
    .map(s => ({ id: s.id, text: s.text, locus: s.locus }))

  const claimSamples = model.claims.slice(0, 12).map(c => ({
    id: c.id,
    text: c.text,
    locus: c.locus,
  }))

  const next: string[] = []
  if (warm.length) next.push(`skim warm loci: ${warm.slice(0, 3).join(', ')}`)
  if (openSlots.length) next.push(`resolve ${openSlots.length} open slot(s) before widening scope`)
  if (model.summary.claims === 0) next.push('no claims extracted — add ~#goal / purpose / law facets')
  if (cold.length) next.push(`review cold orphans (${cold.length}) for archive or link`)
  next.push('spw invent --role hub · spw map · spw formula · spw analyze')

  return {
    lens: model.lens,
    hubs: model.summary.hubs,
    openSlots,
    claimSamples,
    warmLoci: warm,
    coldLoci: cold,
    next,
  }
}

// ── Extraction ─────────────────────────────────────────────────

export function extractClaimsAndSlots(
  file: string,
  source: string,
): { claims: Claim[]; slots: Slot[]; tags: string[] } {
  const claims: Claim[] = []
  const slots: Slot[] = []
  const tags: string[] = []
  const lines = source.split(/\r?\n/)

  const claimRes: Array<{ pattern: string; re: RegExp; valence?: Claim['valence'] }> = [
    { pattern: 'goal', re: /~#goal:\s*"([^"]+)"/ },
    { pattern: 'taste', re: /~#taste:\s*"([^"]+)"/ },
    { pattern: 'purpose', re: /purpose:\s*"([^"]+)"/ },
    { pattern: 'law', re: /\blaw:\s*`([^`]+)`|\blaw:\s*"([^"]+)"/ },
    { pattern: 'intent_goal', re: /goal\s*=\s*`([^`]+)`/ },
    { pattern: 'status', re: /~#status:\s*"([^"]+)"/ },
    { pattern: 'refuse', re: /refuse:\s*#\[|^\s*"Refuse/i },
    { pattern: 'boon', re: /\bboon\b/i, valence: 'boon' },
    { pattern: 'bane', re: /\bbane\b/i, valence: 'bane' },
  ]

  let claimN = 0
  let slotN = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const lineNo = i + 1

    // Open questions / probes → slots
    const openQ = line.match(/^\s*\?\[["']?([^"'\]]+)["']?\]\s*:\s*"([^"]*)"/)
    if (openQ) {
      slotN++
      slots.push({
        id: `${file}#slot:${slotN}`,
        locus: file,
        text: `${openQ[1]}: ${openQ[2] || 'open'}`.trim(),
        line: lineNo,
        status: 'open',
      })
      continue
    }
    if (/\b!probe\b/.test(line)) {
      slotN++
      slots.push({
        id: `${file}#slot:${slotN}`,
        locus: file,
        text: truncate(line.trim(), 80),
        line: lineNo,
        status: 'open',
      })
    }

    for (const rule of claimRes) {
      const m = line.match(rule.re)
      if (!m) continue
      const text = (m[1] || m[2] || m[0] || '').trim()
      if (!text || text.length < 3) continue
      claimN++
      claims.push({
        id: `${file}#claim:${claimN}`,
        locus: file,
        text: truncate(text, 120),
        line: lineNo,
        valence: rule.valence ?? 'neutral',
        pattern: rule.pattern,
      })
      if (rule.pattern === 'goal' || rule.pattern === 'purpose') tags.push('lens:intent')
      if (rule.pattern === 'taste') tags.push('lens:taste')
      if (rule.valence) tags.push(`valence:${rule.valence}`)
    }
  }

  // Frame names as soft tags
  for (const m of source.matchAll(/\^\["([^"]+)"\]/g)) {
    const name = m[1]
    if (name && name.length < 40) tags.push(`frame:${name}`)
  }

  return { claims, slots, tags: [...new Set(tags)] }
}

// ── helpers ────────────────────────────────────────────────────

function asMap(src?: Map<string, string> | Record<string, string>): Map<string, string> {
  if (!src) return new Map()
  if (src instanceof Map) return src
  return new Map(Object.entries(src))
}

function degreesFromLinks(links: CorpusLink[]): {
  in: Map<string, number>
  out: Map<string, number>
} {
  const inn = new Map<string, number>()
  const out = new Map<string, number>()
  for (const l of links) {
    out.set(l.from, (out.get(l.from) ?? 0) + 1)
    inn.set(l.to, (inn.get(l.to) ?? 0) + 1)
  }
  return { in: inn, out }
}

function roleOf(
  file: string,
  hubs: Set<string>,
  orphans: Set<string>,
  inn: number,
  out: number,
): LocusRole {
  if (hubs.has(file)) return 'hub'
  if (orphans.has(file)) return 'orphan'
  if (out === 0 && inn > 0) return 'leaf'
  if (inn === 0 && out > 0) return 'source'
  return 'node'
}

function kindForPath(file: string): LocusKind {
  const base = file.replace(/\\/g, '/').split('/').pop() ?? file
  if (base === 'index.spw') return 'index'
  if (file.includes('/plans/') || file.endsWith('PLAN.md')) return 'pack'
  if (file.includes('/kb/')) return 'pack'
  return 'surface'
}

function topSigilTags(sigils: Record<string, number>, n: number): string[] {
  return Object.entries(sigils)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => `sigil:${k}`)
}

function matchesMask(locus: Locus, mask: Mask): boolean {
  const bag = [locus.id, locus.kind, locus.role ?? '', ...locus.tags].join(' ').toLowerCase()
  for (const ex of mask.exclude) {
    if (ex && bag.includes(ex.toLowerCase())) return false
  }
  if (!mask.include.length) return true
  return mask.include.some(inc => bag.includes(inc.toLowerCase()))
}

function truncate(s: string, max: number): string {
  const one = s.replace(/\s+/g, ' ').trim()
  if (one.length <= max) return one
  return `${one.slice(0, max - 1)}…`
}

/** Builtin lens → default roots (repo-relative). Abstract; host remaps. */
export const COMPOSE_LENSES: Record<
  string,
  { roots: string[]; description: string }
> = {
  free: { roots: ['.'], description: 'Caller-supplied roots' },
  kb: {
    roots: ['.agents/kb'],
    description: 'Agent knowledge-base topics and index',
  },
  code: {
    roots: ['packages', 'src'],
    description: 'Kernel and package surfaces for codebase modeling',
  },
  plan: {
    roots: ['.agents/plans'],
    description: 'Feature plans, wip streams, and distilled artifacts',
  },
  theory: {
    roots: ['docs/theory'],
    description: 'Canon theory surfaces',
  },
  prompts: {
    roots: ['prompts'],
    description: 'Prompt ecology packs',
  },
}

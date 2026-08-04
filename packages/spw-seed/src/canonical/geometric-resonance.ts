/**
 * Geometric resonance — coupling inferred from form geometry and adjacency,
 * not only substrate event logs.
 *
 * Complements packages/spw-runtime detectResonances (event-log).
 *
 * ## Layers (portable, pure)
 *
 * 1. **GeometryBytecode** — content-hash keyed intermediate: dense counts
 *    suitable for cache keys, later VM/bytecode opts, and multi-file merge.
 * 2. **ResonanceDetector** — pure feature extractors over a shared context.
 * 3. **WeightScheme** — named multipliers so agent/corpus tuning is explicit
 *    (no scattered magic floors).
 * 4. **GeometryField** — workspace / thematic aggregation of surface cards.
 *
 * Agent corpus loop: bytecode → resonances (scheme) → field strands →
 * inspectable sense cycle / measure — never host write from this module.
 *
 * @see docs/theory/spw/flow-protocol-sigils.spw
 * @see packages/spw-seed/src/ir/slices.ts FormIR / ResonanceIR
 */

import { inspectGeometry, type GeometryReport } from './geometry-inspect'
import { SIGIL_CHARS } from './geometry-inspect-sigils'
import { scanFlowProtocol, type FlowProtocolModule, type FlowUnit } from './flow-protocol'

// ── Resonance types ───────────────────────────────────────────────

export type GeometricResonanceType =
  | 'op-cooccur' // operators share nesting neighborhood
  | 'phrase-adjacent' // brace phrases within window
  | 'depth-band' // same brace depth band
  | 'schedule-slot' // units in same <<>> schedule
  | 'bias-pole' // bias axis links targets
  | 'probe-measure' // probe near measure

export interface GeometricResonance {
  type: GeometricResonanceType
  /** Endpoint labels (sigils, phrase ids, axes). */
  ends: [string, string]
  /** Final weight after scheme (0..ceiling). */
  strength: number
  evidence: string
  line?: number
  /**
   * Named raw features before scheme multiply — agents/opt passes can reweight
   * without re-scanning source.
   */
  features?: Record<string, number>
  /** Uri when produced under a multi-surface field. */
  uri?: string
}

export interface GeometricResonanceReport {
  version: 'spw.geometry.resonance/1'
  geometry: Pick<GeometryReport, 'version' | 'lessons'> & {
    braceKinds: string[]
    topOps: Array<{ op: string; count: number }>
    maxDepth: number
  }
  flow: FlowProtocolModule
  bytecode: GeometryBytecode
  scheme: string
  resonances: GeometricResonance[]
}

// ── Intermediate bytecode ─────────────────────────────────────────

/**
 * Compact intermediate geometry — not full AST.
 * Designed so later optimizers can:
 * - cache by contentHash across HotSession / agent turns
 * - merge histograms across a workspace without re-tokenizing
 * - treat op/brace/role vectors as “form bytecode” for similarity
 */
export interface GeometryBytecode {
  version: 'spw.geometry.bc/1'
  contentHash: string
  /** Dense operator counts keyed by sigil (only non-zero). */
  opCounts: Record<string, number>
  /** Ordered vector over SIGIL_CHARS for cosine-style compares. */
  opVector: number[]
  braceKinds: Record<string, number>
  maxDepth: number
  deepLines: number
  flowRoles: Record<string, number>
  unitCount: number
  scheduleCount: number
  biasAxisCount: number
  /** Optional surface uri when known. */
  uri?: string
}

// ── Weight schemes ────────────────────────────────────────────────

export interface ResonanceFeatureGains {
  /** Co-occurrence frequency contribution. */
  frequency: number
  /** Inverse gap / proximity for adjacent units. */
  proximity: number
  /** Same schedule membership. */
  schedule: number
  /** Nesting depth band. */
  depth: number
  /** Probe↔measure coupling. */
  probeMeasure: number
  /** Bias pole default. */
  bias: number
}

export interface ResonanceWeightScheme {
  id: string
  description: string
  /** Per-type multipliers after feature fold. */
  typeWeights: Partial<Record<GeometricResonanceType, number>>
  features: ResonanceFeatureGains
  /** Drop edges below this post-scheme strength. */
  floor: number
  /** Clamp post-scheme strength. */
  ceiling: number
  /** Max edges retained after dedup/sort. */
  limit: number
}

/** Balanced defaults for general corpus read. */
export const WEIGHT_SCHEME_DEFAULT: ResonanceWeightScheme = {
  id: 'default',
  description: 'Balanced form + flow coupling for general surfaces',
  typeWeights: {
    'op-cooccur': 1,
    'phrase-adjacent': 1,
    'schedule-slot': 1.1,
    'probe-measure': 1.2,
    'bias-pole': 0.9,
    'depth-band': 0.85,
  },
  features: {
    frequency: 1,
    proximity: 1,
    schedule: 0.8,
    depth: 0.75,
    probeMeasure: 1,
    bias: 0.7,
  },
  floor: 0.12,
  ceiling: 1,
  limit: 48,
}

/**
 * Agent-oriented: amplify probe↔measure and schedule (hypothesis loops),
 * soft-pedal pure op co-occurrence noise in large surfaces.
 */
export const WEIGHT_SCHEME_AGENT: ResonanceWeightScheme = {
  id: 'agent',
  description: 'Agent corpus: prefer probe/measure + schedule over op/adjacency noise',
  typeWeights: {
    'op-cooccur': 0.55,
    'phrase-adjacent': 0.75,
    'schedule-slot': 1.25,
    'probe-measure': 1.45,
    'bias-pole': 1.1,
    'depth-band': 0.7,
  },
  features: {
    frequency: 0.85,
    proximity: 0.95,
    schedule: 1.1,
    depth: 0.6,
    probeMeasure: 1.2,
    bias: 0.9,
  },
  floor: 0.18,
  ceiling: 1,
  limit: 36,
}

/**
 * Thrift / measure-kernel: emphasize measure adjacency and depth cost.
 */
export const WEIGHT_SCHEME_THRIFT: ResonanceWeightScheme = {
  id: 'thrift',
  description: 'Thrift sense: measure coupling + depth cost as mass pressure',
  typeWeights: {
    'op-cooccur': 0.7,
    'phrase-adjacent': 0.9,
    'schedule-slot': 1,
    'probe-measure': 1.5,
    'bias-pole': 0.8,
    'depth-band': 1.2,
  },
  features: {
    frequency: 0.8,
    proximity: 1,
    schedule: 0.9,
    depth: 1.1,
    probeMeasure: 1.3,
    bias: 0.6,
  },
  floor: 0.15,
  ceiling: 1,
  limit: 40,
}

export const WEIGHT_SCHEMES: Record<string, ResonanceWeightScheme> = {
  default: WEIGHT_SCHEME_DEFAULT,
  agent: WEIGHT_SCHEME_AGENT,
  thrift: WEIGHT_SCHEME_THRIFT,
}

export function resolveWeightScheme(id?: string | ResonanceWeightScheme): ResonanceWeightScheme {
  if (!id) return WEIGHT_SCHEME_DEFAULT
  if (typeof id === 'object') return id
  return WEIGHT_SCHEMES[id] ?? WEIGHT_SCHEME_DEFAULT
}

// ── Detection context ─────────────────────────────────────────────

export interface ResonanceDetectionContext {
  source: string
  uri?: string
  geometry: GeometryReport
  flow: FlowProtocolModule
  bytecode: GeometryBytecode
  tops: Array<{ op: string; count: number }>
  units: FlowUnit[]
  scheme: ResonanceWeightScheme
}

/** A single resonance detector — pure function over context (pre-scheme fold). */
export type ResonanceDetector = (ctx: ResonanceDetectionContext) => GeometricResonance[]

// ── Bytecode build ────────────────────────────────────────────────

/** FNV-1a 64-bit hex — pure JS, portable across seed consumers (no node:crypto). */
function portableHash(text: string): string {
  let h = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i))
    h = (h * prime) & 0xffffffffffffffffn
  }
  return h.toString(16).padStart(16, '0')
}

function topOperators(report: GeometryReport, n = 8): Array<{ op: string; count: number }> {
  return report.operators
    .map(r => ({ op: r.sigil, count: r.count }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

function braceKindsMap(report: GeometryReport): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, n] of Object.entries(report.braces.kinds)) {
    if (n > 0) out[k] = n
  }
  return out
}

function braceKindsList(report: GeometryReport): string[] {
  return Object.keys(braceKindsMap(report))
}

/**
 * Compile surface text (+ optional precomputed geometry/flow) into intermediate bytecode.
 */
export function compileGeometryBytecode(
  source: string,
  options: {
    uri?: string
    geometry?: GeometryReport
    flow?: FlowProtocolModule
  } = {},
): GeometryBytecode {
  const geometry = options.geometry ?? inspectGeometry(source)
  const flow = options.flow ?? scanFlowProtocol(source, options.uri)
  const opCounts: Record<string, number> = {}
  for (const e of geometry.operators) {
    if (e.count > 0) opCounts[e.sigil] = e.count
  }
  const opVector = SIGIL_CHARS.map(s => opCounts[s] ?? 0)
  return {
    version: 'spw.geometry.bc/1',
    contentHash: portableHash(source),
    opCounts,
    opVector,
    braceKinds: braceKindsMap(geometry),
    maxDepth: geometry.nesting.maxDepth,
    deepLines: geometry.nesting.deepLines,
    flowRoles: { ...flow.roles } as Record<string, number>,
    unitCount: flow.units.length,
    scheduleCount: flow.schedules.length,
    biasAxisCount: flow.biasAxes.length,
    uri: options.uri,
  }
}

/** Cosine similarity on op vectors (0..1); cheap thematic proximity. */
export function bytecodeOpSimilarity(a: GeometryBytecode, b: GeometryBytecode): number {
  const va = a.opVector
  const vb = b.opVector
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.max(va.length, vb.length)
  for (let i = 0; i < n; i++) {
    const x = va[i] ?? 0
    const y = vb[i] ?? 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// ── Scoring ───────────────────────────────────────────────────────

function clamp(n: number, floor: number, ceiling: number): number {
  return Math.min(ceiling, Math.max(floor, n))
}

function applyScheme(
  raw: GeometricResonance,
  scheme: ResonanceWeightScheme,
  uri?: string,
): GeometricResonance | null {
  const typeW = scheme.typeWeights[raw.type] ?? 1
  const feat = raw.features ?? {}
  // Fold known feature keys with gains; unknown keys contribute raw * 1.
  let featureScore = raw.strength
  if (Object.keys(feat).length) {
    let acc = 0
    let wsum = 0
    for (const [k, v] of Object.entries(feat)) {
      const gain =
        k in scheme.features
          ? scheme.features[k as keyof ResonanceFeatureGains]
          : 1
      acc += v * gain
      wsum += gain
    }
    if (wsum > 0) featureScore = acc / wsum
  }
  const strength = Math.round(clamp(featureScore * typeW, 0, scheme.ceiling) * 1000) / 1000
  if (strength < scheme.floor) return null
  return {
    ...raw,
    strength,
    uri: raw.uri ?? uri,
  }
}

// ── Individual detectors (emit raw strength + features) ───────────

/** Operators that frequently co-occur in the same nesting neighborhood. */
export function detectOpCooccur(ctx: ResonanceDetectionContext): GeometricResonance[] {
  const out: GeometricResonance[] = []
  const { tops } = ctx
  for (let i = 0; i < tops.length; i++) {
    for (let j = i + 1; j < tops.length; j++) {
      const a = tops[i]!
      const b = tops[j]!
      const freq = Math.min(1, (a.count + b.count) / 40)
      if (freq < 0.12) continue
      out.push({
        type: 'op-cooccur',
        ends: [a.op, b.op],
        strength: freq,
        features: { frequency: freq },
        evidence: `ops ${a.op}×${a.count} with ${b.op}×${b.count}`,
      })
    }
  }
  return out
}

/** Flow units that appear within 80 characters of each other. */
export function detectPhraseAdjacent(ctx: ResonanceDetectionContext): GeometricResonance[] {
  const out: GeometricResonance[] = []
  const { units } = ctx
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const u = units[i]!
      const v = units[j]!
      const gap = v.index - (u.index + u.surface.length)
      if (gap < 0 || gap > 80) break
      if (u.role === v.role && u.role === 'unknown') continue
      const proximity = gap < 8 ? 0.9 : gap < 40 ? 0.55 : 0.3
      out.push({
        type: 'phrase-adjacent',
        ends: [
          `${u.role}:${u.sigil ?? u.surface.slice(0, 12)}`,
          `${v.role}:${v.sigil ?? v.surface.slice(0, 12)}`,
        ],
        strength: proximity,
        features: { proximity },
        evidence: `gap=${gap} line~${u.line}`,
        line: u.line,
      })
    }
  }
  return out
}

/** Units that share a `<<>>` schedule slot. */
export function detectScheduleSlot(ctx: ResonanceDetectionContext): GeometricResonance[] {
  const out: GeometricResonance[] = []
  const { source, flow, units } = ctx
  for (const sched of flow.schedules) {
    const idx = source.indexOf(sched)
    if (idx < 0) continue
    const end = idx + sched.length
    const inside = units.filter(u => u.index >= idx && u.index < end)
    for (let i = 0; i < inside.length; i++) {
      for (let j = i + 1; j < inside.length; j++) {
        out.push({
          type: 'schedule-slot',
          ends: [inside[i]!.role, inside[j]!.role],
          strength: 0.8,
          features: { schedule: 0.8 },
          evidence: 'same <<>> schedule',
          line: inside[i]!.line,
        })
      }
    }
  }
  return out
}

/** A probe unit appearing near a measure unit (gap < 120 chars). */
export function detectProbeMeasure(ctx: ResonanceDetectionContext): GeometricResonance[] {
  const out: GeometricResonance[] = []
  const { units } = ctx
  const probes = units.filter(u => u.role === 'probe')
  const measures = units.filter(u => u.role === 'measure')
  for (const p of probes) {
    for (const m of measures) {
      const gap = Math.abs(p.index - m.index)
      if (gap > 120) continue
      const probeMeasure = gap < 40 ? 0.95 : 0.5
      out.push({
        type: 'probe-measure',
        ends: ['probe', 'measure'],
        strength: probeMeasure,
        features: { probeMeasure, proximity: 1 - gap / 120 },
        evidence: `probe↔measure gap=${gap}`,
        line: p.line,
      })
    }
  }
  return out
}

/** Each bias axis contributes a pole coupling. */
export function detectBiasPole(ctx: ResonanceDetectionContext): GeometricResonance[] {
  return ctx.flow.biasAxes.map(axis => ({
    type: 'bias-pole' as const,
    ends: ['bias', axis] as [string, string],
    strength: 0.7,
    features: { bias: 0.7 },
    evidence: `axis ${axis}`,
  }))
}

/** High brace nesting depth registers as a soft depth-band resonance. */
export function detectDepthBand(ctx: ResonanceDetectionContext): GeometricResonance[] {
  const depth = ctx.geometry.nesting.maxDepth
  if (depth < 4) return []
  const depthFeat = Math.min(1, depth / 8)
  return [
    {
      type: 'depth-band',
      ends: ['depth', String(depth)],
      strength: depthFeat,
      features: { depth: depthFeat },
      evidence: `maxDepth=${depth}`,
    },
  ]
}

// ── Registry ──────────────────────────────────────────────────────

/** Default full registry — all built-in detectors in application order. */
export const DEFAULT_RESONANCE_DETECTORS: ResonanceDetector[] = [
  detectOpCooccur,
  detectPhraseAdjacent,
  detectScheduleSlot,
  detectProbeMeasure,
  detectBiasPole,
  detectDepthBand,
]

// ── Helpers ───────────────────────────────────────────────────────

function dedup(resonances: GeometricResonance[]): GeometricResonance[] {
  const seen = new Set<string>()
  const out: GeometricResonance[] = []
  for (const r of resonances.sort((a, b) => b.strength - a.strength)) {
    const k = `${r.uri ?? ''}|${r.type}|${r.ends[0]}|${r.ends[1]}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

// ── Composable entry points ───────────────────────────────────────

/**
 * Build a detection context from raw source text.
 * Call once, then pass to `runResonanceDetectors` with any detector set / scheme.
 */
export function buildResonanceContext(
  source: string,
  options: {
    uri?: string
    scheme?: string | ResonanceWeightScheme
    geometry?: GeometryReport
    flow?: FlowProtocolModule
  } = {},
): ResonanceDetectionContext {
  const geometry = options.geometry ?? inspectGeometry(source)
  const flow = options.flow ?? scanFlowProtocol(source, options.uri)
  const scheme = resolveWeightScheme(options.scheme)
  const bytecode = compileGeometryBytecode(source, {
    uri: options.uri,
    geometry,
    flow,
  })
  return {
    source,
    uri: options.uri,
    geometry,
    flow,
    bytecode,
    tops: topOperators(geometry, 8),
    units: flow.units,
    scheme,
  }
}

/**
 * Run detectors, apply weight scheme, dedup, limit.
 */
export function runResonanceDetectors(
  ctx: ResonanceDetectionContext,
  detectors: ResonanceDetector[] = DEFAULT_RESONANCE_DETECTORS,
  scheme: ResonanceWeightScheme = ctx.scheme,
): GeometricResonance[] {
  const raw: GeometricResonance[] = []
  for (const detect of detectors) {
    raw.push(...detect(ctx))
  }
  const weighted: GeometricResonance[] = []
  for (const r of raw) {
    const next = applyScheme(r, scheme, ctx.uri)
    if (next) weighted.push(next)
  }
  return dedup(weighted).slice(0, scheme.limit)
}

/**
 * Detect geometric resonances from source text using the default detector registry.
 */
export function detectGeometricResonances(
  source: string,
  options: {
    uri?: string
    scheme?: string | ResonanceWeightScheme
  } = {},
): GeometricResonanceReport {
  const ctx = buildResonanceContext(source, options)
  const resonances = runResonanceDetectors(ctx)
  const depth = ctx.geometry.nesting.maxDepth

  return {
    version: 'spw.geometry.resonance/1',
    geometry: {
      version: ctx.geometry.version,
      lessons: ctx.geometry.lessons,
      braceKinds: braceKindsList(ctx.geometry),
      topOps: ctx.tops,
      maxDepth: depth,
    },
    flow: ctx.flow,
    bytecode: ctx.bytecode,
    scheme: ctx.scheme.id,
    resonances,
  }
}

// ── Workspace / thematic field ────────────────────────────────────

export interface GeometrySurfaceCard {
  uri: string
  contentHash: string
  bytecode: GeometryBytecode
  topOps: Array<{ op: string; count: number }>
  maxDepth: number
  resonanceCount: number
  /** Dominant flow roles (count > 0). */
  roles: Record<string, number>
}

export interface GeometryStrand {
  type: GeometricResonanceType | 'op-similarity'
  ends: [string, string]
  /** Aggregated weight across contributing surfaces. */
  weight: number
  surfaces: string[]
  evidence: string
}

export interface GeometryField {
  version: 'spw.geometry.field/1'
  scheme: string
  surfaces: GeometrySurfaceCard[]
  strands: GeometryStrand[]
  /** Global op histogram merge. */
  fieldOps: Array<{ op: string; count: number }>
  /** Optional thematic filter that produced this field. */
  theme?: string
}

export interface BuildGeometryFieldOptions {
  scheme?: string | ResonanceWeightScheme
  /** Include per-surface resonances into strands. */
  resonance?: boolean
  /** Drop strands below this weight. */
  floor?: number
  /** Max strands. */
  limit?: number
  /**
   * Thematic sense filter: keep surfaces whose flow role or resonance type
   * matches (e.g. "probe", "measure", "schedule-slot").
   */
  theme?: string
  /** Pairwise op-vector similarity threshold for cross-surface strands. */
  similarityFloor?: number
}

/**
 * Aggregate many surfaces into a geometry field — the multi-file “semantic space”
 * sketch for agents navigating a .spw corpus.
 */
export function buildGeometryField(
  surfaces: Array<{ uri: string; text: string }>,
  options: BuildGeometryFieldOptions = {},
): GeometryField {
  const scheme = resolveWeightScheme(options.scheme)
  const wantResonance = options.resonance !== false
  const theme = options.theme?.toLowerCase()
  const floor = options.floor ?? scheme.floor
  const limit = options.limit ?? Math.max(scheme.limit, 64)
  const simFloor = options.similarityFloor ?? 0.82

  const cards: GeometrySurfaceCard[] = []
  const strandMap = new Map<string, GeometryStrand>()
  const opMerge: Record<string, number> = {}
  const bytecodes: GeometryBytecode[] = []

  for (const s of surfaces) {
    const report = wantResonance
      ? detectGeometricResonances(s.text, { uri: s.uri, scheme })
      : null
    const bytecode =
      report?.bytecode ?? compileGeometryBytecode(s.text, { uri: s.uri })
    const flow = report?.flow ?? scanFlowProtocol(s.text, s.uri)
    const roles = { ...flow.roles } as Record<string, number>

    if (theme) {
      const roleHit = Object.entries(roles).some(
        ([r, n]) => n > 0 && r.toLowerCase().includes(theme),
      )
      const typeHit =
        report?.resonances.some(r => r.type.includes(theme) || r.ends.some(e => e.includes(theme))) ??
        false
      if (!roleHit && !typeHit && theme !== 'all') continue
    }

    for (const [op, n] of Object.entries(bytecode.opCounts)) {
      opMerge[op] = (opMerge[op] ?? 0) + n
    }

    cards.push({
      uri: s.uri,
      contentHash: bytecode.contentHash,
      bytecode,
      topOps: report?.geometry.topOps ?? topOperators(inspectGeometry(s.text), 6),
      maxDepth: bytecode.maxDepth,
      resonanceCount: report?.resonances.length ?? 0,
      roles,
    })
    bytecodes.push(bytecode)

    if (report) {
      for (const r of report.resonances) {
        const key = `${r.type}|${r.ends[0]}|${r.ends[1]}`
        const prev = strandMap.get(key)
        if (prev) {
          prev.weight = Math.min(scheme.ceiling, prev.weight + r.strength * 0.35)
          if (!prev.surfaces.includes(s.uri)) prev.surfaces.push(s.uri)
        } else {
          strandMap.set(key, {
            type: r.type,
            ends: r.ends,
            weight: r.strength,
            surfaces: [s.uri],
            evidence: r.evidence,
          })
        }
      }
    }
  }

  // Cross-surface op-vector similarity strands (thematic geometry without re-parse)
  for (let i = 0; i < bytecodes.length; i++) {
    for (let j = i + 1; j < bytecodes.length; j++) {
      const a = bytecodes[i]!
      const b = bytecodes[j]!
      const sim = bytecodeOpSimilarity(a, b)
      if (sim < simFloor) continue
      const ua = cards[i]?.uri ?? a.uri ?? `s${i}`
      const ub = cards[j]?.uri ?? b.uri ?? `s${j}`
      const key = `op-similarity|${ua}|${ub}`
      strandMap.set(key, {
        type: 'op-similarity',
        ends: [ua, ub],
        weight: sim,
        surfaces: [ua, ub],
        evidence: `op-vector cosine=${sim.toFixed(3)}`,
      })
    }
  }

  const strands = [...strandMap.values()]
    .filter(s => s.weight >= floor)
    .sort((a, b) => b.weight - a.weight || b.surfaces.length - a.surfaces.length)
    .slice(0, limit)

  const fieldOps = Object.entries(opMerge)
    .map(([op, count]) => ({ op, count }))
    .sort((a, b) => b.count - a.count)

  return {
    version: 'spw.geometry.field/1',
    scheme: scheme.id,
    surfaces: cards,
    strands,
    fieldOps,
    theme,
  }
}

// ── Format helpers ────────────────────────────────────────────────

export function formatResonanceSummary(report: GeometricResonanceReport): string {
  const top = report.resonances
    .slice(0, 6)
    .map(r => `${r.type}:${r.ends.join('↔')}=${r.strength.toFixed(2)}`)
    .join(' ')
  return `resonance scheme=${report.scheme} n=${report.resonances.length} bc=${report.bytecode.contentHash} ${top || '—'}`
}

export function formatGeometryFieldSummary(field: GeometryField): string {
  const strandPreview = field.strands
    .slice(0, 5)
    .map(s => `${s.type}×${s.surfaces.length}@${s.weight.toFixed(2)}`)
    .join(' ')
  return (
    `geometry-field scheme=${field.scheme} surfaces=${field.surfaces.length}` +
    ` strands=${field.strands.length}` +
    (field.theme ? ` theme=${field.theme}` : '') +
    (strandPreview ? `  ${strandPreview}` : '')
  )
}

/** Quote a Spw string literal without leaning on host JSON serializers. */
function spwQuote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Spw-native resonance card — dual-read for agents/humans.
 * Prefer this over host JSON envelopes when the consumer already speaks Spw.
 */
export function formatResonanceAsSpw(
  report: GeometricResonanceReport,
  uri?: string,
): string {
  const edges = report.resonances
    .slice(0, 16)
    .map(r => {
      const a = spwQuote(r.ends[0])
      const b = spwQuote(r.ends[1])
      return `  .{ type: ${r.type}, strength: ${r.strength}, ends: #[ ${a} ; ${b} ]${r.line != null ? `, line: ${r.line}` : ''} }`
    })
    .join('\n')
  const ops = report.geometry.topOps
    .slice(0, 8)
    .map(o => `${o.op}×${o.count}`)
    .join(' ; ')
  return [
    `^["resonance"]{`,
    `  scheme: ${report.scheme}`,
    `  bytecode: ${report.bytecode.contentHash}`,
    uri ? `  uri: ~"${uri}"` : null,
    `  depth: ${report.geometry.maxDepth}`,
    `  topOps: #[ ${ops || '_'} ]`,
    `  edges: #[`,
    edges || '    _',
    `  ]`,
    `}`,
  ]
    .filter(line => line != null)
    .join('\n')
}

/**
 * Spw-native geometry field — workspace strands as dual-read surfaces.
 */
export function formatGeometryFieldAsSpw(field: GeometryField): string {
  const surfaces = field.surfaces
    .slice(0, 20)
    .map(
      s =>
        `  .{ uri: ~"${s.uri}", hash: ${s.contentHash.slice(0, 8)}, depth: ${s.maxDepth}, reso: ${s.resonanceCount} }`,
    )
    .join('\n')
  const strands = field.strands
    .slice(0, 16)
    .map(s => {
      const a = spwQuote(s.ends[0])
      const b = spwQuote(s.ends[1])
      return `  .{ type: ${s.type}, weight: ${s.weight}, ends: #[ ${a} ; ${b} ], n: ${s.surfaces.length} }`
    })
    .join('\n')
  const ops = field.fieldOps
    .slice(0, 10)
    .map(o => `${o.op}×${o.count}`)
    .join(' ; ')
  return [
    `// geometry-field  scheme=${field.scheme}${field.theme ? `  theme=${field.theme}` : ''}`,
    `^seed[Geometry.Field v:0.1 @profile:Spw.b @intent:workspace_field]`,
    `^["field"]{`,
    `  scheme: ${field.scheme}`,
    field.theme ? `  theme: ${field.theme}` : null,
    `  surfaces: ${field.surfaces.length}`,
    `  strands: ${field.strands.length}`,
    `  ops: #[ ${ops || '_'} ]`,
    `}`,
    `^["surfaces"]{`,
    surfaces || '  _',
    `}`,
    `^["strands"]{`,
    strands || '  _',
    `}`,
  ]
    .filter(line => line != null)
    .join('\n')
}

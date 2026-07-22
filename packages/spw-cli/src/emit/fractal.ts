/**
 * Configurable fractal mutation plans + multi-host emissions.
 *
 * Nest self-similar PE work at depth d with depth-weighted objectives,
 * then emit one or more hosts under a shared inject policy.
 *
 * @see prompts/sagas/fractal.spw
 * @see prompts/sagas/profiles.spw
 * @see docs/runtime/md/spw-emit.md
 */

import type { EmitHost, EmitOptions, EmitPackResult, EmitMeasure } from './types'
import { EMIT_HOSTS } from './types'
import { extractEmitDocument } from './extract'
import { encodeHost } from './codecs'
import { measureHold } from './continuity'
import {
  type AxisContext,
  type AxisCacheSnapshot,
  type HoldFactorId,
  cacheAxisContext,
  defaultContextForProfile,
  estimateLiteracy,
  holdAlphaForContext,
  holdProduct,
  weightedMean,
} from './axes'

function emitPackFromSource(
  source: string,
  sourcePath: string,
  options: Partial<EmitOptions>,
): EmitPackResult {
  const opts: EmitOptions = {
    set: options.set ?? {},
    host: options.host ?? 'plain',
    register: options.register,
    strictPositive: options.strictPositive,
    strictContinuity: options.strictContinuity,
    strictStyle: options.strictStyle,
    strictSubject: options.strictSubject,
    strictGenre: options.strictGenre,
  }
  const ir = extractEmitDocument(source, sourcePath, {
    register: opts.register,
    set: opts.set,
  })
  const pack = encodeHost(ir, opts.host)
  if (opts.strictPositive && !pack.measure.hold_positive) {
    throw new Error(`spw emit: positive_ground failed — ${pack.measure.warnings.join('; ')}`)
  }
  if (opts.strictContinuity && !pack.measure.continuity.ok) {
    throw new Error(
      `spw emit: continuity failed — missing anchors: ${pack.measure.continuity.missing.join('; ')}`,
    )
  }
  if (opts.strictStyle && !pack.measure.style_hold.ok) {
    throw new Error(
      `spw emit: style hold failed — missing: ${pack.measure.style_hold.missing.join('; ')}`,
    )
  }
  if (opts.strictSubject && !pack.measure.subject_hold.ok) {
    throw new Error(
      `spw emit: subject hold failed — missing: ${pack.measure.subject_hold.missing.join('; ')}`,
    )
  }
  if (opts.strictGenre && !pack.measure.genre_hold.ok) {
    throw new Error(
      `spw emit: genre hold failed — missing: ${pack.measure.genre_hold.missing.join('; ')}`,
    )
  }
  ir.meta.warnings = [...new Set([...ir.meta.warnings, ...pack.measure.warnings])]
  ir.meta.positive_ground = pack.measure.hold_positive
  return { ir, pack }
}

// ── Config ─────────────────────────────────────────────────────

export type FractalCoordinate =
  | 'axis_light'
  | 'axis_density'
  | 'axis_craft'
  | 'axis_flavor'
  | 'axis_era'
  | 'tone_dim'
  | 'style_phrase'
  | 'subject_cast'
  | 'genre_contract'
  | 'host_slot'
  | 'ladder_step'
  | 'fractal_depth'
  | 'macro_fill'
  | 'emit_phrasing'

export type FractalObjective =
  | 'hold_composite'
  | 'fractal_hold'
  | 'thrift_first'
  | 'signature_composite'
  | 'layout_safe'

export type FoldValence = 'boon' | 'bane' | 'bone' | 'bonk' | 'honk'

export interface FractalMutationConfig {
  /** Named saga/emit profile id */
  profile: string
  maxDepth: number
  /** Weights w(d) for fractal_hold; length may be < maxDepth+1 (pads with last) */
  depthWeights: number[]
  /** Allow-list of mutate coordinates */
  coordinates: FractalCoordinate[]
  /** Form ladders to walk (e.g. op:&, body, frame) */
  ladders: string[]
  /** Seed enrichment surface (default & => {&}) */
  seedEnrichment: string
  foldRequired: boolean
  /** Max !bonk multi-axis steps */
  bonkMax: number
  objective: FractalObjective
  /** Grade cap effect.l0.measure | effect.l1.memory | effect.l2.workspace */
  gradeCap: 'effect.l0.measure' | 'effect.l1.memory' | 'effect.l2.workspace'
  /** Loci templates for nest steps */
  nestLoci: string[]
}

export interface FractalInjectPolicy {
  styleLock: boolean
  subjectLock: boolean
  genreLock: boolean
  tonePhrases: boolean
  continuity: boolean
}

export interface FractalStrictPolicy {
  positive: boolean
  continuity: boolean
  style: boolean
  subject: boolean
  genre: boolean
}

export interface FractalEmitConfig {
  hosts: EmitHost[]
  register?: string
  set: Record<string, number>
  inject: FractalInjectPolicy
  strict: FractalStrictPolicy
  /** Min ratio for style/subject/genre holds (1 = all anchors) */
  holdRatio: number
  /**
   * Dimensional attention context — reweights hold α and literacy snapshot.
   * Does not rewrite genotype text (salience ≠ law).
   */
  context: AxisContext
}

export interface FractalRunConfig {
  mutation: FractalMutationConfig
  emit: FractalEmitConfig
}

export interface FractalPlanStep {
  t: number
  depth: number
  type: 'observe' | 'expand' | 'mutate' | 'measure' | 'decide' | 'nest' | 'fold' | 'pulse' | 'emit'
  coordinate?: FractalCoordinate | string
  locus?: string
  body: string
  valence?: FoldValence
}

export interface FractalPlan {
  profile: string
  maxDepth: number
  objective: FractalObjective
  steps: FractalPlanStep[]
  streamText: string
}

export interface FractalHostResult {
  host: EmitHost
  pack: EmitPackResult
  text: string
}

export interface FractalCompositeMeasure {
  objective: FractalObjective
  /** Depth/host-weighted Hold under context salience α(c) ∈ [0,1] */
  score: number
  /** F8 literacy product snapshot (evidence ← hold score) */
  literacy: {
    form: number
    agency: number
    evidence: number
    memory: number
    L: number
  }
  /** Context used for α(c) and axis cache */
  context: AxisContext
  /** Hold exponents α_i(c) applied in F2 */
  holdAlpha: Record<HoldFactorId, number>
  byHost: Record<string, {
    positive: boolean
    continuity: number
    style: number
    subject: number
    genre: number
    thrift: number
    hold: number
  }>
  warnings: string[]
}

export interface FractalEmitResult {
  config: FractalRunConfig
  plan: FractalPlan
  hosts: FractalHostResult[]
  composite: FractalCompositeMeasure
  /** Cached dimensional relationships + salience for this run */
  axes: AxisCacheSnapshot
}

// ── Builtin profiles (mirror prompts/sagas/profiles.spw) ───────

const DEFAULT_INJECT: FractalInjectPolicy = {
  styleLock: true,
  subjectLock: true,
  genreLock: true,
  tonePhrases: true,
  continuity: true,
}

const DEFAULT_STRICT: FractalStrictPolicy = {
  positive: false,
  continuity: false,
  style: false,
  subject: false,
  genre: false,
}

export const FRACTAL_PROFILES: Record<string, FractalRunConfig> = {
  pe_style_lock: {
    mutation: {
      profile: 'pe_style_lock',
      maxDepth: 1,
      depthWeights: [1],
      coordinates: ['axis_light', 'axis_density', 'axis_craft', 'style_phrase', 'tone_dim'],
      ladders: [],
      seedEnrichment: '',
      foldRequired: false,
      bonkMax: 1,
      objective: 'hold_composite',
      gradeCap: 'effect.l2.workspace',
      nestLoci: [],
    },
    emit: {
      hosts: ['mj', 'copy'],
      register: 'voice_braided_relation',
      set: {},
      inject: { ...DEFAULT_INJECT, genreLock: false },
      strict: { ...DEFAULT_STRICT },
      holdRatio: 1,
      context: 'production',
    },
  },
  fractal_merge: {
    mutation: {
      profile: 'fractal_merge',
      maxDepth: 3,
      depthWeights: [0.5, 0.3, 0.2],
      coordinates: ['ladder_step', 'fractal_depth', 'axis_light', 'style_phrase'],
      ladders: ['op:&', 'body', 'frame'],
      seedEnrichment: '& => {&}',
      foldRequired: true,
      bonkMax: 1,
      objective: 'fractal_hold',
      gradeCap: 'effect.l1.memory',
      nestLoci: ['{&}', '^"style"', 'scene.beat[0]'],
    },
    emit: {
      hosts: ['brief', 'mj', 'social'],
      set: {},
      inject: { ...DEFAULT_INJECT },
      strict: { ...DEFAULT_STRICT },
      holdRatio: 1,
      context: 'production',
    },
  },
  fractal_style_repo: {
    mutation: {
      profile: 'fractal_style_repo',
      maxDepth: 2,
      depthWeights: [0.6, 0.4],
      coordinates: ['style_phrase', 'axis_craft', 'macro_fill'],
      ladders: ['body'],
      seedEnrichment: '& => {&}',
      foldRequired: true,
      bonkMax: 1,
      objective: 'fractal_hold',
      gradeCap: 'effect.l2.workspace',
      nestLoci: ['^"style".phrase_lock', '{&}'],
    },
    emit: {
      hosts: ['mj', 'copy', 'eng_note'],
      register: 'voice_hospitable_craft',
      set: {},
      inject: { ...DEFAULT_INJECT, genreLock: false },
      strict: { ...DEFAULT_STRICT, style: false },
      holdRatio: 0.67,
      context: 'research',
    },
  },
  line_propagate: {
    mutation: {
      profile: 'line_propagate',
      maxDepth: 0,
      depthWeights: [1],
      coordinates: ['style_phrase', 'subject_cast', 'genre_contract', 'host_slot'],
      ladders: [],
      seedEnrichment: '',
      foldRequired: false,
      bonkMax: 0,
      objective: 'hold_composite',
      gradeCap: 'effect.l2.workspace',
      nestLoci: [],
    },
    emit: {
      hosts: ['brief', 'copy', 'audio', 'social', 'mj'],
      set: {},
      inject: { ...DEFAULT_INJECT },
      strict: { ...DEFAULT_STRICT, continuity: true },
      holdRatio: 1,
      context: 'canon',
    },
  },
  pe_thrift_social: {
    mutation: {
      profile: 'pe_thrift_social',
      maxDepth: 0,
      depthWeights: [1],
      coordinates: ['emit_phrasing', 'host_slot', 'tone_dim'],
      ladders: [],
      seedEnrichment: '',
      foldRequired: false,
      bonkMax: 0,
      objective: 'thrift_first',
      gradeCap: 'effect.l1.memory',
      nestLoci: [],
    },
    emit: {
      hosts: ['social', 'web_copy'],
      register: 'voice_web_quiet',
      set: { 'density.sparse': 0.85 },
      inject: {
        styleLock: false,
        subjectLock: false,
        genreLock: false,
        tonePhrases: true,
        continuity: true,
      },
      strict: { ...DEFAULT_STRICT, positive: true },
      holdRatio: 1,
      context: 'thrift',
    },
  },
}

export function listFractalProfiles(): string[] {
  return Object.keys(FRACTAL_PROFILES)
}

export function resolveFractalProfile(name: string): FractalRunConfig {
  const key = name.replace(/^#/, '')
  const base = FRACTAL_PROFILES[key]
  if (!base) {
    throw new Error(
      `unknown fractal profile "${name}" (known: ${listFractalProfiles().join(', ')})`,
    )
  }
  return cloneConfig(base)
}

function cloneConfig(c: FractalRunConfig): FractalRunConfig {
  return JSON.parse(JSON.stringify(c)) as FractalRunConfig
}

/** Overlay CLI/runtime knobs onto a resolved profile. */
export function mergeFractalConfig(
  base: FractalRunConfig,
  overlay: {
    maxDepth?: number
    hosts?: EmitHost[]
    register?: string
    set?: Record<string, number>
    depthWeights?: number[]
    coordinates?: FractalCoordinate[]
    ladders?: string[]
    objective?: FractalObjective
    holdRatio?: number
    context?: AxisContext
    strictPositive?: boolean
    strictContinuity?: boolean
    strictStyle?: boolean
    strictSubject?: boolean
    strictGenre?: boolean
    foldRequired?: boolean
    bonkMax?: number
    nestLoci?: string[]
  },
): FractalRunConfig {
  const out = cloneConfig(base)
  if (overlay.maxDepth != null) out.mutation.maxDepth = overlay.maxDepth
  if (overlay.depthWeights) out.mutation.depthWeights = overlay.depthWeights
  if (overlay.coordinates) out.mutation.coordinates = overlay.coordinates
  if (overlay.ladders) out.mutation.ladders = overlay.ladders
  if (overlay.objective) out.mutation.objective = overlay.objective
  if (overlay.foldRequired != null) out.mutation.foldRequired = overlay.foldRequired
  if (overlay.bonkMax != null) out.mutation.bonkMax = overlay.bonkMax
  if (overlay.nestLoci) out.mutation.nestLoci = overlay.nestLoci
  if (overlay.hosts?.length) out.emit.hosts = overlay.hosts
  if (overlay.register) out.emit.register = overlay.register
  if (overlay.set) out.emit.set = { ...out.emit.set, ...overlay.set }
  if (overlay.holdRatio != null) out.emit.holdRatio = overlay.holdRatio
  if (overlay.context) out.emit.context = overlay.context
  if (overlay.strictPositive != null) out.emit.strict.positive = overlay.strictPositive
  if (overlay.strictContinuity != null) out.emit.strict.continuity = overlay.strictContinuity
  if (overlay.strictStyle != null) out.emit.strict.style = overlay.strictStyle
  if (overlay.strictSubject != null) out.emit.strict.subject = overlay.strictSubject
  if (overlay.strictGenre != null) out.emit.strict.genre = overlay.strictGenre
  // Ensure context always defined (clone from older configs / partial JSON)
  if (!out.emit.context) {
    out.emit.context = defaultContextForProfile(out.mutation.profile)
  }
  return out
}

// ── Plan generation (deterministic stream) ─────────────────────

export function planFractalMutation(
  config: FractalMutationConfig,
  ctx: { styleId?: string; organ?: string; host?: string } = {},
): FractalPlan {
  const organ = ctx.organ ?? '#portrait'
  const style = ctx.styleId ?? '$style_id'
  const host = ctx.host ?? 'mj'
  const steps: FractalPlanStep[] = []
  let t = 0

  steps.push({
    t: t++,
    depth: 0,
    type: 'observe',
    body: `baseline @${organ} host ${host} style ${style}`,
  })
  steps.push({
    t: t++,
    depth: 0,
    type: 'expand',
    body: `fill bindings; report open _; inject locks per policy`,
  })

  if (config.seedEnrichment) {
    steps.push({
      t: t++,
      depth: 0,
      type: 'pulse',
      coordinate: 'ladder_step',
      body: `enrich ${config.seedEnrichment} ladders=[${config.ladders.join(',')}]`,
    })
  }

  const coords = config.coordinates.filter(c => c !== 'fractal_depth' && c !== 'ladder_step')
  const primary = coords[0] ?? 'style_phrase'

  if (config.maxDepth <= 0) {
    steps.push({
      t: t++,
      depth: 0,
      type: 'mutate',
      coordinate: primary,
      body: `${primary}: $from → $to @${organ}`,
    })
    steps.push({
      t: t++,
      depth: 0,
      type: 'measure',
      body: `%objective=${config.objective} %holds`,
    })
    steps.push({
      t: t++,
      depth: 0,
      type: 'decide',
      body: 'keep | revert',
      valence: 'boon',
    })
  } else {
    for (let d = 1; d <= config.maxDepth; d++) {
      const locus =
        config.nestLoci[(d - 1) % Math.max(1, config.nestLoci.length)] ?? '{&}'
      steps.push({
        t: t++,
        depth: d - 1,
        type: 'nest',
        locus,
        coordinate: 'fractal_depth',
        body: `depth+1 locus ${locus} profile ${config.profile}`,
      })
      const coord = coords[(d - 1) % Math.max(1, coords.length)] ?? primary
      steps.push({
        t: t++,
        depth: d,
        type: 'mutate',
        coordinate: coord,
        locus,
        body: `(child d=${d}) ${coord}: $from → $to`,
      })
      steps.push({
        t: t++,
        depth: d,
        type: 'measure',
        body: `(child d=${d}) %hold w=${weightAt(config.depthWeights, d)}`,
      })
      steps.push({
        t: t++,
        depth: d,
        type: 'decide',
        body: `(child d=${d}) !boon keep`,
        valence: 'boon',
      })
      if (config.foldRequired) {
        steps.push({
          t: t++,
          depth: d - 1,
          type: 'fold',
          locus,
          body: `child d=${d} via & → {&} valence !boon`,
          valence: 'boon',
        })
      }
    }
    steps.push({
      t: t++,
      depth: 0,
      type: 'measure',
      body: `parent %${config.objective} depthWeights=[${config.depthWeights.join(',')}]`,
    })
  }

  steps.push({
    t: t++,
    depth: 0,
    type: 'emit',
    body: `hosts configured separately; grade_cap ${config.gradeCap}`,
  })

  const streamText = steps
    .map(s => `>>[${s.t}] ${s.type} — ${s.body}`)
    .join('\n')

  return {
    profile: config.profile,
    maxDepth: config.maxDepth,
    objective: config.objective,
    steps,
    streamText,
  }
}

function weightAt(weights: number[], depth: number): number {
  if (!weights.length) return 1
  if (depth < weights.length) return weights[depth]!
  return weights[weights.length - 1]!
}

// ── Multi-host emit under fractal config ───────────────────────

export function runFractalEmit(
  source: string,
  sourcePath: string,
  config: FractalRunConfig,
): FractalEmitResult {
  const plan = planFractalMutation(config.mutation, {
    host: config.emit.hosts[0],
  })

  const hosts: FractalHostResult[] = []
  for (const host of config.emit.hosts) {
    const opts: Partial<EmitOptions> = {
      host,
      register: config.emit.register,
      set: config.emit.set,
      strictPositive: config.emit.strict.positive,
      strictContinuity: config.emit.strict.continuity,
      strictStyle: config.emit.strict.style,
      strictSubject: config.emit.strict.subject,
      strictGenre: config.emit.strict.genre,
    }
    const pack = emitPackFromSource(source, sourcePath, opts)
    applyHoldRatio(pack, config.emit.holdRatio)
    const text =
      pack.pack.text ??
      Object.values(pack.pack.fields).filter(Boolean).join('\n\n')
    hosts.push({ host, pack, text })
  }

  const composite = scoreComposite(config, hosts)
  const axes = cacheAxisContext(config.emit.context ?? defaultContextForProfile(config.mutation.profile))
  return { config, plan, hosts, composite, axes }
}

function applyHoldRatio(result: EmitPackResult, ratio: number): void {
  // Soften strictness for partial holds: recompute ok flags for reporting only
  for (const key of ['style_hold', 'subject_hold', 'genre_hold', 'continuity'] as const) {
    const h = result.pack.measure[key]
    if (!h || h.anchors_checked === 0) continue
    const r = h.anchors_hit / h.anchors_checked
    if (r + 1e-9 >= ratio) {
      h.ok = true
      h.warnings = h.warnings.filter(w => !w.startsWith(key.replace('_hold', '') + ':') && !w.startsWith('continuity:'))
    }
  }
}

function holdRatio(m: EmitMeasure, key: 'continuity' | 'style_hold' | 'subject_hold' | 'genre_hold'): number {
  const h = m[key]
  if (!h || h.anchors_checked === 0) return 1
  return h.anchors_hit / h.anchors_checked
}

function scoreComposite(
  config: FractalRunConfig,
  hosts: FractalHostResult[],
): FractalCompositeMeasure {
  const warnings: string[] = []
  const byHost: FractalCompositeMeasure['byHost'] = {}
  const scores: number[] = []
  const context = config.emit.context ?? defaultContextForProfile(config.mutation.profile)
  const alpha = holdAlphaForContext(context)
  // Objective may force thrift α even outside thrift context
  if (config.mutation.objective === 'thrift_first') {
    alpha['hold.thrift'] = Math.max(alpha['hold.thrift'] ?? 0, 1)
    alpha['hold.genre'] = Math.min(alpha['hold.genre'] ?? 0, 0.15)
  }
  if (!config.emit.inject.genreLock) {
    alpha['hold.genre'] = 0
  }
  if (!config.emit.inject.styleLock) alpha['hold.style'] = Math.min(alpha['hold.style'] ?? 0, 0.2)
  if (!config.emit.inject.subjectLock) alpha['hold.subject'] = Math.min(alpha['hold.subject'] ?? 0, 0.2)
  if (!config.emit.inject.continuity) alpha['hold.continuity'] = Math.min(alpha['hold.continuity'] ?? 0, 0.2)

  for (const h of hosts) {
    const m = h.pack.pack.measure
    const c = holdRatio(m, 'continuity')
    const s = holdRatio(m, 'style_hold')
    const u = holdRatio(m, 'subject_hold')
    const g = holdRatio(m, 'genre_hold')
    const pos = m.hold_positive ? 1 : 0
    const thrift = 1 / Math.max(1, m.sentence_estimate)
    const factors: Partial<Record<HoldFactorId, number>> = {
      'hold.positive': pos,
      'hold.continuity': c,
      'hold.style': s,
      'hold.subject': u,
      'hold.genre': g,
      'hold.thrift': thrift,
    }
    const hostScore = holdProduct(factors, alpha)
    byHost[h.host] = {
      positive: m.hold_positive,
      continuity: c,
      style: s,
      subject: u,
      genre: g,
      thrift,
      hold: hostScore,
    }
    scores.push(hostScore)
    if (!m.hold_positive) warnings.push(`${h.host}: positive_ground failed`)
    for (const w of m.warnings) warnings.push(`${h.host}: ${w}`)
  }

  // Hosts ≈ depth arms under multi-host; depthWeights re-average
  const weights = config.mutation.depthWeights
  const wvec = scores.map((_, i) => weightAt(weights, i))
  const score = weightedMean(scores, wvec)

  // Agency: one-coordinate law proxy from plan length vs mutate steps (filled later if plan known)
  const literacy = estimateLiteracy({
    holdScore: score,
    agencyRatio: 1,
    formProxy: score > 0 ? 1 : 0.5,
    memoryProxy:
      (config.emit.inject.styleLock ? 0.25 : 0) +
      (config.emit.inject.subjectLock ? 0.25 : 0) +
      (config.emit.inject.genreLock ? 0.25 : 0) +
      (config.emit.inject.continuity ? 0.25 : 0),
  })

  return {
    objective: config.mutation.objective,
    score,
    literacy,
    context,
    holdAlpha: alpha,
    byHost,
    warnings: unique(warnings),
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}

export function parseHostList(raw: string): EmitHost[] {
  const parts = raw.split(/[,+\s]+/).map(s => s.trim().toLowerCase().replace(/-/g, '_')).filter(Boolean)
  const out: EmitHost[] = []
  for (const p of parts) {
    if ((EMIT_HOSTS as readonly string[]).includes(p)) out.push(p as EmitHost)
    else throw new Error(`unknown host "${p}" (${EMIT_HOSTS.join('|')})`)
  }
  if (!out.length) throw new Error('empty host list')
  return out
}

export function parseCoordinateList(raw: string): FractalCoordinate[] {
  return raw
    .split(/[,+\s]+/)
    .map(s => s.trim().replace(/^#/, ''))
    .filter(Boolean) as FractalCoordinate[]
}

export function renderFractalResult(result: FractalEmitResult, mode: 'text' | 'json' | 'plan' = 'text'): string {
  if (mode === 'json') {
    return JSON.stringify(
      {
        profile: result.config.mutation.profile,
        context: result.composite.context,
        plan: {
          maxDepth: result.plan.maxDepth,
          objective: result.plan.objective,
          steps: result.plan.steps,
          stream: result.plan.streamText,
        },
        composite: result.composite,
        axes: result.axes,
        hosts: result.hosts.map(h => ({
          host: h.host,
          text: h.text,
          measure: h.pack.pack.measure,
          fields: h.pack.pack.fields,
        })),
      },
      null,
      2,
    )
  }
  if (mode === 'plan') {
    return [
      `# fractal plan profile=${result.plan.profile} maxDepth=${result.plan.maxDepth} objective=${result.plan.objective} context=${result.composite.context}`,
      result.plan.streamText,
      '',
      `# composite score=${result.composite.score.toFixed(3)} L=${result.composite.literacy.L.toFixed(3)}`,
    ].join('\n')
  }

  const parts: string[] = []
  parts.push(
    `# fractal profile=${result.config.mutation.profile} score=${result.composite.score.toFixed(3)} L=${result.composite.literacy.L.toFixed(3)} objective=${result.composite.objective} context=${result.composite.context}`,
  )
  parts.push(
    `# maxDepth=${result.config.mutation.maxDepth} hosts=${result.config.emit.hosts.join(',')} axes=${result.axes.version}`,
  )
  for (const h of result.hosts) {
    parts.push('')
    parts.push(`## host=${h.host} hold=${(result.composite.byHost[h.host]?.hold ?? 0).toFixed(3)}`)
    parts.push(h.text.trim())
  }
  if (result.composite.warnings.length) {
    parts.push('')
    parts.push('# warnings')
    for (const w of result.composite.warnings) parts.push(`# ! ${w}`)
  }
  return parts.join('\n')
}

// re-export measureHold use for tests
export { measureHold }

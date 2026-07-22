/**
 * Dimensional axes — portable catalog, context salience, literacy product.
 *
 * Mathematical soundness: named formulas over opaque scores.
 * Subjective hooks live in prompts/substrate/axes.spw (not here).
 * Operational: fractal composite reweight, CLI --context.
 *
 * @see docs/theory/spw/dimensional-axes.spw
 * @see prompts/substrate/axes.spw
 * @see prompts/sagas/optimize.spw
 */

// ── Ids ────────────────────────────────────────────────────────

export type AxisContext =
  | 'production'
  | 'canon'
  | 'research'
  | 'pedagogy'
  | 'merch'
  | 'layout'
  | 'thrift'

export const AXIS_CONTEXTS: readonly AxisContext[] = [
  'production',
  'canon',
  'research',
  'pedagogy',
  'merch',
  'layout',
  'thrift',
] as const

export type AbstractAxisId =
  | 'tempo.production'
  | 'tempo.product'
  | 'tempo.language'
  | 'literacy.form'
  | 'literacy.agency'
  | 'literacy.evidence'
  | 'literacy.memory'
  | 'hold.positive'
  | 'hold.continuity'
  | 'hold.style'
  | 'hold.subject'
  | 'hold.genre'
  | 'hold.thrift'
  | 'search.coordinate'
  | 'search.budget'
  | 'search.grade'
  | 'search.objective'
  | 'valence.quality'
  | 'circulation.channel'
  | 'circulation.scarcity'
  | 'circulation.continuity'
  | 'circulation.spectacle'
  | 'play.intrigue'
  | 'play.expression'
  | 'play.motif'
  | 'language.id'
  | 'language.reading'
  | 'language.alias'
  | 'language.dual_read'

export type AxisFamily =
  | 'tempo'
  | 'literacy'
  | 'hold'
  | 'search'
  | 'valence'
  | 'circulation'
  | 'play'
  | 'language'

export type AxisRelationKind =
  | 'feeds'
  | 'gates'
  | 'implements'
  | 'dual'
  | 'slower_than'

export interface AxisSpec {
  id: AbstractAxisId
  family: AxisFamily
  /** Unit-free ratio domain when measurable; else interpretive */
  domain: 'ratio' | 'rate' | 'discrete' | 'id' | 'interpretive'
  measured: boolean
}

export interface AxisEdge {
  from: AbstractAxisId | 'F4_promote'
  to: AbstractAxisId | 'hold.family'
  rel: AxisRelationKind
  note?: string
}

/** Hold factors used in F2 product scoring */
export type HoldFactorId =
  | 'hold.positive'
  | 'hold.continuity'
  | 'hold.style'
  | 'hold.subject'
  | 'hold.genre'
  | 'hold.thrift'

export const HOLD_FACTORS: readonly HoldFactorId[] = [
  'hold.positive',
  'hold.continuity',
  'hold.style',
  'hold.subject',
  'hold.genre',
  'hold.thrift',
] as const

// ── Catalog ────────────────────────────────────────────────────

export const AXIS_CATALOG: readonly AxisSpec[] = [
  { id: 'tempo.production', family: 'tempo', domain: 'rate', measured: false },
  { id: 'tempo.product', family: 'tempo', domain: 'rate', measured: false },
  { id: 'tempo.language', family: 'tempo', domain: 'rate', measured: false },
  { id: 'literacy.form', family: 'literacy', domain: 'ratio', measured: false },
  { id: 'literacy.agency', family: 'literacy', domain: 'ratio', measured: false },
  { id: 'literacy.evidence', family: 'literacy', domain: 'ratio', measured: true },
  { id: 'literacy.memory', family: 'literacy', domain: 'ratio', measured: false },
  { id: 'hold.positive', family: 'hold', domain: 'ratio', measured: true },
  { id: 'hold.continuity', family: 'hold', domain: 'ratio', measured: true },
  { id: 'hold.style', family: 'hold', domain: 'ratio', measured: true },
  { id: 'hold.subject', family: 'hold', domain: 'ratio', measured: true },
  { id: 'hold.genre', family: 'hold', domain: 'ratio', measured: true },
  { id: 'hold.thrift', family: 'hold', domain: 'ratio', measured: true },
  { id: 'search.coordinate', family: 'search', domain: 'discrete', measured: false },
  { id: 'search.budget', family: 'search', domain: 'discrete', measured: false },
  { id: 'search.grade', family: 'search', domain: 'discrete', measured: false },
  { id: 'search.objective', family: 'search', domain: 'id', measured: false },
  { id: 'valence.quality', family: 'valence', domain: 'discrete', measured: false },
  { id: 'circulation.channel', family: 'circulation', domain: 'id', measured: false },
  { id: 'circulation.scarcity', family: 'circulation', domain: 'ratio', measured: false },
  { id: 'circulation.continuity', family: 'circulation', domain: 'ratio', measured: true },
  { id: 'circulation.spectacle', family: 'circulation', domain: 'ratio', measured: false },
  { id: 'play.intrigue', family: 'play', domain: 'ratio', measured: false },
  { id: 'play.expression', family: 'play', domain: 'id', measured: false },
  { id: 'play.motif', family: 'play', domain: 'id', measured: false },
  { id: 'language.id', family: 'language', domain: 'id', measured: false },
  { id: 'language.reading', family: 'language', domain: 'id', measured: false },
  { id: 'language.alias', family: 'language', domain: 'id', measured: false },
  { id: 'language.dual_read', family: 'language', domain: 'interpretive', measured: false },
] as const

/** Typed relationship cache — agents may load without re-deriving lore. */
export const AXIS_RELATIONS: readonly AxisEdge[] = [
  { from: 'tempo.production', to: 'tempo.product', rel: 'feeds', note: 'volume feeds seasonal product' },
  { from: 'tempo.product', to: 'tempo.language', rel: 'feeds', note: 'stable product pressure informs language' },
  { from: 'tempo.language', to: 'tempo.product', rel: 'slower_than' },
  { from: 'tempo.product', to: 'tempo.production', rel: 'slower_than' },
  { from: 'literacy.evidence', to: 'hold.positive', rel: 'implements' },
  { from: 'literacy.evidence', to: 'hold.continuity', rel: 'implements' },
  { from: 'hold.continuity', to: 'circulation.channel', rel: 'feeds' },
  { from: 'search.coordinate', to: 'literacy.agency', rel: 'implements' },
  { from: 'play.expression', to: 'play.motif', rel: 'feeds' },
  { from: 'language.reading', to: 'circulation.scarcity', rel: 'gates' },
  { from: 'F4_promote', to: 'tempo.product', rel: 'gates' },
  { from: 'F4_promote', to: 'tempo.language', rel: 'gates' },
  { from: 'valence.quality', to: 'literacy.form', rel: 'dual' },
  { from: 'hold.continuity', to: 'circulation.continuity', rel: 'implements' },
] as const

// ── Context salience tables ────────────────────────────────────
// Raw boosts (higher = more attention). Missing axes default to 1.
// Damp axes multiply by dampFactor after boost assignment.

interface ContextSalienceDef {
  boost: Partial<Record<AbstractAxisId, number>>
  damp: AbstractAxisId[]
  dampFactor: number
  /** Default α for hold product when not overridden */
  holdAlpha: Partial<Record<HoldFactorId, number>>
}

const CONTEXT_SALIENCE: Record<AxisContext, ContextSalienceDef> = {
  production: {
    boost: {
      'hold.positive': 3,
      'hold.continuity': 3,
      'play.intrigue': 2.5,
      'tempo.production': 3,
      'circulation.channel': 2.5,
      'hold.thrift': 1.5,
    },
    damp: ['tempo.language', 'circulation.scarcity', 'language.dual_read'],
    dampFactor: 0.25,
    holdAlpha: {
      'hold.positive': 1,
      'hold.continuity': 1,
      'hold.style': 0.7,
      'hold.subject': 0.7,
      'hold.genre': 0.4,
      'hold.thrift': 0.5,
    },
  },
  canon: {
    boost: {
      'literacy.evidence': 3,
      'literacy.memory': 3,
      'hold.style': 2.5,
      'hold.subject': 2.5,
      'hold.genre': 2.5,
      'search.grade': 2,
      'hold.positive': 2,
    },
    damp: ['play.intrigue', 'tempo.production'],
    dampFactor: 0.2,
    holdAlpha: {
      'hold.positive': 1,
      'hold.continuity': 1,
      'hold.style': 1,
      'hold.subject': 1,
      'hold.genre': 1,
      'hold.thrift': 0.3,
    },
  },
  research: {
    boost: {
      'search.coordinate': 3,
      'search.budget': 2.5,
      'literacy.agency': 3,
      'tempo.language': 2.5,
      'valence.quality': 2,
    },
    damp: ['circulation.scarcity', 'play.motif'],
    dampFactor: 0.25,
    holdAlpha: {
      'hold.positive': 1,
      'hold.continuity': 0.6,
      'hold.style': 0.8,
      'hold.subject': 0.8,
      'hold.genre': 0.5,
      'hold.thrift': 0.4,
    },
  },
  pedagogy: {
    boost: {
      'literacy.form': 3,
      'literacy.agency': 3,
      'literacy.evidence': 3,
      'literacy.memory': 3,
      'play.expression': 2.5,
      'valence.quality': 2.5,
    },
    damp: ['circulation.spectacle'],
    dampFactor: 0.2,
    holdAlpha: {
      'hold.positive': 1,
      'hold.continuity': 0.9,
      'hold.style': 0.8,
      'hold.subject': 0.8,
      'hold.genre': 0.6,
      'hold.thrift': 0.5,
    },
  },
  merch: {
    boost: {
      'play.motif': 3,
      'circulation.scarcity': 3,
      'language.reading': 3,
      'hold.continuity': 2.5,
      'tempo.product': 2.5,
    },
    damp: ['tempo.production', 'search.budget'],
    dampFactor: 0.2,
    holdAlpha: {
      'hold.positive': 1,
      'hold.continuity': 1.2,
      'hold.style': 0.9,
      'hold.subject': 0.9,
      'hold.genre': 0.5,
      'hold.thrift': 0.4,
    },
  },
  layout: {
    boost: {
      'search.grade': 3,
      'literacy.form': 2.5,
      'search.coordinate': 2,
    },
    damp: ['hold.genre', 'play.motif'],
    dampFactor: 0.3,
    holdAlpha: {
      'hold.positive': 0.5,
      'hold.continuity': 0.3,
      'hold.style': 0.3,
      'hold.subject': 0.3,
      'hold.genre': 0.1,
      'hold.thrift': 0.2,
    },
  },
  thrift: {
    boost: {
      'hold.positive': 3,
      'hold.thrift': 3,
      'hold.continuity': 2.5,
      'circulation.channel': 2,
    },
    damp: ['hold.genre', 'play.motif', 'tempo.language'],
    dampFactor: 0.2,
    holdAlpha: {
      'hold.positive': 1.2,
      'hold.continuity': 1,
      'hold.style': 0.4,
      'hold.subject': 0.4,
      'hold.genre': 0.1,
      'hold.thrift': 1.2,
    },
  },
}

// ── Math ───────────────────────────────────────────────────────

/** Renormalize non-negative weights to sum 1 (empty → {}). */
export function normalizeSalience(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights).filter(([, v]) => v > 0 && Number.isFinite(v))
  const sum = entries.reduce((a, [, v]) => a + v, 0)
  if (sum <= 0) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of entries) out[k] = v / sum
  return out
}

/** Full axis salience vector for context c (raw, then optional normalize). */
export function salienceForContext(
  ctx: AxisContext,
  opts: { normalize?: boolean } = {},
): Record<AbstractAxisId, number> {
  const def = CONTEXT_SALIENCE[ctx]
  const raw = {} as Record<AbstractAxisId, number>
  for (const spec of AXIS_CATALOG) {
    let w = def.boost[spec.id] ?? 1
    if (def.damp.includes(spec.id)) w *= def.dampFactor
    raw[spec.id] = w
  }
  if (opts.normalize) {
    return normalizeSalience(raw) as Record<AbstractAxisId, number>
  }
  return raw
}

/** Hold-factor α(c) for F2 product — not required to sum to 1. */
export function holdAlphaForContext(ctx: AxisContext): Record<HoldFactorId, number> {
  const base = CONTEXT_SALIENCE[ctx].holdAlpha
  const out = {} as Record<HoldFactorId, number>
  for (const id of HOLD_FACTORS) {
    out[id] = base[id] ?? 1
  }
  return out
}

/**
 * F2: Hold = ∏ h_i^{α_i}
 * h_i clamped to [0,1]; α_i ≥ 0. Empty factors → 1.
 */
export function holdProduct(
  factors: Partial<Record<HoldFactorId, number>>,
  alpha: Partial<Record<HoldFactorId, number>>,
): number {
  let p = 1
  for (const id of HOLD_FACTORS) {
    const a = alpha[id]
    if (a == null || a === 0) continue
    const h = clamp01(factors[id] ?? 1)
    p *= Math.pow(h, a)
  }
  return clamp01(p)
}

/**
 * F8: L = Form · Agency · Evidence · Memory
 * Any zero collapses literacy (intentional).
 */
export function literacyProduct(parts: {
  form: number
  agency: number
  evidence: number
  memory: number
}): number {
  return clamp01(parts.form) * clamp01(parts.agency) * clamp01(parts.evidence) * clamp01(parts.memory)
}

/**
 * Weighted mean of scores with salience weights (e.g. hosts / depth arms).
 * score = Σ w_k s_k / Σ w_k
 */
export function weightedMean(scores: number[], weights: number[]): number {
  if (!scores.length) return 0
  let num = 0
  let den = 0
  for (let i = 0; i < scores.length; i++) {
    const w = weights[i] ?? weights[weights.length - 1] ?? 1
    const s = scores[i] ?? 0
    if (!Number.isFinite(w) || w < 0) continue
    num += w * clamp01(s)
    den += w
  }
  return den > 0 ? num / den : 0
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

// ── Relationship cache API ─────────────────────────────────────

export function relationsFrom(id: string): AxisEdge[] {
  return AXIS_RELATIONS.filter(e => e.from === id)
}

export function relationsTo(id: string): AxisEdge[] {
  return AXIS_RELATIONS.filter(e => e.to === id)
}

export interface AxisCacheSnapshot {
  version: 'spw.axes/1'
  context: AxisContext
  /** Normalized salience over all catalog axes */
  salience: Record<string, number>
  /** Hold α for F2 */
  holdAlpha: Record<HoldFactorId, number>
  /** Edges involving boosted axes (top attention) */
  salientRelations: AxisEdge[]
  formulas: {
    F2: string
    F4: string
    F8: string
  }
}

/** Cache dimensional relationship + salience for a run context. */
export function cacheAxisContext(ctx: AxisContext, topK = 8): AxisCacheSnapshot {
  const salience = salienceForContext(ctx, { normalize: true })
  const holdAlpha = holdAlphaForContext(ctx)
  const ranked = Object.entries(salience).sort((a, b) => b[1] - a[1])
  const top = new Set(ranked.slice(0, topK).map(([id]) => id))
  const salientRelations = AXIS_RELATIONS.filter(
    e => top.has(String(e.from)) || top.has(String(e.to)),
  )
  return {
    version: 'spw.axes/1',
    context: ctx,
    salience,
    holdAlpha,
    salientRelations,
    formulas: {
      F2: 'Hold = ∏ h_i^{α_i(c)}',
      F4: 'Canonize ⇔ Hold≥θ ∧ evidence ∧ episode',
      F8: 'L = Form · Agency · Evidence · Memory',
    },
  }
}

export function parseAxisContext(raw: string | undefined | null): AxisContext {
  if (!raw) return 'production'
  const key = raw.trim().toLowerCase().replace(/^#/, '') as AxisContext
  if ((AXIS_CONTEXTS as readonly string[]).includes(key)) return key
  throw new Error(`unknown axis context "${raw}" (known: ${AXIS_CONTEXTS.join('|')})`)
}

/** Default context for fractal/saga profile ids. */
export function defaultContextForProfile(profile: string): AxisContext {
  const p = profile.replace(/^#/, '')
  switch (p) {
    case 'line_propagate':
      return 'canon'
    case 'pe_thrift_social':
      return 'thrift'
    case 'layout_canonical':
    case 'layout_equiv_preview':
      return 'layout'
    case 'fractal_style_repo':
    case 'hybrid_organ_ladder':
      return 'research'
    case 'pe_style_lock':
    case 'pe_subject_cast':
    case 'fractal_merge':
    default:
      return 'production'
  }
}

/**
 * Estimate literacy factors from available emit/saga signals.
 * Missing signals default to neutral 1 so L stays defined.
 */
export function estimateLiteracy(input: {
  holdScore: number
  agencyRatio?: number
  formProxy?: number
  memoryProxy?: number
}): { form: number; agency: number; evidence: number; memory: number; L: number } {
  const form = clamp01(input.formProxy ?? 1)
  const agency = clamp01(input.agencyRatio ?? 1)
  const evidence = clamp01(input.holdScore)
  const memory = clamp01(input.memoryProxy ?? 1)
  return { form, agency, evidence, memory, L: literacyProduct({ form, agency, evidence, memory }) }
}

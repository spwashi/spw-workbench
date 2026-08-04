/**
 * Generalized measure protocol — %mass is one thrift family, not the kernel.
 *
 * A surface declares measurements under a **family** (mass, authority density,
 * form density, …) with an optional **scheme** (exact, band, tol, …).
 * What “file-level syntactic context” means is defined in Spw registries
 * (operator + identifier + subject binding), not hard-coded forever as
 * @self + lines/bytes.
 *
 * Host extractors (fs, graph, form scan) stay at the edge. Seed stays portable:
 * read declarations, apply schemes, disclose unmeasurable keys.
 *
 * @see .spw/registries/measure-context.spw
 * @see docs/theory/spw/measure-context-kernel.spw
 * @see packages/spw-seed/src/canonical/self-mass.ts  (thrift specialization)
 */

import { parse } from '../parser'
import type { Span } from '../types'

// ── Schemes & verdicts ──────────────────────────────────────────

export type EvalSchemeId =
  | 'exact'
  | 'band'
  | 'tol'
  | 'ratio'
  | 'profile'
  | 'prior'
  | string

export interface EvalScheme {
  id: EvalSchemeId
  /** Absolute tolerance (tol scheme). */
  abs?: number
  /** Relative tolerance 0–1 (tol scheme). */
  rel?: number
  lo?: number
  hi?: number
  profile?: string
  prior?: string
}

export type MeasureVerdict =
  | 'match'
  | 'drift'
  | 'band_ok'
  | 'soft_miss'
  | 'undeclared'
  | 'unmeasurable'
  | 'scheme_mismatch'

// ── Attentional scope · perceptive plane · representational form ─

/**
 * What slice of the world a measure algorithm attends to.
 * Selected before observation — the “where” of measurement.
 */
export type AttentionalScopeKind =
  | 'subject_file' // @self (or defined subject bind)
  | 'surface' // the .spw surface itself
  | 'selection' // SelectionIR / globs
  | 'ego' // graph neighborhood
  | 'window' // stream / line window
  | 'corpus' // multi-root
  | 'register' // runtime register focus
  | string

export interface AttentionalScope {
  kind: AttentionalScopeKind
  /** Path, uri, or opaque id. */
  target?: string
  depth?: number
  /** Lens id when scope is lens-relative. */
  lensId?: string
}

/**
 * How the algorithm “sees” — which perceptive plane.
 * Orthogonal to scope (same file, different planes).
 */
export type PerceptivePlane =
  | 'thrift' // lines/bytes/tokens
  | 'syntax' // form/ops/braces
  | 'graph' // pathRefs / topology
  | 'flow' // protocol roles / schedules
  | 'authority' // writes/joins/reads claims
  | 'probe' // wonder/probe density
  | 'valence' // quality marks
  | 'runtime' // register/substrate
  | string

/**
 * Representational form the algorithm produces or consumes.
 * Aligns with IR kinds when projected into the interconnect graph.
 */
export type RepresentationalForm =
  | 'scalar'
  | 'vector'
  | 'table'
  | 'graph'
  | 'stream'
  | 'envelope'
  | 'ir_slice'
  | string

// ── Family & algorithm (registry-shaped) ────────────────────────

/**
 * A measure family is named by operator+identifier product in Spw
 * (e.g. `%` + `mass` → thrift family), not by a closed TS enum.
 */
export interface MeasureFamilyDef {
  /** Family id: mass, density, authority, … */
  id: string
  /** Operator sigil that opens the declaration (usually %). */
  operator: string
  /** Identifier after operator in surface grammar (%mass, %density). */
  identifier: string
  /** Default plane for this family. */
  plane: PerceptivePlane
  /** Default attentional scope kind. */
  scopeKind: AttentionalScopeKind
  /** How subject is bound on the surface (self, path, focus, …). */
  subjectBind: 'self' | 'path' | 'focus' | 'selection' | 'none' | string
  /** Keys this family knows (extensible via registry). */
  keys: string[]
  /** Default evaluation scheme. */
  defaultScheme: EvalSchemeId
  /** Algorithm id (host or Spw-described). */
  algorithm: string
  /** Representational form of observations. */
  form: RepresentationalForm
  note?: string
}

/** Algorithm recipe — may be host-implemented or Spw-described steps. */
export interface MeasureAlgorithmDef {
  id: string
  plane: PerceptivePlane
  scopeKind: AttentionalScopeKind
  form: RepresentationalForm
  /** Ordered steps (Spw can list these as strings / refs). */
  steps: string[]
  /** IR kinds produced/consumed when linked into interconnect. */
  ir?: { consumes?: string[]; produces?: string[] }
  host?: string
  note?: string
}

// ── Declarations & observations ─────────────────────────────────

export interface DeclaredMetric {
  key: string
  value: number
  span?: Span
  scheme?: EvalScheme
}

/**
 * One declared measure block on a surface — generalized from MassDeclaration.
 */
export interface MeasureDeclaration {
  family: string
  operator: string
  identifier: string
  /** Subject as written (e.g. @self path). */
  subject?: string
  subjectSpan?: Span
  metrics: Record<string, DeclaredMetric>
  otherKeys: string[]
  facetSpan?: Span
  /** File-level context assumed from family def. */
  context: {
    scope: AttentionalScope
    plane: PerceptivePlane
    form: RepresentationalForm
    algorithm: string
  }
}

export interface ObservedMetric {
  key: string
  value?: number
  unmeasurable?: boolean
  note?: string
}

export interface MeasureReconciliation {
  family: string
  key: string
  declared?: number
  observed?: number
  scheme: EvalScheme
  verdict: MeasureVerdict
  span?: Span
}

// ── Built-in bootstrap (mass as thrift specialization) ──────────

/** Bootstrap family: %mass — thrift plane, subject_file scope, @self bind. */
export const MASS_FAMILY: MeasureFamilyDef = {
  id: 'mass',
  operator: '%',
  identifier: 'mass',
  plane: 'thrift',
  scopeKind: 'subject_file',
  subjectBind: 'self',
  keys: ['lines', 'bytes'],
  defaultScheme: 'exact',
  algorithm: 'thrift.file_physics',
  form: 'vector',
  note: 'Legacy compelling product; specialization of measure protocol, not the kernel.',
}

export const THRIFT_FILE_ALGORITHM: MeasureAlgorithmDef = {
  id: 'thrift.file_physics',
  plane: 'thrift',
  scopeKind: 'subject_file',
  form: 'vector',
  steps: [
    'resolve subject from surface bind (self → path)',
    'read host bytes',
    'count lines and bytes',
    'return ObservedMetric[]',
  ],
  ir: { consumes: ['selection', 'identity'], produces: ['measure'] },
  host: 'fs',
  note: 'CLI/host implements observation; seed reconciles only.',
}

export const BUILTIN_FAMILIES: readonly MeasureFamilyDef[] = [
  MASS_FAMILY,
  {
    id: 'density',
    operator: '%',
    identifier: 'density',
    plane: 'syntax',
    scopeKind: 'surface',
    subjectBind: 'none',
    keys: ['ops', 'depth', 'frames'],
    defaultScheme: 'band',
    algorithm: 'syntax.form_density',
    form: 'vector',
    note: 'Proposed — observe via FormIR / geometry.',
  },
  {
    id: 'authority',
    operator: '%',
    identifier: 'authority',
    plane: 'authority',
    scopeKind: 'subject_file',
    subjectBind: 'self',
    keys: ['writes', 'joins', 'reads'],
    defaultScheme: 'exact',
    algorithm: 'authority.host_extract',
    form: 'table',
    note: 'Claim streams !writes/&joins remain; %authority is measure-shaped twin.',
  },
]

export const BUILTIN_ALGORITHMS: readonly MeasureAlgorithmDef[] = [
  THRIFT_FILE_ALGORITHM,
  {
    id: 'syntax.form_density',
    plane: 'syntax',
    scopeKind: 'surface',
    form: 'vector',
    steps: [
      'parse surface (or reuse ParseIR)',
      'inspectGeometry / FormIR',
      'emit ops%, maxDepth, frame count',
    ],
    ir: { consumes: ['parse', 'form'], produces: ['measure'] },
    host: 'seed-geometry',
  },
  {
    id: 'attention.scope_walk',
    plane: 'graph',
    scopeKind: 'selection',
    form: 'stream',
    steps: [
      'take AttentionalScope / SelectionIR',
      'apply lens stack',
      'for each uri: open perceptive plane',
      'precipitate MeasureIR rows',
      'optional crystallize window',
    ],
    ir: {
      consumes: ['selection', 'attention', 'lens'],
      produces: ['measure', 'stream', 'precipitate'],
    },
    host: 'runtime-session',
    note: 'Scalable kernel loop: Spw describes the walk; host runs extractors per plane.',
  },
]

// ── Scheme application ──────────────────────────────────────────

export function defaultScheme(id: EvalSchemeId = 'exact'): EvalScheme {
  return { id }
}

/**
 * Reconcile one declared metric against observation under a scheme.
 */
export function reconcileMetric(
  declared: DeclaredMetric | undefined,
  observed: ObservedMetric | undefined,
  scheme: EvalScheme = defaultScheme('exact'),
): MeasureReconciliation {
  const key = declared?.key ?? observed?.key ?? '?'
  if (!declared) {
    return {
      family: '',
      key,
      observed: observed?.value,
      scheme,
      verdict: 'undeclared',
    }
  }
  if (!observed || observed.unmeasurable || observed.value === undefined) {
    return {
      family: '',
      key: declared.key,
      declared: declared.value,
      scheme,
      verdict: 'unmeasurable',
      span: declared.span,
    }
  }

  const d = declared.value
  const o = observed.value
  const sch = declared.scheme ?? scheme
  let verdict: MeasureVerdict = 'drift'

  switch (sch.id) {
    case 'exact':
      verdict = d === o ? 'match' : 'drift'
      break
    case 'tol': {
      const abs = sch.abs ?? 0
      const rel = sch.rel ?? 0
      const ok = Math.abs(d - o) <= abs || (d !== 0 && Math.abs(d - o) / Math.abs(d) <= rel)
      verdict = ok ? 'match' : 'drift'
      break
    }
    case 'band': {
      const lo = sch.lo ?? d
      const hi = sch.hi ?? d
      verdict = o >= lo && o <= hi ? 'band_ok' : 'drift'
      break
    }
    case 'ratio': {
      if (d === 0) verdict = o === 0 ? 'match' : 'drift'
      else {
        const r = o / d
        const lo = sch.lo ?? 0.9
        const hi = sch.hi ?? 1.1
        verdict = r >= lo && r <= hi ? 'match' : 'soft_miss'
      }
      break
    }
    default:
      verdict = 'scheme_mismatch'
  }

  return {
    family: '',
    key: declared.key,
    declared: d,
    observed: o,
    scheme: sch,
    verdict,
    span: declared.span,
  }
}

export function reconcileFamily(
  family: string,
  metrics: Record<string, DeclaredMetric>,
  observations: Record<string, ObservedMetric>,
  scheme: EvalScheme = defaultScheme('exact'),
  knownKeys?: readonly string[],
): MeasureReconciliation[] {
  const keys = new Set([
    ...Object.keys(metrics),
    ...Object.keys(observations),
    ...(knownKeys ?? []),
  ])
  const out: MeasureReconciliation[] = []
  for (const key of keys) {
    const row = reconcileMetric(metrics[key], observations[key], scheme)
    row.family = family
    if (knownKeys && !knownKeys.includes(key) && metrics[key] && !observations[key]) {
      row.verdict = 'unmeasurable'
    }
    out.push(row)
  }
  return out
}

// ── Registry load from Spw source (definition surfaces) ─────────

export interface MeasureContextRegistry {
  families: MeasureFamilyDef[]
  algorithms: MeasureAlgorithmDef[]
  /** Operator+identifier → family id. */
  byProduct: Record<string, string>
}

function productKey(operator: string, identifier: string): string {
  return `${operator}${identifier}`
}

/**
 * Bootstrap registry (TS). Spw definition surfaces *override/extend* via
 * {@link loadMeasureContextFromSpw}.
 */
export function bootstrapMeasureRegistry(): MeasureContextRegistry {
  const families = [...BUILTIN_FAMILIES]
  const algorithms = [...BUILTIN_ALGORITHMS]
  const byProduct: Record<string, string> = {}
  for (const f of families) {
    byProduct[productKey(f.operator, f.identifier)] = f.id
  }
  return { families, algorithms, byProduct }
}

/**
 * Load / merge measure-context definitions from a Spw registry source.
 *
 * Recognizes frames shaped like:
 *
 *   ^["family"]{ id: mass , operator: "%" , identifier: mass , plane: thrift , ... }
 *   ^["algorithm"]{ id: thrift.file_physics , plane: thrift , steps: #[ ... ] }
 *
 * Loose reader: string/identifier literals; missing fields keep defaults from mass-like template.
 */
export function loadMeasureContextFromSpw(
  source: string,
  base: MeasureContextRegistry = bootstrapMeasureRegistry(),
): MeasureContextRegistry {
  const result = parse(source)
  if (!result.ast) return base

  const families = [...base.families]
  const algorithms = [...base.algorithms]
  const byProduct = { ...base.byProduct }

  const famById = new Map(families.map(f => [f.id, f]))
  const algoById = new Map(algorithms.map(a => [a.id, a]))

  walk(result.ast, node => {
    if (node.type !== 'Operation') return
    const op = node as {
      operator?: { value?: string }
      frame?: { content?: unknown[] }
      body?: { content?: unknown[] }
    }
    // ^["family"]{ ... } or ^["algorithm"]{ ... }
    if (op.operator?.value !== '^') return
    const label = frameLabel(op.frame)
    if (label !== 'family' && label !== 'algorithm') return
    const fields = bodyFields(op.body)

    if (label === 'family') {
      const id = strField(fields, 'id') ?? strField(fields, 'identifier') ?? 'anon'
      const identifier = strField(fields, 'identifier') ?? id
      const operator = strField(fields, 'operator') ?? '%'
      const prev = famById.get(id)
      const def: MeasureFamilyDef = {
        id,
        operator,
        identifier,
        plane: (strField(fields, 'plane') as PerceptivePlane) ?? prev?.plane ?? 'thrift',
        scopeKind: (strField(fields, 'scope') as AttentionalScopeKind) ?? prev?.scopeKind ?? 'subject_file',
        subjectBind: strField(fields, 'subject') ?? prev?.subjectBind ?? 'self',
        keys: listField(fields, 'keys') ?? prev?.keys ?? ['lines', 'bytes'],
        defaultScheme: (strField(fields, 'scheme') as EvalSchemeId) ?? prev?.defaultScheme ?? 'exact',
        algorithm: strField(fields, 'algorithm') ?? prev?.algorithm ?? 'thrift.file_physics',
        form: (strField(fields, 'form') as RepresentationalForm) ?? prev?.form ?? 'vector',
        note: strField(fields, 'note') ?? prev?.note,
      }
      famById.set(id, def)
      byProduct[productKey(operator, identifier)] = id
    }

    if (label === 'algorithm') {
      const id = strField(fields, 'id') ?? 'anon'
      const prev = algoById.get(id)
      const def: MeasureAlgorithmDef = {
        id,
        plane: (strField(fields, 'plane') as PerceptivePlane) ?? prev?.plane ?? 'thrift',
        scopeKind: (strField(fields, 'scope') as AttentionalScopeKind) ?? prev?.scopeKind ?? 'surface',
        form: (strField(fields, 'form') as RepresentationalForm) ?? prev?.form ?? 'vector',
        steps: listField(fields, 'steps') ?? prev?.steps ?? [],
        host: strField(fields, 'host') ?? prev?.host,
        note: strField(fields, 'note') ?? prev?.note,
        ir: prev?.ir,
      }
      algoById.set(id, def)
    }
  })

  return {
    families: [...famById.values()],
    algorithms: [...algoById.values()],
    byProduct,
  }
}

export function resolveFamily(
  registry: MeasureContextRegistry,
  operator: string,
  identifier: string,
): MeasureFamilyDef | undefined {
  const id = registry.byProduct[productKey(operator, identifier)]
  if (!id) return undefined
  return registry.families.find(f => f.id === id)
}

/**
 * File-level syntactic context assumed when seeing `%mass` (or other family)
 * on a surface — from registry definition, not ad-hoc CLI knowledge.
 */
export function contextForFamily(family: MeasureFamilyDef, subject?: string): MeasureDeclaration['context'] {
  return {
    scope: { kind: family.scopeKind, target: subject },
    plane: family.plane,
    form: family.form,
    algorithm: family.algorithm,
  }
}

// ── Tiny AST helpers (declaration-oriented) ─────────────────────

function walk(node: unknown, visit: (n: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  if (typeof obj.type === 'string') visit(obj)
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) for (const item of value) walk(item, visit)
    else if (value && typeof value === 'object') walk(value, visit)
  }
}

function frameLabel(frame: unknown): string | undefined {
  const f = frame as { content?: unknown[] } | undefined
  if (!f?.content?.length) return undefined
  for (const c of f.content) {
    const t = c as { type?: string; token?: { value?: string }; terms?: unknown[] }
    if (t.type === 'Literal' || t.type === 'Identifier') {
      return unquote(t.token?.value ?? '')
    }
    if (t.type === 'Expression' && t.terms?.[0]) {
      const term = t.terms[0] as { token?: { value?: string }; type?: string }
      if (term.token?.value) return unquote(term.token.value)
    }
  }
  return undefined
}

function bodyFields(body: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const b = body as { content?: unknown[] } | undefined
  if (!b?.content) return out
  for (const item of b.content) {
    walk(item, n => {
      if (n.type !== 'Binding' && n.type !== 'Expression') return
      // Binding-like: key + value on expression terms
    })
    // Heuristic: Binding nodes
    const n = item as Record<string, unknown>
    if (n.type === 'Binding') {
      const key = bindingKey(n.key)
      if (key) out[key] = n.value
    }
    // Sequence of bindings inside expression
    if (n.type === 'Expression') {
      const terms = (n.terms as unknown[]) ?? []
      for (const term of terms) {
        const t = term as Record<string, unknown>
        if (t.type === 'Binding') {
          const key = bindingKey(t.key)
          if (key) out[key] = t.value
        }
      }
    }
  }
  // Also deep-walk for Binding
  walk(body, n => {
    if (n.type !== 'Binding') return
    const key = bindingKey(n.key)
    if (key && out[key] === undefined) out[key] = n.value
  })
  return out
}

function bindingKey(key: unknown): string | undefined {
  const k = key as Record<string, unknown> | undefined
  if (!k) return undefined
  if (k.type === 'Identifier') return ((k.token as { value?: string })?.value ?? '').trim() || undefined
  if (k.type === 'Reference') return (k.raw as string | undefined)?.trim() || undefined
  if (k.type === 'Expression') {
    const terms = k.terms as unknown[] | undefined
    if (terms?.[0]) return bindingKey(terms[0])
  }
  return undefined
}

function unquote(raw: string): string {
  const t = raw.trim()
  if (t.length >= 2) {
    const a = t[0]
    const b = t[t.length - 1]
    if ((a === '"' || a === "'" || a === '`') && a === b) return t.slice(1, -1)
  }
  return t
}

function strField(fields: Record<string, unknown>, name: string): string | undefined {
  const v = fields[name]
  if (v === undefined) return undefined
  return scalarString(v)
}

function listField(fields: Record<string, unknown>, name: string): string[] | undefined {
  const v = fields[name]
  if (v === undefined) return undefined
  const node = v as Record<string, unknown>
  // Frame/set #[a, b] or body list
  const content =
    (node.content as unknown[]) ??
    (node.terms as unknown[]) ??
    (node.type === 'Expression' ? (node.terms as unknown[]) : undefined)
  if (!Array.isArray(content)) {
    const s = scalarString(v)
    return s ? [s] : undefined
  }
  const out: string[] = []
  for (const c of content) {
    const s = scalarString(c)
    if (s) out.push(s)
  }
  return out.length ? out : undefined
}

function scalarString(node: unknown): string | undefined {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  const n = node as Record<string, unknown>
  if (!n || typeof n !== 'object') return undefined
  if (n.type === 'Literal' || n.type === 'Identifier') {
    return unquote((n.token as { value?: string })?.value ?? '')
  }
  if (n.type === 'Reference') return (n.raw as string) ?? undefined
  if (n.type === 'Expression' && Array.isArray(n.terms) && n.terms.length === 1) {
    return scalarString(n.terms[0])
  }
  return undefined
}

/**
 * Self-mass — thrift specialization of the measure protocol.
 *
 * **Not the measure kernel.** Kernel vocabulary (families, schemes, scopes,
 * planes, algorithms) lives in `measure-protocol.ts` and
 * `.spw/registries/measure-context.spw`. This module implements one family:
 *
 *   operator `%` + identifier `mass` → plane thrift, scope subject_file,
 *   subject bind `@self`, algorithm `thrift.file_physics`, keys lines/bytes.
 *
 *   ^["module"]{
 *     @self: ~"../js/kernel/dom-contracts.js"
 *     %mass{ lines: 2315, bytes: 69219 }
 *   }
 *
 * Hand-probed numbers rot: the file changes, the facet does not, and nothing
 * says so. This reads the declaration and the subject so the two can be
 * compared, and returns spans so a reconciler can rewrite the numbers in place
 * without reformatting the surface around them.
 *
 * Measurement only — resolving `@self` against a filesystem belongs to the
 * caller, which keeps this module portable.
 *
 * @see measure-protocol.ts
 * @see .spw/registries/measure-context.spw
 */

import { parse } from '../parser'
import type { Span } from '../types'

/** A number this surface declares about its subject. */
export interface DeclaredMeasure {
  key: string
  value: number
  /** Span of the literal alone, so a rewrite touches only the digits. */
  span: Span
}

export interface MassDeclaration {
  /** Path from `@self`, exactly as written (still relative to the surface). */
  self: string
  selfSpan: Span
  /** Numeric entries of the `%mass` facet, keyed by name. */
  measures: Record<string, DeclaredMeasure>
  /** Non-numeric entries (`eager: #yes`), carried through untouched. */
  otherKeys: string[]
  massSpan?: Span
}

/** What a subject file actually measures. */
export interface MeasuredMass {
  lines: number
  bytes: number
}

export type MassVerdict = 'match' | 'drift' | 'undeclared' | 'unmeasurable'

export interface MassReconciliation {
  key: string
  declared?: number
  measured?: number
  verdict: MassVerdict
  span?: Span
}

/** Keys this module knows how to measure. Others are reported, never rewritten. */
export const MEASURABLE_KEYS = ['lines', 'bytes'] as const
export type MeasurableKey = (typeof MEASURABLE_KEYS)[number]

function unquote(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]
    if ((first === '"' || first === "'" || first === '`') && first === last) {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

function walk(node: unknown, visit: (n: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  if (typeof obj.type === 'string') visit(obj)
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visit)
    } else if (value && typeof value === 'object') {
      walk(value, visit)
    }
  }
}

/** Sole term of a single-term expression, or undefined. */
function loneTerm(expr: unknown): Record<string, unknown> | undefined {
  const e = expr as { terms?: unknown[] } | undefined
  if (!e?.terms || e.terms.length !== 1) return undefined
  return e.terms[0] as Record<string, unknown>
}

function bindingKeyName(key: unknown): string | undefined {
  const k = key as Record<string, unknown> | undefined
  if (!k) return undefined
  if (k.type === 'Identifier') {
    return ((k.token as { value?: string })?.value ?? '').trim() || undefined
  }
  if (k.type === 'Reference') {
    return (k.raw as string | undefined)?.trim() || undefined
  }
  return undefined
}

/**
 * Read every `@self` + `%mass` pairing in `source`.
 *
 * Pairs are matched by containing frame: a surface may describe several
 * modules, and a `%mass` belongs to the `@self` it shares a body with.
 */
export function readMassDeclarations(source: string): MassDeclaration[] {
  const result = parse(source)
  if (!result.ast) return []

  const selves: { path: string; span: Span }[] = []
  const masses: {
    span: Span
    measures: Record<string, DeclaredMeasure>
    otherKeys: string[]
  }[] = []

  walk(result.ast, node => {
    if (node.type === 'Binding' && bindingKeyName(node.key) === 'self') {
      const term = loneTerm(node.value)
      if (term?.type === 'PathRef') {
        const token = (term.path as { token?: { value?: string } })?.token
        if (token?.value) {
          selves.push({ path: unquote(token.value), span: term.span as Span })
        }
      }
      return
    }

    if (
      node.type === 'Operation' &&
      (node.operator as { value?: string })?.value === '%' &&
      (node.operatorLabel as { value?: string })?.value === 'mass'
    ) {
      const measures: Record<string, DeclaredMeasure> = {}
      const otherKeys: string[] = []
      const sequence = (node.body as { sequence?: { expressions?: unknown[] } })?.sequence
      for (const expr of sequence?.expressions ?? []) {
        const term = loneTerm(expr)
        if (term?.type !== 'Binding') continue
        const key = bindingKeyName(term.key)
        if (!key) continue
        const valueTerm = loneTerm(term.value)
        const token = (valueTerm as { token?: { type?: string; value?: string } } | undefined)?.token
        if (valueTerm?.type === 'Literal' && token?.type === 'NUMBER') {
          measures[key] = {
            key,
            value: Number(token.value),
            span: valueTerm.span as Span,
          }
        } else {
          otherKeys.push(key)
        }
      }
      masses.push({ span: node.span as Span, measures, otherKeys })
    }
  })

  // Pair each `%mass` with the nearest preceding `@self`; a surface with one of
  // each is the common case and falls out of this too.
  return selves.map((self, i) => {
    const next = selves[i + 1]
    const mass = masses.find(
      m =>
        m.span.start.offset > self.span.start.offset &&
        (!next || m.span.start.offset < next.span.start.offset),
    )
    return {
      self: self.path,
      selfSpan: self.span,
      measures: mass?.measures ?? {},
      otherKeys: mass?.otherKeys ?? [],
      massSpan: mass?.span,
    }
  })
}

/**
 * Measure subject text.
 *
 * `lines` counts newline-terminated lines the way `wc -l` does, so a declared
 * number probed by hand at a shell agrees with this one.
 */
export function measureMass(text: string): MeasuredMass {
  let lines = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lines++
  }
  return {
    lines,
    bytes: Buffer.byteLength(text, 'utf8'),
  }
}

/**
 * Compare what a surface claims against what its subject measures.
 *
 * Keys outside {@link MEASURABLE_KEYS} come back as `unmeasurable` rather than
 * being dropped: the surface said something this probe cannot check, and
 * silence would read as agreement.
 */
export function reconcileMass(
  declaration: MassDeclaration,
  measured: MeasuredMass,
): MassReconciliation[] {
  const out: MassReconciliation[] = []

  for (const key of MEASURABLE_KEYS) {
    const declared = declaration.measures[key]
    const actual = measured[key]
    if (!declared) {
      out.push({ key, measured: actual, verdict: 'undeclared' })
      continue
    }
    out.push({
      key,
      declared: declared.value,
      measured: actual,
      verdict: declared.value === actual ? 'match' : 'drift',
      span: declared.span,
    })
  }

  for (const [key, declared] of Object.entries(declaration.measures)) {
    if ((MEASURABLE_KEYS as readonly string[]).includes(key)) continue
    out.push({ key, declared: declared.value, verdict: 'unmeasurable', span: declared.span })
  }
  for (const key of declaration.otherKeys) {
    out.push({ key, verdict: 'unmeasurable' })
  }

  return out
}

/**
 * Rewrite drifted numbers in place.
 *
 * Edits are applied back-to-front so earlier spans stay valid, and only the
 * digits of a drifted literal are touched — the surface around them, including
 * whatever formatting profile it follows, is left exactly as written.
 */
export function applyMassCorrections(
  source: string,
  entries: MassReconciliation[],
): { source: string; applied: number } {
  const edits = entries
    .filter(e => e.verdict === 'drift' && e.span && e.measured !== undefined)
    .sort((a, b) => b.span!.start.offset - a.span!.start.offset)

  let next = source
  for (const edit of edits) {
    const { start, end } = edit.span!
    next = next.slice(0, start.offset) + String(edit.measured) + next.slice(end.offset)
  }

  return { source: next, applied: edits.length }
}

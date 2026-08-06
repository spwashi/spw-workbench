/**
 * Composition forms — geometric multi-term surfaces as intermediate products.
 *
 * PathRef overfit: ~<name> is membrane potential, not a path.
 * These forms compose Acts and Bounds without camelCase kv bags.
 *
 * Forms:
 *   conceptual_probe   — <file>@"appendix.spw"?  (membrane · perspective · probe)
 *   act_consequence    — !{…} ~<consequence> | ?{…} ~<consequence>
 *                        (and observation-wrapped (!{…}) / (?{…}))
 *
 * @see docs/theory/spw/operator-atlas.spw
 * @see docs/theory/spw/em-fixity-association.spw
 * @see docs/theory/spw/onf.spw (postfix still sequential at surface; fold here)
 */

import type {
  ASTNode,
  BodyNode,
  CapsuleNode,
  ExpressionNode,
  LiteralNode,
  OperationNode,
  PathRefNode,
  ScopeNode,
  SeedNode,
  SequenceNode,
  TermNode,
} from '../types'
import { parse } from '../parser'
import { facet, formatSpwCard } from './spw-card'

export const COMPOSITION_FORM_VERSION = 'spw.composition_form/1' as const

export type CompositionKind = 'conceptual_probe' | 'act_consequence'

export interface ConceptualProbeForm {
  version: typeof COMPOSITION_FORM_VERSION
  kind: 'conceptual_probe'
  /** Host membrane / file capsule or path. */
  host: TermNode
  /** Lens path string (appendix). */
  lens: string
  /** Whether trailing ? probe was present. */
  probe: boolean
  /** Observation wrap around host if any. */
  scopedHost: boolean
}

export interface ActConsequenceForm {
  version: typeof COMPOSITION_FORM_VERSION
  kind: 'act_consequence'
  /**
   * Leading Act with body:
   *   !{…} — discharge / fire
   *   ?{…} — probe / query (same membrane link; different Act)
   */
  act: OperationNode
  /** '!' discharge or '?' probe. */
  head: '!' | '?'
  /** ~ membrane potential (capsule subject) or residual term. */
  consequence: TermNode
  /** Act wrapped in () observation scope. */
  scoped: boolean
  /** Consequence channel/name when capsule. */
  consequenceName?: string
}

export type CompositionForm = ConceptualProbeForm | ActConsequenceForm

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith('`') && value.endsWith('`')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function termOf(expr: ExpressionNode | undefined): TermNode | undefined {
  if (!expr?.terms?.length) return undefined
  if (expr.terms.length === 1) return expr.terms[0]
  return undefined
}

function isOp(term: TermNode | undefined, value: string): term is OperationNode {
  return !!term && term.type === 'Operation' && term.operator?.value === value
}

function isCapsule(term: TermNode | undefined): term is CapsuleNode {
  return !!term && term.type === 'Capsule'
}

function isLiteralString(term: TermNode | undefined): term is LiteralNode {
  return !!term && term.type === 'Literal' && term.token?.type === 'STRING'
}

function isPathRef(term: TermNode | undefined): term is PathRefNode {
  return !!term && term.type === 'PathRef'
}

function isScope(term: TermNode | undefined): term is ScopeNode {
  return !!term && term.type === 'Scope'
}

function isBangBody(term: TermNode | undefined): term is OperationNode {
  return isOp(term, '!') && !!term.body
}

/** !{…} discharge or ?{…} probe — body required for act→consequence silhouette. */
function isHeadBody(term: TermNode | undefined): term is OperationNode {
  return !!term && term.type === 'Operation' && !!term.body
    && (term.operator?.value === '!' || term.operator?.value === '?')
}

function headOf(term: OperationNode): '!' | '?' {
  return term.operator?.value === '?' ? '?' : '!'
}

function capsuleChannelName(cap: CapsuleNode): string | undefined {
  if (cap.tag?.value) return cap.tag.value
  if (cap.channel?.type === 'Identifier') return cap.channel.token?.value
  if (cap.channel?.type === 'Literal') return unquote(String(cap.channel.token?.value ?? ''))
  // interior sequence: single id, or path-shaped id/id/id with / connectors
  const interior = cap.interior
  if (interior?.expressions?.length === 1) {
    const expr = interior.expressions[0]!
    const terms = expr.terms ?? []
    if (terms.length === 1 && terms[0]?.type === 'Identifier') {
      return terms[0].token?.value
    }
    if (terms.length > 1) {
      const parts: string[] = []
      for (let i = 0; i < terms.length; i++) {
        const t = terms[i]
        if (t?.type === 'Identifier') parts.push(t.token.value)
        else if (t?.type === 'Literal') parts.push(unquote(String(t.token.value)))
        else return undefined
        const conn = expr.connectors?.[i]
        if (conn && i < terms.length - 1) {
          parts.push(conn.value === '..' ? '..' : conn.value)
        }
      }
      // connectors are between terms; rebuild path
      if (expr.connectors?.length) {
        let raw = ''
        for (let i = 0; i < terms.length; i++) {
          const t = terms[i]!
          if (t.type === 'Identifier') raw += t.token.value
          else if (t.type === 'Literal') raw += unquote(String(t.token.value))
          if (i < (expr.connectors?.length ?? 0)) {
            raw += expr.connectors[i]!.value
          }
        }
        return raw || undefined
      }
      return parts.join('/') || undefined
    }
  }
  return undefined
}

function lensFromTerm(term: TermNode | undefined): string | undefined {
  if (!term) return undefined
  if (isLiteralString(term)) return unquote(String(term.token.value))
  if (isPathRef(term)) return unquote(String(term.path.token.value))
  if (isOp(term, '@') && term.subject) return lensFromTerm(term.subject)
  return undefined
}

/**
 * Fold a top-level sequence into a composition form when the silhouette matches.
 * Returns null if the sequence is ordinary juxtaposition.
 */
export function recognizeCompositionSequence(
  sequence: SequenceNode,
): CompositionForm | null {
  const exprs = sequence.expressions ?? []
  if (exprs.length < 2) return null

  const terms = exprs.map(e => termOf(e)).filter(Boolean) as TermNode[]

  // ── conceptual_probe: host · @lens · ?  or  host · @ · lens · ? ──
  // Patterns:
  //   Capsule / PathRef / Identifier , Operation@ (with subject lens), Operation?
  //   Capsule , Operation@, Literal, Operation?
  {
    const probe = recognizeConceptualProbe(terms)
    if (probe) return probe
  }

  // ── act_consequence: !{…} · ~<…>  or  (!{…}) · ~<…> ──
  {
    const ac = recognizeActConsequence(terms)
    if (ac) return ac
  }

  return null
}

function recognizeConceptualProbe(terms: TermNode[]): ConceptualProbeForm | null {
  if (terms.length < 2) return null

  let i = 0
  let scopedHost = false
  let host: TermNode | undefined = terms[0]

  // Optional observation wrap: ( <file> ) or ( host )
  if (isScope(host)) {
    scopedHost = true
    const inner = host.sequence?.expressions?.[0]
      ? termOf(host.sequence.expressions[0])
      : undefined
    if (!inner) return null
    host = inner
    i = 0 // still consume host from terms[0] as scope; next from 1
  }

  // Host must be membrane-ish or path
  if (!isCapsule(host) && !isPathRef(host) && host.type !== 'Identifier') {
    // bare scope already unwrapped
    if (!scopedHost) return null
  }

  // Rest after host
  const rest = scopedHost ? terms.slice(1) : terms.slice(1)
  if (rest.length === 0) return null

  let lens: string | undefined
  let probe = false
  let j = 0

  // @"lens" as single op with subject
  if (isOp(rest[j], '@')) {
    lens = lensFromTerm(rest[j])
    if (!lens && rest[j + 1]) {
      // bare @ then literal
      lens = lensFromTerm(rest[j + 1])
      if (lens) j += 1
    }
    j += 1
  } else {
    return null
  }

  if (!lens) return null

  if (rest[j] && isOp(rest[j], '?')) {
    probe = true
    j += 1
  }

  // allow trailing nothing
  if (j < rest.length) {
    // extra terms — not this form unless only whitespace-level noise
    return null
  }

  return {
    version: COMPOSITION_FORM_VERSION,
    kind: 'conceptual_probe',
    host: host!,
    lens,
    probe,
    scopedHost,
  }
}

function recognizeActConsequence(terms: TermNode[]): ActConsequenceForm | null {
  if (terms.length < 2) return null

  let act: OperationNode | undefined
  let scoped = false
  let consequence: TermNode | undefined

  // !{…} or ?{…} then ~<membrane>
  if (isHeadBody(terms[0])) {
    act = terms[0]
    consequence = terms[1]
  } else if (isScope(terms[0])) {
    scoped = true
    const innerExprs = terms[0].sequence?.expressions ?? []
    const only = innerExprs.length === 1 ? termOf(innerExprs[0]) : undefined
    if (!isHeadBody(only)) {
      const head = innerExprs.map(e => termOf(e)).find(t => isHeadBody(t))
      if (!isHeadBody(head)) return null
      act = head
    } else {
      act = only
    }
    consequence = terms[1]
  } else {
    return null
  }

  if (!act || !consequence) return null

  // consequence must be ~ membrane potential (op ~ with capsule) — not PathRef
  let consequenceName: string | undefined
  if (isOp(consequence, '~')) {
    if (isCapsule(consequence.subject)) {
      consequenceName = capsuleChannelName(consequence.subject)
    } else if (isPathRef(consequence.subject as TermNode)) {
      consequenceName = unquote(
        String((consequence.subject as PathRefNode).path?.token?.value ?? ''),
      )
    }
  } else if (isPathRef(consequence)) {
    // transitional: bare-name PathRef overfit only
    const raw = unquote(String(consequence.path.token.value))
    if (!raw.includes('/') && !raw.startsWith('.') && !/\.\w+$/.test(raw)) {
      consequenceName = raw
    } else {
      return null
    }
  } else {
    return null
  }

  return {
    version: COMPOSITION_FORM_VERSION,
    kind: 'act_consequence',
    act,
    head: headOf(act),
    consequence,
    scoped,
    consequenceName,
  }
}

/** Recognize from a full parse of source text. */
export function recognizeCompositionSource(source: string): CompositionForm | null {
  const result = parse(source.trim())
  if (!result.success || !result.ast) return null
  const seed = result.ast as SeedNode
  const expr = seed.expression
  if (!expr) return null
  if (expr.type === 'Sequence') {
    return recognizeCompositionSequence(expr)
  }
  if (expr.type === 'Expression') {
    // single expression — wrap as trivial sequence
    return recognizeCompositionSequence({
      type: 'Sequence',
      span: expr.span,
      expressions: [expr],
      separators: [],
    })
  }
  return null
}

/** Host label for dual-read / runtime (file membrane name or path). */
export function hostLabel(host: TermNode): string {
  if (isCapsule(host)) {
    return capsuleChannelName(host) ?? 'file'
  }
  if (isPathRef(host)) {
    return unquote(String(host.path.token.value))
  }
  if (host.type === 'Identifier') {
    return host.token.value
  }
  return 'host'
}

/** Intermediate ONF-ish frame description (portable JSON product). */
export function compositionToProduct(form: CompositionForm): {
  version: typeof COMPOSITION_FORM_VERSION
  kind: CompositionKind
  frames: Record<string, string | boolean | undefined>
} {
  if (form.kind === 'conceptual_probe') {
    return {
      version: COMPOSITION_FORM_VERSION,
      kind: form.kind,
      frames: {
        host: hostLabel(form.host),
        lens: form.lens,
        probe: form.probe,
        scopedHost: form.scopedHost,
        reg: 'perspective',
        eval: 'within_host_conceptual_space',
      },
    }
  }
  return {
    version: COMPOSITION_FORM_VERSION,
    kind: form.kind,
    frames: {
      head: form.head,
      act: form.head,
      consequence: form.consequenceName ?? 'membrane',
      scoped: form.scoped,
      reg: form.head === '?' ? 'probe' : 'hydrate',
      link:
        form.head === '?'
          ? 'probe_then_potential_membrane'
          : 'act_then_potential_membrane',
    },
  }
}

/** Nested-frame dual-read — geometric, not camelHump kv bags. */
export function formatCompositionSpw(form: CompositionForm): string {
  if (form.kind === 'conceptual_probe') {
    return formatSpwCard('conceptual_probe', [
      facet.group('geometry', [
        facet.atom('host', hostLabel(form.host)),
        facet.path('lens', form.lens),
        facet.flag('probe', form.probe),
        facet.flag('scoped', form.scopedHost),
      ]),
      facet.group('eval', [
        facet.str('space', 'within host membrane'),
        facet.str('lens', 'perspective @'),
        facet.str('tail', form.probe ? 'probe ?' : 'open'),
      ]),
    ])
  }
  return formatSpwCard('act_consequence', [
    facet.group('geometry', [
      facet.atom('head', form.head),
      facet.atom('consequence', form.consequenceName ?? 'membrane'),
      facet.flag('scoped', form.scoped),
    ]),
    facet.group('link', [
      facet.str(
        'from',
        form.head === '?' ? 'probe body' : 'discharge body',
      ),
      facet.str('to', 'potential membrane'),
      facet.str('not', 'PathRef'),
    ]),
  ])
}

/** Body text summary from !{…} for runtime notes. */
export function actBodySketch(act: OperationNode): string {
  const body = act.body as BodyNode | undefined
  const exprs = body?.sequence?.expressions ?? []
  const parts: string[] = []
  for (const e of exprs.slice(0, 6)) {
    const t = termOf(e)
    if (!t) continue
    if (t.type === 'Identifier') parts.push(t.token.value)
    else if (t.type === 'Literal') parts.push(unquote(String(t.token.value)))
    else parts.push(t.type)
  }
  return parts.join(' ') || '…'
}

/**
 * Authority declarations — what a module surface claims its subject may do.
 *
 *   ^["module"]{
 *     @self: ~"../js/kernel/dom-contracts.js"
 *     !writes: << dataset[*] ; style[*] >>
 *     &joins: << MutationObserver ; pointerdown >>
 *   }
 *
 * These are claims about code, and claims about code drift. A developer adds a
 * `document.addEventListener` or a `.dataset.x =` without touching the surface,
 * and the declaration quietly becomes fiction. This reads the claims so a
 * tracer can compare them against what the subject actually does.
 *
 * The stream interior is read as text rather than through its AST. `;` is a
 * sequential connector in the lexer (streams / CA pipelines), but claim split
 * still uses text so qualifier forms like `dataset[*]` stay robust — the tree
 * may fragment those, while the list-of-names reading is more faithful.
 *
 * Portable: parsing and slicing only. Inspecting the subject belongs to the
 * caller, which needs a filesystem and a JavaScript parser.
 */

import { parse } from '../parser'
import type { Span } from '../types'

/** Facets read as authority claims, keyed by the sigil+label that introduces them. */
export const AUTHORITY_FACETS = {
  '!writes': 'writes',
  '&joins': 'joins',
  '!reads': 'reads',
} as const

export type AuthorityKind = (typeof AUTHORITY_FACETS)[keyof typeof AUTHORITY_FACETS]

export interface AuthorityClaim {
  kind: AuthorityKind
  /** Name as written, without any qualifier: `dataset` from `dataset[*]`. */
  name: string
  /** Frame qualifier when present: `*` from `dataset[*]`. */
  qualifier?: string
  /** Full claim text, for reporting. */
  raw: string
  span: Span
}

export interface AuthorityDeclaration {
  /** Subject path from `@self`, as written, when the surface names one. */
  self?: string
  claims: AuthorityClaim[]
  span: Span
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

function loneTerm(expr: unknown): Record<string, unknown> | undefined {
  const e = expr as { terms?: unknown[] } | undefined
  if (!e?.terms || e.terms.length !== 1) return undefined
  return e.terms[0] as Record<string, unknown>
}

function unquote(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    if ((first === '"' || first === "'" || first === '`') && trimmed.endsWith(first)) {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

/** `!writes` from an Operation key with operator `!` and label `writes`. */
function facetName(key: unknown): string | undefined {
  const k = key as Record<string, unknown> | undefined
  if (k?.type !== 'Operation') return undefined
  const sigil = (k.operator as { value?: string })?.value
  const label = (k.operatorLabel as { value?: string })?.value
  if (!sigil || !label) return undefined
  return `${sigil}${label}`
}

/**
 * Split a stream interior into claims.
 *
 * `;` and `,` both separate; a newline does too, so a claim list written one per
 * line reads the same as one written inline.
 */
function splitClaims(
  interior: string,
  interiorStart: number,
  kind: AuthorityKind,
  source: string,
): AuthorityClaim[] {
  const out: AuthorityClaim[] = []
  let cursor = 0

  for (const piece of interior.split(/[;,\n]/)) {
    const start = cursor
    cursor += piece.length + 1

    const raw = piece.trim()
    if (!raw) continue

    const offset = interiorStart + start + piece.indexOf(raw)
    const match = /^([^[\s]+)(?:\[([^\]]*)\])?/.exec(raw)
    if (!match) continue

    out.push({
      kind,
      name: match[1]!,
      qualifier: match[2]?.trim() || undefined,
      raw,
      span: {
        start: offsetToSpanPoint(source, offset),
        end: offsetToSpanPoint(source, offset + raw.length),
      },
    })
  }

  return out
}

function offsetToSpanPoint(source: string, offset: number): Span['start'] {
  let line = 1
  let lastNewline = -1
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++
      lastNewline = i
    }
  }
  return { line, column: offset - lastNewline, offset }
}

/**
 * Read every authority facet in `source`, grouped by the surface that holds it.
 *
 * A surface with no `@self` still yields its claims — the tracer decides what to
 * do with claims it cannot attribute to a file.
 */
export function readAuthorityDeclarations(source: string): AuthorityDeclaration[] {
  const result = parse(source)
  if (!result.ast) return []

  const selves: { path: string; offset: number }[] = []
  const claims: AuthorityClaim[] = []
  let span: Span | undefined

  walk(result.ast, node => {
    if (node.type === 'Seed') span = node.span as Span

    if (node.type === 'Binding') {
      const term = loneTerm(node.value)

      const key = node.key as Record<string, unknown> | undefined
      if (key?.type === 'Reference' && (key.raw as string | undefined)?.trim() === 'self') {
        if (term?.type === 'PathRef') {
          const token = (term.path as { token?: { value?: string } })?.token
          if (token?.value) {
            selves.push({
              path: unquote(token.value),
              offset: (term.span as Span).start.offset,
            })
          }
        }
        return
      }

      const facet = facetName(node.key)
      const kind = facet
        ? AUTHORITY_FACETS[facet as keyof typeof AUTHORITY_FACETS]
        : undefined
      if (!kind || term?.type !== 'Stream') return

      // Slice between the delimiters rather than reassembling AST fragments.
      const open = term.open as { span: Span }
      const close = term.close as { span: Span } | undefined
      const from = open.span.end.offset
      const to = close?.span.start.offset ?? from
      claims.push(...splitClaims(source.slice(from, to), from, kind, source))
    }
  })

  if (claims.length === 0) return []

  // Attribute each claim to the nearest preceding `@self`, mirroring how a
  // surface reads top to bottom. A file may describe several modules, and
  // merging their claims would check one subject against another's authority.
  const grouped = new Map<string, AuthorityClaim[]>()
  const pathFor = new Map<string, string | undefined>()

  for (const claim of claims) {
    const owner = selves
      .filter(s => s.offset < claim.span.start.offset)
      .reduce<{ path: string; offset: number } | undefined>(
        (best, cur) => (!best || cur.offset > best.offset ? cur : best),
        undefined,
      )
    const key = owner ? `${owner.offset}` : ''
    pathFor.set(key, owner?.path)
    const bucket = grouped.get(key)
    if (bucket) bucket.push(claim)
    else grouped.set(key, [claim])
  }

  return [...grouped.entries()].map(([key, group]) => ({
    self: pathFor.get(key),
    claims: group,
    span: span!,
  }))
}

/** What a subject file was observed to actually do. */
export interface ObservedAuthority {
  kind: AuthorityKind
  name: string
  /** Where in the subject, for reporting: `path:line`. */
  sites: string[]
}

export type AuthorityVerdict = 'declared' | 'leak' | 'stale'

export interface AuthorityFinding {
  kind: AuthorityKind
  name: string
  verdict: AuthorityVerdict
  /** Subject sites, when observed. */
  sites?: string[]
  /** Declaration span, when declared. */
  span?: Span
}

/**
 * Compare declared authority against observed authority.
 *
 * - `leak` — the subject does it and the surface never said so. This is the
 *   finding that matters: authority a reader of the surface cannot know about.
 * - `stale` — the surface claims it and the subject no longer does it. Weaker,
 *   but it is how a declaration becomes decorative.
 *
 * A claim qualified `[*]` matches any observed name sharing its head, so
 * `dataset[*]` covers every `dataset` write rather than needing one claim each.
 */
export function reconcileAuthority(
  declared: AuthorityClaim[],
  observed: ObservedAuthority[],
): AuthorityFinding[] {
  const findings: AuthorityFinding[] = []
  const matchedClaims = new Set<AuthorityClaim>()

  for (const obs of observed) {
    const claim = declared.find(
      c => c.kind === obs.kind && (c.name === obs.name || (c.qualifier === '*' && c.name === obs.name)),
    )
    if (claim) {
      matchedClaims.add(claim)
      findings.push({
        kind: obs.kind,
        name: obs.name,
        verdict: 'declared',
        sites: obs.sites,
        span: claim.span,
      })
      continue
    }
    findings.push({ kind: obs.kind, name: obs.name, verdict: 'leak', sites: obs.sites })
  }

  for (const claim of declared) {
    if (matchedClaims.has(claim)) continue
    findings.push({ kind: claim.kind, name: claim.name, verdict: 'stale', span: claim.span })
  }

  return findings
}

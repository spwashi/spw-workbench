/**
 * Spw Selector — LSP Bridge
 *
 * Thin adapter between the src/seed/query module and LSP conventions.
 * Preserves the SpwSelectorHit interface for backward compatibility
 * with stdio-server.ts while delegating to the real selector algebra.
 *
 * Span contract: startOffset/endOffset and startCharacter/endCharacter are
 * half-open [start, end) — end is exclusive, matching LSP Range semantics.
 *
 * Angle-path form `~<.spw/foo.spw>` is an LSP compatibility projection for
 * corpus nearest-neighbor edges. Seed may still parse it as recovered prose
 * rather than PathRef; keep allowlists aligned across highlighters until a
 * versioned Seed syntax owns the form.
 *
 * This file is the migration bridge — once the LSP server is updated
 * to use SpwMatch directly, this adapter can be removed.
 */

import {
  parse,
  spwq,
  or,
  type SpwMatch,
  type SpwSelector,
  PATH_REFS,
  REFERENCES,
  NAVIGABLE,
} from '@spwashi/spw-seed'

// ── Legacy interface (preserved for stdio-server.ts) ─────────

export type SpwSelectorKind = 'pathRef' | 'rootRef'

/** Half-open span: endOffset / endCharacter are exclusive (LSP-compatible). */
export interface SpwSelectorSpan {
  startOffset: number
  /** Exclusive byte/code-unit offset (one past last included character). */
  endOffset: number
  startLine: number
  startCharacter: number
  endLine: number
  /** Exclusive character on endLine (LSP Range.end.character). */
  endCharacter: number
}

export interface SpwSelectorHit {
  kind: SpwSelectorKind
  raw: string
  span: SpwSelectorSpan
  target: string
  root?: string
}

interface LinePosition {
  line: number
  character: number
}

const REF_ENVELOPE_OPERATORS = new Set(['&', '^', '*', '?', '~', '!', '%', '='])
const REF_BOUNDARY_CHARS = new Set(['(', '[', '{', ',', ':', '=', '|', '&', '^', '*', '?', '~', '!', '%'])

function buildLineOffsets(source: string): number[] {
  const offsets = [0]
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') offsets.push(i + 1)
  }
  return offsets
}

function offsetToPosition(offsets: number[], offset: number): LinePosition {
  let lo = 0
  let hi = offsets.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const start = offsets[mid]
    const next = mid + 1 < offsets.length ? offsets[mid + 1] : Number.POSITIVE_INFINITY
    if (offset < start) {
      hi = mid - 1
    } else if (offset >= next) {
      lo = mid + 1
    } else {
      return { line: mid, character: offset - start }
    }
  }
  return { line: 0, character: offset }
}

function buildSpan(offsets: number[], startOffset: number, endOffsetExclusive: number): SpwSelectorSpan {
  const start = offsetToPosition(offsets, startOffset)
  // Exclusive end maps directly to LSP Range.end (one past last included char).
  const end = offsetToPosition(offsets, Math.max(startOffset, endOffsetExclusive))
  return {
    startOffset,
    endOffset: endOffsetExclusive,
    startLine: start.line,
    startCharacter: start.character,
    endLine: end.line,
    endCharacter: end.character,
  }
}

function isBoundaryBeforeRef(ch: string): boolean {
  if (!ch) return true
  if (/\s/.test(ch)) return true
  return REF_BOUNDARY_CHARS.has(ch)
}

/** True when angle-bracket content is a navigable path, not a label or pattern. */
export function isAnglePathLike(inner: string): boolean {
  const s = inner.trim()
  if (!s) return false
  // Reject pattern/selector fragments: ~<#.>, ~<core> labels without path shape
  if (/[#*{}()[\]|]/.test(s)) return false
  if (s.includes('/')) return true
  if (s.startsWith('.')) return true
  if (/\.(spw|ts|tsx|js|mjs|cjs|md|json)$/i.test(s)) return true
  return false
}

function fallbackPathRefs(source: string): SpwSelectorHit[] {
  const hits: SpwSelectorHit[] = []
  const offsets = buildLineOffsets(source)
  // Track covered ranges so quoted and angle forms do not double-hit.
  const covered: Array<{ start: number; end: number }> = []
  const isCovered = (start: number, end: number) =>
    covered.some((r) => start < r.end && end > r.start)

  // 1) ~"./path", ~<label>"./path" — quoted tilde refs (highest priority)
  // Keep this intentionally strict to avoid matching arbitrary "~" inside prose/commands.
  const pathRegex = /~\s*(?:<[^>\n"]+>\s*)?"([^"\n]+)"/g
  let pathMatch: RegExpExecArray | null
  while ((pathMatch = pathRegex.exec(source)) !== null) {
    const raw = pathMatch[0] ?? ''
    const target = pathMatch[1] ?? ''
    if (!target) continue

    // Guard against accidental mid-token captures while keeping operator-wrapped refs discoverable.
    const prev = pathMatch.index > 0 ? source[pathMatch.index - 1] : ''
    if (!isBoundaryBeforeRef(prev)) continue

    const start = pathMatch.index
    const end = start + raw.length
    covered.push({ start, end })
    hits.push({
      kind: 'pathRef',
      raw,
      target,
      span: buildSpan(offsets, start, end),
    })
  }

  // 2) ~<.spw/foo.spw>, ~<./index.spw> — angle path without trailing quote
  // Compatibility projection (not necessarily Seed PathRef yet).
  // Corpus uses this heavily for nearest-neighbor / introspect edges.
  // Do not match ~<label>"path" (already covered) or non-path labels like ~<core>.
  const anglePathRegex = /~\s*<([^>\n"]+)>(?!\s*")/g
  let angleMatch: RegExpExecArray | null
  while ((angleMatch = anglePathRegex.exec(source)) !== null) {
    const raw = angleMatch[0] ?? ''
    const target = (angleMatch[1] ?? '').trim()
    if (!target || !isAnglePathLike(target)) continue

    const prev = angleMatch.index > 0 ? source[angleMatch.index - 1] : ''
    if (!isBoundaryBeforeRef(prev)) continue

    const start = angleMatch.index
    const end = start + raw.length
    if (isCovered(start, end)) continue
    covered.push({ start, end })
    hits.push({
      kind: 'pathRef',
      raw,
      target,
      span: buildSpan(offsets, start, end),
    })
  }

  // 3) @root/path
  const rootRegex = /@([A-Za-z_][A-Za-z0-9_]*)\/([A-Za-z0-9_.\-/*]+)/g
  let rootMatch: RegExpExecArray | null
  while ((rootMatch = rootRegex.exec(source)) !== null) {
    let raw = rootMatch[0] ?? ''
    const root = rootMatch[1] ?? ''
    let target = rootMatch[2] ?? ''
    if (!raw || !root || !target) continue

    const prev = rootMatch.index > 0 ? source[rootMatch.index - 1] : ''
    if (!isBoundaryBeforeRef(prev)) continue

    // Keep wildcard refs (e.g. "@spw/harness/*"), but trim postfix envelope "*" wrappers.
    if (target.endsWith('*') && !target.endsWith('/*')) {
      target = target.slice(0, -1)
      raw = raw.slice(0, -1)
      if (!target || !raw) continue
    }

    const start = rootMatch.index
    const end = start + raw.length
    hits.push({
      kind: 'rootRef',
      raw,
      root,
      target,
      span: buildSpan(offsets, start, end),
    })
  }

  return hits
}

function isEnvelopeOperator(ch: string | undefined): boolean {
  return !!ch && REF_ENVELOPE_OPERATORS.has(ch)
}

function expandSpanWithOperatorEnvelope(lines: string[], span: SpwSelectorSpan): SpwSelectorSpan {
  const next = { ...span }

  const startLineText = lines[next.startLine] ?? ''
  while (next.startCharacter > 0 && isEnvelopeOperator(startLineText[next.startCharacter - 1])) {
    next.startCharacter -= 1
    next.startOffset = Math.max(0, next.startOffset - 1)
  }

  // endCharacter is exclusive: the first character after the hit is at endCharacter.
  const endLineText = lines[next.endLine] ?? ''
  let suffixIndex = next.endCharacter
  while (suffixIndex < endLineText.length && isEnvelopeOperator(endLineText[suffixIndex])) {
    next.endCharacter += 1
    next.endOffset += 1
    suffixIndex += 1
  }

  return next
}

function withOperatorEnvelopeExpandedSpans(source: string, hits: SpwSelectorHit[]): SpwSelectorHit[] {
  const lines = source.split('\n')
  return hits.map((hit) => ({
    ...hit,
    span: expandSpanWithOperatorEnvelope(lines, hit.span),
  }))
}

// ── Match → Hit conversion ───────────────────────────────────

function matchToHit(match: SpwMatch): SpwSelectorHit | null {
  const node = match.node

  if (node.type === 'PathRef') {
    const pathRef = node as any
    const raw = pathRef.path?.token?.value ?? ''
    const target = unquote(raw)
    if (!target) return null
    return {
      kind: 'pathRef',
      raw,
      target,
      span: match.span,
    }
  }

  if (node.type === 'Reference') {
    const ref = node as any
    const raw = ref.raw ?? ''
    if (!raw.includes('/')) return null

    const parts = raw.split('/').filter(Boolean)
    if (parts.length < 2) return null

    const [root, ...rest] = parts
    const target = rest.join('/')
    if (!root || !target) return null

    return {
      kind: 'rootRef',
      raw,
      root,
      target,
      span: match.span,
    }
  }

  return null
}

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

// ── Public API (backward-compatible) ─────────────────────────

export function selectPathRefs(source: string): SpwSelectorHit[] {
  const fallbackHits = fallbackPathRefs(source)
  if (fallbackHits.length > 0) {
    return withOperatorEnvelopeExpandedSpans(source, fallbackHits)
  }

  const matches = spwq.fromSource(source, NAVIGABLE)
  const hits: SpwSelectorHit[] = []

  for (const match of matches) {
    const hit = matchToHit(match)
    if (hit) hits.push(hit)
  }

  return withOperatorEnvelopeExpandedSpans(source, hits)
}

export function findPathRefAtPosition(
  hits: SpwSelectorHit[],
  line: number,
  character: number,
): SpwSelectorHit | null {
  // Spans are half-open [start, end): character == endCharacter is outside.
  const containing = hits.filter((hit) => {
    if (line < hit.span.startLine || line > hit.span.endLine) return false
    if (line === hit.span.startLine && character < hit.span.startCharacter) return false
    if (line === hit.span.endLine && character >= hit.span.endCharacter) return false
    return true
  })

  if (containing.length === 0) return null
  containing.sort(
    (a, b) =>
      (a.span.endOffset - a.span.startOffset) -
      (b.span.endOffset - b.span.startOffset)
  )
  return containing[0] ?? null
}

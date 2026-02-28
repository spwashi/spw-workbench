/**
 * Spw Selector — LSP Bridge
 *
 * Thin adapter between the src/seed/query module and LSP conventions.
 * Preserves the SpwSelectorHit interface for backward compatibility
 * with stdio-server.ts while delegating to the real selector algebra.
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
} from '../../src/seed'

// ── Legacy interface (preserved for stdio-server.ts) ─────────

export type SpwSelectorKind = 'pathRef' | 'rootRef'

export interface SpwSelectorSpan {
  startOffset: number
  endOffset: number
  startLine: number
  startCharacter: number
  endLine: number
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

function buildSpan(source: string, startOffset: number, endOffsetExclusive: number): SpwSelectorSpan {
  const offsets = buildLineOffsets(source)
  const start = offsetToPosition(offsets, startOffset)
  const end = offsetToPosition(offsets, Math.max(startOffset, endOffsetExclusive - 1))
  return {
    startOffset,
    endOffset: endOffsetExclusive,
    startLine: start.line,
    startCharacter: start.character,
    endLine: end.line,
    endCharacter: end.character,
  }
}

function fallbackPathRefs(source: string): SpwSelectorHit[] {
  const hits: SpwSelectorHit[] = []

  // ~"./path", ~#label "./path", ~<label>"./path"
  const pathRegex = /~[^"\n]*"([^"]+)"/g
  let pathMatch: RegExpExecArray | null
  while ((pathMatch = pathRegex.exec(source)) !== null) {
    const raw = pathMatch[0] ?? ''
    const target = pathMatch[1] ?? ''
    if (!target) continue
    const start = pathMatch.index
    const end = start + raw.length
    hits.push({
      kind: 'pathRef',
      raw,
      target,
      span: buildSpan(source, start, end),
    })
  }

  // @root/path
  const rootRegex = /@([A-Za-z_][A-Za-z0-9_]*)\/([A-Za-z0-9_.\-/*]+)/g
  let rootMatch: RegExpExecArray | null
  while ((rootMatch = rootRegex.exec(source)) !== null) {
    const raw = rootMatch[0] ?? ''
    const root = rootMatch[1] ?? ''
    const target = rootMatch[2] ?? ''
    if (!raw || !root || !target) continue
    const start = rootMatch.index
    const end = start + raw.length
    hits.push({
      kind: 'rootRef',
      raw,
      root,
      target,
      span: buildSpan(source, start, end),
    })
  }

  return hits
}

function isEnvelopeOperator(ch: string | undefined): boolean {
  return !!ch && REF_ENVELOPE_OPERATORS.has(ch)
}

function expandSpanWithOperatorEnvelope(source: string, span: SpwSelectorSpan): SpwSelectorSpan {
  const lines = source.split('\n')
  const next = { ...span }

  const startLineText = lines[next.startLine] ?? ''
  while (next.startCharacter > 0 && isEnvelopeOperator(startLineText[next.startCharacter - 1])) {
    next.startCharacter -= 1
    next.startOffset = Math.max(0, next.startOffset - 1)
  }

  const endLineText = lines[next.endLine] ?? ''
  let suffixIndex = next.endCharacter + 1
  while (suffixIndex < endLineText.length && isEnvelopeOperator(endLineText[suffixIndex])) {
    next.endCharacter += 1
    next.endOffset += 1
    suffixIndex += 1
  }

  return next
}

function withOperatorEnvelopeExpandedSpans(source: string, hits: SpwSelectorHit[]): SpwSelectorHit[] {
  return hits.map((hit) => ({
    ...hit,
    span: expandSpanWithOperatorEnvelope(source, hit.span),
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
  const matches = spwq.fromSource(source, NAVIGABLE)
  const hits: SpwSelectorHit[] = []

  for (const match of matches) {
    const hit = matchToHit(match)
    if (hit) hits.push(hit)
  }

  if (hits.length > 0) {
    return withOperatorEnvelopeExpandedSpans(source, hits)
  }

  const fallbackHits = fallbackPathRefs(source)
  return withOperatorEnvelopeExpandedSpans(source, fallbackHits)
}

export function findPathRefAtPosition(
  hits: SpwSelectorHit[],
  line: number,
  character: number,
): SpwSelectorHit | null {
  const containing = hits.filter((hit) => {
    if (line < hit.span.startLine || line > hit.span.endLine) return false
    if (line === hit.span.startLine && character < hit.span.startCharacter) return false
    if (line === hit.span.endLine && character > hit.span.endCharacter) return false
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

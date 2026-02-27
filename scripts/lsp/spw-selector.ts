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

  return hits
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

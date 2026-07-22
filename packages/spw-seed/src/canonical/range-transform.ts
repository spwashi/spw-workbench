/**
 * Range address + span transforms — L2 source spans with hash preconditions.
 *
 * Implements the tooling path from docs/theory/spw/range-transform.spw:
 *   resolve fragment → plan SourceEdit[] → apply under effect.l*
 *
 * Document line ranges use path fragments (`#:L12-L28`), not n-range `((…))`.
 *
 * @see differential.ts, operational-transform.ts, mutation-automata.ts
 */

import { hashString } from './canonicalize'
import {
  applyEdits,
  type EffectGrade,
  type SourceEdit,
  type SourceDifferential,
  differentialFromSources,
} from './differential'

export type RangeEncoding = 'utf16' | 'utf8'

export interface SourcePosition {
  /** 1-based line */
  line: number
  /** 0-based column (code units in encoding) */
  column: number
}

export interface SourceSpan {
  start: SourcePosition
  end: SourcePosition
  /** Inclusive end line when only line range (columns default full lines) */
  lineOnly?: boolean
}

export interface ResolvedRange {
  uri: string
  source: string
  contentHash: string
  encoding: RangeEncoding
  /** UTF-16 code unit offsets into full source (JS string indexing) */
  startOffset: number
  endOffset: number
  span: SourceSpan
  fragment: string
}

export type SpanTransformId = 'indent_lines' | 'outdent_lines' | 'trim_lines'

export interface SpanTransformOptions {
  size?: number
  effectCeiling?: EffectGrade
}

export interface RangePlan {
  version: 'spw.range/1'
  resolved: ResolvedRange
  transform: SpanTransformId
  options: SpanTransformOptions
  edits: SourceEdit[]
  /** After applying edits to resolved.source */
  plannedSource: string
  effectCeiling: EffectGrade
  writeSafe: boolean
}

const FRAGMENT_LINE =
  /^#:L(\d+)(?:C(\d+))?(?:-L(\d+)(?:C(\d+))?)?$/i
const FRAGMENT_OFFSET = /^#@offset=(\d+)\.\.(\d+)$/i

/**
 * Content hash for write preconditions (stable hex, not crypto-grade secret).
 */
export function contentHash(source: string): string {
  return hashString(source).slice(0, 16)
}

/**
 * Parse a pathref-style fragment (without the path).
 * Examples: `#:L12-L28`, `#:L12`, `#:L12C0-L28C4`, `#@offset=10..80`
 */
export function parseRangeFragment(fragment: string): SourceSpan | { offsetStart: number; offsetEnd: number } | null {
  const f = fragment.trim()
  const off = f.match(FRAGMENT_OFFSET)
  if (off) {
    return { offsetStart: Number(off[1]), offsetEnd: Number(off[2]) }
  }
  const m = f.match(FRAGMENT_LINE)
  if (!m) return null
  const startLine = Number(m[1])
  const startCol = m[2] !== undefined ? Number(m[2]) : 0
  const endLine = m[3] !== undefined ? Number(m[3]) : startLine
  const endCol = m[4] !== undefined ? Number(m[4]) : Number.POSITIVE_INFINITY
  return {
    start: { line: startLine, column: startCol },
    end: { line: endLine, column: endCol },
    lineOnly: m[2] === undefined && m[4] === undefined,
  }
}

/**
 * Split pathref `path#fragment` or `path` + separate fragment.
 */
export function splitPathFragment(ref: string): { path: string; fragment: string } {
  const hash = ref.indexOf('#')
  if (hash < 0) return { path: ref, fragment: '' }
  return { path: ref.slice(0, hash), fragment: ref.slice(hash) }
}

/** Convert 1-based line/col span to UTF-16 offsets. */
export function spanToOffsets(
  source: string,
  span: SourceSpan,
): { start: number; end: number } {
  const lines = source.split(/\r?\n/)
  const startLine = Math.max(1, span.start.line)
  const endLine = Math.max(startLine, span.end.line)

  let start = 0
  for (let i = 1; i < startLine; i++) {
    start += (lines[i - 1]?.length ?? 0) + 1 // assume \n
  }
  start += Math.min(span.start.column, lines[startLine - 1]?.length ?? 0)

  let end = 0
  for (let i = 1; i < endLine; i++) {
    end += (lines[i - 1]?.length ?? 0) + 1
  }
  const endLineText = lines[endLine - 1] ?? ''
  const endCol =
    span.end.column === Number.POSITIVE_INFINITY
      ? endLineText.length
      : Math.min(span.end.column, endLineText.length)
  end += endCol

  // Normalize CRLF split: if source used \r\n, offsets from split(/\r?\n/) +1 undercount
  // For simplicity, recompute with walk when source contains \r\n
  if (source.includes('\r\n')) {
    return spanToOffsetsCrLf(source, span)
  }
  return { start, end: Math.max(start, end) }
}

function spanToOffsetsCrLf(source: string, span: SourceSpan): { start: number; end: number } {
  let line = 1
  let col = 0
  let start = 0
  let end = source.length
  let foundStart = false
  for (let i = 0; i < source.length; i++) {
    if (!foundStart && line === span.start.line && col === span.start.column) {
      start = i
      foundStart = true
    }
    if (line === span.end.line) {
      const endCol =
        span.end.column === Number.POSITIVE_INFINITY
          ? // end of line
            -1
          : span.end.column
      if (endCol === -1) {
        // find line end
        if (source[i] === '\n') {
          end = i
          break
        }
      } else if (col === endCol) {
        end = i
        break
      }
    }
    if (source[i] === '\n') {
      line++
      col = 0
    } else if (source[i] === '\r') {
      // skip, count with next
    } else {
      col++
    }
  }
  if (!foundStart) {
    // fallback: line starts
    const lines = source.split(/\r?\n/)
    let s = 0
    for (let i = 1; i < span.start.line; i++) s += (lines[i - 1]?.length ?? 0) + 1
    start = s + span.start.column
  }
  return { start, end: Math.max(start, end) }
}

export function resolveRange(input: {
  uri: string
  source: string
  fragment: string
  encoding?: RangeEncoding
}): ResolvedRange {
  const encoding = input.encoding ?? 'utf16'
  const parsed = parseRangeFragment(input.fragment)
  if (!parsed) {
    throw new Error(`invalid range fragment: ${input.fragment}`)
  }

  let startOffset: number
  let endOffset: number
  let span: SourceSpan

  if ('offsetStart' in parsed) {
    startOffset = parsed.offsetStart
    endOffset = parsed.offsetEnd
    span = {
      start: offsetToPosition(input.source, startOffset),
      end: offsetToPosition(input.source, endOffset),
    }
  } else {
    span = parsed
    const o = spanToOffsets(input.source, span)
    startOffset = o.start
    endOffset = o.end
  }

  return {
    uri: input.uri,
    source: input.source,
    contentHash: contentHash(input.source),
    encoding,
    startOffset,
    endOffset,
    span,
    fragment: input.fragment,
  }
}

function offsetToPosition(source: string, offset: number): SourcePosition {
  let line = 1
  let column = 0
  const o = Math.min(Math.max(0, offset), source.length)
  for (let i = 0; i < o; i++) {
    if (source[i] === '\n') {
      line++
      column = 0
    } else {
      column++
    }
  }
  return { line, column }
}

/**
 * Plan span transforms as SourceEdits (layout-first).
 */
export function planSpanTransform(
  resolved: ResolvedRange,
  transform: SpanTransformId,
  options: SpanTransformOptions = {},
): RangePlan {
  const size = Math.max(1, options.size ?? 2)
  const slice = resolved.source.slice(resolved.startOffset, resolved.endOffset)
  const lines = slice.split(/\r?\n/)
  let newSlice: string

  switch (transform) {
    case 'indent_lines': {
      const pad = ' '.repeat(size)
      newSlice = lines.map(l => (l.length ? pad + l : l)).join('\n')
      break
    }
    case 'outdent_lines': {
      newSlice = lines
        .map(l => {
          if (l.startsWith(' '.repeat(size))) return l.slice(size)
          if (l.startsWith('\t')) return l.slice(1)
          return l.replace(/^\s{1,}/, m => (m.length > size ? m.slice(size) : ''))
        })
        .join('\n')
      break
    }
    case 'trim_lines': {
      newSlice = lines.map(l => l.trimEnd()).join('\n')
      break
    }
    default:
      throw new Error(`unknown span transform: ${transform}`)
  }

  const edits: SourceEdit[] = [
    {
      start: resolved.startOffset,
      end: resolved.endOffset,
      newText: newSlice,
      ruleId: transform,
      stratum: 'layout',
    },
  ]

  const plannedSource = applyEdits(resolved.source, edits)
  const effectCeiling = options.effectCeiling ?? 'effect.l1.memory'

  return {
    version: 'spw.range/1',
    resolved,
    transform,
    options: { size, effectCeiling },
    edits,
    plannedSource,
    effectCeiling,
    writeSafe: effectCeiling !== 'effect.l0.measure',
  }
}

/** Apply plan when contentHash still matches (S2 gate). */
export function applyRangePlan(
  currentSource: string,
  plan: RangePlan,
  opts: { expectedHash?: string; force?: boolean } = {},
): { source: string; differential: SourceDifferential } {
  const hash = contentHash(currentSource)
  const expected = opts.expectedHash ?? plan.resolved.contentHash
  if (!opts.force && hash !== expected) {
    throw new Error(
      `range apply refused: contentHash drift (have ${hash}, plan ${expected})`,
    )
  }
  if (plan.effectCeiling === 'effect.l0.measure') {
    throw new Error('range apply refused: effect.l0.measure is plan-only')
  }
  const source = applyEdits(currentSource, plan.edits)
  return {
    source,
    differential: differentialFromSources(currentSource, source, plan.transform, 'layout', hashString),
  }
}

export function formatRangePlan(plan: RangePlan): string {
  const r = plan.resolved
  return [
    `# spw range plan  ${plan.transform}  effect=${plan.effectCeiling}`,
    `uri=${r.uri}  fragment=${r.fragment}  hash=${r.contentHash}`,
    `span L${r.span.start.line}C${r.span.start.column}-L${r.span.end.line}C${r.span.end.column === Number.POSITIVE_INFINITY ? '∞' : r.span.end.column}`,
    `offsets ${r.startOffset}..${r.endOffset}  edits=${plan.edits.length}  writeSafe=${plan.writeSafe}`,
  ].join('\n')
}

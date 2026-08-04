/**
 * Geometry inspect — learn brace + operator geometry from a surface.
 *
 * Combines brace projection (paired bounds) with a cheap sigil census and
 * simple nesting depth so humans/agents can *see* form without full analysis.
 *
 * @see brace-projection.ts
 * @see form-ladders.ts
 */

import { parse } from '../parser'
import { extractBraceProjection, type BraceProjection } from './brace-projection'
import { SIGIL_CHARS } from './geometry-inspect-sigils'

export interface OperatorGeometryEntry {
  sigil: string
  count: number
  percent: number
  role: string
}

export interface BraceNestingStats {
  maxDepth: number
  openBalance: number
  /** heuristic: lines with depth ≥ 2 */
  deepLines: number
}

/**
 * A place where structured parsing gave up and the surface degraded to prose.
 *
 * The fallback is intended — a documentation language must not hard-fail — but
 * it must not be silent either. Reporting the stall point turns "my expression
 * did nothing" into a line number and a token.
 */
export interface ProseDegradation {
  line: number
  column: number
  /** Token type parsing stopped on, e.g. `ARROW`, `CAPSULE_CLOSE`. */
  found?: string
  message: string
}

export interface GeometryReport {
  version: 'spw.geometry/1'
  braces: BraceProjection
  operators: OperatorGeometryEntry[]
  nesting: BraceNestingStats
  /** Surfaces that fell back to prose, with the token that stopped the parse. */
  degradations: ProseDegradation[]
  /** short teaching lines */
  lessons: string[]
}

const ROLES: Record<string, string> = {
  '^': 'integrate / frame',
  '!': 'action / inject',
  '?': 'wonder / probe',
  '~': 'potential / path',
  '*': 'value / collapse',
  '=': 'config / bias',
  '@': 'perspective / root',
  '#': 'annotation / resonance',
  '.': 'ground / facet',
  '&': 'confluence / merge',
  $: 'select / address',
  '%': 'measure',
}

const SIGIL_SET = new Set<string>(SIGIL_CHARS)

/**
 * Inspect brace kinds + operator rhythm + nesting depth of source text.
 */
export function inspectGeometry(source: string): GeometryReport {
  const braces = extractBraceProjection(source)
  const operators = censusOperators(source)
  const nesting = nestingStats(source)
  const degradations = collectDegradations(source)
  const lessons = buildLessons(braces, operators, nesting, degradations)
  return {
    version: 'spw.geometry/1',
    braces,
    operators,
    nesting,
    degradations,
    lessons,
  }
}

function collectDegradations(source: string): ProseDegradation[] {
  const out: ProseDegradation[] = []
  for (const w of parse(source).warnings) {
    const data = w.data as { code?: string; message?: string; found?: string } | undefined
    if (data?.code !== 'prose-degradation') continue
    out.push({
      line: w.position.line,
      column: w.position.column,
      found: data.found,
      message: data.message ?? 'Surface degraded to prose.',
    })
  }
  return out
}

function censusOperators(source: string): OperatorGeometryEntry[] {
  const counts = new Map<string, number>()
  let total = 0
  for (const ch of source) {
    if (!SIGIL_SET.has(ch)) continue
    counts.set(ch, (counts.get(ch) ?? 0) + 1)
    total++
  }
  return [...counts.entries()]
    .map(([sigil, count]) => ({
      sigil,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
      role: ROLES[sigil] ?? 'operator',
    }))
    .sort((a, b) => b.count - a.count || a.sigil.localeCompare(b.sigil))
}

function nestingStats(source: string): BraceNestingStats {
  let depth = 0
  let maxDepth = 0
  let deepLines = 0
  for (const line of source.split(/\r?\n/)) {
    let lineMax = depth
    for (const ch of line) {
      if (ch === '{' || ch === '[' || ch === '(') {
        depth++
        if (depth > maxDepth) maxDepth = depth
        if (depth > lineMax) lineMax = depth
      } else if (ch === '}' || ch === ']' || ch === ')') {
        depth = Math.max(0, depth - 1)
      }
    }
    if (lineMax >= 2) deepLines++
  }
  return { maxDepth, openBalance: depth, deepLines }
}

function buildLessons(
  braces: BraceProjection,
  operators: OperatorGeometryEntry[],
  nesting: BraceNestingStats,
  degradations: ProseDegradation[],
): string[] {
  const out: string[] = []
  const k = braces.kinds
  const totalBraces =
    k.scope + k.frame + k.body + k.capsule + k.stream + k.nrange
  if (totalBraces === 0) {
    out.push('No paired braces detected — surface may be prose-heavy or linear.')
  } else {
    const dominant = (
      [
        ['body {}', k.body],
        ['frame []', k.frame],
        ['scope ()', k.scope],
        ['capsule <>', k.capsule],
        ['stream <<>>', k.stream],
        ['nrange (())', k.nrange],
      ] as [string, number][]
    )
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])[0]
    if (dominant) {
      out.push(`Dominant bound: ${dominant[0]} ×${dominant[1]} — geometry centers there.`)
    }
  }
  if (braces.medials > 0) {
    out.push(
      `Medial capsules ×${braces.medials} (channels: ${braces.channels.slice(0, 6).join(', ') || '—'}) — inline geometry, not only shells.`,
    )
  }
  if (braces.coupleOps > 0) {
    out.push(`Couple ops ×${braces.coupleOps} — peer relations bind geometry across sites.`)
  }
  const topOp = operators[0]
  if (topOp) {
    out.push(
      `Operator rhythm led by ${topOp.sigil} (${topOp.role}) — ${topOp.percent.toFixed(0)}% of sigils.`,
    )
  }
  if (nesting.maxDepth >= 3) {
    out.push(
      `Nesting maxDepth=${nesting.maxDepth} — deep form; prefer local labels before long-range &.`,
    )
  } else if (nesting.maxDepth <= 1 && totalBraces > 0) {
    out.push('Shallow nesting — good for teaching contours one bound at a time.')
  }
  if (nesting.openBalance !== 0) {
    out.push(`Unbalanced open braces (balance=${nesting.openBalance}) — check close pairs.`)
  }
  if (degradations.length > 0) {
    const where = degradations
      .slice(0, 3)
      .map(d => `line ${d.line}${d.found ? ` (${d.found})` : ''}`)
      .join(', ')
    const more = degradations.length > 3 ? `, +${degradations.length - 3} more` : ''
    out.push(
      `${degradations.length} surface${degradations.length === 1 ? '' : 's'} degraded to prose at ${where}${more} — structure was written but not parsed.`,
    )
  }
  out.push('Learn: empty → inhabit → label/select → path/ref → fold (form-ladders).')
  return out
}

export function formatGeometryReport(r: GeometryReport): string {
  const k = r.braces.kinds
  const opTotal = r.operators.reduce((a, o) => a + o.count, 0)
  const lines = [
    `# spw geometry  braces=${k.scope + k.frame + k.body + k.capsule + k.stream + k.nrange}  ops=${opTotal}  maxDepth=${r.nesting.maxDepth}`,
    `kinds  ()=${k.scope}  []=${k.frame}  {}=${k.body}  <>=${k.capsule}  <<>>=${k.stream}  (())=${k.nrange}`,
    `couple=${r.braces.coupleOps}  medials=${r.braces.medials}  shells=${r.braces.shells}  channels=${r.braces.channels.slice(0, 8).join(',') || '—'}`,
    `signature  ${r.braces.signature.slice(0, 16)}…`,
    '',
    'operators',
  ]
  for (const o of r.operators.slice(0, 12)) {
    lines.push(
      `  ${o.sigil}  ${String(o.count).padStart(4)}  ${o.percent.toFixed(1).padStart(5)}%  ${o.role}`,
    )
  }
  if (r.degradations.length > 0) {
    lines.push('', 'degraded to prose')
    for (const d of r.degradations.slice(0, 12)) {
      lines.push(`  ! ${d.line}:${d.column}  ${d.message}`)
    }
    if (r.degradations.length > 12) {
      lines.push(`  … +${r.degradations.length - 12} more`)
    }
  }
  lines.push('', 'lessons')
  for (const L of r.lessons) lines.push(`  · ${L}`)
  return lines.join('\n')
}

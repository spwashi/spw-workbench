/**
 * Shared CLI view helpers — disclosure grammar for all commands.
 *
 * Law:
 *   meta  → stderr   body → stdout
 *   header: formatSpwCard primary { ~#k: v … } on stderr
 *   next:   ^["next"]{ ~#steps: #[ … ] }
 *
 * @see packages/spw-seed/src/canonical/spw-card.ts
 * @see docs/runtime/spw/cli-command-surface.spw
 */

import { facet, formatSpwCard, type SpwCardPart, type SpwFacetValue } from '@spwashi/spw-seed'

let quietMeta = false

/** Process-local quiet for meta lines (headers, next:, tips). */
export function setMetaQuiet(quiet: boolean): void {
  quietMeta = quiet
}

export function isMetaQuiet(): boolean {
  return quietMeta
}

function fieldParts(
  fields: Record<string, string | number | boolean | null | undefined>,
): SpwCardPart[] {
  const parts: SpwCardPart[] = []
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue
    if (typeof value === 'boolean') {
      parts.push(facet.flag(key, value))
    } else if (typeof value === 'number') {
      parts.push(facet.atom(key, value))
    } else if (
      typeof value === 'string' &&
      (value.includes('/') || value.endsWith('.spw') || value.startsWith('.'))
    ) {
      parts.push(facet.path(key, value))
    } else {
      parts.push(facet.atom(key, value as SpwFacetValue))
    }
  }
  return parts
}

/** Standard command header on stderr — dual-read card via formatSpwCard. */
export function emitHeader(
  primary: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
  options: { mode?: string } = {},
): void {
  if (quietMeta) return
  const parts: SpwCardPart[] = []
  if (options.mode) parts.push(facet.atom('mode', options.mode))
  parts.push(...fieldParts(fields))
  const card = formatSpwCard(primary, parts)
  for (const line of card.split('\n')) {
    console.error(line)
  }
}

/** Indented meta detail line (still suppressed by quiet). */
export function emitDetail(...parts: string[]): void {
  if (quietMeta) return
  meta(' ', ...parts)
}

/** Footer companions — primaries only. */
export function emitNext(...steps: string[]): void {
  if (quietMeta || steps.length === 0) return
  const card = formatSpwCard('next', [facet.list('steps', steps)])
  for (const line of card.split('\n')) {
    console.error(line)
  }
}

export function meta(...parts: string[]): void {
  if (quietMeta) return
  console.error(parts.filter(Boolean).join(' '))
}

export function metaBlock(title: string, rows: Array<[string, string]>): void {
  if (quietMeta) return
  const parts: SpwCardPart[] = rows.map(([k, v]) => facet.str(k, v))
  const card = formatSpwCard(title, parts)
  for (const line of card.split('\n')) {
    console.error(line)
  }
}

export function pad(s: string, width: number, align: 'left' | 'right' = 'left'): string {
  const t = s.length > width ? `${s.slice(0, Math.max(0, width - 1))}…` : s
  return align === 'right' ? t.padStart(width) : t.padEnd(width)
}

export function truncate(s: string, max: number): string {
  const one = s.replace(/\s+/g, ' ').trim()
  if (one.length <= max) return one
  if (max <= 1) return '…'
  return `${one.slice(0, max - 1)}…`
}

/** Levenshtein distance for did-you-mean. */
export function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i < m + 1; i++) {
    for (let j = 1; j < n + 1; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(
        (dp[i - 1]![j] ?? 0) + 1,
        (dp[i]![j - 1] ?? 0) + 1,
        (dp[i - 1]![j - 1] ?? 0) + cost,
      )
    }
  }
  return dp[m]![n]!
}

export function suggestClosest(input: string, candidates: string[], maxDistance = 3): string[] {
  const scored = candidates
    .map(c => ({ c, d: editDistance(input.toLowerCase(), c.toLowerCase()) }))
    .filter(x => x.d <= maxDistance)
    .sort((a, b) => a.d - b.d || a.c.localeCompare(b.c))
  return scored.slice(0, 5).map(x => x.c)
}

export function formatTable(
  headers: string[],
  rows: string[][],
  opts: { maxCol?: number } = {},
): string {
  const maxCol = opts.maxCol ?? 48
  const widths = headers.map((h, i) => {
    let w = h.length
    for (const row of rows) {
      w = Math.max(w, truncate(row[i] ?? '', maxCol).length)
    }
    return Math.min(w, maxCol)
  })
  const line = (cells: string[]) =>
    cells.map((c, i) => pad(truncate(c, widths[i]!), widths[i]!)).join('  ')
  const out = [line(headers), line(widths.map(w => '─'.repeat(w)))]
  for (const row of rows) out.push(line(row.map(c => c ?? '')))
  return out.join('\n')
}

/** Extract 1-based line window from source. */
export function sliceLines(source: string, startLine1: number, endLine1: number): string {
  const lines = source.split(/\r?\n/)
  const start = Math.max(1, startLine1)
  const end = Math.min(lines.length, endLine1)
  const out: string[] = []
  for (let n = start; n <= end; n++) {
    out.push(`${String(n).padStart(4)} │ ${lines[n - 1] ?? ''}`)
  }
  return out.join('\n')
}

export function contextAround(
  source: string,
  startLine1: number,
  endLine1: number,
  context: number,
): string {
  return sliceLines(source, startLine1 - context, endLine1 + context)
}

export interface OutlineFrame {
  kind: 'frame' | 'root' | 'path' | 'intent' | 'other'
  label: string
  line: number
  depth: number
  snippet: string
}

/**
 * Cheap textual outline for skim/read — does not require full selector stack.
 * Picks common Spw landmarks: ^"name", @root, ~"path", ~#trait keys.
 */
export function skimOutline(source: string, maxItems = 80): OutlineFrame[] {
  const lines = source.split(/\r?\n/)
  const items: OutlineFrame[] = []
  const frameRe = /^\s*\^\[?"([^"]+)"\]?/
  const rootRe = /^\s*@([A-Za-z_][\w.-]*)\s*:/
  const pathRe = /~["'`]([^"'`]+)["'`]/
  const intentRe = /^\s*~#goal\s*:/
  const traitRe = /^\s*~#([A-Za-z_][\w]*)\s*:/

  for (let i = 0; i < lines.length && items.length < maxItems; i++) {
    const line = lines[i]!
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue

    const indent = line.match(/^\s*/)?.[0].length ?? 0
    const depth = Math.min(6, Math.floor(indent / 2))

    const fm = line.match(frameRe)
    if (fm) {
      items.push({
        kind: 'frame',
        label: fm[1]!,
        line: i + 1,
        depth,
        snippet: truncate(trimmed, 72),
      })
      continue
    }
    const rm = line.match(rootRe)
    if (rm) {
      items.push({
        kind: 'root',
        label: `@${rm[1]}`,
        line: i + 1,
        depth,
        snippet: truncate(trimmed, 72),
      })
      continue
    }
    if (intentRe.test(line)) {
      items.push({
        kind: 'intent',
        label: '~#goal',
        line: i + 1,
        depth,
        snippet: truncate(trimmed, 72),
      })
      continue
    }
    const tm = line.match(traitRe)
    if (tm && ['claim', 'taste', 'title', 'acceptance', 'audience'].includes(tm[1]!)) {
      items.push({
        kind: 'other',
        label: `~#${tm[1]}`,
        line: i + 1,
        depth,
        snippet: truncate(trimmed, 72),
      })
      continue
    }
    const pm = line.match(pathRe)
    if (pm && indent < 4) {
      items.push({
        kind: 'path',
        label: pm[1]!,
        line: i + 1,
        depth,
        snippet: truncate(trimmed, 72),
      })
    }
  }
  return items
}

export function renderOutline(items: OutlineFrame[], opts: { maxLabel?: number } = {}): string {
  const maxLabel = opts.maxLabel ?? 28
  const lines: string[] = []
  for (const it of items) {
    const mark =
      it.kind === 'frame'
        ? '◆'
        : it.kind === 'root'
          ? '@'
          : it.kind === 'path'
            ? '~'
            : it.kind === 'intent'
              ? '?'
              : '·'
    const indent = '  '.repeat(it.depth)
    const loc = pad(String(it.line), 4, 'right')
    const label = pad(truncate(it.label, maxLabel), maxLabel)
    lines.push(`${loc} ${mark} ${indent}${label}  ${truncate(it.snippet, 56)}`)
  }
  return lines.join('\n')
}

export function countMap(items: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1)
  return m
}

export function renderCounts(map: Map<string, number>, top = 12): string {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, top)
    .map(([k, v]) => `${k}:${v}`)
    .join('  ')
}

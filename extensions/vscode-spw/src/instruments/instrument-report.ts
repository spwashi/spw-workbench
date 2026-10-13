import type { SpwCliInvocation } from './cli-invocation'
import type { CliRunOutput } from './run-cli'

export interface InstrumentRun extends CliRunOutput {
  invocation: SpwCliInvocation
}

export interface InstrumentReport {
  heading: string
  /** Receipt lines: where the reading came from and what it touched. */
  receipt: string[]
  notes?: string[]
  /** Markdown drawn from the runs, placed before the raw output. */
  sections?: string[]
  runs: InstrumentRun[]
}

export function renderInstrumentReport(report: InstrumentReport): string[] {
  const lines = [`# ${report.heading}`, '', ...report.receipt]
  if (report.notes?.length) lines.push('', ...report.notes.map(note => `- ${note}`))
  if (report.sections?.length) lines.push('', ...report.sections)
  for (const run of report.runs) {
    lines.push('', `## ${inlineCode(commandLine(run.invocation))}`, '')
    lines.push(`${run.durationMs} ms · exit ${run.exitCode}`)
    // The CLI prints its header card and receipts on stderr and its product on
    // stdout; stderr first keeps the terminal's reading order.
    const stderr = run.stderr.trimEnd()
    if (stderr) lines.push('', 'stderr:', '', ...fenced(stderr, 'text'))
    const stdout = run.stdout.trimEnd()
    lines.push('', 'stdout:', '', ...fenced(stdout || '(no output)', run.invocation.output))
  }
  return lines
}

export function commandLine(invocation: SpwCliInvocation): string {
  return invocation.display ?? ['spw', ...invocation.arguments.map(shellWord)].join(' ')
}

// ── Query performance ──────────────────────────────────────────

export interface QueryStats {
  files_walked?: number
  files_parsed?: number
  bytes_read?: number
  cache_hits?: number
  parse_ms?: number
  total_ms?: number
}

const STATS_PREFIX = 'spw query stats '

/** Splits the `spw query stats {…}` line off stderr; the rest stays visible. */
export function parseQueryStats(stderr: string): { stats?: QueryStats; remainder: string } {
  let stats: QueryStats | undefined
  const remainder: string[] = []
  for (const line of stderr.split('\n')) {
    const at = line.indexOf(STATS_PREFIX)
    if (stats === undefined && at >= 0) {
      try {
        const parsed: unknown = JSON.parse(line.slice(at + STATS_PREFIX.length))
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          stats = pickNumbers(parsed as Record<string, unknown>)
          continue
        }
      } catch {
        // Not the stats line after all; keep it visible.
      }
    }
    remainder.push(line)
  }
  return { stats, remainder: remainder.join('\n') }
}

export function renderQueryStats(stats: QueryStats, wallMs: number): string[] {
  const rows: Array<[string, string]> = []
  const add = (label: string, value: string | undefined): void => {
    if (value !== undefined) rows.push([label, value])
  }
  add('files walked', count(stats.files_walked))
  add('files parsed', count(stats.files_parsed))
  add('bytes read', stats.bytes_read === undefined ? undefined : `${stats.bytes_read} (${(stats.bytes_read / 1024).toFixed(1)} KiB)`)
  add('cache hits', count(stats.cache_hits))
  add('parse', ms(stats.parse_ms))
  if (stats.parse_ms !== undefined && stats.files_parsed) {
    add('parse per file', ms(stats.parse_ms / stats.files_parsed))
  }
  add('query total', ms(stats.total_ms))
  if (stats.total_ms !== undefined && stats.parse_ms !== undefined) {
    add('walk, select, and count (total − parse)', ms(Math.max(0, stats.total_ms - stats.parse_ms)))
  }
  add('process wall time (adds npm and CLI startup)', ms(wallMs))
  return [
    '## Walk and parse',
    '',
    '| measure | value |',
    '| --- | --- |',
    ...rows.map(([label, value]) => `| ${label} | ${value} |`),
  ]
}

/** Lifts the stats line out of the query run into a table. */
export function presentQueryPerformance(runs: InstrumentRun[]): { sections: string[]; runs: InstrumentRun[] } {
  const query = runs[0]
  if (!query) return { sections: [], runs }
  const { stats, remainder } = parseQueryStats(query.stderr)
  if (!stats) {
    return { sections: ['## Walk and parse', '', 'The CLI printed no stats line; see stderr below.'], runs }
  }
  return {
    sections: renderQueryStats(stats, query.durationMs),
    runs: [{ ...query, stderr: remainder }, ...runs.slice(1)],
  }
}

// ── Markdown helpers ───────────────────────────────────────────

export function fenced(body: string, language: string): string[] {
  const longest = Math.max(0, ...[...body.matchAll(/`+/g)].map(match => match[0].length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return [`${fence}${language}`, body, fence]
}

export function inlineCode(text: string): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map(match => match[0].length))
  const ticks = '`'.repeat(longest + 1)
  const pad = longest > 0 ? ' ' : ''
  return `${ticks}${pad}${text}${pad}${ticks}`
}

function shellWord(word: string): string {
  return /^[\w@%+=:,./-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`
}

function pickNumbers(record: Record<string, unknown>): QueryStats {
  const stats: Record<string, number> = {}
  for (const key of ['files_walked', 'files_parsed', 'bytes_read', 'cache_hits', 'parse_ms', 'total_ms']) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) stats[key] = value
  }
  return stats
}

function count(value: number | undefined): string | undefined {
  return value === undefined ? undefined : String(value)
}

function ms(value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${value.toFixed(1)} ms`
}

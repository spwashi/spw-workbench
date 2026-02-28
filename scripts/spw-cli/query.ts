import path from 'node:path'
import process from 'node:process'
import {
  ANY,
  ANNOTATION_OPS,
  BOON_OPS,
  BONE_OPS,
  CONFIG_OPS,
  DEFER_OPS,
  DOMAIN_ROOTS,
  DOMAIN_ROOTS_FULL,
  HYDRATE_OPS,
  NAVIGABLE,
  OPS_WITH_BODIES,
  OPS_WITH_FRAMES,
  PATH_REFS,
  QUERY_OPS,
  REFERENCES,
  SCOPES,
  type SpwMatch,
  type SpwSelector,
  spwq,
} from '../../src/seed'
import { tryParseSelector } from '../../src/seed/query/selector-expr'
import { collectSpwFiles } from '../spw-ls/scan'
import type { QueryArgs, QueryRow } from './types'

const SELECTOR_MAP: Record<string, SpwSelector> = {
  navigable: NAVIGABLE,
  refs: REFERENCES,
  pathRefs: PATH_REFS,
  rootRefs: REFERENCES,
  domains: DOMAIN_ROOTS,
  'domains+': DOMAIN_ROOTS_FULL,
  scopes: SCOPES,
  hydrate: HYDRATE_OPS,
  probes: QUERY_OPS,
  configs: CONFIG_OPS,
  defers: DEFER_OPS,
  taps: DOMAIN_ROOTS,
  annotations: ANNOTATION_OPS,
  'ops:frame': OPS_WITH_FRAMES,
  'ops:body': OPS_WITH_BODIES,
  boon: BOON_OPS,
  bone: BONE_OPS,
  all: ANY,
}

const SELECT_FIELDS = new Set<keyof QueryRow>([
  'file',
  'kind',
  'sigil',
  'brace',
  'root',
  'target',
  'label',
  'line',
  'column',
  'text',
])

export async function runQueryCli(args: QueryArgs): Promise<void> {
  const selector = resolveSelector(args)
  const files = await collectFiles(args.roots)
  const whereFilters = parseWhere(args.where)
  const selectFields = parseSelect(args.select)
  const rows: QueryRow[] = []

  for (const file of files) {
    const source = await BunLikeFs.readText(file)
    if (source === null) continue

    let matches = spwq.fromSource(source, selector)
    if (args.selector === 'rootRefs') {
      matches = matches.filter((match) => match.node.type === 'Reference' && extractReferenceRaw(match).includes('/'))
    }

    for (const match of matches) {
      const row = toRow(file, source, match)
      if (!passesWhere(row, whereFilters)) continue
      rows.push(row)
    }
  }

  const limited = rows.slice(0, Math.max(1, args.limit))
  if (args.format === 'json') {
    const payload = limited.map((row) => projectRow(row, selectFields))
    console.log(JSON.stringify({
      from: args.roots,
      selector: args.expr || args.selector,
      where: args.where || '(none)',
      select: selectFields,
      scanned: files.length,
      returned: rows.length,
      limited: limited.length,
      rows: payload,
    }, null, 2))
  } else {
    console.log(`# spw query`)
    console.log(`from: ${args.roots.join(', ')}`)
    console.log(`selector: ${args.expr || args.selector}`)
    console.log(`where: ${args.where || '(none)'}`)
    console.log(`select: ${selectFields.join(',')}`)
    console.log(`scanned: ${files.length} returned: ${rows.length} limited: ${limited.length}`)
    for (const row of limited) {
      const projected = projectRow(row, selectFields)
      console.log(renderProjected(projected, selectFields))
    }
  }

  if (args.summary) {
    const byKind = new Map<string, number>()
    const bySigil = new Map<string, number>()
    for (const row of rows) {
      byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1)
      if (row.sigil) bySigil.set(row.sigil, (bySigil.get(row.sigil) ?? 0) + 1)
    }
    console.error(`summary.kind: ${renderCountMap(byKind)}`)
    console.error(`summary.sigil: ${renderCountMap(bySigil)}`)
  }
}

function resolveSelector(args: QueryArgs): SpwSelector {
  if (args.expr) {
    const parsed = tryParseSelector(args.expr)
    if (!parsed) {
      throw new Error(`--expr parse failed: ${args.expr}`)
    }
    return parsed
  }

  const preset = SELECTOR_MAP[args.selector]
  if (preset) return preset

  const parsed = tryParseSelector(args.selector)
  if (parsed) return parsed

  throw new Error(`Unknown selector: ${args.selector}`)
}

async function collectFiles(roots: string[]): Promise<string[]> {
  const files = new Set<string>()
  for (const root of roots) {
    const items = await collectSpwFiles(root)
    for (const file of items) files.add(file)
  }
  return [...files].sort()
}

function toRow(file: string, source: string, match: SpwMatch): QueryRow {
  const snippet = source.slice(match.span.startOffset, match.span.endOffset).replace(/\s+/g, ' ').trim()
  const relFile = path.relative(process.cwd(), file)
  const row: QueryRow = {
    file: relFile,
    kind: match.node.type,
    sigil: '',
    brace: '',
    root: '',
    target: '',
    label: '',
    line: match.span.startLine + 1,
    column: match.span.startCharacter + 1,
    text: snippet,
  }

  if (match.node.type === 'Operation') {
    const op = match.node as any
    row.sigil = op.operator?.value ?? ''
    row.label = op.operatorLabel?.value ?? ''
    row.brace = detectBrace(snippet)
    return row
  }

  if (match.node.type === 'PathRef') {
    const pathRef = match.node as any
    const raw = pathRef.path?.token?.value ?? ''
    row.target = unquote(raw)
    row.sigil = '~'
    row.brace = detectBrace(snippet)
    return row
  }

  if (match.node.type === 'Reference') {
    const raw = extractReferenceRaw(match)
    row.sigil = '@'
    row.target = raw
    const parts = raw.split('/').filter(Boolean)
    if (parts.length >= 2) {
      row.root = parts[0]
      row.target = parts.slice(1).join('/')
    }
    return row
  }

  return row
}

function detectBrace(snippet: string): string {
  if (snippet.includes('[') && snippet.includes(']')) return '[]'
  if (snippet.includes('{') && snippet.includes('}')) return '{}'
  if (snippet.includes('(') && snippet.includes(')')) return '()'
  if (snippet.includes('<') && snippet.includes('>')) return '<>'
  return ''
}

function extractReferenceRaw(match: SpwMatch): string {
  return (match.node as any).raw ?? ''
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

interface WhereClause {
  field: keyof QueryRow
  op: '=' | '~' | 'in'
  value: string
  values: string[]
}

function parseWhere(input: string): WhereClause[] {
  if (!input.trim()) return []
  const rawClauses = input.split(/[;,]/).map((part) => part.trim()).filter(Boolean)
  const clauses: WhereClause[] = []

  for (const rawClause of rawClauses) {
    const inMatch = rawClause.match(/^([a-z_]+)\s+in\s+(.+)$/i)
    if (inMatch) {
      const field = normalizeField(inMatch[1])
      if (!field) continue
      const values = inMatch[2].split('|').map((part) => part.trim()).filter(Boolean)
      clauses.push({ field, op: 'in', value: inMatch[2], values })
      continue
    }

    const eqOrContains = rawClause.match(/^([a-z_]+)\s*([=~])\s*(.+)$/i)
    if (!eqOrContains) continue
    const field = normalizeField(eqOrContains[1])
    if (!field) continue
    const op = eqOrContains[2] as '=' | '~'
    const value = trimQuotes(eqOrContains[3].trim())
    clauses.push({ field, op, value, values: [] })
  }

  return clauses
}

function trimQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('`') && value.endsWith('`'))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function normalizeField(value: string): keyof QueryRow | null {
  const normalized = value.trim().toLowerCase() as keyof QueryRow
  return SELECT_FIELDS.has(normalized) ? normalized : null
}

function passesWhere(row: QueryRow, clauses: WhereClause[]): boolean {
  for (const clause of clauses) {
    const fieldValue = String(row[clause.field] ?? '')
    if (clause.op === '=' && fieldValue !== clause.value) return false
    if (clause.op === '~' && !fieldValue.includes(clause.value)) return false
    if (clause.op === 'in' && !clause.values.includes(fieldValue)) return false
  }
  return true
}

function parseSelect(selectRaw: string): Array<keyof QueryRow> {
  const fields = selectRaw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => normalizeField(part))
    .filter((field): field is keyof QueryRow => field !== null)

  return fields.length > 0 ? fields : ['file', 'kind', 'line', 'column', 'text']
}

function projectRow(row: QueryRow, fields: Array<keyof QueryRow>): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const field of fields) out[field] = row[field]
  return out
}

function renderProjected(projected: Record<string, string | number>, fields: Array<keyof QueryRow>): string {
  return fields.map((field) => `${field}=${JSON.stringify(projected[field] ?? '')}`).join('\t')
}

function renderCountMap(map: Map<string, number>): string {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => `${name}:${count}`)
    .join('  ')
}

const BunLikeFs = {
  async readText(filePath: string): Promise<string | null> {
    try {
      const fs = await import('node:fs/promises')
      return await fs.readFile(filePath, 'utf8')
    } catch {
      return null
    }
  },
}


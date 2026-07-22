import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { type SpwMatch, spwq } from '@spwashi/spw-seed'
import { collectSpwFiles as walkSpwFiles, DEFAULT_IGNORED_DIRS } from './fs-walk'
import { printHelpPage } from './help'
import { extractReferenceRaw, filterRootRefs, listCliSelectorPresetNames, resolveCliSelector } from './selectors'
import type { QueryArgs, QueryRow, ViewFormat } from './types'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace, type SpwWorkspace } from './workspace'
import {
  contextAround,
  countMap,
  formatTable,
  meta,
  metaBlock,
  renderCounts,
  suggestClosest,
  truncate,
} from './view'

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

const IGNORED_DIRS = new Set([...DEFAULT_IGNORED_DIRS, '_workbench'])

export async function runQueryCli(args: QueryArgs): Promise<void> {
  let selectorLabel: string
  let selector
  try {
    const resolved = resolveCliSelector(args.selector, args.expr)
    selector = resolved.selector
    selectorLabel = resolved.label
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.startsWith('Unknown selector:')) {
      const hint = suggestClosest(args.selector, listCliSelectorPresetNames())
      console.error(`spw query: ${msg}`)
      if (hint.length) console.error(`  did you mean: ${hint.join(', ')}?`)
      console.error(`  presets: ${listCliSelectorPresetNames().join(', ')}`)
      process.exitCode = 1
      return
    }
    throw err
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const resolvedRoots = workspace
    ? await Promise.all(args.roots.map(root => resolveWorkspacePath(workspace, root)))
    : args.roots
  const files = await collectFiles(resolvedRoots)
  const whereFilters = parseWhere(args.where)
  const selectFields = parseSelect(args.select, args.format)
  const sourceByFile = new Map<string, string>()

  const perFile = await Promise.all(
    files.map(async (file) => {
      const source = await readText(file)
      if (source === null) return null
      sourceByFile.set(file, source)

      let matches = spwq.fromSource(source, selector)
      if (!args.expr && args.selector === 'rootRefs') {
        matches = filterRootRefs(matches)
      }

      return matches
        .map((match) => toRow(file, source, match, workspace))
        .filter((row) => passesWhere(row, whereFilters))
    }),
  )
  const rows: QueryRow[] = perFile.flatMap((r) => r ?? [])

  const limited = rows.slice(0, Math.max(1, args.limit))

  if (args.count) {
    const byFile = countMap(rows.map(r => r.file))
    const byKind = countMap(rows.map(r => r.kind))
    if (args.format === 'json') {
      console.log(
        JSON.stringify(
          {
            command: 'query',
            total: rows.length,
            scanned: files.length,
            byFile: Object.fromEntries(byFile),
            byKind: Object.fromEntries(byKind),
          },
          null,
          2,
        ),
      )
    } else {
      console.log(`total=${rows.length}  files=${byFile.size}  scanned=${files.length}`)
      console.log(`kind  ${renderCounts(byKind)}`)
      console.log(`file  ${renderCounts(byFile, 20)}`)
    }
    return
  }

  if (args.format === 'json') {
    const payload = limited.map(row => projectRow(row, selectFields))
    console.log(
      JSON.stringify(
        {
          command: 'query',
          from: args.roots,
          selector: args.expr || selectorLabel,
          where: args.where || '(none)',
          select: selectFields,
          scanned: files.length,
          returned: rows.length,
          limited: limited.length,
          rows: payload,
        },
        null,
        2,
      ),
    )
  } else {
    if (!args.quiet) {
      meta(
        `# spw query`,
        `from=${args.roots.join(',')}`,
        `selector=${args.expr || selectorLabel}`,
        `where=${args.where || '—'}`,
        `hits=${rows.length}`,
        `show=${limited.length}`,
        `scanned=${files.length}`,
      )
    }

    if (limited.length === 0) {
      meta('  (no matches)')
      meta('  tip: widen --from, try --selector refs|pathRefs|all, or drop --where')
    } else if (args.group) {
      renderGrouped(limited, selectFields, args, sourceByFile, workspace)
    } else if (args.format === 'table') {
      console.log(renderAsTable(limited, selectFields))
    } else if (args.format === 'skim') {
      for (const row of limited) {
        console.log(renderSkimRow(row))
        if (args.context > 0) {
          const abs = resolveAbs(row.file, workspace)
          const src = sourceByFile.get(abs) ?? sourceByFile.get(path.resolve(row.file))
          if (src) {
            console.log(contextAround(src, row.line, row.line, args.context))
            console.log('')
          }
        }
      }
    } else {
      for (const row of limited) {
        const projected = projectRow(row, selectFields)
        console.log(renderProjected(projected, selectFields))
        if (args.context > 0) {
          const abs = resolveAbs(row.file, workspace)
          const src = sourceByFile.get(abs)
          if (src) {
            console.log(contextAround(src, row.line, row.line, args.context))
            console.log('')
          }
        }
      }
    }

    if (rows.length > limited.length && !args.quiet) {
      meta(`  … truncated; ${rows.length - limited.length} more (raise --limit)`)
    }
  }

  if (args.summary) {
    const byKind = countMap(rows.map(r => r.kind))
    const bySigil = countMap(rows.map(r => r.sigil).filter(Boolean))
    const byFile = countMap(rows.map(r => r.file))
    metaBlock('summary', [
      ['hits', String(rows.length)],
      ['files', String(byFile.size)],
      ['kind', renderCounts(byKind)],
      ['sigil', renderCounts(bySigil) || '—'],
      ['top files', renderCounts(byFile, 8)],
    ])
  }
}

export function printQueryHelp(): void {
  printHelpPage({
    title: 'Spw Query',
    usage: [
      'spw query [--from prompts,.spw] [--selector navigable] [--where …] [--format skim|table|lines|json]',
      'spw query --from prompts --skim --selector pathRefs --limit 30',
      'spw query --from prompts --count --selector ops:frame',
      'spw query --from prompts --group --where "file~templates"',
    ],
    sections: [
      {
        title: 'View flags',
        lines: [
          '--skim              Compact file:line kind snippet (great for browsing)',
          '--table             Aligned columns',
          '--json              Structured JSON envelope',
          '--group / -g        Group hits by file',
          '--count             Totals + histograms only',
          '--context N / -C N  Source window under each hit',
          '--limit N / -n N    Cap rows (default 100)',
          '--quiet / -q        No header banner',
          '--summary           kind/sigil/file histograms on stderr',
        ],
      },
      {
        title: 'Filter',
        lines: [
          '--from / --root     Comma-separated roots (default .spw)',
          '--selector / -s     Preset or expr (default navigable)',
          '--expr / -e         Raw selector expression',
          '--where / -w        field=val, field~substr, field in A|B',
          '--select            columns for lines/json (file,kind,line,text,…)',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'spw query --from prompts --skim --selector pathRefs -n 25',
          'spw query --from prompts,docs --selector navigable --where "kind in PathRef|Reference" --table',
          'spw query --from prompts --count --selector ops:frame --summary',
          'spw query --from .spw --expr "$~\\"_\\" | $@_" --where "root=spw" --select file,kind,root,target,line',
        ],
      },
      {
        title: 'Sense companions',
        lines: [
          'spw invent --from <dir>     file catalog + roles',
          'spw analyze --from <dir>    multi-selector densities',
          'spw formula --from <dir>    math pattern discovery',
          'spw map --from <dir>        hubs / layers / cycles',
        ],
      },
      {
        title: 'Related',
        lines: [
          'spw select <file> --skim     single-file',
          'spw skim <file>              outline without selector',
          'spw tree <path>              directory map',
        ],
      },
    ],
  })
}

function resolveAbs(relFile: string, workspace: SpwWorkspace | null): string {
  const base = workspace?.consumerRoot ?? process.cwd()
  return path.resolve(base, relFile)
}

function renderGrouped(
  rows: QueryRow[],
  fields: Array<keyof QueryRow>,
  args: QueryArgs,
  sourceByFile: Map<string, string>,
  workspace: SpwWorkspace | null,
): void {
  const groups = new Map<string, QueryRow[]>()
  for (const row of rows) {
    const list = groups.get(row.file) ?? []
    list.push(row)
    groups.set(row.file, list)
  }
  for (const [file, list] of groups) {
    console.log(`\n## ${file}  (${list.length})`)
    for (const row of list) {
      if (args.format === 'skim') console.log(`  ${renderSkimRow(row, true)}`)
      else console.log(`  ${renderProjected(projectRow(row, fields.filter(f => f !== 'file')), fields.filter(f => f !== 'file'))}`)
      if (args.context > 0) {
        const abs = resolveAbs(file, workspace)
        const src = sourceByFile.get(abs)
        if (src) console.log(contextAround(src, row.line, row.line, args.context))
      }
    }
  }
}

function renderSkimRow(row: QueryRow, hideFile = false): string {
  const loc = `${row.line}:${row.column}`
  const kind = row.sigil ? `${row.kind}:${row.sigil}` : row.kind
  const target = row.target || row.label || ''
  const text = truncate(row.text, 64)
  if (hideFile) return `${padRight(loc, 8)} ${padRight(kind, 16)} ${target ? `${target}  ` : ''}${text}`
  return `${row.file}:${loc}  ${padRight(kind, 14)}  ${target ? `${truncate(target, 24)}  ` : ''}${text}`
}

function padRight(s: string, n: number): string {
  return s.length >= n ? s : s.padEnd(n)
}

function renderAsTable(rows: QueryRow[], fields: Array<keyof QueryRow>): string {
  const headers = fields.map(String)
  const body = rows.map(row => fields.map(f => String(row[f] ?? '')))
  return formatTable(headers, body, { maxCol: 40 })
}

async function collectFiles(roots: string[]): Promise<string[]> {
  const perRoot = await Promise.all(
    roots.map((root) => walkSpwFiles(root, { ignore: IGNORED_DIRS })),
  )
  const files = new Set<string>()
  for (const items of perRoot) {
    for (const file of items) files.add(file)
  }
  return [...files].sort()
}

function toRow(file: string, source: string, match: SpwMatch, workspace: SpwWorkspace | null): QueryRow {
  const snippet = source.slice(match.span.startOffset, match.span.endOffset).replace(/\s+/g, ' ').trim()
  const relFile = path.relative(workspace?.consumerRoot ?? process.cwd(), file)
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
    const op = match.node as { operator?: { value?: string }; operatorLabel?: { value?: string } }
    row.sigil = op.operator?.value ?? ''
    row.label = op.operatorLabel?.value ?? ''
    row.brace = detectBrace(snippet)
    return row
  }

  if (match.node.type === 'PathRef') {
    const pathRef = match.node as { path?: { token?: { value?: string } } }
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
      row.root = parts[0]!
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
  const rawClauses = input.split(/[;,]/).map(part => part.trim()).filter(Boolean)
  const clauses: WhereClause[] = []

  for (const rawClause of rawClauses) {
    const inMatch = rawClause.match(/^([a-z_]+)\s+in\s+(.+)$/i)
    if (inMatch) {
      const field = normalizeField(inMatch[1]!)
      if (!field) continue
      const values = inMatch[2]!.split('|').map(part => part.trim()).filter(Boolean)
      clauses.push({ field, op: 'in', value: inMatch[2]!, values })
      continue
    }

    const eqOrContains = rawClause.match(/^([a-z_]+)\s*([=~])\s*(.+)$/i)
    if (!eqOrContains) continue
    const field = normalizeField(eqOrContains[1]!)
    if (!field) continue
    const op = eqOrContains[2] as '=' | '~'
    const value = trimQuotes(eqOrContains[3]!.trim())
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

function parseSelect(selectRaw: string, format: ViewFormat): Array<keyof QueryRow> {
  if (format === 'skim' && selectRaw === 'file,kind,sigil,brace,root,target,label,line,column,text') {
    return ['file', 'line', 'kind', 'text']
  }
  const fields = selectRaw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => normalizeField(part))
    .filter((field): field is keyof QueryRow => field !== null)

  return fields.length > 0 ? fields : ['file', 'kind', 'line', 'column', 'text']
}

function projectRow(row: QueryRow, fields: Array<keyof QueryRow>): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const field of fields) out[field] = row[field]
  return out
}

function renderProjected(projected: Record<string, string | number>, fields: Array<keyof QueryRow>): string {
  return fields.map(field => `${field}=${JSON.stringify(projected[field] ?? '')}`).join('\t')
}

async function readText(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, 'utf8')
  } catch {
    return null
  }
}

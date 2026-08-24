/**
 * spw census — population product (multi-file inventory + topo roles).
 * Collate chain step 1. Route aliases: invent, inventory, inv (not taught).
 */

import process from 'node:process'
import { formatCorpusProductSpw, formatPopulationSpw } from '@spwashi/spw-seed'
import { printHelpPage } from './help'
import {
  filterInventory,
  inventoryStats,
  scanCorpus,
  sortInventory,
  type InventoryRole,
  type InventoryRow,
} from './corpus-scan'
import {
  CORPUS_SPREAD_HELP_LINES,
  indexDepthForSpread,
  readCorpusSpreadArgument,
  type CorpusSpread,
} from './corpus-spread'
import { formatJsonEnvelope } from './envelope'
import {
  emitDetail,
  emitHeader,
  emitNext,
  formatTable,
  setMetaQuiet,
  truncate,
} from './view'

interface InventArgs {
  roots: string[]
  json: boolean
  sort: 'file' | 'lines' | 'refs' | 'frames' | 'sigils' | 'degree'
  role: InventoryRole | 'all'
  limit: number
  hubs: number
  quiet: boolean
  spread: CorpusSpread
  /** Spw cards (default) | aligned table | JSON via --json. */
  format: 'spw' | 'table'
}

function parseInventArgs(argv: string[]): InventArgs {
  const args = stripCommand(argv)
  const parsed: InventArgs = {
    roots: [],
    json: false,
    sort: 'degree',
    role: 'all',
    limit: 80,
    hubs: 24,
    quiet: false,
    spread: 'standard',
    format: 'spw',
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--json') {
      parsed.json = true
      continue
    }
    if (a === '--table' || a === '--format=table') {
      parsed.format = 'table'
      continue
    }
    if (a === '--spw' || a === '--format=spw') {
      parsed.format = 'spw'
      continue
    }
    if (a === '--format') {
      const next = (args[++i] ?? 'spw').toLowerCase()
      if (next === 'table' || next === 'spw') parsed.format = next
      continue
    }
    if (a === '--quiet' || a === '-q') {
      parsed.quiet = true
      continue
    }
    if (a === '--from' || a === '--root') {
      parsed.roots.push(...splitCsv(args[++i] ?? ''))
      continue
    }
    if (a.startsWith('--from=')) {
      parsed.roots.push(...splitCsv(a.slice('--from='.length)))
      continue
    }
    if (a === '--sort') {
      parsed.sort = parseSort(args[++i] ?? 'degree')
      continue
    }
    if (a.startsWith('--sort=')) {
      parsed.sort = parseSort(a.slice('--sort='.length))
      continue
    }
    if (a === '--role') {
      parsed.role = parseRole(args[++i] ?? 'all')
      continue
    }
    if (a.startsWith('--role=')) {
      parsed.role = parseRole(a.slice('--role='.length))
      continue
    }
    if (a === '--limit' || a === '-n') {
      parsed.limit = Math.max(1, Number(args[++i] ?? 80) || 80)
      continue
    }
    if (a.startsWith('--limit=')) {
      parsed.limit = Math.max(1, Number(a.slice('--limit='.length)) || 80)
      continue
    }
    if (a === '--hubs') {
      // Route-only alias for hub table width; prefer --limit for body rows.
      parsed.hubs = Math.max(1, Number(args[++i] ?? 24) || 24)
      continue
    }
    if (a.startsWith('--hubs=')) {
      parsed.hubs = Math.max(1, Number(a.slice('--hubs='.length)) || 24)
      continue
    }
    const spread = readCorpusSpreadArgument(args, i, 'census')
    if (spread) {
      parsed.spread = spread.spread
      i = spread.nextIndex
      continue
    }
    if (!a.startsWith('-')) {
      parsed.roots.push(a)
      continue
    }
    throw new Error(`spw census: unknown flag ${a}`)
  }
  if (!parsed.roots.length) parsed.roots = ['.']
  return parsed
}

function stripCommand(argv: string[]): string[] {
  const head = argv[0]
  if (
    head === 'census' ||
    head === 'invent' ||
    head === 'inventory' ||
    head === 'inv'
  ) {
    return argv.slice(1)
  }
  return argv
}

function splitCsv(s: string): string[] {
  return s.split(/[,+\s]+/).map(x => x.trim()).filter(Boolean)
}

function parseSort(s: string): InventArgs['sort'] {
  const k = s.toLowerCase()
  if (k === 'file' || k === 'lines' || k === 'refs' || k === 'frames' || k === 'sigils' || k === 'degree') {
    return k
  }
  throw new Error(`spw census: --sort must be file|lines|refs|frames|sigils|degree (got ${s})`)
}

function parseRole(s: string): InventoryRole | 'all' {
  const k = s.toLowerCase()
  if (k === 'all' || k === 'hub' || k === 'orphan' || k === 'leaf' || k === 'source' || k === 'node') {
    return k
  }
  throw new Error(`spw census: --role must be all|hub|orphan|leaf|source|node (got ${s})`)
}

export function printInventHelp(): void {
  printHelpPage({
    title: 'Spw Census — population product',
    usage: [
      'spw census [paths...] [--from a,b] [--sort degree|lines|refs|frames|file] [--role hub|orphan|…]',
      'spw census prompts --sort lines -n 40',
      'spw census prompts --table          # table output',
      'spw census .spw --role hub --json',
    ],
    sections: [
      {
        title: 'Output',
        lines: [
          'Default: source-shaped Spw cards for corpus settings and population rows',
          'role: hub | source | leaf | orphan | node',
          'Reuse: process memory + .spw/gen/session/corpus-memo, keyed by mtime fingerprint',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--sort <k>         degree|lines|refs|frames|file|sigils',
          '--role <r>         all|hub|orphan|leaf|source|node',
          '--limit / -n       Max body rows (default 80)',
          ...CORPUS_SPREAD_HELP_LINES,
          '--spw / --format spw   Spw cards (default)',
          '--table / --format table  Aligned table',
          '--json             Versioned JSON envelope',
          '--quiet / -q       Suppress headers, details, and recommendations',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'spw census prompts -n 12',
          'spw census prompts --table',
          'spw graph <same roots> --limit 12',
          'spw inspect corpus prompts',
          'spw density <same roots>',
        ],
      },
    ],
  })
}

export async function runSpwInventCli(argv: string[] = process.argv): Promise<void> {
  let args: InventArgs
  try {
    args = parseInventArgs(argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  if (args.roots.includes('--help') || args.roots.includes('-h')) {
    printInventHelp()
    return
  }

  const indexDepth = indexDepthForSpread(args.spread)
  const scan = await scanCorpus({
    roots: args.roots,
    hubTop: args.hubs,
    index: indexDepth,
  })

  let rows = filterInventory(scan.inventory, args.role)
  rows = sortInventory(rows, args.sort)
  const limited = rows.slice(0, args.limit)
  const stats = inventoryStats(scan.inventory)
  const broken = scan.topography.brokenTargets.length

  setMetaQuiet(args.quiet)

  if (args.json) {
    console.log(
      formatJsonEnvelope('census', limited, {
        from: args.roots,
        sort: args.sort,
        role: args.role,
        controls: { spread: args.spread, indexDepth },
        product: scan.product,
        memoPlane: scan.memoPlane,
        stats: {
          ...stats,
          cyclic: scan.topography.cyclic,
          layers: scan.topography.layers.length,
          brokenTargets: broken,
          links: scan.topography.links,
        },
        returned: limited.length,
        totalMatching: rows.length,
      }),
    )
    return
  }

  emitHeader('census', {
    files: stats.files,
    lines: stats.lines,
    links: scan.topography.links,
    cyclic: scan.topography.cyclic,
    memo: scan.memoPlane,
    format: args.format,
    spread: args.spread,
    index_depth: indexDepth,
  })
  emitDetail(
    `refs path=${stats.pathRefs} root=${stats.rootRefs}  frames=${stats.frames}  broken=${broken}`,
  )
  const roleCounts = Object.entries(stats.byRole)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')
  emitDetail(`roles  ${roleCounts || '—'}`)
  emitDetail(`product ${scan.product.version}  fp=${scan.product.fingerprint.slice(0, 12)}`)

  if (!limited.length) {
    emitDetail('(no files)')
    emitDetail('tip: pass a root with .spw files, e.g. spw census prompts')
    return
  }

  if (args.format === 'table') {
    console.log(
      formatTable(
        ['file', 'lines', 'pRef', 'rRef', 'frm', 'ann', 'in', 'out', 'role', 'sigils'],
        limited.map(r => rowCells(r)),
        { maxCol: 52 },
      ),
    )
  } else {
    // Spw cards: path-bound population statements + corpus head.
    const head = formatCorpusProductSpw(
      { ...scan.product, population: limited },
      { rowLimit: args.limit, includeRows: false },
    )
    const pop = formatPopulationSpw(limited, {
      among: args.roots,
      limit: args.limit,
    })
    console.log(`${head}\n\n${pop}`)
  }

  if (rows.length > limited.length) {
    emitDetail(`… ${rows.length - limited.length} more (raise --limit)`)
  }

  emitNext(
    'spw graph <roots>',
    'spw formula <roots>',
    'spw density <roots>',
    'spw inspect corpus <roots>',
  )
}

function rowCells(r: InventoryRow): string[] {
  return [
    truncate(r.file, 52),
    String(r.lines),
    String(r.pathRefs),
    String(r.rootRefs),
    String(r.frames),
    String(r.annotations),
    String(r.inDegree),
    String(r.outDegree),
    r.role,
    truncate(r.sigilTop || '—', 16),
  ]
}

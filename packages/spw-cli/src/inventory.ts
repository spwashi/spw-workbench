/**
 * spw census (invent) — multi-file population with topography roles + signal counts.
 * Canonical: census. Aliases: invent, inventory, inv.
 *
 * First step of the sense loop: what is here, what is warm (hub), what is cold (orphan).
 */

import process from 'node:process'
import { printHelpPage } from './help'
import {
  filterInventory,
  inventoryStats,
  parseIndexDepth,
  scanCorpus,
  sortInventory,
  type IndexDepth,
  type InventoryRole,
  type InventoryRow,
} from './corpus-scan'
import { formatJsonEnvelope } from './envelope'
import { formatTable, meta, truncate } from './view'

interface InventArgs {
  roots: string[]
  json: boolean
  sort: 'file' | 'lines' | 'refs' | 'frames' | 'sigils' | 'degree'
  role: InventoryRole | 'all'
  limit: number
  hubs: number
  quiet: boolean
  depth: IndexDepth
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
    depth: 'standard',
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--json') {
      parsed.json = true
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
      parsed.hubs = Math.max(1, Number(args[++i] ?? 24) || 24)
      continue
    }
    if (a === '--depth') {
      parsed.depth = parseIndexDepth(args[++i])
      continue
    }
    if (a.startsWith('--depth=')) {
      parsed.depth = parseIndexDepth(a.slice('--depth='.length))
      continue
    }
    if (!a.startsWith('-')) {
      parsed.roots.push(a)
      continue
    }
    throw new Error(`spw invent: unknown flag ${a}`)
  }
  if (!parsed.roots.length) parsed.roots = ['.']
  return parsed
}

function stripCommand(argv: string[]): string[] {
  const slice = argv[0] === 'invent' || argv[0] === 'inventory' || argv[0] === 'inv' ? argv.slice(1) : argv
  return slice
}

function splitCsv(s: string): string[] {
  return s.split(/[,+\s]+/).map(x => x.trim()).filter(Boolean)
}

function parseSort(s: string): InventArgs['sort'] {
  const k = s.toLowerCase()
  if (k === 'file' || k === 'lines' || k === 'refs' || k === 'frames' || k === 'sigils' || k === 'degree') {
    return k
  }
  throw new Error(`spw invent: --sort must be file|lines|refs|frames|sigils|degree (got ${s})`)
}

function parseRole(s: string): InventoryRole | 'all' {
  const k = s.toLowerCase()
  if (k === 'all' || k === 'hub' || k === 'orphan' || k === 'leaf' || k === 'source' || k === 'node') {
    return k
  }
  throw new Error(`spw invent: --role must be all|hub|orphan|leaf|source|node (got ${s})`)
}

export function printInventHelp(): void {
  printHelpPage({
    title: 'Spw Census — multi-file population inventory',
    usage: [
      'spw census [paths...] [--from a,b] [--sort degree|lines|refs|frames|file] [--role hub|orphan|…]',
      'spw census prompts --sort lines -n 40',
      'spw census .spw --role hub --json',
      'spw invent … / spw inv …   # compat aliases',
    ],
    sections: [
      {
        title: 'Columns',
        lines: [
          'file · lines · pathRefs · rootRefs · frames · annot · in/out degree · role · top sigils',
          'role: hub (high degree) | source (out only) | leaf (in only) | orphan | node',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--sort / --role / --hubs / --limit / -n   (see usage examples)',
          '--depth <d>   Scan depth minimal|standard|full (default standard)',
          '--json        Structured envelope',
        ],
      },
      {
        title: 'Sense loop',
        lines: [
          '1. invent  — what exists + warmth',
          '2. map     — hubs, layers, cycles, broken targets',
          '3. formula — named + embedded math patterns',
          '4. query   — multi-file select/count/group analysis',
          '5. skim    — read a hub without full query',
        ],
      },
      {
        title: 'Pair with',
        lines: [
          'spw map <same roots> --hubs 12',
          'spw formula <same roots> --top 20',
          'spw query --from <dir> --count --selector pathRefs',
          'spw skim <hub.spw>',
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

  const scan = await scanCorpus({
    roots: args.roots,
    hubTop: args.hubs,
    index: args.depth,
  })

  let rows = filterInventory(scan.inventory, args.role)
  rows = sortInventory(rows, args.sort)
  const limited = rows.slice(0, args.limit)
  const stats = inventoryStats(scan.inventory)
  const broken = scan.topography.brokenTargets.length

  if (args.json) {
    console.log(
      formatJsonEnvelope('invent', limited, {
        from: args.roots,
        sort: args.sort,
        role: args.role,
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

  if (!args.quiet) {
    meta(
      `# spw invent  files=${stats.files}  lines=${stats.lines}  links=${scan.topography.links}  cyclic=${scan.topography.cyclic}`,
    )
    meta(
      `  refs path=${stats.pathRefs} root=${stats.rootRefs}  frames=${stats.frames}  broken=${broken}`,
    )
    const roleCounts = Object.entries(stats.byRole)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(' ')
    meta(`  roles  ${roleCounts || '—'}`)
  }

  if (!limited.length) {
    meta('  (no files)')
    meta('  tip: pass a root with .spw files, e.g. spw invent prompts')
    return
  }

  console.log(
    formatTable(
      ['file', 'lines', 'pRef', 'rRef', 'frm', 'ann', 'in', 'out', 'role', 'sigils'],
      limited.map(r => rowCells(r)),
      { maxCol: 52 },
    ),
  )

  if (rows.length > limited.length) {
    meta(`  … ${rows.length - limited.length} more (raise --limit)`)
  }

  if (!args.quiet) {
    meta(
      '  next: spw map <roots> · spw formula <roots> · spw query --from <dir> --count · spw skim <hub>',
    )
  }
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

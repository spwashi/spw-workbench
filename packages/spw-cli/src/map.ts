/**
 * spw map — learn topography & relationship interplay in a corpus.
 *
 * Useful for novel codebases with strands of familiarity (path refs, roots,
 * frames, sigil rhythm) and for business/academic relationship packs.
 */

import process from 'node:process'
import {
  compareFamiliarity,
  type TopographyReport,
} from '@spwashi/spw-seed'
import { parseIndexDepth, scanCorpus, type IndexDepth } from './corpus-scan'
import { printHelpPage } from './help'
import { formatTable, meta, metaBlock, truncate } from './view'

interface MapArgs {
  roots: string[]
  compare?: string[]
  json: boolean
  hubs: number
  limit: number
  resolvePaths: boolean
  depth: IndexDepth
}

function parseMapArgs(argv: string[]): MapArgs {
  const args = argv[0] === 'map' || argv[0] === 'topo' ? argv.slice(1) : argv
  const parsed: MapArgs = {
    roots: [],
    json: false,
    hubs: 12,
    limit: 40,
    resolvePaths: true,
    depth: 'standard',
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--json') {
      parsed.json = true
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
    if (a === '--compare' || a === '-c') {
      parsed.compare = splitCsv(args[++i] ?? '')
      continue
    }
    if (a.startsWith('--compare=')) {
      parsed.compare = splitCsv(a.slice('--compare='.length))
      continue
    }
    if (a === '--hubs') {
      parsed.hubs = Math.max(1, Number(args[++i] ?? 12) || 12)
      continue
    }
    if (a.startsWith('--hubs=')) {
      parsed.hubs = Math.max(1, Number(a.slice('--hubs='.length)) || 12)
      continue
    }
    if (a === '--limit' || a === '-n') {
      parsed.limit = Math.max(1, Number(args[++i] ?? 40) || 40)
      continue
    }
    if (a === '--no-resolve') {
      parsed.resolvePaths = false
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
    throw new Error(`spw map: unknown flag ${a}`)
  }
  if (!parsed.roots.length) parsed.roots = ['.']
  return parsed
}

function splitCsv(s: string): string[] {
  return s.split(/[,+\s]+/).map(x => x.trim()).filter(Boolean)
}

export function printMapHelp(): void {
  printHelpPage({
    title: 'Spw Map — corpus topography & familiarity',
    usage: [
      'spw map [paths...] [--from a,b] [--compare otherRoot] [--json] [--hubs 12]',
      'spw map prompts --hubs 15',
      'spw map prompts --compare docs/theory',
      'spw topo .spw   # alias',
    ],
    sections: [
      {
        title: 'What it shows',
        lines: [
          'Path-ref & @root relationship graph across .spw files',
          'Cycles, topo layers, hubs (high degree), orphans, broken targets',
          'Familiarity strands: path basenames, sigil rhythm, frame density, root shelves',
          '--compare: shared strands vs a second corpus (novel codebase with familiar wires)',
          '--depth <d>: scan depth minimal|standard|full (default standard)',
        ],
      },
      {
        title: 'Sense loop',
        lines: [
          'spw invent <roots>     inventory + roles',
          'spw map <roots>        topography (this command)',
          'spw formula <roots>    formula catalog + pattern scan',
          'spw analyze <roots>    multi-selector stats',
          'spw query / skim       drill into hits',
        ],
      },
      {
        title: 'Uses',
        lines: [
          'Business/academic relationship packs (who depends on whom)',
          'Onboarding to a new Spw tree that still uses ~ and @',
          'Cache planning: hubs are warm candidates; orphans may be cold archives',
        ],
      },
    ],
  })
}

export async function runSpwMapCli(argv: string[] = process.argv): Promise<void> {
  let args: MapArgs
  try {
    args = parseMapArgs(argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  if (args.roots.includes('--help') || args.roots.includes('-h')) {
    printMapHelp()
    return
  }

  const primaryScan = await scanCorpus({
    roots: args.roots,
    resolvePaths: args.resolvePaths,
    hubTop: args.hubs,
    index: args.depth,
  })
  const primary = primaryScan.topography
  let compare: TopographyReport | undefined
  if (args.compare?.length) {
    compare = (
      await scanCorpus({
        roots: args.compare,
        resolvePaths: args.resolvePaths,
        hubTop: args.hubs,
        index: args.depth,
      })
    ).topography
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          primary: serializeReport(primary),
          compare: compare ? serializeReport(compare) : undefined,
          familiarity: compare ? compareFamiliarity(primary, compare) : undefined,
        },
        null,
        2,
      ),
    )
    return
  }

  printReport('primary', primary, args)
  if (compare) {
    console.log('')
    printReport('compare', compare, args)
    const fam = compareFamiliarity(primary, compare)
    console.log('')
    metaBlock('familiarity (shared strands)', [
      ['path overlap', fam.pathOverlap.toFixed(3)],
      ['sigil cosine', fam.cosineSigils.toFixed(3)],
      ['frame affinity', fam.frameOverlap.toFixed(3)],
      ...fam.sharedStrands.map(s => [s.id, `${s.score.toFixed(3)}  ${truncate(s.detail, 60)}`] as [string, string]),
    ])
    if (fam.onlyA.length) meta(`  only primary stems: ${fam.onlyA.slice(0, 12).join(', ')}`)
    if (fam.onlyB.length) meta(`  only compare stems: ${fam.onlyB.slice(0, 12).join(', ')}`)
  }

  meta('  next: spw invent <roots> · spw formula <roots> · spw analyze <roots> · spw skim <hub>')
}

function printReport(label: string, r: TopographyReport, args: MapArgs): void {
  meta(
    `# spw map ${label}  files=${r.files}  links=${r.links}  cyclic=${r.cyclic}  hubs=${r.hubs.length}`,
  )
  if (r.cyclic && r.cycleWitness) {
    console.log(`cycle: ${r.cycleWitness.join(' → ')}`)
  }
  if (r.layers.length) {
    console.log(`layers: ${r.layers.length}  (depth of dependency stack)`)
    for (let i = 0; i < Math.min(r.layers.length, 8); i++) {
      const layer = r.layers[i]!
      console.log(`  L${i} (${layer.length})  ${layer.slice(0, 6).join(', ')}${layer.length > 6 ? ', …' : ''}`)
    }
  }

  if (r.hubs.length) {
    console.log('')
    console.log(
      formatTable(
        ['hub', 'in', 'out', 'Σ'],
        r.hubs.slice(0, args.hubs).map(h => [truncate(h.id, 48), String(h.inDegree), String(h.outDegree), String(h.total)]),
      ),
    )
  }

  if (r.strands.length) {
    console.log('')
    console.log('strands (familiarity wires)')
    for (const s of r.strands) {
      console.log(`  ${s.id.padEnd(22)} ${s.score.toFixed(3)}  ${truncate(s.detail, 64)}`)
    }
  }

  if (r.brokenTargets.length) {
    console.log('')
    console.log(`broken path targets (${r.brokenTargets.length})`)
    for (const t of r.brokenTargets.slice(0, args.limit)) console.log(`  ! ${t}`)
  }

  if (r.orphans.length && r.orphans.length <= args.limit) {
    console.log('')
    console.log(`orphans (no edges): ${r.orphans.slice(0, 12).join(', ')}`)
  }
}

function serializeReport(r: TopographyReport) {
  return {
    files: r.files,
    links: r.links,
    cyclic: r.cyclic,
    cycleWitness: r.cycleWitness,
    layers: r.layers,
    hubs: r.hubs,
    orphans: r.orphans,
    brokenTargets: r.brokenTargets,
    strands: r.strands,
    sigilHistogram: r.sigilHistogram,
    edgeCount: r.graph.edges.length,
    nodeCount: r.graph.nodes.length,
  }
}

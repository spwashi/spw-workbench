/**
 * spw graph — corpus topography & familiarity (IrKind graph product).
 * Route aliases: map, topo (not taught).
 */

import process from 'node:process'
import {
  compareFamiliarity,
  formatTopographySpw,
  type TopographyReport,
} from '@spwashi/spw-seed'
import { scanCorpus } from './corpus-scan'
import {
  CORPUS_SPREAD_HELP_LINES,
  indexDepthForSpread,
  readCorpusSpreadArgument,
  type CorpusSpread,
} from './corpus-spread'
import { printHelpPage } from './help'
import { formatJsonEnvelope } from './envelope'
import {
  emitDetail,
  emitHeader,
  emitNext,
  formatTable,
  meta,
  metaBlock,
  setMetaQuiet,
  truncate,
} from './view'

interface MapArgs {
  roots: string[]
  compare?: string[]
  json: boolean
  hubs: number
  limit: number
  resolvePaths: boolean
  spread: CorpusSpread
  format: 'spw' | 'table'
  quiet: boolean
}

function parseMapArgs(argv: string[]): MapArgs {
  const args =
    argv[0] === 'graph' || argv[0] === 'map' || argv[0] === 'topo'
      ? argv.slice(1)
      : argv
  const parsed: MapArgs = {
    roots: [],
    json: false,
    hubs: 12,
    limit: 40,
    resolvePaths: true,
    spread: 'standard',
    format: 'spw',
    quiet: false,
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
    if (a === '--hubs' || a === '--limit' || a === '-n') {
      const n = Math.max(1, Number(args[++i] ?? 12) || 12)
      parsed.hubs = n
      parsed.limit = n
      continue
    }
    if (a.startsWith('--hubs=')) {
      const n = Math.max(1, Number(a.slice('--hubs='.length)) || 12)
      parsed.hubs = n
      parsed.limit = n
      continue
    }
    if (a.startsWith('--limit=')) {
      const n = Math.max(1, Number(a.slice('--limit='.length)) || 40)
      parsed.hubs = n
      parsed.limit = n
      continue
    }
    if (a === '--no-resolve') {
      parsed.resolvePaths = false
      continue
    }
    const spread = readCorpusSpreadArgument(args, i, 'graph')
    if (spread) {
      parsed.spread = spread.spread
      i = spread.nextIndex
      continue
    }
    if (!a.startsWith('-')) {
      parsed.roots.push(a)
      continue
    }
    throw new Error(`spw graph: unknown flag ${a}`)
  }
  if (!parsed.roots.length) parsed.roots = ['.']
  return parsed
}

function splitCsv(s: string): string[] {
  return s.split(/[,+\s]+/).map(x => x.trim()).filter(Boolean)
}

export function printMapHelp(): void {
  printHelpPage({
    title: 'Spw Graph — topography product',
    usage: [
      'spw graph [paths...] [--from a,b] [--compare otherRoot] [--limit 12]',
      'spw graph prompts --limit 15',
      'spw graph prompts --compare docs/theory',
      'spw graph prompts --table',
    ],
    sections: [
      {
        title: 'Output',
        lines: [
          'Default: a Spw graph card with hubs, strands, and broken references',
          'Table: --table',
          'Reuse: shares the census corpus memo keyed by mtime fingerprint',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--compare / -c   Second root set for familiarity strands',
          '--limit / -n     Hub / broken row cap (also accepts --hubs)',
          ...CORPUS_SPREAD_HELP_LINES,
          '--no-resolve     Leave path targets unresolved',
          '--spw            Spw graph card (default)',
          '--table          Aligned tables',
          '--json           Versioned JSON envelope',
          '--quiet / -q     Suppress headers, details, and recommendations',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'spw census <roots> -n 20',
          'spw graph <roots> --limit 12',
          'spw formula <roots>',
          'spw density <roots>',
          'spw inspect corpus <roots>',
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

  setMetaQuiet(args.quiet)

  const indexDepth = indexDepthForSpread(args.spread)
  const primaryScan = await scanCorpus({
    roots: args.roots,
    resolvePaths: args.resolvePaths,
    hubTop: args.hubs,
    index: indexDepth,
  })
  const primary = primaryScan.topography
  let compare: TopographyReport | undefined
  let compareRoots: string[] | undefined
  if (args.compare?.length) {
    compareRoots = args.compare
    compare = (
      await scanCorpus({
        roots: args.compare,
        resolvePaths: args.resolvePaths,
        hubTop: args.hubs,
        index: indexDepth,
      })
    ).topography
  }

  if (args.json) {
    console.log(
      formatJsonEnvelope('graph', {
        controls: { spread: args.spread, indexDepth },
        primary: serializeReport(primary),
        compare: compare ? serializeReport(compare) : undefined,
        familiarity: compare ? compareFamiliarity(primary, compare) : undefined,
        product: primaryScan.product,
        memoPlane: primaryScan.memoPlane,
      }),
    )
    return
  }

  emitHeader('graph', {
    files: primary.files,
    links: primary.links,
    cyclic: primary.cyclic,
    hubs: primary.hubs.length,
    memo: primaryScan.memoPlane,
    format: args.format,
    spread: args.spread,
    index_depth: indexDepth,
  })

  if (args.format === 'table') {
    printReportTable('primary', primary, args)
  } else {
    console.log(
      formatTopographySpw(primary, {
        among: args.roots,
        label: 'primary',
        memo: primaryScan.memoPlane,
        hubLimit: args.hubs,
        brokenLimit: args.limit,
      }),
    )
  }

  if (compare && compareRoots) {
    console.log('')
    if (args.format === 'table') {
      printReportTable('compare', compare, args)
    } else {
      console.log(
        formatTopographySpw(compare, {
          among: compareRoots,
          label: 'compare',
          hubLimit: args.hubs,
          brokenLimit: args.limit,
        }),
      )
    }
    const fam = compareFamiliarity(primary, compare)
    console.log('')
    metaBlock('familiarity', [
      ['path_overlap', fam.pathOverlap.toFixed(3)],
      ['sigil_cosine', fam.cosineSigils.toFixed(3)],
      ['frame_affinity', fam.frameOverlap.toFixed(3)],
      ...fam.sharedStrands.map(
        s =>
          [s.id, `${s.score.toFixed(3)}  ${truncate(s.detail, 60)}`] as [
            string,
            string,
          ],
      ),
    ])
    if (fam.onlyA.length) {
      emitDetail(`only primary stems: ${fam.onlyA.slice(0, 12).join(', ')}`)
    }
    if (fam.onlyB.length) {
      emitDetail(`only compare stems: ${fam.onlyB.slice(0, 12).join(', ')}`)
    }
  }

  emitNext(
    'spw census <roots>',
    'spw formula <roots>',
    'spw density <roots>',
    'spw outline <hub>',
  )
}

function printReportTable(
  label: string,
  r: TopographyReport,
  args: MapArgs,
): void {
  meta(
    `# graph ${label}  files=${r.files}  links=${r.links}  cyclic=${r.cyclic}  hubs=${r.hubs.length}`,
  )
  if (r.cyclic && r.cycleWitness) {
    console.log(`cycle: ${r.cycleWitness.join(' → ')}`)
  }
  if (r.layers.length) {
    console.log(`layers: ${r.layers.length}  (depth of dependency stack)`)
    for (let i = 0; i < Math.min(r.layers.length, 8); i++) {
      const layer = r.layers[i]!
      console.log(
        `  L${i} (${layer.length})  ${layer.slice(0, 6).join(', ')}${layer.length > 6 ? ', …' : ''}`,
      )
    }
  }

  if (r.hubs.length) {
    console.log('')
    console.log(
      formatTable(
        ['hub', 'in', 'out', 'Σ'],
        r.hubs
          .slice(0, args.hubs)
          .map(h => [
            truncate(h.id, 48),
            String(h.inDegree),
            String(h.outDegree),
            String(h.total),
          ]),
      ),
    )
  }

  if (r.strands.length) {
    console.log('')
    console.log('strands (familiarity wires)')
    for (const s of r.strands) {
      console.log(
        `  ${s.id.padEnd(22)} ${s.score.toFixed(3)}  ${truncate(s.detail, 64)}`,
      )
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

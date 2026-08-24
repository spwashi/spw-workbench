/**
 * spw lattice — apposition unit-cell spectrum over .spw surfaces.
 *
 * Materials / photonics reading (interpretive tooling names only):
 *   lattice  → ordered ~# readings on a surface
 *   spectrum → named vs anonymous population
 *   mask     → envelope hash for transfer/reuse
 *
 * Future: comment interstitial census, pattern photolithography apply, doping maps.
 */

import process from 'node:process'
import {
  appositionSpectrum,
  scanAppositions,
  type AppositionLattice,
  type AppositionSpectrum,
} from '@spwashi/spw-seed'
import { scanCorpus } from './corpus-scan'
import {
  CORPUS_SPREAD_HELP_LINES,
  indexDepthForSpread,
  readCorpusSpreadArgument,
  type CorpusSpread,
} from './corpus-spread'
import { helpLoc, printHelpPage } from './help'
import { defineLoc } from './loc'
import { formatTable, meta, truncate } from './view'

/** Copy for lattice — revise here; keys section.key → lattice.section.key */
const L = defineLoc('lattice', {
  'help.summary':
    'Apposition unit-cell spectrum — named readings without a full parse',
  'help.usage': 'spw lattice [paths...] [--json] [--top N] [--spread standard]',
  'help.opt_json': '--json            Complete JSON spectrum + per-file lattices',
  'help.opt_top': '--top, -n N       Top named species in aggregate (default 24)',
  'help.opt_limit': '--limit N         Max files listed with cells (default 40)',
  'help.opt_quiet': '--quiet, -q       Suppress headers and details',
  'help.note_cells': 'Unit cell = ~#name(body) or ~#(body). Mask = envelope hash.',
  'help.note_comments': 'Does not promote comments; that is future interstitial tooling.',
  'help.note_alias': 'Alias: spw readings',
  'help.ex_basic': 'spw lattice .spw docs/theory --top 20',
  'help.ex_json': 'spw lattice prompts --json',
  'meta.header':
    '# spw lattice  files={files} with_cells={withCells} cells={cells} named={named}',
  'status.none': '  (no apposition unit cells — try paths with ~#name(…) readings)',
})

interface LatticeArgs {
  roots: string[]
  json: boolean
  quiet: boolean
  spread: CorpusSpread
  top: number
  limit: number
}

function parseArgs(argv: string[]): LatticeArgs {
  const args = argv[0] === 'lattice' || argv[0] === 'readings' ? argv.slice(1) : argv
  const parsed: LatticeArgs = {
    roots: [],
    json: false,
    quiet: false,
    spread: 'standard',
    top: 24,
    limit: 40,
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
    const spread = readCorpusSpreadArgument(args, i, 'lattice')
    if (spread) {
      parsed.spread = spread.spread
      i = spread.nextIndex
      continue
    }
    if ((a === '--top' || a === '-n') && args[i + 1]) {
      parsed.top = Math.max(1, Number(args[++i]) || 24)
      continue
    }
    if (a === '--limit' && args[i + 1]) {
      parsed.limit = Math.max(1, Number(args[++i]) || 40)
      continue
    }
    if (a === '--help' || a === '-h') {
      printLatticeHelp()
      process.exit(0)
    }
    if (a.startsWith('-')) {
      throw new Error(`spw lattice: unknown flag ${a}`)
    }
    parsed.roots.push(a)
  }
  if (parsed.roots.length === 0) parsed.roots.push('.')
  return parsed
}

export function printLatticeHelp(): void {
  printHelpPage({
    name: 'lattice',
    summary: L('help.summary'),
    usage: [L('help.usage')],
    groups: [
      {
        title: helpLoc('help.options'),
        lines: [
          L('help.opt_json'),
          L('help.opt_top'),
          ...CORPUS_SPREAD_HELP_LINES,
          L('help.opt_limit'),
          L('help.opt_quiet'),
        ],
      },
      {
        title: helpLoc('help.notes'),
        lines: [L('help.note_cells'), L('help.note_comments'), L('help.note_alias')],
      },
    ],
    examples: [L('help.ex_basic'), L('help.ex_json')],
  })
}

interface FileLatticeRow {
  path: string
  lattice: AppositionLattice
  spectrum: AppositionSpectrum
}

export async function runSpwLatticeCli(argv: string[]): Promise<void> {
  let args: LatticeArgs
  try {
    args = parseArgs(argv)
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  const indexDepth = indexDepthForSpread(args.spread)
  const corpus = await scanCorpus({ roots: args.roots, index: indexDepth })
  const rows: FileLatticeRow[] = []
  const aggregateNames: Record<string, number> = {}
  let totalCells = 0
  let totalNamed = 0
  let totalAnonymous = 0
  let filesWithCells = 0
  const filesScanned = corpus.sources.size

  for (const [relPath, text] of corpus.sources) {
    const lattice = scanAppositions(text)
    if (lattice.cells.length === 0) continue
    filesWithCells++
    totalCells += lattice.cells.length
    totalNamed += lattice.namedCount
    totalAnonymous += lattice.anonymousCount
    const spectrum = appositionSpectrum(lattice)
    for (const [name, n] of Object.entries(spectrum.byName)) {
      aggregateNames[name] = (aggregateNames[name] ?? 0) + n
    }
    rows.push({ path: relPath, lattice, spectrum })
  }

  const topNames = Object.entries(aggregateNames)
    .sort((a, b) => b[1] - a[1])
    .slice(0, args.top)

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          command: 'lattice',
          version: 'spw.lattice/1',
          controls: { spread: args.spread, indexDepth, memoPlane: corpus.memoPlane },
          roots: args.roots,
          filesScanned,
          filesWithCells,
          totalCells,
          totalNamed,
          totalAnonymous,
          topNames: Object.fromEntries(topNames),
          files: rows.slice(0, args.limit).map(r => ({
            path: r.path,
            substrateHash: r.lattice.substrateHash,
            named: r.spectrum.named,
            anonymous: r.spectrum.anonymous,
            byName: r.spectrum.byName,
            cells: r.lattice.cells.map(c => ({
              name: c.name,
              mask: c.mask,
              span: c.span,
              body: truncate(c.body, 80),
            })),
          })),
        },
        null,
        2,
      ),
    )
    return
  }

  if (!args.quiet) {
    meta(
      `# spw lattice  spread=${args.spread} index_depth=${indexDepth} memo=${corpus.memoPlane} files=${filesScanned} with_cells=${filesWithCells} ` +
        `cells=${totalCells} named=${totalNamed} anonymous=${totalAnonymous}`,
    )
  }

  if (topNames.length === 0) {
    meta(L('status.none'))
    return
  }

  console.log('species spectrum (named unit cells)')
  console.log(
    formatTable(
      ['count', 'name'],
      topNames.map(([name, n]) => [String(n), name]),
    ),
  )

  const sample = rows
    .filter(r => r.lattice.namedCount > 0)
    .sort((a, b) => b.lattice.namedCount - a.lattice.namedCount)
    .slice(0, Math.min(12, args.limit))

  if (sample.length && !args.quiet) {
    console.log('')
    console.log('surfaces with densest named lattice')
    console.log(
      formatTable(
        ['named', 'anon', 'path'],
        sample.map(r => [
          String(r.lattice.namedCount),
          String(r.lattice.anonymousCount),
          truncate(r.path, 56),
        ]),
      ),
    )
  }
}

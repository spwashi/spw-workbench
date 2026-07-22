/**
 * spw analyze — multi-selector data analysis over a corpus in one pass.
 *
 * Complements invent (catalog), map (topo), formula (math patterns), query (one selector).
 */

import process from 'node:process'
import { spwq } from '@spwashi/spw-seed'
import { scanCorpus } from './corpus-scan'
import { printHelpPage } from './help'
import { CLI_SELECTOR_PRESETS, listCliSelectorPresetNames, resolveCliSelector } from './selectors'
import { formatTable, meta, renderCounts, truncate } from './view'

const DEFAULT_SELECTORS = [
  'pathRefs',
  'refs',
  'ops:frame',
  'annotations',
  'probes',
  'scopes',
  'domains',
]

interface AnalyzeArgs {
  roots: string[]
  selectors: string[]
  json: boolean
  topFiles: number
  quiet: boolean
}

function parseAnalyzeArgs(argv: string[]): AnalyzeArgs {
  const args = argv[0] === 'analyze' || argv[0] === 'stats' ? argv.slice(1) : argv
  const parsed: AnalyzeArgs = {
    roots: [],
    selectors: [...DEFAULT_SELECTORS],
    json: false,
    topFiles: 12,
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
    if (a === '--from' || a === '--root') {
      parsed.roots.push(...splitCsv(args[++i] ?? ''))
      continue
    }
    if (a.startsWith('--from=')) {
      parsed.roots.push(...splitCsv(a.slice('--from='.length)))
      continue
    }
    if (a === '--selectors' || a === '-s') {
      parsed.selectors = splitCsv(args[++i] ?? '')
      continue
    }
    if (a.startsWith('--selectors=')) {
      parsed.selectors = splitCsv(a.slice('--selectors='.length))
      continue
    }
    if (a === '--top' || a === '--top-files') {
      parsed.topFiles = Math.max(1, Number(args[++i] ?? 12) || 12)
      continue
    }
    if (a.startsWith('--top=')) {
      parsed.topFiles = Math.max(1, Number(a.slice('--top='.length)) || 12)
      continue
    }
    if (!a.startsWith('-')) {
      parsed.roots.push(a)
      continue
    }
    throw new Error(`spw analyze: unknown flag ${a}`)
  }
  if (!parsed.roots.length) parsed.roots = ['.']
  if (!parsed.selectors.length) parsed.selectors = [...DEFAULT_SELECTORS]
  return parsed
}

function splitCsv(s: string): string[] {
  return s.split(/[,+\s]+/).map(x => x.trim()).filter(Boolean)
}

export function printAnalyzeHelp(): void {
  printHelpPage({
    title: 'Spw Analyze — multi-selector corpus stats',
    usage: [
      'spw analyze [paths...] [--selectors pathRefs,ops:frame,annotations]',
      'spw analyze prompts --json',
      'spw stats docs/theory   # alias',
    ],
    sections: [
      {
        title: 'What you get',
        lines: [
          'Per-selector hit totals + density (hits per 100 lines)',
          'Top files by combined activity',
          'Sigil histogram from inventory signals',
          'Quick topography snapshot (links, cyclic, hubs, broken)',
        ],
      },
      {
        title: 'Default selectors',
        lines: DEFAULT_SELECTORS,
      },
      {
        title: 'Sense loop',
        lines: [
          'invent → map → formula → analyze → query/skim detail',
          `presets: ${listCliSelectorPresetNames().join(', ')}`,
        ],
      },
    ],
  })
}

export async function runSpwAnalyzeCli(argv: string[] = process.argv): Promise<void> {
  let args: AnalyzeArgs
  try {
    args = parseAnalyzeArgs(argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  if (args.roots.includes('--help') || args.roots.includes('-h')) {
    printAnalyzeHelp()
    return
  }

  const resolved = args.selectors.map(name => {
    try {
      return resolveCliSelector(name, '')
    } catch {
      if (CLI_SELECTOR_PRESETS[name]) {
        return { selector: CLI_SELECTOR_PRESETS[name]!, label: name }
      }
      throw new Error(
        `spw analyze: unknown selector "${name}" (presets: ${listCliSelectorPresetNames().join(', ')})`,
      )
    }
  })

  const corpus = await scanCorpus({ roots: args.roots })
  const selectorTotals = new Map<string, number>()
  const perFileActivity = new Map<string, number>()
  const perSelectorFiles = new Map<string, number>()

  for (const { label, selector } of resolved) {
    selectorTotals.set(label, 0)
    perSelectorFiles.set(label, 0)
  }

  for (const [file, source] of corpus.sources) {
    let fileHits = 0
    for (const { label, selector } of resolved) {
      let n = 0
      try {
        n = spwq.fromSource(source, selector).length
      } catch {
        n = 0
      }
      if (n > 0) {
        selectorTotals.set(label, (selectorTotals.get(label) ?? 0) + n)
        perSelectorFiles.set(label, (perSelectorFiles.get(label) ?? 0) + 1)
        fileHits += n
      }
    }
    if (fileHits > 0) perFileActivity.set(file, fileHits)
  }

  const totalLines = corpus.inventory.reduce((a, r) => a + r.lines, 0)
  const selectorRows = resolved.map(({ label }) => {
    const hits = selectorTotals.get(label) ?? 0
    const files = perSelectorFiles.get(label) ?? 0
    const density = totalLines > 0 ? (hits / totalLines) * 100 : 0
    return { label, hits, files, density }
  })

  const topFiles = [...perFileActivity.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, args.topFiles)

  const sigilHist = corpus.topography.sigilHistogram

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          command: 'analyze',
          from: args.roots,
          files: corpus.inventory.length,
          lines: totalLines,
          links: corpus.topography.links,
          cyclic: corpus.topography.cyclic,
          brokenTargets: corpus.topography.brokenTargets.length,
          hubs: corpus.topography.hubs.slice(0, 12),
          selectors: selectorRows,
          topFiles: topFiles.map(([file, hits]) => ({ file, hits })),
          sigilHistogram: sigilHist,
        },
        null,
        2,
      ),
    )
    return
  }

  if (!args.quiet) {
    meta(
      `# spw analyze  files=${corpus.inventory.length}  lines=${totalLines}  links=${corpus.topography.links}  cyclic=${corpus.topography.cyclic}`,
    )
    meta(
      `  broken=${corpus.topography.brokenTargets.length}  layers=${corpus.topography.layers.length}  hubs=${corpus.topography.hubs.length}`,
    )
  }

  console.log('selectors')
  console.log(
    formatTable(
      ['selector', 'hits', 'files', 'per100ln'],
      selectorRows.map(r => [
        r.label,
        String(r.hits),
        String(r.files),
        r.density.toFixed(2),
      ]),
    ),
  )

  if (topFiles.length) {
    console.log('')
    console.log('top files (combined selector activity)')
    console.log(
      formatTable(
        ['file', 'hits'],
        topFiles.map(([f, h]) => [truncate(f, 56), String(h)]),
      ),
    )
  }

  const sigEntries = Object.entries(sigilHist).sort((a, b) => b[1] - a[1]).slice(0, 12)
  if (sigEntries.length && !args.quiet) {
    meta(`  sigils  ${renderCounts(new Map(sigEntries), 12)}`)
  }

  if (corpus.topography.hubs.length && !args.quiet) {
    meta(
      `  hubs  ${corpus.topography.hubs
        .slice(0, 6)
        .map(h => `${truncate(h.id, 28)}(${h.total})`)
        .join('  ')}`,
    )
  }

  if (!args.quiet) {
    meta(
      '  next: spw invent --role hub · spw formula <roots> · spw query --from … --skim -s pathRefs',
    )
  }
}

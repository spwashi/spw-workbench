/**
 * spw formula — discover named catalog formulas + surface-embedded patterns.
 *
 * Bridges authoring (math-modeling.spw) and machine (seed math + emit axes).
 */

import process from 'node:process'
import {
  FORMULA_CATALOG,
  SPW_MATH_IDIOMS,
  aggregateFormulaPatterns,
  scanFormulas,
  summarizeFormulaHits,
  type FormulaHit,
} from '@spwashi/spw-seed'
import { parseIndexDepth, scanCorpus, type IndexDepth } from './corpus-scan'
import { printHelpPage } from './help'
import { formatTable, meta, renderCounts, truncate } from './view'

interface FormulaArgs {
  roots: string[]
  json: boolean
  catalog: boolean
  idioms: boolean
  scan: boolean
  top: number
  limit: number
  family?: string
  quiet: boolean
  depth: IndexDepth
}

function parseFormulaArgs(argv: string[]): FormulaArgs {
  const args = argv[0] === 'formula' || argv[0] === 'formulas' ? argv.slice(1) : argv
  const parsed: FormulaArgs = {
    roots: [],
    json: false,
    catalog: false,
    idioms: false,
    scan: false,
    top: 24,
    limit: 60,
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
    if (a === '--catalog') {
      parsed.catalog = true
      continue
    }
    if (a === '--idioms') {
      parsed.idioms = true
      continue
    }
    if (a === '--scan') {
      parsed.scan = true
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
    if (a === '--family' || a === '-f') {
      parsed.family = (args[++i] ?? '').toLowerCase()
      continue
    }
    if (a.startsWith('--family=')) {
      parsed.family = a.slice('--family='.length).toLowerCase()
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
    if (a === '--top') {
      parsed.top = Math.max(1, Number(args[++i] ?? 24) || 24)
      continue
    }
    if (a.startsWith('--top=')) {
      parsed.top = Math.max(1, Number(a.slice('--top='.length)) || 24)
      continue
    }
    if (a === '--limit' || a === '-n') {
      parsed.limit = Math.max(1, Number(args[++i] ?? 60) || 60)
      continue
    }
    if (a.startsWith('--limit=')) {
      parsed.limit = Math.max(1, Number(a.slice('--limit='.length)) || 60)
      continue
    }
    if (!a.startsWith('-')) {
      parsed.roots.push(a)
      continue
    }
    throw new Error(`spw formula: unknown flag ${a}`)
  }
  // Default: catalog alone if no roots/flags; scan if roots given; explicit flags always win
  if (!parsed.catalog && !parsed.scan && !parsed.idioms) {
    if (parsed.roots.length) parsed.scan = true
    else parsed.catalog = true
  }
  if (parsed.scan && !parsed.roots.length) parsed.roots = ['.']
  return parsed
}

function splitCsv(s: string): string[] {
  return s.split(/[,+\s]+/).map(x => x.trim()).filter(Boolean)
}

export function printFormulaHelp(): void {
  printHelpPage({
    title: 'Spw Formula — catalog + discovery',
    usage: [
      'spw formula                      # named catalog (F2, F8, field, graph…)',
      'spw formula [paths...] [--scan]  # find embedded patterns in surfaces',
      'spw formula prompts --family field --top 15',
      'spw formula --catalog --json',
    ],
    sections: [
      {
        title: 'Families',
        lines: [
          'hold · measure · field · graph · loop · literacy · axis · constraint',
          'Matches docs/theory/spw/math-modeling.spw families + emit axes F2/F4/F8',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--catalog         Print machine-backed formula catalog',
          '--idioms          Print surface-pattern idioms with falsify claims',
          '--scan            Scan .spw roots for pattern hits (default when paths given)',
          '--family <id>     Filter catalog/idioms/hits by family',
          '--top N           Pattern frequency table size (default 24)',
          '--limit N / -n N  Max hit lines shown (default 60)',
          '--depth <d>       Scan depth minimal|standard|full (default standard)',
          '--json            Structured envelope',
        ],
      },
      {
        title: 'Idioms vs catalog',
        lines: [
          'catalog  named formula -> meaning (F2.hold, F8.literacy, …)',
          'idioms   surface syntax -> math machine -> falsifiable claim',
          'idioms are what an agent checks a claim against, not just what it names',
        ],
      },
      {
        title: 'Analysis path',
        lines: [
          'spw invent prompts --role hub',
          'spw formula prompts --family measure',
          'spw query --from prompts --count --selector probes',
          'spw map prompts --compare docs/theory',
        ],
      },
    ],
  })
}

export async function runSpwFormulaCli(argv: string[] = process.argv): Promise<void> {
  let args: FormulaArgs
  try {
    args = parseFormulaArgs(argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  if (args.roots.includes('--help') || args.roots.includes('-h')) {
    printFormulaHelp()
    return
  }

  const catalog = FORMULA_CATALOG.filter(
    e => !args.family || e.family === args.family,
  )
  const idioms = SPW_MATH_IDIOMS.filter(
    i => !args.family || i.family === args.family,
  )

  type FileReport = { file: string; hits: FormulaHit[]; byFamily: Record<string, number> }
  let reports: FileReport[] = []
  let patterns: ReturnType<typeof aggregateFormulaPatterns> = []
  let allHits: Array<FormulaHit & { file: string }> = []

  if (args.scan) {
    const corpus = await scanCorpus({ roots: args.roots, index: args.depth })
    for (const [file, source] of corpus.sources) {
      let hits = scanFormulas(source)
      if (args.family) hits = hits.filter(h => h.family === args.family)
      if (!hits.length) continue
      reports.push({
        file,
        hits,
        byFamily: summarizeFormulaHits(hits) as Record<string, number>,
      })
      for (const h of hits) allHits.push({ ...h, file })
    }
    patterns = aggregateFormulaPatterns(reports)
    if (args.family) {
      patterns = patterns.filter(p => p.family === args.family)
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          command: 'formula',
          from: args.roots,
          family: args.family ?? null,
          catalog: args.catalog ? catalog : undefined,
          idioms: args.idioms ? idioms : undefined,
          scan: args.scan
            ? {
                filesWithHits: reports.length,
                totalHits: allHits.length,
                patterns: patterns.slice(0, args.top),
                hits: allHits
                  .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line)
                  .slice(0, args.limit),
              }
            : undefined,
        },
        null,
        2,
      ),
    )
    return
  }

  if (args.catalog) {
    if (!args.quiet) meta(`# spw formula catalog  entries=${catalog.length}`)
    console.log(
      formatTable(
        ['id', 'family', 'formula', 'meaning'],
        catalog.map(e => [
          e.id,
          e.family,
          truncate(e.formula, 40),
          truncate(e.meaning, 48),
        ]),
        { maxCol: 48 },
      ),
    )
    if (args.idioms || args.scan) console.log('')
  }

  if (args.idioms) {
    if (!args.quiet) meta(`# spw formula idioms  entries=${idioms.length}`)
    console.log(
      formatTable(
        ['id', 'family', 'surface', 'machine', 'falsify'],
        idioms.map(i => [
          i.id,
          i.family,
          truncate(i.surface, 32),
          truncate(i.machine, 32),
          truncate(i.falsify, 40),
        ]),
        { maxCol: 40 },
      ),
    )
    if (args.scan) console.log('')
  }

  if (args.scan) {
    if (!args.quiet) {
      meta(
        `# spw formula scan  roots=${args.roots.join(',')}  files_hit=${reports.length}  hits=${allHits.length}`,
      )
    }

    if (!patterns.length) {
      meta('  (no formula patterns found)')
      meta('  tip: try docs/theory or prompts/math; or spw formula --catalog')
      return
    }

    console.log('pattern frequency')
    console.log(
      formatTable(
        ['family', 'pattern', 'hits', 'files'],
        patterns.slice(0, args.top).map(p => [
          p.family,
          p.patternId,
          String(p.count),
          String(p.files),
        ]),
      ),
    )

    const familyHist = new Map<string, number>()
    for (const p of patterns) {
      familyHist.set(p.family, (familyHist.get(p.family) ?? 0) + p.count)
    }
    if (!args.quiet) {
      meta(`  families  ${renderCounts(familyHist, 12)}`)
    }

    const sample = allHits
      .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line)
      .slice(0, args.limit)

    if (sample.length) {
      console.log('')
      console.log('sample hits')
      console.log(
        formatTable(
          ['score', 'family', 'pattern', 'where', 'snippet'],
          sample.map(h => [
            h.score.toFixed(2),
            h.family,
            h.patternId,
            truncate(`${h.file}:${h.line}`, 40),
            truncate(h.snippet, 44),
          ]),
          { maxCol: 44 },
        ),
      )
    }

    if (!args.quiet) {
      meta('  next: spw invent --role hub · spw query --from … --count · skim high-score files')
    }
  }
}

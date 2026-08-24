/**
 * spw taste — measure how a corpus states its own standards.
 *
 * `~#taste:` is where a surface says what "good" means for the thing it
 * governs. `~#goal:` says what the surface is for. A surface with a goal and no
 * taste has stated a purpose without stating a standard — those are the
 * highest-value gaps, and they are what this command ranks.
 *
 * Marks are counted lexically, not through the parser. The parser under-reports
 * annotations (a backtick literal in a frame body is one confirmed trigger), so
 * a parser-only census would quietly understate coverage. `--fidelity` reports
 * that delta rather than hiding it.
 */

import process from 'node:process'
import { spwq } from '@spwashi/spw-seed'
import { scanCorpus, type InventoryRow } from './corpus-scan'
import {
  indexDepthForSpread,
  readCorpusSpreadArgument,
  type CorpusSpread,
} from './corpus-spread'
import { printHelpPage } from './help'
import { formatTable, meta, truncate } from './view'

/** Marks that state purpose. A surface with one of these and no taste is a gap. */
const INTENT_MARKS = ['goal', 'intent', 'status'] as const

export interface MarkDeclaration {
  name: string
  value: string
  line: number
}

export interface TasteRow {
  file: string
  region: string
  lines: number
  inDegree: number
  role: string
  declared: number
  visible: number
  taste: string | null
  hasIntent: boolean
}

interface TasteArgs {
  roots: string[]
  json: boolean
  top: number
  missing: boolean
  vocab: boolean
  fidelity: boolean
  spread: CorpusSpread
}

/**
 * Extract `~#name:` / `$#name:` declarations from a surface.
 *
 * Line-oriented on purpose: a declaration occupies its own line by convention,
 * and this must not miss marks the parser misses. Header comments (`# ...`),
 * slash comments, and mark-shaped text inside quotes or backticks are excluded.
 */
export function declaredMarks(source: string): MarkDeclaration[] {
  const out: MarkDeclaration[] = []

  source.split(/\r?\n/).forEach((raw, i) => {
    const trimmed = raw.trim()
    if (trimmed.startsWith('//')) return
    if (trimmed.startsWith('#') && !/^[~$]#/.test(trimmed)) return

    const code = raw.split('//')[0] ?? ''
    // Blank out literal bodies so a mark quoted inside prose is not counted.
    const masked = code.replace(/"[^"]*"/g, '""').replace(/`[^`]*`/g, '``')
    const decl = /^\s*[~$]#(\w+)\s*:/.exec(masked)
    if (!decl) return

    const value = code.slice(code.indexOf(':', code.indexOf(decl[1]!)) + 1).trim()
    out.push({ name: decl[1]!, value: stripDelimiters(value), line: i + 1 })
  })

  return out
}

function stripDelimiters(value: string): string {
  const m = /^"([\s\S]*)"$|^`([\s\S]*)`$/.exec(value.trim())
  return (m?.[1] ?? m?.[2] ?? value).trim()
}

/** How many annotations the parser actually surfaces for this source. */
function visibleMarks(source: string): number {
  try {
    return (spwq.fromSource(source, { nodeType: 'Annotation' } as never) as unknown[]).length
  } catch {
    return 0
  }
}

function regionOf(file: string): string {
  const head = file.split('/')[0] ?? '.'
  return head.endsWith('.spw') ? '.' : head
}

/**
 * @param withFidelity re-parse each surface to count AST-visible annotations.
 *   scanCorpus has already parsed everything once and does not expose the tree,
 *   so this doubles parse cost across the corpus — only pay it when the fidelity
 *   audit is actually going to be printed.
 */
export function buildTasteRows(
  sources: Map<string, string>,
  inventory: InventoryRow[],
  withFidelity = false,
): TasteRow[] {
  const byFile = new Map(inventory.map((row) => [row.file, row]))

  return [...sources].map(([file, source]) => {
    const marks = declaredMarks(source)
    const taste = marks.find((m) => m.name === 'taste')
    const inv = byFile.get(file)

    return {
      file,
      region: regionOf(file),
      lines: inv?.lines ?? source.split(/\r?\n/).length,
      inDegree: inv?.inDegree ?? 0,
      role: inv?.role ?? 'node',
      declared: marks.length,
      visible: withFidelity ? visibleMarks(source) : marks.length,
      taste: taste ? taste.value : null,
      hasIntent: marks.some((m) => (INTENT_MARKS as readonly string[]).includes(m.name)),
    }
  })
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'not', 'no', 'but', 'is', 'are', 'be', 'to', 'of', 'in', 'on',
  'by', 'for', 'with', 'without', 'that', 'this', 'it', 'its', 'as', 'at', 'from', 'one', 'two',
  'per', 'over', 'than', 'then', 'when', 'until', 'never', 'always', 'only', 'each', 'every',
])

/** Words recurring across taste declarations — the corpus's standard vocabulary. */
export function tasteVocabulary(rows: TasteRow[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!row.taste) continue
    const seen = new Set<string>()
    for (const word of row.taste.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []) {
      if (STOPWORDS.has(word) || seen.has(word)) continue
      seen.add(word)
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }
  return new Map([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
}

function parseTasteArgs(argv: string[]): TasteArgs {
  const args = argv[0] === 'taste' ? argv.slice(1) : argv
  const parsed: TasteArgs = {
    roots: [],
    json: false,
    top: 15,
    missing: false,
    vocab: false,
    fidelity: false,
    spread: 'standard',
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--json') { parsed.json = true; continue }
    if (a === '--missing') { parsed.missing = true; continue }
    if (a === '--vocab') { parsed.vocab = true; continue }
    if (a === '--fidelity') { parsed.fidelity = true; continue }
    if (a === '--top' || a === '-n') { parsed.top = Math.max(1, Number(args[++i]) || 15); continue }
    if (a.startsWith('--top=')) { parsed.top = Math.max(1, Number(a.slice(6)) || 15); continue }
    const spread = readCorpusSpreadArgument(args, i, 'taste')
    if (spread) { parsed.spread = spread.spread; i = spread.nextIndex; continue }
    if (!a.startsWith('-')) { parsed.roots.push(a); continue }
    throw new Error(`spw taste: unknown flag ${a}`)
  }

  if (!parsed.roots.length) parsed.roots = ['.']
  return parsed
}

export function printTasteHelp(): void {
  printHelpPage({
    title: 'spw taste — measure how a corpus states its own standards',
    usage: [
      'spw taste [paths...]',
      'spw taste prompts --missing',
      'spw taste --vocab --top 30',
      'spw taste --fidelity',
    ],
    sections: [
      {
        title: 'What it reads',
        lines: [
          `~#taste:   the standard a surface holds itself to`,
          `~#goal:    what the surface is for`,
          'A surface with a goal and no taste has stated purpose without standard.',
        ],
      },
      {
        title: 'Sections',
        lines: [
          'coverage   taste declarations per region, weighted by reach',
          'gaps       highest in-degree surfaces carrying intent but no taste',
          'vocab      words recurring across taste declarations',
          'fidelity   marks declared vs marks the parser reports',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--missing        only the gap list',
          '--vocab          only the vocabulary table',
          '--fidelity       only the parser-visibility audit',
          '--top / -n N     rows per table (default 15)',
          '--spread <distance>  corpus work near|standard|far',
          '--depth <d>          compatibility alias: minimal|standard|full',
          '--json               JSON product (legacy unwrapped shape)',
        ],
      },
      {
        title: 'Why lexical',
        lines: [
          'Marks are counted from source, not from the AST. The parser drops',
          'annotations in any frame that also contains a backtick literal, so a',
          'parser-only census understates coverage. --fidelity reports the delta.',
        ],
      },
    ],
  })
}

export async function runSpwTasteCli(argv: string[] = process.argv): Promise<void> {
  let args: TasteArgs
  try {
    args = parseTasteArgs(argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  const only = args.missing || args.vocab || args.fidelity
  const show = {
    coverage: !only,
    gaps: !only || args.missing,
    vocab: !only || args.vocab,
    // Opt-in: the audit costs a second full parse of the corpus.
    fidelity: args.fidelity,
  }

  const indexDepth = indexDepthForSpread(args.spread)
  const corpus = await scanCorpus({ roots: args.roots, index: indexDepth })
  const rows = buildTasteRows(corpus.sources, corpus.inventory, show.fidelity)

  const withTaste = rows.filter((r) => r.taste)
  const gaps = rows
    .filter((r) => !r.taste && r.hasIntent)
    .sort((a, b) => b.inDegree - a.inDegree || b.lines - a.lines)
  const vocab = tasteVocabulary(rows)
  const declared = rows.reduce((a, r) => a + r.declared, 0)
  const visible = rows.reduce((a, r) => a + Math.min(r.visible, r.declared), 0)

  if (args.json) {
    console.log(JSON.stringify({
      ok: true,
      command: 'taste',
      controls: { spread: args.spread, indexDepth, memoPlane: corpus.memoPlane },
      roots: args.roots,
      summary: {
        surfaces: rows.length,
        withTaste: withTaste.length,
        coverage: rows.length ? withTaste.length / rows.length : 0,
        intentWithoutTaste: gaps.length,
        marksDeclared: declared,
        // Only meaningful when --fidelity paid for the second parse.
        marksVisibleToParser: show.fidelity ? visible : null,
      },
      vocab: [...vocab].slice(0, args.top).map(([word, n]) => ({ word, surfaces: n })),
      gaps: gaps.slice(0, args.top).map((r) => ({ file: r.file, inDegree: r.inDegree, role: r.role })),
      rows: rows.map((r) => ({ ...r })),
    }, null, 2))
    return
  }

  if (show.coverage) {
    meta(`# spw taste  spread=${args.spread}  index_depth=${indexDepth}  memo=${corpus.memoPlane}  roots=${args.roots.join(',')}  surfaces=${rows.length}`)
    console.log()

    const byRegion = new Map<string, { total: number; taste: number; reach: number }>()
    for (const row of rows) {
      const cur = byRegion.get(row.region) ?? { total: 0, taste: 0, reach: 0 }
      cur.total++
      if (row.taste) cur.taste++
      cur.reach += row.inDegree
      byRegion.set(row.region, cur)
    }

    console.log(formatTable(
      ['region', 'surfaces', 'taste', 'coverage', 'reach'],
      [...byRegion]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, args.top)
        .map(([region, s]) => [
          region,
          String(s.total),
          String(s.taste),
          `${((100 * s.taste) / s.total).toFixed(0)}%`,
          String(s.reach),
        ]),
    ))

    const pct = rows.length ? ((100 * withTaste.length) / rows.length).toFixed(1) : '0.0'
    console.log()
    meta(`  corpus coverage: ${withTaste.length}/${rows.length} surfaces declare taste (${pct}%)`)
  }

  if (show.gaps && gaps.length) {
    console.log()
    meta(`# intent without taste — ranked by how much else points here`)
    console.log()
    console.log(formatTable(
      ['in', 'role', 'surface'],
      gaps.slice(0, args.top).map((r) => [String(r.inDegree), r.role, truncate(r.file, 62)]),
    ))
    meta(`  ${gaps.length} surfaces state a goal without stating a standard`)
  }

  if (show.vocab && vocab.size) {
    console.log()
    meta(`# taste vocabulary — words shared across declarations`)
    console.log()
    console.log(formatTable(
      ['surfaces', 'word'],
      [...vocab].slice(0, args.top).map(([word, n]) => [String(n), word]),
    ))
    const singletons = [...vocab].filter(([, n]) => n === 1).length
    meta(`  ${vocab.size} distinct words; ${singletons} appear exactly once`)
  }

  if (show.fidelity) {
    console.log()
    meta(`# fidelity — declared marks vs marks the parser reports`)
    console.log()

    const worst = rows
      .filter((r) => r.visible < r.declared)
      .sort((a, b) => (b.declared - b.visible) - (a.declared - a.visible))

    console.log(formatTable(
      ['lost', 'seen', 'decl', 'surface'],
      worst.slice(0, args.top).map((r) => [
        String(r.declared - r.visible),
        String(r.visible),
        String(r.declared),
        truncate(r.file, 56),
      ]),
    ))

    const pct = declared ? ((100 * visible) / declared).toFixed(1) : '100.0'
    meta(`  ${visible}/${declared} declared marks reach the AST (${pct}%)`)
    meta(`  ${worst.length} surfaces under-report; a backtick literal in a frame is one trigger`)
  }
}

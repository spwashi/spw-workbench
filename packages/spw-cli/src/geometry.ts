/**
 * spw geometry — inspect braces + operators; optional resonance + workspace field.
 *
 * effect.l0.measure only — never writes host trees.
 * (Contrast: spw measure --write / spw pulse --write are effect.l2.workspace.)
 *
 * Output surfaces (prefer Spw cards over JSON):
 *   human · --spw card · --json envelope · --ndjson stream
 * Intermediate: geometry bytecode + weight-schemed resonances.
 * Gen dumps (optional future --to-gen): `.spw/gen/geometry|field/` — not canon.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  buildGeometryField,
  detectGeometricResonances,
  formatGeometryFieldAsSpw,
  formatGeometryFieldSummary,
  formatGeometryReport,
  formatResonanceAsSpw,
  formatResonanceSummary,
  inspectGeometry,
  parse,
  resolveWeightScheme,
  type GeometryField,
  type GeometricResonanceReport,
  type GeometryReport,
} from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'
import { emitDetail, emitHeader, emitNext, formatTable, meta } from './view'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '_workbench', '.agents'])

interface GeomArgs {
  files: string[]
  json: boolean
  /** One JSON object per surface (host interop only). */
  ndjson: boolean
  /** Source-shaped Spw cards (preferred interoperable surface). */
  spwOut: boolean
  stdin: boolean
  help: boolean
  /** Attach geometric resonance + bytecode. */
  resonance: boolean
  /** Aggregate multi-file geometry field (default when >1 surface or --field). */
  field: boolean
  /** Force field even for single file. */
  fieldOnly: boolean
  scheme: string
  theme?: string
  limit: number
  /** Cap surfaces walked from directories. */
  maxFiles: number
  /**
   * Static-analysis pack: parse health + nesting balance + top lessons
   * without full resonance (cheap multi-file triage).
   */
  staticOnly: boolean
}

function parseArgs(argv: string[]): GeomArgs {
  const args = argv[0] === 'geometry' || argv[0] === 'geom' || argv[0] === 'form' ? argv.slice(1) : argv
  const parsed: GeomArgs = {
    files: [],
    json: false,
    ndjson: false,
    spwOut: false,
    stdin: false,
    help: false,
    resonance: false,
    field: false,
    fieldOnly: false,
    scheme: 'default',
    limit: 48,
    maxFiles: 200,
    staticOnly: false,
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '--help' || a === '-h') {
      parsed.help = true
      continue
    }
    if (a === '--static' || a === '--sa') {
      parsed.staticOnly = true
      continue
    }
    if (a === '--json') {
      parsed.json = true
      continue
    }
    if (a === '--spw' || a === '--format=spw') {
      parsed.spwOut = true
      continue
    }
    if (a === '--ndjson' || a === '--stream') {
      parsed.ndjson = true
      continue
    }
    if (a === '--stdin') {
      parsed.stdin = true
      continue
    }
    if (a === '--resonance' || a === '--with-resonance') {
      parsed.resonance = true
      continue
    }
    if (a === '--field') {
      parsed.field = true
      parsed.fieldOnly = true
      continue
    }
    if (a === '--scheme') {
      parsed.scheme = args[++i] ?? 'default'
      continue
    }
    if (a.startsWith('--scheme=')) {
      parsed.scheme = a.slice('--scheme='.length) || 'default'
      continue
    }
    if (a === '--theme') {
      parsed.theme = args[++i]
      continue
    }
    if (a.startsWith('--theme=')) {
      parsed.theme = a.slice('--theme='.length)
      continue
    }
    if (a === '--limit' || a === '-n') {
      parsed.limit = Math.max(1, Number(args[++i] ?? 48) || 48)
      continue
    }
    if (a.startsWith('--limit=')) {
      parsed.limit = Math.max(1, Number(a.slice('--limit='.length)) || 48)
      continue
    }
    if (a === '--max-files') {
      parsed.maxFiles = Math.max(1, Number(args[++i] ?? 200) || 200)
      continue
    }
    if (a.startsWith('--max-files=')) {
      parsed.maxFiles = Math.max(1, Number(a.slice('--max-files='.length)) || 200)
      continue
    }
    // Explicit write rejection — geometry never mutates the workspace
    if (a === '--write' || a === '--fix' || a === '--apply') {
      throw new Error(
        'spw geometry: effect.l0.measure only — no host writes. Use `spw measure --write` or `spw pulse --write` for l2.workspace.',
      )
    }
    if (!a.startsWith('-')) {
      parsed.files.push(a)
      continue
    }
    throw new Error(`spw geometry: unknown flag ${a}`)
  }
  return parsed
}

export function printGeometryHelp(): void {
  printHelpPage({
    title: 'Spw Form — script geometry + static analysis',
    usage: [
      'spw form <file.spw> [--static] [--resonance] [--spw|--json]',
      'spw form prompts --static --limit 40',
      'spw form prompts --resonance --scheme agent --spw',
      'spw form docs prompts --field --theme probe --spw',
      'cat surface.spw | spw form --stdin --resonance --spw',
    ],
    sections: [
      {
        title: 'Value (why not just open the editor)',
        lines: [
          'Batch static triage across roots (parse balance, depth, lessons)',
          'Geometry bytecode + resonance for cache keys / similarity (headless)',
          'Multi-file field strands — expensive to rebuild by hand in LSP',
          'effect.l0.measure only — never writes',
        ],
      },
      {
        title: 'Modes',
        lines: [
          '--static      cheap multi-file static pack (default lean for dirs)',
          '(default)     full form card per surface',
          '--resonance   bytecode + weighted geometric resonances',
          '--field       aggregate workspace field strands',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--static / --sa                  static-analysis table (dirs lean here)',
          '--resonance / --with-resonance   bytecode + resonances',
          '--field                          workspace field aggregation',
          '--scheme ID                      default | agent | thrift',
          '--theme TOKEN                    filter field by role/type',
          '--limit N                        resonance / strand / static row cap',
          '--max-files N                    directory walk cap (default 200)',
          '--stdin                          read source from stdin',
          '--spw | --json | --ndjson        output form; prefer source-shaped Spw cards',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'spw form prompts --static',
          'spw inspect static <file>     # same plane, thinner entry',
          'spw inspect session <file>    # + beat cache hit flags',
          'spw lattice <roots>           # corpus ~# spectrum only',
          'spw cycle --before a --after b',
        ],
      },
    ],
  })
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const c of process.stdin) chunks.push(c as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function collectSpwFiles(target: string, maxFiles: number, out: string[]): Promise<void> {
  if (out.length >= maxFiles) return
  const abs = path.resolve(target)
  let st
  try {
    st = await fs.stat(abs)
  } catch {
    return
  }
  if (st.isFile()) {
    if (abs.endsWith('.spw')) out.push(abs)
    return
  }
  if (!st.isDirectory()) return
  const entries = await fs.readdir(abs, { withFileTypes: true })
  for (const e of entries) {
    if (out.length >= maxFiles) return
    if (e.name.startsWith('.') && e.name !== '.spw') continue
    if (IGNORED_DIRS.has(e.name)) continue
    const full = path.join(abs, e.name)
    if (e.isDirectory()) await collectSpwFiles(full, maxFiles, out)
    else if (e.isFile() && e.name.endsWith('.spw')) out.push(full)
  }
}

interface SurfaceCardOut {
  uri: string
  geometry: GeometryReport
  resonance?: GeometricResonanceReport
}

function printHumanSurface(card: SurfaceCardOut, multi: boolean): void {
  if (multi) meta(`# file=${card.uri}`)
  console.log(formatGeometryReport(card.geometry))
  if (card.resonance) {
    console.log('')
    console.log(`## Resonance  ${formatResonanceSummary(card.resonance)}`)
    for (const r of card.resonance.resonances.slice(0, 12)) {
      console.log(
        `  ${r.strength.toFixed(2)}  ${r.type.padEnd(16)} ${r.ends.join(' ↔ ')}  ${r.evidence}`,
      )
    }
    if (card.resonance.resonances.length > 12) {
      console.log(`  … ${card.resonance.resonances.length - 12} more`)
    }
    console.log(`  bytecode  ${card.resonance.bytecode.contentHash}  scheme=${card.resonance.scheme}`)
  }
}

function printHumanField(field: GeometryField): void {
  console.log(`# ${formatGeometryFieldSummary(field)}`)
  console.log('')
  console.log('## Surfaces')
  for (const s of field.surfaces.slice(0, 24)) {
    const roles = Object.entries(s.roles)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([r, n]) => `${r}×${n}`)
      .join(' ')
    console.log(
      `  ${s.uri}  depth=${s.maxDepth}  reso=${s.resonanceCount}  hash=${s.contentHash.slice(0, 8)}  ${roles || '—'}`,
    )
  }
  if (field.surfaces.length > 24) console.log(`  … ${field.surfaces.length - 24} more`)
  console.log('')
  console.log('## Strands')
  for (const st of field.strands.slice(0, 16)) {
    console.log(
      `  ${st.weight.toFixed(2)}  ${String(st.type).padEnd(16)} ${st.ends.join(' ↔ ')}  surfaces=${st.surfaces.length}`,
    )
  }
  if (field.strands.length > 16) console.log(`  … ${field.strands.length - 16} more`)
  console.log('')
  console.log('## Field ops')
  console.log(
    '  ' +
      field.fieldOps
        .slice(0, 12)
        .map(o => `${o.op}×${o.count}`)
        .join(' '),
  )
}

export async function runSpwGeometryCli(argv: string[] = process.argv): Promise<void> {
  let args: GeomArgs
  try {
    args = parseArgs(argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  if (args.help || (!args.files.length && !args.stdin)) {
    printGeometryHelp()
    if (!args.help && !args.files.length && !args.stdin) process.exitCode = 1
    return
  }

  // Validate scheme early
  const scheme = resolveWeightScheme(args.scheme)
  if (typeof args.scheme === 'string' && args.scheme !== scheme.id && !['default', 'agent', 'thrift'].includes(args.scheme)) {
    // resolveWeightScheme falls back to default; warn agent
    console.error(`spw geometry: unknown scheme "${args.scheme}", using ${scheme.id}`)
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const sources: Array<{ uri: string; text: string }> = []

  if (args.stdin) {
    sources.push({ uri: 'stdin', text: await readStdin() })
  }

  for (const f of args.files) {
    const abs = workspace ? await resolveWorkspacePath(workspace, f) : path.resolve(f)
    let st
    try {
      st = await fs.stat(abs)
    } catch {
      console.error(`spw geometry: cannot read ${f}`)
      process.exitCode = 1
      return
    }
    if (st.isDirectory()) {
      const files: string[] = []
      await collectSpwFiles(abs, args.maxFiles, files)
      for (const file of files) {
        const rel = path.relative(process.cwd(), file) || file
        sources.push({ uri: rel, text: await fs.readFile(file, 'utf8') })
      }
    } else {
      const rel = path.relative(process.cwd(), abs) || f
      sources.push({ uri: rel, text: await fs.readFile(abs, 'utf8') })
    }
  }

  if (!sources.length) {
    console.error('spw form: no .spw surfaces found')
    process.exitCode = 1
    return
  }

  // Directory walks lean static unless the user asked for resonance/field/spw card
  const leanStatic =
    args.staticOnly ||
    (sources.length > 1 && !args.resonance && !args.fieldOnly && !args.field && !args.theme && !args.spwOut)

  if (leanStatic) {
    const limited = sources.slice(0, args.limit)
    const rows = limited.map(s => {
      const g = inspectGeometry(s.text)
      const p = parse(s.text, { path: s.uri })
      const issues: string[] = []
      if (!p.success) issues.push(`parse×${p.errors?.length ?? 1}`)
      if (g.nesting.openBalance !== 0) issues.push(`unbal=${g.nesting.openBalance}`)
      if (g.degradations.length) issues.push(`degrade×${g.degradations.length}`)
      if (g.lessons[0]) issues.push(g.lessons[0].slice(0, 36))
      const opTop = g.operators
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(o => `${o.sigil}×${o.count}`)
        .join(' ')
      return {
        file: s.uri,
        parse: p.success ? 'ok' : 'fail',
        depth: g.nesting.maxDepth,
        deep: g.nesting.deepLines,
        ops: opTop || '—',
        issues: issues.join('; ') || '—',
        lessons: g.lessons,
      }
    })

    emitHeader('form', {
      mode: 'static',
      files: sources.length,
      shown: rows.length,
      effect: 'effect.l0.measure',
    })

    if (args.json) {
      console.log(
        formatJsonEnvelope('form.static', rows, {
          files: sources.length,
          effect: 'effect.l0.measure',
        }),
      )
      return
    }

    console.log(
      formatTable(
        ['file', 'parse', 'depth', 'deepLn', 'ops', 'issues'],
        rows.map(r => [
          r.file,
          r.parse,
          String(r.depth),
          String(r.deep),
          r.ops,
          r.issues.slice(0, 48),
        ]),
        { maxCol: 40 },
      ),
    )
    if (sources.length > limited.length) {
      emitDetail(`… ${sources.length - limited.length} more (raise --limit)`)
    }
    // Surface first lesson block for single-file static
    if (rows.length === 1 && rows[0]!.lessons.length) {
      console.log('')
      for (const L of rows[0]!.lessons.slice(0, 6)) console.log(`  · ${L}`)
    }
    emitNext(
      'spw form <file> --resonance',
      'spw inspect session <file>',
      'spw lattice <roots>',
    )
    return
  }

  // Field when --field, --theme, or multi-file with --resonance
  const buildField =
    args.fieldOnly || (sources.length > 1 && (args.field || !!args.theme || args.resonance))

  const cards: SurfaceCardOut[] = []
  for (const s of sources) {
    const geometry = inspectGeometry(s.text)
    const card: SurfaceCardOut = { uri: s.uri, geometry }
    if (args.resonance || buildField) {
      card.resonance = detectGeometricResonances(s.text, {
        uri: s.uri,
        scheme: { ...scheme, limit: args.limit },
      })
    }
    cards.push(card)
  }

  let field: GeometryField | undefined
  if (buildField) {
    field = buildGeometryField(sources, {
      scheme: { ...scheme, limit: args.limit },
      resonance: true,
      theme: args.theme,
      limit: args.limit,
    })
  }

  // ── Output ────────────────────────────────────────────────────
  if (args.spwOut) {
    for (const c of cards) {
      if (cards.length > 1) console.log(`// --- ${c.uri}`)
      console.log(formatGeometryReport(c.geometry))
      if (c.resonance) {
        console.log('')
        console.log(formatResonanceAsSpw(c.resonance, c.uri))
      }
      console.log('')
    }
    if (field) console.log(formatGeometryFieldAsSpw(field))
    return
  }

  if (args.ndjson) {
    for (const c of cards) {
      const row: Record<string, unknown> = {
        surface: 'spw.geometry.card',
        uri: c.uri,
        geometry: c.geometry,
      }
      if (c.resonance) {
        row.bytecode = c.resonance.bytecode
        row.scheme = c.resonance.scheme
        row.resonances = c.resonance.resonances
      }
      console.log(JSON.stringify(row))
    }
    if (field) {
      console.log(JSON.stringify({ surface: 'spw.geometry.field', ...field }))
    }
    return
  }

  if (args.json) {
    const data = {
      effect: 'effect.l0.measure',
      scheme: scheme.id,
      surfaces: cards.map(c => ({
        uri: c.uri,
        geometry: c.geometry,
        ...(c.resonance
          ? {
              bytecode: c.resonance.bytecode,
              scheme: c.resonance.scheme,
              resonances: c.resonance.resonances,
            }
          : {}),
      })),
      field,
    }
    console.log(
      formatJsonEnvelope('geometry', data, {
        files: cards.length,
        resonance: args.resonance || !!field,
        scheme: scheme.id,
        fieldStrands: field?.strands.length ?? 0,
      }),
    )
    return
  }

  // human
  if (field && args.fieldOnly && !args.resonance) {
    printHumanField(field)
    return
  }

  for (let i = 0; i < cards.length; i++) {
    printHumanSurface(cards[i]!, cards.length > 1)
    if (i < cards.length - 1) console.log('')
  }
  if (field && (args.fieldOnly || cards.length > 1)) {
    console.log('')
    printHumanField(field)
  }
}

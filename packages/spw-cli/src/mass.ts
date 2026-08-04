/**
 * spw measure (mass/thrift family) — reconcile declared `%mass` against `@self`.
 *
 * Canonical name: `measure` (alias `mass`, `thrift`).
 * **Mass is one thrift family**, not the measure kernel. Context for `%`+`mass`
 * (subject_file, @self, thrift.file_physics) is defined in
 * `.spw/registries/measure-context.spw` / measure-protocol.ts.
 *
 * effect.l0.measure by default; `--write` is effect.l2.workspace and rewrites
 * only the drifted digits.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  applyMassCorrections,
  measureMass,
  readMassDeclarations,
  reconcileMass,
  type MassReconciliation,
} from '@spwashi/spw-seed'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'

interface CliArgs {
  targets: string[]
  write: boolean
  json: boolean
  help: boolean
  /** Report surfaces that declare `@self` but no `%mass` facet. */
  missing: boolean
}

interface SubjectReport {
  file: string
  self: string
  resolved: string
  entries: MassReconciliation[]
  error?: string
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '_workbench'])

function parseArgs(argv: string[]): CliArgs {
  const common = parseCommonFlags(argv.slice(2))
  const parsed: CliArgs = {
    targets: [],
    write: false,
    json: false,
    help: common.flags.help,
    missing: false,
  }

  for (const arg of common.args) {
    if (arg === 'mass' || arg === 'measure' || arg === 'thrift' || arg === 'size') continue
    if (arg === '--write') {
      parsed.write = true
      continue
    }
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (arg === '--missing') {
      parsed.missing = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }
    if (arg.startsWith('-')) throw new Error(`spw measure: unknown flag ${arg}`)
    parsed.targets.push(arg)
  }

  if (parsed.targets.length === 0) parsed.targets.push('.')
  return parsed
}

export function printSpwMassHelp(): void {
  printHelpPage({
    title: 'Spw Measure — mass/thrift family (declared %mass vs @self)',
    usage: [
      'spw measure [mass|thrift] [targets...]',
      'spw measure prompts --json',
      'spw measure docs --write',
      'spw mass …                    # alias',
    ],
    sections: [
      {
        title: 'What it reads',
        lines: [
          'A surface names its subject and records that subject’s size:',
          '  ^["module"]{',
          '    @self: ~"../js/kernel/dom-contracts.js"',
          '    %mass{ lines: 2315, bytes: 69219 }',
          '  }',
          '@self resolves relative to the .spw file that declares it.',
        ],
      },
      {
        title: 'Verdicts',
        lines: [
          'match         declared number equals the measured one',
          'drift         declared number is stale — --write corrects it',
          'undeclared    measurable but the facet does not claim it',
          'unmeasurable  the facet claims something this probe cannot check',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--write     Rewrite drifted numbers in place (effect.l2.workspace)',
          '--json      Machine-readable report',
          '--missing   Also list surfaces with @self but no %mass facet',
        ],
      },
    ],
  })
}

async function collectSpwFiles(target: string): Promise<string[]> {
  const absolute = path.resolve(target)
  let stats
  try {
    stats = await fs.stat(absolute)
  } catch {
    return []
  }
  if (stats.isFile()) return absolute.endsWith('.spw') ? [absolute] : []
  if (!stats.isDirectory()) return []

  const out: string[] = []
  for (const entry of await fs.readdir(absolute, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
    const entryPath = path.join(absolute, entry.name)
    if (entry.isDirectory()) out.push(...(await collectSpwFiles(entryPath)))
    else if (entry.isFile() && entry.name.endsWith('.spw')) out.push(entryPath)
  }
  return out
}

function symbol(verdict: MassReconciliation['verdict']): string {
  if (verdict === 'match') return '='
  if (verdict === 'drift') return '~'
  if (verdict === 'undeclared') return '+'
  return '?'
}

export async function runSpwMassCli(argv: string[] = process.argv): Promise<void> {
  let cli: CliArgs
  try {
    cli = parseArgs(argv)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
    return
  }

  if (cli.help) {
    printSpwMassHelp()
    return
  }

  const repoRoot = process.cwd()
  const fileSet = new Set<string>()
  for (const target of cli.targets) {
    for (const file of await collectSpwFiles(target)) fileSet.add(file)
  }

  const reports: SubjectReport[] = []
  let drifted = 0
  let corrected = 0

  for (const file of Array.from(fileSet).sort()) {
    const source = await fs.readFile(file, 'utf8')
    const declarations = readMassDeclarations(source)
    if (declarations.length === 0) continue

    let nextSource = source
    for (const declaration of declarations) {
      if (Object.keys(declaration.measures).length === 0 && !cli.missing) continue

      const resolved = path.resolve(path.dirname(file), declaration.self)
      const rel = path.relative(repoRoot, file) || file

      let subject: string
      try {
        subject = await fs.readFile(resolved, 'utf8')
      } catch {
        reports.push({
          file: rel,
          self: declaration.self,
          resolved: path.relative(repoRoot, resolved),
          entries: [],
          error: 'subject not found',
        })
        continue
      }

      const entries = reconcileMass(declaration, measureMass(subject))
      const fileDrift = entries.filter(e => e.verdict === 'drift').length
      drifted += fileDrift

      if (cli.write && fileDrift > 0) {
        // Re-read spans from the current text: an earlier declaration in this
        // same file may already have shifted them.
        const fresh = readMassDeclarations(nextSource).find(d => d.self === declaration.self)
        if (fresh) {
          const refreshed = reconcileMass(fresh, measureMass(subject))
          const applied = applyMassCorrections(nextSource, refreshed)
          nextSource = applied.source
          corrected += applied.applied
        }
      }

      reports.push({
        file: rel,
        self: declaration.self,
        resolved: path.relative(repoRoot, resolved),
        entries,
      })
    }

    if (cli.write && nextSource !== source) {
      await fs.writeFile(file, nextSource, 'utf8')
    }
  }

  if (cli.json) {
    console.log(JSON.stringify({ version: 'spw.mass/1', reports, drifted, corrected }, null, 2))
  } else if (reports.length === 0) {
    console.log('spw mass: no surfaces declare @self with a %mass facet.')
  } else {
    for (const report of reports) {
      if (report.error) {
        console.log(`! ${report.file}  @self ${report.self} — ${report.error}`)
        continue
      }
      console.log(`# ${report.file}  @self ${report.self}`)
      for (const entry of report.entries) {
        const declared = entry.declared === undefined ? '—' : String(entry.declared)
        const measured = entry.measured === undefined ? '—' : String(entry.measured)
        console.log(
          `  ${symbol(entry.verdict)} ${entry.key.padEnd(10)} declared=${declared.padEnd(8)} measured=${measured.padEnd(8)} ${entry.verdict}`,
        )
      }
    }
  }

  if (cli.write) {
    console.log(`spw mass: ${corrected} number(s) corrected across ${reports.length} subject(s).`)
    return
  }

  console.log(`spw mass: ${reports.length} subject(s), ${drifted} drifted.`)
  if (drifted > 0) process.exitCode = 1
}

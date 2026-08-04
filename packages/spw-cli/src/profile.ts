/**
 * spw surface (stack lens) — resolved dialect × review × format for a .spw file.
 *
 * Canonical name: `surface` (aliases `profile`, `stack`).
 * Today: stack identity card. Later: form + graph + thrift composite.
 * effect.l0.measure — no writes.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  parse,
  resolveSurfaceProfile,
  scanExperimentalRefs,
  type SurfaceProfileStack,
} from '@spwashi/spw-seed'
import { parseCommonFlags } from './args'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'


interface CliArgs {
  targets: string[]
  json: boolean
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const common = parseCommonFlags(argv.slice(2))
  const parsed: CliArgs = {
    targets: [],
    json: common.flags.json ?? false,
    help: common.flags.help,
  }
  for (const arg of common.args) {
    if (arg === 'profile' || arg === 'surface' || arg === 'stack') continue
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }
    if (arg.startsWith('-')) throw new Error(`spw surface: unknown flag ${arg}`)
    parsed.targets.push(arg)
  }
  return parsed
}

export function printSpwProfileHelp(): void {
  printHelpPage({
    title: 'Spw Surface — stack lens (dialect × review × format)',
    usage: [
      'spw surface <file.spw>',
      'spw surface .agents/plans/foo/wip.spw --json',
      'spw stack <file.spw>              # alias (identity only)',
      'spw profile <file.spw>            # compat alias',
    ],
    sections: [
      {
        title: 'What it shows (stack lens today)',
        lines: [
          'dialect (+ source: header|pragma|path|default|option)',
          'review, format, mutation, reading, domain',
          'metasyntax flags (newlineAsSpace, machineLint, flowGlyphs, planStream)',
          'parse dialectPreprocessed + experimentalRefs (=exp ids)',
          'Later composite: form summary + ego graph + thrift (see cli-sense-reorientation)',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--json    Machine-readable envelope',
          '--help    This page',
        ],
      },
    ],
  })
}

function relPath(file: string): string {
  const cwd = process.cwd()
  const abs = path.resolve(file)
  return abs.startsWith(cwd + path.sep) ? path.relative(cwd, abs) : abs
}

function printStack(file: string, stack: SurfaceProfileStack, parseExtra: {
  dialectPreprocessed?: boolean
  experimentalRefs?: string[]
  success: boolean
}): void {
  console.log(`# ${file}`)
  console.log(`dialect     ${stack.dialect}  (${stack.dialectSource})`)
  console.log(`review      ${stack.review}`)
  console.log(`format      ${stack.format}`)
  console.log(`mutation    ${stack.mutation}`)
  console.log(`reading     ${stack.reading}`)
  console.log(`domain      ${stack.domain}`)
  console.log(`contextMode ${stack.contextMode}`)
  console.log(`lex         ${stack.lex}`)
  console.log('metasyntax')
  console.log(`  newlineAsSpace  ${stack.metasyntax.newlineAsSpace}`)
  console.log(`  machineLint     ${stack.metasyntax.machineLint}`)
  console.log(`  flowGlyphs      ${stack.metasyntax.flowGlyphs}`)
  console.log(`  planStream      ${stack.metasyntax.planStream}`)
  console.log(`  highContext     ${stack.metasyntax.highContext}`)
  console.log(`parse.ok          ${parseExtra.success}`)
  console.log(`parse.preprocessed ${parseExtra.dialectPreprocessed ?? false}`)
  if (parseExtra.experimentalRefs?.length) {
    console.log(`experimentalRefs  ${parseExtra.experimentalRefs.join(', ')}`)
  }
}

export async function runSpwProfileCli(argv: string[] = process.argv): Promise<void> {
  const args = parseArgs(argv)
  if (args.help) {
    printSpwProfileHelp()
    return
  }
  if (args.targets.length === 0) {
    printSpwProfileHelp()
    process.exitCode = 1
    return
  }

  const reports: Array<Record<string, unknown>> = []

  for (const target of args.targets) {
    const abs = path.resolve(target)
    const rel = relPath(target)
    let source: string
    try {
      source = await fs.readFile(abs, 'utf8')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (args.json) {
        reports.push({ file: rel, error: msg })
      } else {
        console.error(`spw profile: cannot read ${rel}: ${msg}`)
      }
      process.exitCode = 1
      continue
    }

    const stack = resolveSurfaceProfile(source, { path: rel })
    const parsed = parse(source, { path: rel })
    const scan = scanExperimentalRefs(source)

    if (args.json) {
      reports.push({
        file: rel,
        stack,
        parse: {
          success: parsed.success,
          dialect: parsed.dialect,
          dialectSource: parsed.dialectSource,
          dialectPreprocessed: parsed.dialectPreprocessed ?? false,
          experimentalRefs: parsed.experimentalRefs ?? scan.ids,
          warningCount: parsed.warnings.length,
        },
      })
    } else {
      printStack(rel, stack, {
        success: parsed.success,
        dialectPreprocessed: parsed.dialectPreprocessed,
        experimentalRefs: parsed.experimentalRefs ?? (scan.ids.length ? scan.ids : undefined),
      })
      if (args.targets.length > 1) console.log('')
    }
  }

  if (args.json) {
    console.log(formatJsonEnvelope('profile', reports, { files: reports.length }))
  }
}

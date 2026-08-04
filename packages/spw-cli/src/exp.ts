/**
 * spw exp — list / show experimental syntax catalog entries.
 *
 * effect.l0.measure — browse reference ids for plans and tooling.
 */

import process from 'node:process'
import {
  formatCatalogEntryMarkdown,
  getSyntaxCatalogEntry,
  listSyntaxCatalog,
  type ExpRuntimeHook,
  type ExpStatus,
} from '@spwashi/spw-seed'
import { parseCommonFlags } from './args'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'

interface CliArgs {
  sub: 'list' | 'show' | 'help'
  id?: string
  status?: ExpStatus
  dialect?: string
  hook?: ExpRuntimeHook
  json: boolean
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const common = parseCommonFlags(argv.slice(2))
  const args = common.args.filter(a => a !== 'exp')
  const parsed: CliArgs = {
    sub: 'list',
    json: common.flags.json ?? false,
    help: common.flags.help,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }
    if (arg === '--status' || arg.startsWith('--status=')) {
      const v = arg.startsWith('--status=') ? arg.slice(9) : args[++i]
      if (v === 'proposed' || v === 'partial' || v === 'implemented') parsed.status = v
      else throw new Error(`spw exp: bad --status ${v}`)
      continue
    }
    if (arg === '--dialect' || arg.startsWith('--dialect=')) {
      parsed.dialect = arg.startsWith('--dialect=') ? arg.slice(10) : args[++i]
      continue
    }
    if (arg === '--hook' || arg.startsWith('--hook=')) {
      const v = arg.startsWith('--hook=') ? arg.slice(7) : args[++i]
      if (v === 'none' || v === 'lint' || v === 'lower' || v === 'parse') parsed.hook = v
      else throw new Error(`spw exp: bad --hook ${v}`)
      continue
    }
    if (arg.startsWith('-')) throw new Error(`spw exp: unknown flag ${arg}`)
    if (arg === 'list' || arg === 'show' || arg === 'help') {
      parsed.sub = arg
      continue
    }
    if (parsed.sub === 'show' || !parsed.id) {
      parsed.id = arg
      if (parsed.sub === 'list' && parsed.id) parsed.sub = 'show'
      continue
    }
  }

  if (parsed.help) parsed.sub = 'help'
  return parsed
}

export function printSpwExpHelp(): void {
  printHelpPage({
    title: 'Spw Exp — experimental syntax catalog',
    usage: [
      'spw exp list [--status proposed|partial|implemented] [--dialect Spw.f] [--hook parse]',
      'spw exp show <id>',
      'spw exp list --json',
    ],
    sections: [
      {
        title: 'What it is',
        lines: [
          'Greppable reference ids for plan/experimental syntax (σ-chain, dialects, refactor plan, …).',
          'status proposed + hook none|lint|lower means reference — not silent runtime law.',
          'Plans cite with: =exp[ id: flow.sigma_chain ]',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--status    Filter list by status',
          '--dialect   Filter list by dialect product surface',
          '--hook      Filter by runtimeHook (none|lint|lower|parse)',
          '--json      Machine-readable envelope',
        ],
      },
    ],
  })
}

export async function runSpwExpCli(argv: string[] = process.argv): Promise<void> {
  let args: CliArgs
  try {
    args = parseArgs(argv)
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exitCode = 1
    return
  }

  if (args.sub === 'help') {
    printSpwExpHelp()
    return
  }

  if (args.sub === 'show') {
    if (!args.id) {
      console.error('spw exp show: missing id')
      process.exitCode = 1
      return
    }
    const entry = getSyntaxCatalogEntry(args.id)
    if (!entry) {
      console.error(`spw exp: unknown id "${args.id}"`)
      process.exitCode = 1
      return
    }
    if (args.json) {
      console.log(formatJsonEnvelope('exp', entry))
    } else {
      console.log(formatCatalogEntryMarkdown(entry))
    }
    return
  }

  // list
  const entries = listSyntaxCatalog({
    status: args.status,
    dialect: args.dialect,
    runtimeHook: args.hook,
  })

  if (args.json) {
    console.log(
      formatJsonEnvelope('exp', entries, {
        count: entries.length,
        status: args.status ?? null,
        dialect: args.dialect ?? null,
        hook: args.hook ?? null,
      }),
    )
    return
  }

  if (entries.length === 0) {
    console.log('spw exp: no catalog entries match filters')
    return
  }

  const idW = Math.max(...entries.map(e => e.id.length), 2)
  const stW = Math.max(...entries.map(e => e.status.length), 6)
  console.log(`${'id'.padEnd(idW)}  ${'status'.padEnd(stW)}  hook     dialect  summary`)
  for (const e of entries) {
    console.log(
      `${e.id.padEnd(idW)}  ${e.status.padEnd(stW)}  ${(e.runtimeHook).padEnd(8)} ${(e.dialect ?? '—').padEnd(8)} ${e.summary}`,
    )
  }
  console.log(`\n${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}  (spw exp show <id>)`)
}

import process from 'node:process'
import { parseCommand, parseCommonFlags, parseQueryArgs } from './args'
import { runSpwDevCli } from './dev'
import { printDoctorHelp, runSpwDoctorCli } from './doctor'
import { printSpwFormatHelp, runSpwFormatCli } from './format'
import { printHelpPage } from './help'
import { printInitUsage, runSpwInitCli } from './init'
import { runSpwLsCli } from './ls'
import { printHelp as printLsHelp } from './ls/args'
import { runSpwMemCli } from './mem'
import { printMemHelp } from './mem'
import { runSpwMountCli } from './mount'
import { printMountHelp } from './mount'
import { runQueryCli } from './query'
import { printSelectUsage, runSpwSelectCli } from './select'

export async function runSpwCli(argv: string[]): Promise<void> {
  const { command, args: rawArgs } = parseCommand(argv)
  const common = parseCommonFlags(rawArgs)
  const args = common.args

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command === 'query' || command === 'q') {
    if (common.flags.help) {
      printQueryHelp()
      return
    }
    await runQueryCli(parseQueryArgs(args))
    return
  }

  if (command === 'select' || command === 'spwq') {
    if (common.flags.help) {
      printSelectUsage()
      return
    }
    await runSpwSelectCli(toCliArgv(command, args))
    return
  }

  if (command === 'init' || command === 'install') {
    if (common.flags.help) {
      printInitUsage()
      return
    }
    await runSpwInitCli(toCliArgv(command, args))
    return
  }

  if (command === 'doctor') {
    if (common.flags.help) {
      printDoctorHelp()
      return
    }
    await runSpwDoctorCli(toCliArgv(command, args))
    return
  }

  switch (command) {
    case 'ls':
      if (common.flags.help) {
        printLsHelp('spw:ls')
        return
      }
      await runSpwLsCli({ argv: toCliArgv(command, args), entryName: 'spw:ls' })
      return
    case 'seq':
      if (common.flags.help) {
        printLsHelp('spw:seq')
        return
      }
      await runSpwLsCli({ argv: toCliArgv(command, args), entryName: 'spw:seq', compatNotice: true })
      return
    case 'mount':
      if (common.flags.help) {
        printMountHelp()
        return
      }
      await runSpwMountCli(toCliArgv(command, args))
      return
    case 'mem':
      if (common.flags.help) {
        printMemHelp()
        return
      }
      await runSpwMemCli(toCliArgv(command, args))
      return
    case 'format':
      if (common.flags.help) {
        printSpwFormatHelp()
        return
      }
      await runSpwFormatCli(toCliArgv(command, args))
      return
    case 'dev':
      await runSpwDevCli()
      return
    default:
      console.error(`spw: unknown command "${command}"`)
      printHelp()
      process.exitCode = 1
      return
  }
}

function toCliArgv(command: string, args: string[]): string[] {
  return ['node', command, ...args]
}

function printHelp(): void {
  printHelpPage({
    title: 'Spw CLI',
    usage: [
      'spw <command> [args]',
      'npm run spw -- <command> [args]',
    ],
    sections: [
      {
        title: 'Commands',
        lines: [
          'init         Bootstrap a .spw workspace in a target directory',
          'doctor       Diagnose site-install readiness in a target directory',
          'query | q    Deep multi-file query (from/select/where style)',
          'select       Single-file AST selector surface (absorbs spwq)',
          'ls           Liminal sequence selector engine (operator/braces/probe)',
          'mount        Mount/check surfaces for workbench-shaped roots',
          'mem          Memory surface tools',
          'format       Spw formatter',
          'dev          Hot loop runner',
          'help         Print this help',
        ],
      },
      {
        title: 'Compatibility',
        lines: [
          'install      Alias for init',
          'seq          Alias for ls',
          'spwq         Alias for select',
        ],
      },
      {
        title: 'Try',
        lines: [
          'spw init my-site',
          'spw doctor my-site',
          'npm run spw -- init my-site',
          'npm run spw -- query --help',
          'npm run spw -- format --help',
        ],
      },
    ],
  })
}

function printQueryHelp(): void {
  printHelpPage({
    title: 'Spw Query',
    usage: [
      'npm run spw -- query [--from .spw,docs] [--selector navigable | --expr "$@_"] [--where "kind=Reference,root=src"] [--select file,kind,target,line,column] [--limit 100] [--format lines|json] [--summary]',
    ],
    sections: [
      {
        title: 'Examples',
        lines: [
          'npm run spw -- query --from .spw,docs --selector navigable --where "kind in PathRef|Reference"',
          'npm run spw -- query --from .spw --expr "$~\\"_\\" | $@_" --where "root=spw" --select file,kind,root,target,line',
          'npm run spw -- query --from docs --where "file~onboarding,sigil=@"',
        ],
      },
    ],
  })
}

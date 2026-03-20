import process from 'node:process'
import { parseCommand, parseQueryArgs } from './args'
import { runSpwDevCli } from './dev'
import { runSpwFormatCli } from './format'
import { runSpwLsCli } from './ls'
import { runSpwMemCli } from './mem'
import { runSpwMountCli } from './mount'
import { runQueryCli } from './query'

export async function runSpwCli(argv: string[]): Promise<void> {
  const { command, args } = parseCommand(argv)

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command === 'query' || command === 'q') {
    if (args.includes('--help') || args.includes('-h')) {
      printQueryHelp()
      return
    }
    await runQueryCli(parseQueryArgs(args))
    return
  }

  switch (command) {
    case 'ls':
    case 'select':
      await runSpwLsCli({ argv: toCliArgv(command, args), entryName: 'spw:ls' })
      return
    case 'seq':
      await runSpwLsCli({ argv: toCliArgv(command, args), entryName: 'spw:seq', compatNotice: true })
      return
    case 'mount':
      await runSpwMountCli(toCliArgv(command, args))
      return
    case 'mem':
      await runSpwMemCli(toCliArgv(command, args))
      return
    case 'format':
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
  console.log(`
Spw CLI

Usage:
  npm run spw -- <command> [args]

Commands:
  query|q      Deep multi-file query (CSS/SQL-inspired from/select/where style)
  ls|select    Liminal sequence selector engine (operator/braces/probe)
  seq          Compatibility alias for ls
  mount        Mount/check surfaces
  mem          Memory surface tools
  format       Spw formatter
  dev          Hot loop runner
  help         Print this help

Try:
  npm run spw -- query --help
`)
}

function printQueryHelp(): void {
  console.log(`
Spw Query

Usage:
  npm run spw -- query [--from .spw,docs] [--selector navigable | --expr "$@_"]
                         [--where "kind=Reference,root=src"] [--select file,kind,target,line,column]
                         [--limit 100] [--format lines|json] [--summary]

Examples:
  npm run spw -- query --from .spw,docs --selector navigable --where "kind in PathRef|Reference"
  npm run spw -- query --from .spw --expr "$~\"_\" | $@_" --where "root=spw" --select file,kind,root,target,line
  npm run spw -- query --from docs --where "file~onboarding,sigil=@"
`)
}

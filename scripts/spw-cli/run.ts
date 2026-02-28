import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { parseCommand, parseQueryArgs } from './args'
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

  const forwarded = resolveForward(command)
  if (!forwarded) {
    console.error(`spw: unknown command "${command}"`)
    printHelp()
    process.exitCode = 1
    return
  }

  await forwardToScript(forwarded, args)
}

function resolveForward(command: string): string | null {
  switch (command) {
    case 'ls':
    case 'select':
      return 'scripts/spw-ls.ts'
    case 'seq':
      return 'scripts/spw-seq.ts'
    case 'mount':
      return 'scripts/spw-mount.ts'
    case 'mem':
      return 'scripts/spw-mem.ts'
    case 'format':
      return 'scripts/spw-format.ts'
    case 'dev':
      return 'scripts/spw-dev.ts'
    default:
      return null
  }
}

function forwardToScript(scriptPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const abs = path.resolve(scriptPath)
    const child = spawn(process.execPath, ['--import', 'tsx', abs, ...args], {
      stdio: 'inherit',
    })
    child.on('exit', (code) => {
      if (code && code !== 0) {
        process.exitCode = code
      }
      resolve()
    })
    child.on('error', reject)
  })
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
  mount        Mount/check surfaces (forwards to scripts/spw-mount.ts)
  mem          Memory surface tools (forwards to scripts/spw-mem.ts)
  format       Spw formatter (forwards to scripts/spw-format.ts)
  dev          Hot loop runner (forwards to scripts/spw-dev.ts)
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


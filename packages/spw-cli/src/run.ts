import process from 'node:process'
import { parseCommand, parseCommonFlags, parseQueryArgs } from './args'
import { printBeatHelp, runSpwBeatCli } from './beat'
import { runSpwDevCli } from './dev'
import { printDoctorHelp, runSpwDoctorCli } from './doctor'
import { printSpwFormatHelp, runSpwFormatCli } from './format'
import { printMutateHelp, runSpwMutateCli } from './mutate'
import { printExpandHelp, runSpwExpandCli } from './expand'
import { printSpwPulseHelp, runSpwPulseCli } from './pulse'
import { printHelpPage } from './help'
import { printInitUsage, runSpwInitCli } from './init'
import { runSpwLsCli } from './ls'
import { printHelp as printLsHelp } from './ls/args'
import { runSpwMemCli } from './mem'
import { printMemHelp } from './mem'
import { runSpwMountCli } from './mount'
import { printMountHelp } from './mount'
import { printQueryHelp, runQueryCli } from './query'
import { printRootsHelp, runSpwRootsCli } from './roots'
import { printSelectUsage, runSpwSelectCli } from './select'
import { printEmitHelp, runSpwEmitCli } from './emit'
import { printTreeHelp, runSpwTreeCli } from './tree'
import { printSkimHelp, runSpwSkimCli } from './skim'
import { printMapHelp, runSpwMapCli } from './map'
import { printInventHelp, runSpwInventCli } from './inventory'
import { printFormulaHelp, runSpwFormulaCli } from './formula'
import { printAnalyzeHelp, runSpwAnalyzeCli } from './analyze'
import { printGeometryHelp, runSpwGeometryCli } from './geometry'
import { suggestClosest } from './view'

const KNOWN_COMMANDS = [
  'help',
  'query', 'q',
  'select', 'spwq',
  'skim', 'read',
  'invent', 'inventory', 'inv',
  'map', 'topo',
  'formula', 'formulas',
  'analyze', 'stats',
  'geometry', 'geom',
  'init', 'install',
  'doctor',
  'roots',
  'tree',
  'ls', 'seq',
  'mount',
  'mem',
  'format',
  'pulse', 'mutate', 'beat',
  'expand',
  'dev',
  'emit',
]

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

  if (command === 'skim' || command === 'read') {
    if (common.flags.help) {
      printSkimHelp(command)
      return
    }
    await runSpwSkimCli(toCliArgv(command, args))
    return
  }

  if (command === 'map' || command === 'topo') {
    if (common.flags.help) {
      printMapHelp()
      return
    }
    await runSpwMapCli(toCliArgv(command, args))
    return
  }

  if (command === 'invent' || command === 'inventory' || command === 'inv') {
    if (common.flags.help) {
      printInventHelp()
      return
    }
    await runSpwInventCli(toCliArgv(command, args))
    return
  }

  if (command === 'formula' || command === 'formulas') {
    if (common.flags.help) {
      printFormulaHelp()
      return
    }
    await runSpwFormulaCli(toCliArgv(command, args))
    return
  }

  if (command === 'analyze' || command === 'stats') {
    if (common.flags.help) {
      printAnalyzeHelp()
      return
    }
    await runSpwAnalyzeCli(toCliArgv(command, args))
    return
  }

  if (command === 'geometry' || command === 'geom') {
    if (common.flags.help) {
      printGeometryHelp()
      return
    }
    await runSpwGeometryCli(toCliArgv(command, args))
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

  if (command === 'roots') {
    if (common.flags.help) {
      printRootsHelp()
      return
    }
    await runSpwRootsCli(toCliArgv(command, args))
    return
  }

  if (command === 'tree') {
    if (common.flags.help) {
      printTreeHelp()
      return
    }
    await runSpwTreeCli(toCliArgv(command, args))
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
    case 'pulse':
      if (common.flags.help) {
        printSpwPulseHelp()
        return
      }
      await runSpwPulseCli(toCliArgv(command, args))
      return
    case 'mutate':
      if (common.flags.help) {
        printMutateHelp()
        return
      }
      await runSpwMutateCli(toCliArgv(command, args))
      return
    case 'beat':
      if (common.flags.help) {
        printBeatHelp()
        return
      }
      await runSpwBeatCli(toCliArgv(command, args))
      return
    case 'expand':
      if (common.flags.help) {
        printExpandHelp()
        return
      }
      await runSpwExpandCli(toCliArgv(command, args))
      return
    case 'dev':
      if (common.flags.help) {
        printDevHelp()
        return
      }
      await runSpwDevCli()
      return
    case 'emit':
      if (common.flags.help) {
        printEmitHelp()
        return
      }
      await runSpwEmitCli(toCliArgv(command, args))
      return
    default: {
      console.error(`spw: unknown command "${command}"`)
      const hint = suggestClosest(command, KNOWN_COMMANDS)
      if (hint.length) console.error(`  did you mean: ${hint.join(', ')}?`)
      printHelp()
      process.exitCode = 1
      return
    }
  }
}

function toCliArgv(command: string, args: string[]): string[] {
  return ['node', command, ...args]
}

function printDevHelp(): void {
  printHelpPage({
    title: 'Spw Dev',
    usage: ['spw dev'],
    sections: [
      {
        title: 'What it does',
        lines: [
          'Polls .spw for created/changed/removed *.spw files every 1000ms.',
          'Canonicalizes (format) and parse-validates each touched file in place.',
        ],
      },
    ],
  })
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
          'doctor       Diagnose mounted-consumer readiness',
          'roots        List declared workspace roots and ownership roles',
          'tree         Render a bounded tree of .spw files',
          'invent|inv   Surface inventory: lines, refs, frames, topo roles',
          'map | topo   Corpus topography, hubs, cycles, familiarity strands',
          'formula      Named formula catalog + embedded pattern discovery',
          'analyze|stats Multi-selector hit densities + top active files',
          'geometry|geom Brace + operator geometry lessons for a surface',
          'query | q    Multi-file AST query (skim/table/group/count)',
          'select       Single-file selector (absorbs spwq)',
          'skim | read  Outline or line-window a surface (no full query)',
          'ls           Liminal sequence selector engine (operator/braces/probe)',
          'mount        Mount/check surfaces for workbench-shaped roots',
          'mem          Memory surface tools',
          'format       Spw formatter',
          'pulse        effect.l0.measure; optional atomic l2.workspace --write; --stdin REPL',
          'mutate       l1.memory→l2.workspace (paths) or --stdin buffer for host',
          'beat         Cadence only — HMR/REPL clock, no tree effect',
          'emit         Collapse surfaces to host packs (PE / brief IR)',
          'dev          Hot watcher: light format+parse on .spw (not multi-mutate)',
          'help         Print this help',
        ],
      },
      {
        title: 'Compatibility',
        lines: [
          'install      Alias for init',
          'seq          Alias for ls',
          'spwq         Alias for select',
          'inventory    Alias for invent',
          'formulas     Alias for formula',
          'stats        Alias for analyze',
        ],
      },
      {
        title: 'Sense loop (inventory → topo → formulas → analysis)',
        lines: [
          'spw invent prompts --sort degree -n 30',
          'spw map prompts --hubs 12',
          'spw map prompts --compare docs/theory',
          'spw formula prompts --family field',
          'spw analyze prompts',
          'spw query --from prompts --count --selector pathRefs',
          'spw skim <hub.spw>',
        ],
      },
      {
        title: 'Try',
        lines: [
          'spw doctor',
          'spw invent --help',
          'spw formula --catalog',
          'spw analyze prompts --json',
          'spw map --help',
          'spw query --help',
        ],
      },
    ],
  })
}


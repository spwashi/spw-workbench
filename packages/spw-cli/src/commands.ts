import { parseQueryArgs } from './args'
import { printAnalyzeHelp, runSpwAnalyzeCli } from './analyze'
import { printAtlasHelp, runSpwAtlasCli } from './atlas'
import { printBeatHelp, runSpwBeatCli } from './beat'
import { runSpwDevCli } from './dev'
import { printDoctorHelp, runSpwDoctorCli } from './doctor'
import { printEmitHelp, runSpwEmitCli } from './emit'
import { printExpandHelp, runSpwExpandCli } from './expand'
import { printSpwFormatHelp, runSpwFormatCli } from './format'
import { printFormulaHelp, runSpwFormulaCli } from './formula'
import { printGeometryHelp, runSpwGeometryCli } from './geometry'
import { printSpwMassHelp, runSpwMassCli } from './mass'
import { printSpwAuthorityHelp, runSpwAuthorityCli } from './authority'
import { printSpwProfileHelp, runSpwProfileCli } from './profile'
import { printSpwExpHelp, runSpwExpCli } from './exp'
import { printSnippetHelp, runSpwSnippetCli } from './snippet'
import { printCycleHelp, runSpwCycleCli } from './cycle'
import { printCiteHelp, printFollowHelp, runSpwCiteCli, runSpwFollowCli } from './cite'
import { printHelpPage } from './help'
import { printInitUsage, runSpwInitCli } from './init'
import { printInventHelp, runSpwInventCli } from './inventory'
import { runSpwLsCli } from './ls'
import { printHelp as printLsHelp } from './ls/args'
import { printMapHelp, runSpwMapCli } from './map'
import { printMemHelp, runSpwMemCli } from './mem'
import { printMountHelp, runSpwMountCli } from './mount'
import { printMutateHelp, runSpwMutateCli } from './mutate'
import {
  printSpwPulseHelp,
  runSpwPulseCli,
  SPW_PULSE_SCHEMA_VERSION,
  SPW_PULSE_SURFACE,
  type PulseErrorEnvelope,
} from './pulse'
import { printQueryHelp, runQueryCli } from './query'
import { printRefactorHelp, runSpwRefactorCli } from './refactor'
import { printRefreshHelp, runSpwRefreshCli } from './refresh'
import { printRootsHelp, runSpwRootsCli } from './roots'
import { printSelectUsage, runSpwSelectCli } from './select'
import { printSkimHelp, runSpwSkimCli } from './skim'
import { printTasteHelp, runSpwTasteCli } from './taste'
import { printTreeHelp, runSpwTreeCli } from './tree'
import { printLatticeHelp, runSpwLatticeCli } from './lattice'
import { printDeltaHelp, runSpwDeltaCli } from './delta'
import { printInspectHelp, runSpwInspectCli } from './inspect'

/**
 * Which part of the loop a command belongs to. Groups order the help page and
 * keep the vocabulary honest: a command's group is a claim about what it costs
 * you to run it.
 */
/**
 * Loop cost band. Matches collate-before-discharge (operational-field).
 * @see docs/runtime/spw/cli-command-surface.spw
 */
export type CommandGroup = 'workspace' | 'collate' | 'select' | 'shape' | 'effect'

export interface CommandSpec {
  /**
   * Primary token — registry, help, headers, dual-read card kind.
   * Prefer IrKind when the command collates that product (stack, graph, measure, form, …).
   */
  name: string
  /** Route-only alternates. Never taught in headers / Examples / next:. */
  aliases?: string[]
  group: CommandGroup
  /** One line, present tense, no trailing period — the help page reads as a list. */
  summary: string
  printHelp: (invoked: string) => void
  run: (invoked: string, args: string[]) => Promise<void>
}

export const COMMAND_GROUPS: { id: CommandGroup; title: string; blurb: string }[] = [
  { id: 'workspace', title: 'Workspace', blurb: 'where surfaces live and whether they are reachable' },
  { id: 'collate', title: 'Collate', blurb: 'effect.l0.measure — produce IR products without writing the tree' },
  { id: 'select', title: 'Select', blurb: 'pull selection or outline from sources' },
  { id: 'shape', title: 'Shape', blurb: 'rewrite surfaces or project them elsewhere' },
  { id: 'effect', title: 'Effect', blurb: 'plan, apply, cadence — staged writes' },
]

/** Shape a subcommand's argv the way the command modules expect it. */
function argv(invoked: string, args: string[]): string[] {
  return ['node', invoked, ...args]
}

/**
 * `spw measure mass …` / `spw measure thrift …` — family token for help literacy.
 * Today only the mass/thrift family is implemented; strip so mass CLI sees paths.
 */
function stripMeasureFamily(args: string[]): string[] {
  const family = args[0]
  if (family === 'mass' || family === 'thrift' || family === 'size') {
    return args.slice(1)
  }
  return args
}

/**
 * Preserve the machine-readable failure contract that belonged to the deleted
 * pulse wrapper. Other commands delegate failures to the root host, but pulse
 * already publishes its own versioned JSON surface.
 */
async function runPulseCommand(invoked: string, args: string[]): Promise<void> {
  try {
    await runSpwPulseCli(argv(invoked, args))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (args.includes('--json')) {
      const envelope = {
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'error',
        ok: false,
        errors: [message],
      } satisfies PulseErrorEnvelope
      console.log(JSON.stringify(envelope, null, 2))
    } else {
      console.error(`spw pulse: ${message}`)
    }
    process.exitCode = 1
  }
}

export const COMMANDS: CommandSpec[] = [
  // ── Workspace ────────────────────────────────────────────────
  {
    name: 'init',
    aliases: ['install'],
    group: 'workspace',
    summary: 'Bootstrap a .spw workspace in a target directory',
    printHelp: () => printInitUsage(),
    run: (invoked, args) => runSpwInitCli(argv(invoked, args)),
  },
  {
    name: 'doctor',
    group: 'workspace',
    summary: 'Diagnose mounted-consumer readiness',
    printHelp: () => printDoctorHelp(),
    run: (invoked, args) => runSpwDoctorCli(argv(invoked, args)),
  },
  {
    name: 'roots',
    group: 'workspace',
    summary: 'List declared workspace roots and ownership roles',
    printHelp: () => printRootsHelp(),
    run: (invoked, args) => runSpwRootsCli(argv(invoked, args)),
  },
  {
    name: 'mount',
    group: 'workspace',
    summary: 'Mount/check surfaces for workbench-shaped roots',
    printHelp: () => printMountHelp(),
    run: (invoked, args) => runSpwMountCli(argv(invoked, args)),
  },
  {
    name: 'tree',
    group: 'workspace',
    summary: 'Render a bounded tree of .spw files',
    printHelp: () => printTreeHelp(),
    run: (invoked, args) => runSpwTreeCli(argv(invoked, args)),
  },

  // ── Collate (effect.l0.measure — IR products) ────────────────
  // Primaries prefer IrKind tokens when collating that product.
  // @see docs/runtime/spw/cli-command-surface.spw
  {
    name: 'census',
    aliases: ['invent', 'inventory', 'inv'],
    group: 'collate',
    summary: 'Population product: lines, refs, frames, topo roles',
    printHelp: () => printInventHelp(),
    run: (invoked, args) => runSpwInventCli(argv(invoked, args)),
  },
  {
    name: 'graph',
    aliases: ['map', 'topo'],
    group: 'collate',
    summary: 'Graph / topography IR: hubs, cycles, familiarity strands',
    printHelp: () => printMapHelp(),
    run: (invoked, args) => runSpwMapCli(argv(invoked, args)),
  },
  {
    name: 'atlas',
    group: 'collate',
    summary: 'Longitudinal workspace material measures',
    printHelp: () => printAtlasHelp(),
    run: (invoked, args) => runSpwAtlasCli(argv(invoked, args)),
  },
  {
    name: 'formula',
    aliases: ['formulas'],
    group: 'collate',
    summary: 'Formula catalog + embedded pattern hits',
    printHelp: () => printFormulaHelp(),
    run: (invoked, args) => runSpwFormulaCli(argv(invoked, args)),
  },
  {
    name: 'density',
    aliases: ['analyze', 'stats'],
    group: 'collate',
    summary: 'Selector hit densities + top active files',
    printHelp: () => printAnalyzeHelp(),
    run: (invoked, args) => runSpwAnalyzeCli(argv(invoked, args)),
  },
  {
    name: 'form',
    aliases: ['geometry', 'geom'],
    group: 'collate',
    summary: 'Script geometry + static form analysis (brace/op/resonance/field)',
    printHelp: () => printGeometryHelp(),
    run: (invoked, args) => runSpwGeometryCli(argv(invoked, args)),
  },
  {
    name: 'lattice',
    aliases: ['readings'],
    group: 'collate',
    summary: 'Corpus ~# apposition spectrum (prefer form/inspect for one file)',
    printHelp: () => printLatticeHelp(),
    run: (_invoked, args) => runSpwLatticeCli(['lattice', ...args]),
  },
  {
    name: 'delta',
    group: 'collate',
    summary: 'ChangeReport product; optional patch bank (collate-only)',
    printHelp: () => printDeltaHelp(),
    run: (_invoked, args) => runSpwDeltaCli(['delta', ...args]),
  },
  {
    name: 'measure',
    aliases: ['mass', 'thrift'],
    group: 'collate',
    summary: 'Measure IR under schemes (mass/thrift family today)',
    printHelp: () => printSpwMassHelp(),
    run: (invoked, args) => runSpwMassCli(argv(invoked, stripMeasureFamily(args))),
  },
  {
    name: 'authority',
    group: 'collate',
    summary: 'Declared !writes / &joins vs what the subject actually does',
    printHelp: () => printSpwAuthorityHelp(),
    run: (invoked, args) => runSpwAuthorityCli(argv(invoked, args)),
  },
  {
    name: 'taste',
    group: 'collate',
    summary: 'Taste coverage, standard vocabulary, and mark fidelity',
    printHelp: () => printTasteHelp(),
    run: (invoked, args) => runSpwTasteCli(argv(invoked, args)),
  },
  {
    name: 'stack',
    aliases: ['surface', 'profile'],
    group: 'collate',
    summary: 'Profile stack IR — dialect × review × format card',
    printHelp: () => printSpwProfileHelp(),
    run: (invoked, args) => runSpwProfileCli(argv(invoked, args)),
  },
  {
    name: 'exp',
    aliases: ['experimental', 'catalog'],
    group: 'collate',
    summary: 'Experimental syntax catalog (list/show reference ids)',
    printHelp: () => printSpwExpHelp(),
    run: (invoked, args) => runSpwExpCli(argv(invoked, args)),
  },
  {
    name: 'cycle',
    group: 'collate',
    summary: 'Before/after sense receipts (prepare→inspect); pairs with inspect',
    printHelp: () => printCycleHelp(),
    run: (_invoked, args) => runSpwCycleCli(['node', 'cycle', ...args]),
  },
  {
    name: 'inspect',
    group: 'collate',
    summary: 'Cache/bank/medium/session/static planes (effect.l0.measure)',
    printHelp: () => printInspectHelp(),
    run: (invoked, args) => runSpwInspectCli(argv(invoked, args)),
  },
  {
    name: 'cite',
    group: 'collate',
    summary: 'Point at form bytecode (@bc) — Spw dual-read, no JSON',
    printHelp: () => printCiteHelp(),
    run: (_invoked, args) => runSpwCiteCli(['node', 'cite', ...args]),
  },
  {
    name: 'follow',
    group: 'collate',
    summary: 'Resolve @bc or surface under grain; optional --collapse',
    printHelp: () => printFollowHelp(),
    run: (_invoked, args) => runSpwFollowCli(['node', 'follow', ...args]),
  },

  // ── Select ───────────────────────────────────────────────────
  {
    name: 'query',
    aliases: ['q'],
    group: 'select',
    summary: 'Multi-file AST selection (table/group/count)',
    printHelp: () => printQueryHelp(),
    run: (_invoked, args) => runQueryCli(parseQueryArgs(args)),
  },
  {
    name: 'select',
    aliases: ['spwq'],
    group: 'select',
    summary: 'Single-file selection product',
    printHelp: () => printSelectUsage(),
    run: (invoked, args) => runSpwSelectCli(argv(invoked, args)),
  },
  {
    name: 'outline',
    aliases: ['skim', 'read'],
    group: 'select',
    summary: 'Outline or line-window disclosure (no full selection)',
    printHelp: (invoked) => printSkimHelp(invoked),
    run: (invoked, args) => runSpwSkimCli(argv(invoked, args)),
  },
  {
    name: 'ls',
    aliases: ['seq'],
    group: 'select',
    summary: 'Liminal sequence selection (operator/braces/probe)',
    printHelp: (invoked) => printLsHelp(invoked === 'seq' ? 'spw:seq' : 'spw:ls'),
    run: (invoked, args) =>
      runSpwLsCli(
        invoked === 'seq'
          ? { argv: argv(invoked, args), entryName: 'spw:seq', compatNotice: true }
          : { argv: argv(invoked, args), entryName: 'spw:ls' },
      ),
  },

  // ── Shape ────────────────────────────────────────────────────
  {
    name: 'format',
    group: 'shape',
    summary: 'Spw formatter',
    printHelp: () => printSpwFormatHelp(),
    run: (invoked, args) => runSpwFormatCli(argv(invoked, args)),
  },
  {
    name: 'expand',
    group: 'shape',
    summary: 'Project template lineage inline (source untouched)',
    printHelp: () => printExpandHelp(),
    run: (invoked, args) => runSpwExpandCli(argv(invoked, args)),
  },
  {
    name: 'snippet',
    aliases: ['snip'],
    group: 'shape',
    summary: 'Generate and hydrate seed templates (editor emit)',
    printHelp: () => printSnippetHelp(),
    run: (_invoked, args) => runSpwSnippetCli(['node', 'snippet', ...args]),
  },
  {
    name: 'refactor',
    group: 'shape',
    summary: 'Rename marks across a corpus, addressed by structure',
    printHelp: () => printRefactorHelp(),
    run: (invoked, args) => runSpwRefactorCli(argv(invoked, args)),
  },
  {
    name: 'refresh',
    group: 'shape',
    summary: "Recompute a plan's cache block from the plan itself",
    printHelp: () => printRefreshHelp(),
    run: (invoked, args) => runSpwRefreshCli(argv(invoked, args)),
  },
  {
    name: 'emit',
    group: 'shape',
    summary: 'Collapse surfaces to host packs (PE / brief IR)',
    printHelp: () => printEmitHelp(),
    run: (invoked, args) => runSpwEmitCli(argv(invoked, args)),
  },

  // ── Effect ───────────────────────────────────────────────────
  {
    name: 'pulse',
    group: 'effect',
    summary: 'effect.l0.measure; optional atomic l2.workspace --write; --stdin REPL',
    printHelp: () => printSpwPulseHelp(),
    run: runPulseCommand,
  },
  {
    name: 'mutate',
    group: 'effect',
    summary: 'l1.memory→l2.workspace (paths) or --stdin buffer for host',
    printHelp: () => printMutateHelp(),
    run: (invoked, args) => runSpwMutateCli(argv(invoked, args)),
  },
  {
    name: 'beat',
    group: 'effect',
    summary: 'Cadence only — HMR/REPL clock, no tree effect',
    printHelp: () => printBeatHelp(),
    run: (invoked, args) => runSpwBeatCli(argv(invoked, args)),
  },
  {
    name: 'mem',
    group: 'effect',
    summary: 'Durable fs dump/load of runtime state (not beat cache — see inspect)',
    printHelp: () => printMemHelp(),
    run: (invoked, args) => runSpwMemCli(argv(invoked, args)),
  },
  {
    name: 'dev',
    group: 'effect',
    summary: 'Hot watcher: light format+parse on .spw (not multi-mutate)',
    printHelp: () => printDevHelp(),
    run: () => runSpwDevCli(),
  },
]

/** Every accepted token, canonical names and aliases alike. */
export function knownCommands(): string[] {
  const names = ['help']
  for (const spec of COMMANDS) {
    names.push(spec.name, ...(spec.aliases ?? []))
  }
  return names
}

export function findCommand(token: string): CommandSpec | undefined {
  return COMMANDS.find(
    (spec) => spec.name === token || (spec.aliases ?? []).includes(token),
  )
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

export function printRootHelp(): void {
  // One column width across both the command list and the alias list — an alias
  // may be longer than every canonical name (`inventory` beats `geometry`).
  const width = Math.max(...knownCommands().map((token) => token.length))

  const groups = COMMAND_GROUPS.map((group) => ({
    title: `${group.title} — ${group.blurb}`,
    lines: COMMANDS.filter((spec) => spec.group === group.id).map(
      (spec) => `${spec.name.padEnd(width)}  ${spec.summary}`,
    ),
  }))

  const aliases = COMMANDS.flatMap((spec) =>
    (spec.aliases ?? []).map((alias) => `${alias.padEnd(width)}  Alias for ${spec.name}`),
  )

  printHelpPage({
    title: 'Spw CLI',
    usage: ['spw <command> [args]', 'npm run spw -- <command> [args]', 'spw <command> --help'],
    sections: [
      ...groups,
      { title: 'Compatibility', lines: aliases },
      {
        title: 'Collate chain (IR products at effect.l0.measure)',
        lines: [
          'spw census prompts --sort degree -n 30',
          'spw graph prompts --limit 12',
          'spw graph prompts --compare docs/theory',
          'spw stack <file.spw>',
          'spw measure mass prompts --json',
          'spw formula prompts --family field',
          'spw density prompts',
          'spw form <file.spw>',
          'spw query --from prompts --count --selector pathRefs',
          'spw outline <hub.spw>',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'spw doctor',
          'spw atlas --advice',
          'spw formula --catalog',
          'spw density prompts --json',
          'spw graph --help',
          'spw stack --help',
          'spw pulse a.spw --stamp',
          'spw mutate --from <stencil-id> b.spw --dry-run',
        ],
      },
    ],
  })
}

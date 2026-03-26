import process from 'node:process'
import { printHelpPage } from '../help'
import type { CliArgs, MatchMode, SurfaceMode } from './types'

export function printHelp(entryName: string): void {
  printHelpPage({
    title: 'Spw Liminal Selection and Probe Query',
    usage: [
      `npm run ${entryName} -- --seq '?~@&*^' --probe '?(subject).[' [--probe-window 16] [--braces '<>{}'] [--label query] [--surface hybrid] [--mode hybrid] [--equiv soft] [--root .spw] [--top 20] [--strict] [--model lattice] [--json]`,
    ],
    sections: [
      {
        title: 'Flags',
        lines: [
          "--seq <sequence>      Operator sequence (selector charge). Example: '?~@&*^' or '?_query'",
          "--braces <sequence>   Brace sequence filter. Example: '<>{}'",
          '--label <name>        Label filter (in addition to inline labels from --seq)',
          "--probe <expr>        Probe expression (operator or sequence). Example: '?(subject).['",
          '--probe-op <op>       Compatibility alias for --probe with one operator token',
          '--probe-window <n>    Lookahead window for downstream probe scoring (default: 12)',
          '--surface <mode>      Operator stream source: ast|raw|hybrid (default: hybrid)',
          '--mode <mode>         Match mode: ordered|set|hybrid (default: hybrid)',
          '--equiv <mode>        Token equivalence: strict|soft (default: strict)',
          '--root <path>         Root(s) to scan for .spw files (comma-separated)',
          '--top <n>             Max results to print (default: 20)',
          '--strict              Require strict hits across active query dimensions',
          '--model <name>        Optimization lens: fluid|lattice|thermal|quantum',
          '--json                Emit JSON output',
        ],
      },
    ],
  })
}

function asSurfaceMode(value: string): SurfaceMode {
  const normalized = value.toLowerCase()
  return normalized === 'ast' || normalized === 'raw' || normalized === 'hybrid'
    ? normalized
    : 'hybrid'
}

function asMatchMode(value: string): MatchMode {
  const normalized = value.toLowerCase()
  return normalized === 'ordered' || normalized === 'set' || normalized === 'hybrid'
    ? normalized
    : 'hybrid'
}

export function parseArgs(argv: string[], entryName: string): CliArgs {
  const args = argv.slice(2)
  const parsed: CliArgs = {
    sequence: '',
    braces: '',
    roots: ['.spw'],
    top: 20,
    strict: false,
    json: false,
    model: 'fluid',
    label: '',
    surface: 'hybrid',
    mode: 'hybrid',
    equiv: 'strict',
    probeExpr: '',
    probeWindow: 12,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      printHelp(entryName)
      process.exit(0)
    }

    if (arg === '--seq') {
      parsed.sequence = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--seq=')) {
      parsed.sequence = arg.slice('--seq='.length)
      continue
    }

    if (arg === '--braces') {
      parsed.braces = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--braces=')) {
      parsed.braces = arg.slice('--braces='.length)
      continue
    }

    if (arg === '--label') {
      parsed.label = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--label=')) {
      parsed.label = arg.slice('--label='.length)
      continue
    }

    if (arg === '--probe') {
      parsed.probeExpr = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--probe=')) {
      parsed.probeExpr = arg.slice('--probe='.length)
      continue
    }

    if (arg === '--probe-op') {
      parsed.probeExpr = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--probe-op=')) {
      parsed.probeExpr = arg.slice('--probe-op='.length)
      continue
    }

    if (arg === '--probe-window') {
      parsed.probeWindow = Number(args[i + 1] ?? '12') || 12
      i += 1
      continue
    }
    if (arg.startsWith('--probe-window=')) {
      parsed.probeWindow = Number(arg.slice('--probe-window='.length)) || 12
      continue
    }

    if (arg === '--surface') {
      parsed.surface = asSurfaceMode(args[i + 1] ?? 'hybrid')
      i += 1
      continue
    }
    if (arg.startsWith('--surface=')) {
      parsed.surface = asSurfaceMode(arg.slice('--surface='.length))
      continue
    }

    if (arg === '--mode') {
      parsed.mode = asMatchMode(args[i + 1] ?? 'hybrid')
      i += 1
      continue
    }
    if (arg.startsWith('--mode=')) {
      parsed.mode = asMatchMode(arg.slice('--mode='.length))
      continue
    }

    if (arg === '--equiv') {
      parsed.equiv = (args[i + 1] ?? 'strict').toLowerCase() === 'soft' ? 'soft' : 'strict'
      i += 1
      continue
    }
    if (arg.startsWith('--equiv=')) {
      parsed.equiv = arg.slice('--equiv='.length).toLowerCase() === 'soft' ? 'soft' : 'strict'
      continue
    }

    if (arg === '--root') {
      const value = args[i + 1] ?? ''
      parsed.roots = value.split(',').map((part) => part.trim()).filter(Boolean)
      i += 1
      continue
    }
    if (arg.startsWith('--root=')) {
      const value = arg.slice('--root='.length)
      parsed.roots = value.split(',').map((part) => part.trim()).filter(Boolean)
      continue
    }

    if (arg === '--top') {
      parsed.top = Number(args[i + 1] ?? '20') || 20
      i += 1
      continue
    }
    if (arg.startsWith('--top=')) {
      parsed.top = Number(arg.slice('--top='.length)) || 20
      continue
    }

    if (arg === '--strict') {
      parsed.strict = true
      continue
    }

    if (arg === '--json') {
      parsed.json = true
      continue
    }

    if (arg === '--model') {
      parsed.model = (args[i + 1] ?? 'fluid').toLowerCase()
      i += 1
      continue
    }
    if (arg.startsWith('--model=')) {
      parsed.model = arg.slice('--model='.length).toLowerCase()
      continue
    }
  }

  return parsed
}

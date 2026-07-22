/**
 * spw beat — pure cadence signal. No .spw tree writes, no memory-surface
 * access: it only emits timestamped ticks at a fixed interval for other
 * tooling (dev loops, agents, demos) to key off.
 */
import process from 'node:process'
import { printHelpPage } from './help'

const DEFAULT_INTERVAL_MS = 500 // the --spw-beat craft-guard unit

interface BeatCliArgs {
  intervalMs: number
  count: number | null
  json: boolean
  help: boolean
}

export async function runSpwBeatCli(argv: string[] = process.argv): Promise<void> {
  const raw = argv.slice(2)
  const rest = raw[0] === 'beat' ? raw.slice(1) : raw
  const args = parseBeatArgs(rest)

  if (args.help) {
    printBeatHelp()
    return
  }

  await new Promise<void>((resolveRun) => {
    let seq = 0
    const stop = () => {
      clearInterval(timer)
      process.off('SIGINT', stop)
      resolveRun()
    }
    const tick = () => {
      seq += 1
      emitTick(seq, args)
      if (args.count !== null && seq >= args.count) stop()
    }
    const timer = setInterval(tick, args.intervalMs)
    process.once('SIGINT', stop)
    tick()
  })
}

function emitTick(seq: number, args: BeatCliArgs): void {
  const at = new Date().toISOString()
  if (args.json) {
    console.log(JSON.stringify({ command: 'beat', seq, at, intervalMs: args.intervalMs }))
  } else {
    console.log(`beat#${seq}  ${at}`)
  }
}

function parseBeatArgs(args: string[]): BeatCliArgs {
  let intervalMs = DEFAULT_INTERVAL_MS
  let count: number | null = null
  let json = false
  let help = false

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!
    if (arg === '--help' || arg === '-h') {
      help = true
      continue
    }
    if (arg === '--interval' || arg === '-i') {
      intervalMs = positiveNumber(args[i + 1], intervalMs)
      i += 1
      continue
    }
    if (arg.startsWith('--interval=')) {
      intervalMs = positiveNumber(arg.slice('--interval='.length), intervalMs)
      continue
    }
    if (arg === '--count' || arg === '-n') {
      count = positiveNumber(args[i + 1], count ?? 1)
      i += 1
      continue
    }
    if (arg.startsWith('--count=')) {
      count = positiveNumber(arg.slice('--count='.length), count ?? 1)
      continue
    }
    if (arg === '--json') {
      json = true
      continue
    }
  }

  return { intervalMs, count, json, help }
}

function positiveNumber(raw: string | undefined, fallback: number): number {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

export function printBeatHelp(): void {
  printHelpPage({
    title: 'Spw Beat',
    usage: [
      'spw beat [--interval 500] [--count N] [--json]',
    ],
    sections: [
      {
        title: 'What it does',
        lines: [
          'Emits a timestamped cadence tick every --interval ms (default 500,',
          'the --spw-beat craft-guard unit). Pure timing signal: no tree writes,',
          'no memory-surface access. Runs until Ctrl+C, or exits after --count ticks.',
        ],
      },
      {
        title: 'Hot / REPL role',
        lines: [
          'Cadence only — debounce HMR, key REPL loops, agent poll phases.',
          'No tree effect (not on the effect.l* write ladder).',
          'See docs/runtime/md/pulse-mutate-beat.md',
        ],
      },
      {
        title: 'Related',
        lines: [
          'spw pulse    effect.l0.measure; optional atomic effect.l2.workspace --write',
          'spw mutate   l1.memory → l2.workspace (paths) or --stdin body',
          'spw dev      watcher: light format+parse on .spw changes',
        ],
      },
      {
        title: 'Try',
        lines: [
          'spw beat --count 5',
          'spw beat --interval 1000 --json',
        ],
      },
    ],
  })
}

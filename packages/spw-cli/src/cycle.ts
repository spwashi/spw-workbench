/**
 * spw cycle — inspectable before/after sense processing.
 *
 * effect.l0.measure: no host writes. Compares two files or two directories of one
 * surface through prepare/parse/inspect/(evaluate) with cache + interconnect.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { runSenseCycle, type SenseCycleStepId } from '@spwashi/spw-runtime'
import { formatJsonEnvelope } from './envelope'
import { printHelpPage } from './help'

interface Args {
  help: boolean
  json: boolean
  before?: string
  after?: string
  channel: string
  beats: number
  steps: SenseCycleStepId[]
  noCacheProbe: boolean
  textBefore?: string
  textAfter?: string
}

const DEFAULT_STEPS: SenseCycleStepId[] = ['prepare', 'parse', 'inspect', 'interconnect']

function parseArgs(argv: string[]): Args {
  const raw = argv.slice(2)
  const tokens = raw[0] === 'cycle' ? raw.slice(1) : raw
  const args: Args = {
    help: false,
    json: false,
    channel: 'trial',
    beats: 0,
    steps: [...DEFAULT_STEPS],
    noCacheProbe: false,
  }

  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]!
    if (a === '--help' || a === '-h') args.help = true
    else if (a === '--json') args.json = true
    else if (a === '--no-cache-probe') args.noCacheProbe = true
    else if (a === '--before') args.before = tokens[++i]
    else if (a.startsWith('--before=')) args.before = a.slice('--before='.length)
    else if (a === '--after') args.after = tokens[++i]
    else if (a.startsWith('--after=')) args.after = a.slice('--after='.length)
    else if (a === '--channel') args.channel = tokens[++i] ?? 'trial'
    else if (a.startsWith('--channel=')) args.channel = a.slice('--channel='.length)
    else if (a === '--beats') args.beats = Math.max(0, Number(tokens[++i] ?? 0) || 0)
    else if (a.startsWith('--beats=')) args.beats = Math.max(0, Number(a.slice('--beats='.length)) || 0)
    else if (a === '--steps') {
      const v = tokens[++i] ?? ''
      args.steps = parseSteps(v)
    } else if (a.startsWith('--steps=')) {
      args.steps = parseSteps(a.slice('--steps='.length))
    } else if (a === '--evaluate') {
      if (!args.steps.includes('evaluate')) args.steps.push('evaluate')
    } else if (a.startsWith('-')) {
      throw new Error(`spw cycle: unknown flag ${a}`)
    } else if (!args.before) {
      args.before = a
    } else if (!args.after) {
      args.after = a
    } else {
      throw new Error(`spw cycle: unexpected argument ${a}`)
    }
  }
  return args
}

function parseSteps(v: string): SenseCycleStepId[] {
  const allowed = new Set<SenseCycleStepId>([
    'prepare',
    'parse',
    'inspect',
    'evaluate',
    'beat',
    'interconnect',
  ])
  const steps = v
    .split(/[,+\s]+/)
    .map(s => s.trim())
    .filter(Boolean) as SenseCycleStepId[]
  for (const s of steps) {
    if (!allowed.has(s)) throw new Error(`spw cycle: unknown step ${s}`)
  }
  return steps.length ? steps : [...DEFAULT_STEPS]
}

export function printCycleHelp(): void {
  printHelpPage({
    title: 'Spw Cycle — inspectable before/after sense processing',
    usage: [
      'spw cycle --before a.spw --after b.spw [--json]',
      'spw cycle before.spw after.spw',
      'spw cycle --before a.spw --beats 2 --evaluate --json',
      'spw cycle --before dirA --after dirB   # pairs by relative path',
    ],
    sections: [
      {
        title: 'What it does',
        lines: [
          'effect.l0.measure — no host writes',
          'Runs prepare/parse/inspect on before and after surfaces on one HotSession',
          'Reports contentHash, dialect, phrases, flow roles, probes, cache hits',
          'Optional interconnect graph summary (IR spine density)',
          'Optional --beats between phases; --evaluate for interpret path',
        ],
      },
      {
        title: 'Steps',
        lines: [
          'prepare · parse · inspect · evaluate · beat · interconnect',
          'Default: prepare,parse,inspect,interconnect',
          '--steps prepare,inspect,evaluate',
        ],
      },
      {
        title: 'Compose',
        lines: [
          'spw cycle --before x.spw --after y.spw --json | jq .data.delta',
          'spw cycle fixture/before fixture/after --channel experimental',
          'Pair with: spw surface, spw measure, spw snippet hydrate',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--before PATH     Before file or directory of .spw',
          '--after PATH      After file or directory (default: same as before)',
          '--channel ID      Stability channel (default trial)',
          '--beats N         Tick session beat clock between phases',
          '--evaluate        Include interpret/evaluate steps',
          '--steps LIST      Comma-separated step ids',
          '--no-cache-probe  Skip second evaluate for cache hit check',
          '--json            Envelope with full receipt',
        ],
      },
    ],
  })
}

async function readSurface(
  target: string,
): Promise<{ path: string; text: string }[]> {
  const abs = path.resolve(target)
  const st = await fs.stat(abs)
  if (st.isFile()) {
    return [{ path: path.relative(process.cwd(), abs) || abs, text: await fs.readFile(abs, 'utf8') }]
  }
  if (st.isDirectory()) {
    const out: { path: string; text: string }[] = []
    await walkSpw(abs, abs, out)
    return out.sort((a, b) => a.path.localeCompare(b.path))
  }
  throw new Error(`spw cycle: not found ${target}`)
}

async function walkSpw(
  root: string,
  dir: string,
  out: { path: string; text: string }[],
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await walkSpw(root, full, out)
    else if (e.isFile() && e.name.endsWith('.spw')) {
      out.push({
        path: path.relative(process.cwd(), full) || full,
        text: await fs.readFile(full, 'utf8'),
      })
    }
  }
}

function printHuman(result: ReturnType<typeof runSenseCycle>): void {
  console.log(`# spw cycle  channel=${result.channel}  schema=${result.schema}`)
  console.log('')
  console.log('## Before')
  printCard(result.before)
  console.log('')
  console.log('## After')
  printCard(result.after)
  console.log('')
  console.log('## Delta')
  console.log(`  contentChanged     ${result.delta.contentChanged}`)
  console.log(`  parseOkChanged     ${result.delta.parseOkChanged}`)
  console.log(`  dialectChanged     ${result.delta.dialectChanged}`)
  console.log(`  phraseKeysChanged  ${result.delta.phraseKeysChanged.join(', ') || '—'}`)
  const fr = Object.entries(result.delta.flowRoleDeltas)
  console.log(`  flowRoleDeltas     ${fr.length ? fr.map(([k, v]) => `${k}:${v > 0 ? '+' : ''}${v}`).join(' ') : '—'}`)
  console.log(
    `  cache              hits ${result.delta.cache.beforeHits}→${result.delta.cache.afterHits}` +
      (result.delta.cache.secondAfterHit === undefined
        ? ''
        : `  re-eval hit=${result.delta.cache.secondAfterHit}`),
  )
  if (result.interconnect) {
    console.log('')
    console.log('## Interconnect')
    console.log(
      `  before nodes=${result.interconnect.before.nodeCount} edges=${result.interconnect.before.edgeCount} opts=${result.interconnect.before.openOpts.join(',') || '—'}`,
    )
    console.log(
      `  after  nodes=${result.interconnect.after.nodeCount} edges=${result.interconnect.after.edgeCount} opts=${result.interconnect.after.openOpts.join(',') || '—'}`,
    )
  }
  console.log('')
  console.log('## Steps')
  for (const s of result.steps) {
    console.log(`  [${s.phase}] ${s.step}  beat=${s.atBeat}${s.note ? `  ${s.note}` : ''}`)
  }
}

function printCard(c: {
  path?: string
  contentHash: string
  dialect?: string
  parseOk: boolean
  phraseCounts: Record<string, number>
  flowSummary?: string
  probeSummary?: string
}): void {
  console.log(`  path         ${c.path ?? '—'}`)
  console.log(`  contentHash  ${c.contentHash}`)
  console.log(`  dialect      ${c.dialect ?? '—'}  parseOk=${c.parseOk}`)
  console.log(`  flow         ${c.flowSummary ?? '—'}`)
  console.log(`  probes       ${c.probeSummary ?? '—'}`)
  const phrases = Object.entries(c.phraseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, n]) => `${k}×${n}`)
  console.log(`  phrases      ${phrases.join(' ') || '—'}`)
}

export async function runSpwCycleCli(argv: string[] = process.argv): Promise<void> {
  let args: Args
  try {
    args = parseArgs(argv)
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
    return
  }

  if (args.help) {
    printCycleHelp()
    return
  }
  if (!args.before) {
    printCycleHelp()
    process.exitCode = 1
    return
  }

  try {
    const beforeList = await readSurface(args.before)
    const afterList = args.after ? await readSurface(args.after) : beforeList

    if (beforeList.length === 1 && afterList.length === 1) {
      const result = runSenseCycle({
        before: beforeList[0]!,
        after: afterList[0]!,
        channel: args.channel,
        beatsBetween: args.beats,
        steps: args.steps,
        probeCache: !args.noCacheProbe,
      })
      // Drop heavy graphs from CLI json by default
      const { graphs: _g, ...data } = result
      if (args.json) {
        console.log(
          formatJsonEnvelope('cycle', data, {
            contentChanged: result.delta.contentChanged,
            channel: result.channel,
          }),
        )
      } else {
        printHuman(result)
      }
      if (result.delta.parseOkChanged || (!result.before.parseOk && !result.after.parseOk)) {
        // soft: still exit 0 for inspectability; fail only if after is broken and before was ok
      }
      if (result.before.parseOk && !result.after.parseOk) process.exitCode = 1
      return
    }

    // Directory pair: match by basename
    const afterByBase = new Map(afterList.map(s => [path.basename(s.path ?? ''), s]))
    const paired: ReturnType<typeof runSenseCycle>[] = []
    for (const b of beforeList) {
      const base = path.basename(b.path ?? '')
      const a = afterByBase.get(base) ?? b
      paired.push(
        runSenseCycle({
          before: b,
          after: a,
          channel: args.channel,
          beatsBetween: args.beats,
          steps: args.steps,
          probeCache: !args.noCacheProbe,
        }),
      )
    }

    if (args.json) {
      const data = paired.map(({ graphs: _g, ...r }) => r)
      console.log(
        formatJsonEnvelope(
          'cycle',
          { pairs: data },
          { files: paired.length, changed: paired.filter(p => p.delta.contentChanged).length },
        ),
      )
    } else {
      console.log(`# spw cycle  directory pairs=${paired.length}`)
      for (const r of paired) {
        console.log('')
        console.log(`### ${r.before.path ?? '?'} → ${r.after.path ?? '?'}`)
        console.log(
          `  changed=${r.delta.contentChanged}  dialect ${r.before.dialect}→${r.after.dialect}  parse ${r.before.parseOk}→${r.after.parseOk}`,
        )
      }
    }
    if (paired.some(p => p.before.parseOk && !p.after.parseOk)) process.exitCode = 1
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  }
}

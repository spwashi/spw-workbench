/**
 * spw fingerprint --readings — what the parser makes of every line, kept
 * before a grammar change and checked after it (reading-drift plan). The
 * fingerprint counts node kinds per surface; this is the same contour by line.
 *
 *   spw fingerprint --readings <paths…>                 how many surfaces and lines read, and which did not
 *   spw fingerprint --readings <paths…> --write FILE    keep the readings: fingerprints and text hashes only
 *   spw fingerprint --readings <paths…> --check FILE    list every line whose reading changed since FILE
 *
 * A corpus is read in place by the path it is named by, inside this repo or
 * not; the snapshot keeps keys relative to the path it was named by, never an
 * absolute path and never a line of text. A surface whose text changed since
 * the snapshot is said so and not compared, since its drift would mix the
 * edit with the grammar. --check exits 1 when any line drifted.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  READINGS_SCHEMA,
  compareReadings,
  readingsOf,
  type ReadingsSnapshot,
  type SurfaceDrift,
  type SurfaceReadings,
} from '@spwashi/spw-seed'
import { formatJsonEnvelope } from './envelope'
import { collectSpwFiles } from './fs-walk'
import { meta } from './view'

interface ReadingsArgs {
  json: boolean
  paths: string[]
  write?: string
  check?: string
  /** What took the snapshot, kept in it (a commit, a release). */
  label?: string
  limit: number
}

function parseArgs(argv: string[]): ReadingsArgs {
  const args: ReadingsArgs = { json: false, paths: [], limit: 40 }
  const value = (token: string, next: () => string | undefined): string => {
    const eq = token.indexOf('=')
    const v = eq >= 0 ? token.slice(eq + 1) : next()
    if (!v) throw new Error(`spw fingerprint --readings: ${token} needs a value`)
    return v
  }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!
    const next = () => argv[++i]
    if (token === '--readings') continue
    else if (token === '--json') args.json = true
    else if (token === '--write' || token.startsWith('--write=')) args.write = value(token, next)
    else if (token === '--check' || token.startsWith('--check=')) args.check = value(token, next)
    else if (token === '--label' || token.startsWith('--label=')) args.label = value(token, next)
    else if (token === '--limit' || token.startsWith('--limit=')) args.limit = Math.max(0, Number(value(token, next)) || 0)
    else if (token.startsWith('-')) throw new Error(`spw fingerprint --readings: unknown flag ${token}`)
    else args.paths.push(token)
  }
  if (args.write && args.check) throw new Error('spw fingerprint --readings: --write and --check are two runs, before and after a change')
  if (!args.paths.length) args.paths.push('.')
  return args
}

/** The --readings lines of spw fingerprint's help page. */
export const READINGS_HELP_GROUPS = [
  {
    title: 'Readings (one line at a time)',
    lines: [
      '--readings PATHS…  How every line reads: what each node starting on it is, what it sits in, what it follows',
      '--write FILE       Keep the readings before a grammar change: line fingerprints and text hashes, no text',
      '--check FILE       After the change, list every line whose reading moved; exit 1 if any did',
      '--label TEXT       Say what took the snapshot (a commit, a release); kept in the file',
      '--limit N          Drifted lines printed (default 40; --json keeps all)',
    ],
  },
  {
    title: 'Readings notes',
    lines: [
      'Separators, spacing and comments are spelling and leave a reading alone.',
      'A corpus outside this repo is read in place by the path it is named by; keys stay relative to that path.',
      'A surface whose text changed since the snapshot is reported as text changed and not compared.',
    ],
  },
]

/** A key for a surface: relative to the working directory when inside it, else to the path it was named by. */
export function surfaceKey(file: string, named: string, cwd = process.cwd()): string {
  const fromCwd = path.relative(cwd, file)
  if (!fromCwd.startsWith('..') && !path.isAbsolute(fromCwd)) return fromCwd.split(path.sep).join('/')
  const root = path.resolve(named)
  const base = path.basename(root)
  const inner = path.relative(root, file)
  return (inner ? `${base}/${inner}` : base).split(path.sep).join('/')
}

interface Read {
  readings: Record<string, SurfaceReadings>
  texts: Map<string, string>
  unread: string[]
}

async function readCorpus(paths: string[]): Promise<Read> {
  const readings: Record<string, SurfaceReadings> = {}
  const texts = new Map<string, string>()
  const unread: string[] = []
  const seen = new Map<string, string>()
  for (const named of paths) {
    for (const file of await collectSpwFiles(named)) {
      const key = surfaceKey(file, named)
      if (seen.has(key) && seen.get(key) !== file) {
        throw new Error(`two surfaces read as ${key}; name corpora whose folders differ, or read them in separate runs`)
      }
      seen.set(key, file)
      const text = await fs.readFile(file, 'utf8')
      const surface = readingsOf(text, { path: key })
      if (!surface) unread.push(key)
      else {
        readings[key] = surface
        texts.set(key, text)
      }
    }
  }
  return { readings, texts, unread }
}

function lineCount(readings: Record<string, SurfaceReadings>): number {
  return Object.values(readings).reduce((sum, s) => sum + Object.keys(s.lines).length, 0)
}

function tally(drift: SurfaceDrift[]): Record<string, number> {
  const counts: Record<string, number> = { same: 0, drift: 0, text_changed: 0, new: 0, gone: 0 }
  for (const d of drift) counts[d.status] = (counts[d.status] ?? 0) + 1
  return counts
}

async function readSnapshot(file: string): Promise<ReadingsSnapshot> {
  const json = JSON.parse(await fs.readFile(file, 'utf8')) as Partial<ReadingsSnapshot>
  if (json.schema !== READINGS_SCHEMA || !json.surfaces) throw new Error(`${file} is not a ${READINGS_SCHEMA} snapshot`)
  return json as ReadingsSnapshot
}

async function check(args: ReadingsArgs, read: Read): Promise<number> {
  const snapshot = await readSnapshot(args.check!)
  const drift = compareReadings(snapshot.surfaces, read.readings)
  const counts = tally(drift)
  const moved = drift.filter(d => d.status === 'drift')
  const lines = moved.reduce((sum, d) => sum + d.lines.length, 0)
  if (args.json) {
    console.log(formatJsonEnvelope('fingerprint', { schema: READINGS_SCHEMA, snapshot: snapshot.parser ?? null, drift: drift.filter(d => d.status !== 'same'), unread: read.unread }, { ...counts, lines }))
    return lines ? 1 : 0
  }
  meta(`# spw fingerprint --readings --check  snapshot=${snapshot.parser ?? '(unlabelled)'} surfaces=${drift.length} same=${counts.same} drift=${counts.drift} text_changed=${counts.text_changed} new=${counts.new} gone=${counts.gone} lines=${lines}`)
  let shown = 0
  for (const d of moved) {
    const text = read.texts.get(d.file)?.split('\n') ?? []
    for (const line of d.lines) {
      if (shown++ >= args.limit) break
      console.log(`${d.file}:${line}  ${(text[line - 1] ?? '').trim().slice(0, 100)}`)
    }
  }
  if (shown > args.limit) console.log(`… ${lines - args.limit} more lines (--limit, or --json for all)`)
  if (counts.text_changed) console.log(`${counts.text_changed} surface${counts.text_changed === 1 ? '' : 's'} changed text since the snapshot; their lines were not compared`)
  if (!lines) console.log('no line reads differently')
  return lines ? 1 : 0
}

export async function runFingerprintReadings(argv: string[]): Promise<void> {
  let args: ReadingsArgs
  try {
    args = parseArgs(argv)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
    return
  }
  let read: Read
  try {
    read = await readCorpus(args.paths)
  } catch (error) {
    console.error(`spw fingerprint --readings: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 2
    return
  }
  const surfaces = Object.keys(read.readings).length
  if (read.unread.length) meta(`# no tree for ${read.unread.length} surface${read.unread.length === 1 ? '' : 's'}: ${read.unread.slice(0, 3).join(', ')}${read.unread.length > 3 ? ', …' : ''}`)

  if (args.check) {
    try {
      process.exitCode = await check(args, read)
    } catch (error) {
      console.error(`spw fingerprint --readings: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = 2
    }
    return
  }

  const snapshot: ReadingsSnapshot = { schema: READINGS_SCHEMA, ...(args.label ? { parser: args.label } : {}), surfaces: read.readings }
  if (args.write) {
    await fs.mkdir(path.dirname(path.resolve(args.write)), { recursive: true })
    await fs.writeFile(args.write, `${JSON.stringify(snapshot)}\n`, 'utf8')
    meta(`# spw fingerprint --readings --write  ${args.write}  surfaces=${surfaces} lines=${lineCount(read.readings)}${args.label ? ` label=${args.label}` : ''}`)
    return
  }
  if (args.json) {
    console.log(formatJsonEnvelope('fingerprint', snapshot, { surfaces, lines: lineCount(read.readings), unread: read.unread.length }))
    return
  }
  const fallback = Object.values(read.readings).filter(s => s.proseFallback).length
  meta(`# spw fingerprint --readings  surfaces=${surfaces} lines=${lineCount(read.readings)} prose=${fallback} unread=${read.unread.length}`)
  console.log('keep them with --write FILE before a grammar change, then --check FILE after it')
}

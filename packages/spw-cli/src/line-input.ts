/**
 * The text a reader command reads: a file named on the command line, a line
 * given with --line, or standard input with --stdin. Shared by say, pairs and
 * hear, so the three take their input one way.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { readStdin } from './stdio'

export interface LineInput {
  /** Where the text came from: a path, '<line>' or '<stdin>'. */
  uri: string
  text: string
  /** True when the text came from --line. */
  isLine: boolean
}

/** Flags that take a value, so their values are never read as a file name. */
const VALUED = new Set(['--line', '--out', '--ear', '--gap', '--names', '--at', '-o'])

export interface SplitArgs {
  positionals: string[]
  values: Map<string, string>
  switches: Set<string>
}

export function splitArgs(args: string[]): SplitArgs {
  const positionals: string[] = []
  const values = new Map<string, string>()
  const switches = new Set<string>()
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    const eq = arg.indexOf('=')
    if (arg.startsWith('--') && eq > 0) values.set(arg.slice(0, eq), arg.slice(eq + 1))
    else if (VALUED.has(arg)) values.set(arg, args[++i] ?? '')
    else if (arg.startsWith('-')) switches.add(arg)
    else positionals.push(arg)
  }
  return { positionals, values, switches }
}

/** Read the input the arguments name, or throw a usage message naming the command. */
export async function readLineInput(command: string, split: SplitArgs): Promise<LineInput> {
  const line = split.values.get('--line')
  if (line !== undefined) return { uri: '<line>', text: line, isLine: true }
  if (split.switches.has('--stdin')) return { uri: '<stdin>', text: await readStdin(), isLine: false }
  const file = split.positionals[0]
  if (!file) throw new Error(`spw ${command}: name a file, or pass --line '<spw>' or --stdin`)
  return { uri: file, text: await fs.readFile(path.resolve(file), 'utf8'), isLine: false }
}

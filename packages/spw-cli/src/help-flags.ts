/**
 * Every command's flags as data, read from the command's own help page.
 *
 * A help page declares a flag on a line of its own, indented, with the flag's
 * spellings first and what it does after a gap of two or more spaces:
 *
 *   --sort <k>         degree|lines|refs|frames|file|sigils
 *   --width N / -w N   Print width for prose (default 88)
 *
 * The data is derived from that text rather than declared again beside it, so
 * the page and the data cannot disagree. A flag the page names only in usage or
 * prose (`spw beat [--interval 500]`) is listed under `mentions`, so a command
 * whose page declares little says so instead of looking flagless.
 *
 * `writes` marks a flag whose name says it writes (--write, --out, --save,
 * --apply, --html). It is read from the name, not tested against what the
 * command does, and help --json says so.
 */

import type { CommandSpec } from './commands'

export interface HelpFlag {
  /** Every name the line gives the flag, long and short: ['--width', '-w']. */
  names: string[]
  /** Each spelling as written, value placeholder included: ['--width N', '-w N']. */
  spellings: string[]
  /** The value the first spelling takes, as the page writes it (<k>, N, ID); absent for a switch. */
  value?: string
  /** What the page says the flag does. */
  says: string
  /** The help section the line sits in: Flags, Options, Modes, Run flags. */
  section: string
  /** True when the flag's name says it writes. Read from the name only. */
  writes: boolean
}

export interface CommandFlags {
  flags: HelpFlag[]
  /** Flags the page names in usage or prose and declares on no line of their own. */
  mentions: string[]
}

const WRITING_NAMES = new Set(['--write', '--out', '--save', '--apply', '--html'])
const FLAG_LINE = /^\s{2,}(-{1,2}[A-Za-z][\w-]*)/
const NAMED = /(?<![\w-])(--[a-z][a-z0-9-]*|-[A-Za-z](?![\w-]))/g

/** The text a command's help prints, captured instead of printed. */
export function helpText(spec: Pick<CommandSpec, 'name' | 'printHelp'>): string {
  const lines: string[] = []
  const log = console.log
  console.log = (...parts: unknown[]) => {
    lines.push(parts.map(String).join(' '))
  }
  try {
    spec.printHelp(spec.name)
  } finally {
    console.log = log
  }
  return lines.join('\n')
}

/** The flags a help page declares, and the ones it only names. */
export function readHelpFlags(text: string): CommandFlags {
  const byName = new Map<string, HelpFlag>()
  const declared: HelpFlag[] = []
  let section = ''
  for (const line of text.split('\n')) {
    const heading = line.match(/^([A-Z][^:]*):\s*$/)
    if (heading) {
      section = heading[1]!.trim()
      continue
    }
    if (!FLAG_LINE.test(line) || section === 'Usage') continue
    const body = line.trim()
    const gap = body.search(/\s{2,}/)
    const head = gap < 0 ? body : body.slice(0, gap)
    const says = gap < 0 ? '' : body.slice(gap).trim()
    const spellings = head.split(/\s+\/\s+|,\s+/).map((s) => s.trim()).filter(Boolean)
    const names = spellings.map((s) => s.split(/\s+/)[0]!).filter((s) => s.startsWith('-'))
    if (!names.length) continue
    const first = spellings[0]!.split(/\s+/).slice(1).join(' ')
    const known = names.map((name) => byName.get(name)).find(Boolean)
    if (known) {
      // A page may declare one flag in two sections (format's --diff); keep one entry and both readings.
      for (const name of names) if (!known.names.includes(name)) known.names.push(name)
      if (says && !known.says.includes(says)) known.says = known.says ? `${known.says}; ${says}` : says
      for (const name of names) byName.set(name, known)
      continue
    }
    const flag: HelpFlag = {
      names,
      spellings,
      ...(first ? { value: first } : {}),
      says,
      section,
      writes: names.some((name) => WRITING_NAMES.has(name)),
    }
    declared.push(flag)
    for (const name of names) byName.set(name, flag)
  }
  const mentions = [...new Set([...text.matchAll(NAMED)].map((m) => m[1]!))]
    .filter((name) => name.startsWith('--') && name !== '--help' && !byName.has(name))
    .sort()
  return { flags: declared, mentions }
}

/** One command's flags, from its help page. */
export function commandFlags(spec: Pick<CommandSpec, 'name' | 'printHelp'>): CommandFlags {
  return readHelpFlags(helpText(spec))
}

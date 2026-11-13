/**
 * spw help --json — the command surface as data, for tools and agents in other
 * repositories that would otherwise parse the help page's prose.
 *
 * Built from the same registry the text page prints (COMMANDS, COMMAND_GROUPS),
 * so the two cannot drift. A command's group is the cost band the registry
 * declares for it (docs/runtime/spw/cli-command-surface.spw ^groups); it is a
 * claim, not a tested guarantee that a command writes nothing, and flags such
 * as --write change what a command touches. The payload says so, so a consumer
 * that fences commands reads the band as a hint and keeps its own check.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMMAND_GROUPS, COMMANDS, type CommandGroup, type CommandSpec } from './commands'
import { commandFlags, type HelpFlag } from './help-flags'

export const HELP_JSON_SCHEMA = 'spw.cli.help/1'

export interface HelpJsonCommand {
  name: string
  group: CommandGroup
  summary: string
  aliases: string[]
  help: string
  /** The flags the command's help page declares, read from that page (help-flags.ts). */
  flags: HelpFlag[]
  /** Flags the page names in usage or prose without a line of their own. */
  mentions: string[]
}

export interface HelpJson {
  schema: typeof HELP_JSON_SCHEMA
  /** commit and dirty are null unless this module sits in a git checkout of the workbench itself. */
  workbench: { version: string | null; commit: string | null; dirty: boolean | null }
  usage: string[]
  groups: { id: CommandGroup; title: string; blurb: string }[]
  commands: HelpJsonCommand[]
  routes: Record<string, string>
  effects: { basis: 'declared'; source: string; note: string }
  flags: { basis: 'help_page'; note: string }
}

/** The workbench root this module was loaded from, or null when it cannot be told (a bundle, a copy). */
function workbenchRoot(): string | null {
  try {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  } catch {
    return null
  }
}

const git = (root: string, args: string[]): string =>
  execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

/**
 * Version from the root package.json; commit and dirty only when git's top level is that root,
 * so a workbench copied into a host repository never reports the host's commit as its own.
 */
export function workbenchProvenance(root: string | null = workbenchRoot()): HelpJson['workbench'] {
  const none = { version: null, commit: null, dirty: null }
  if (!root) return none
  let version: string | null = null
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { version?: unknown }
    version = typeof pkg.version === 'string' ? pkg.version : null
  } catch {
    return none
  }
  try {
    if (path.resolve(git(root, ['rev-parse', '--show-toplevel'])) !== path.resolve(root)) return { version, commit: null, dirty: null }
    return { version, commit: git(root, ['rev-parse', '--short=8', 'HEAD']) || null, dirty: git(root, ['status', '--porcelain', '--untracked-files=no']).length > 0 }
  } catch {
    return { version, commit: null, dirty: null }
  }
}

export function rootHelpJson(provenance: HelpJson['workbench'] = workbenchProvenance()): HelpJson {
  return {
    schema: HELP_JSON_SCHEMA,
    workbench: provenance,
    usage: ['spw <command> [arguments] [options]', 'npm run spw -- <command> [arguments] [options]', 'spw <command> --help'],
    groups: COMMAND_GROUPS.map(({ id, title, blurb }) => ({ id, title, blurb })),
    commands: COMMANDS.map(commandHelpJson),
    routes: Object.fromEntries(COMMANDS.flatMap((spec) => (spec.aliases ?? []).map((alias) => [alias, spec.name]))),
    effects: {
      basis: 'declared',
      source: 'docs/runtime/spw/cli-command-surface.spw ^groups',
      note: 'A group is the cost band the registry declares for a command, not a tested guarantee that it writes nothing; flags such as --write change what a command touches.',
    },
    flags: {
      basis: 'help_page',
      note: 'Each flag is read from a line of the command\'s help page, so the page and this list agree. writes is true where the flag\'s name says it writes (--write, --out, --save, --apply, --html); it is not tested against what the command does.',
    },
  }
}

/** One command as data: its place in the registry and the flags its help page declares. */
export function commandHelpJson(spec: CommandSpec): HelpJsonCommand {
  const { flags, mentions } = commandFlags(spec)
  return {
    name: spec.name,
    group: spec.group,
    summary: spec.summary,
    aliases: [...(spec.aliases ?? [])],
    help: `spw ${spec.name} --help`,
    flags,
    mentions,
  }
}

/** spw <command> --help --json */
export function printCommandHelpJson(spec: CommandSpec): void {
  console.log(JSON.stringify({ schema: HELP_JSON_SCHEMA, command: commandHelpJson(spec) }, null, 2))
}

export function printRootHelpJson(): void {
  console.log(JSON.stringify(rootHelpJson(), null, 2))
}

/**
 * The quest's grow step: run its spw commands against the consumer root.
 *
 * A grow line is spw commands joined by `&&` (`spw lint .spw && spw resolve
 * --from .spw`). Each command runs in this process through the command table,
 * from the current directory, so workspace discovery finds the consumer root
 * whether the CLI was started there or inside a mounted `.spw/_workbench`.
 * Only read-only commands are accepted; nothing here writes or commits.
 */

import { tryDiscoverSpwWorkspace, type SpwWorkspace } from './workspace'

/** Read-only commands a grow line may run. */
export const GROW_COMMANDS: ReadonlySet<string> = new Set([
  'lint',
  'resolve',
  'doctor',
  'roots',
  'tree',
  'census',
  'graph',
  'outline',
])

export interface GrowCommand {
  /** Subcommand and its arguments, without the leading `spw`. */
  args: string[]
}

export interface GrowRun {
  command: string
  exitCode: number
  /** Captured output lines when the run was quiet (JSON mode). */
  output?: string[]
}

export type GrowDispatch = (command: string, args: string[]) => Promise<void>

/** How a reader runs the CLI from the consumer root, by workspace mode. */
export type InvocationForm = 'mounted' | 'workbench' | 'bare'

/** Split a grow line into spw commands. Throws on anything that is not one. */
export function parseGrowLine(line: string): GrowCommand[] {
  const parts = line.split('&&').map(part => part.trim())
  if (parts.length === 0 || parts.some(part => part.length === 0)) {
    throw new Error(`grow expects spw commands joined by &&: ${line}`)
  }
  return parts.map(part => {
    if (/["'`$|;<>\\]/.test(part)) {
      throw new Error(`grow runs plain spw commands; remove quotes and shell marks: ${part}`)
    }
    const words = part.split(/\s+/)
    if (words[0] !== 'spw' || !words[1]) {
      throw new Error(`grow runs spw commands only: ${part}`)
    }
    if (!GROW_COMMANDS.has(words[1])) {
      throw new Error(`grow runs read-only commands (${[...GROW_COMMANDS].join(', ')}); not ${words[1]}`)
    }
    return { args: words.slice(1) }
  })
}

export function invocationForm(workspace: SpwWorkspace | null): InvocationForm {
  if (!workspace) return 'bare'
  return workspace.mode === 'mounted-consumer' ? 'mounted' : 'workbench'
}

/** The command as a reader would paste it at the consumer root. */
export function formatGrowCommand(command: GrowCommand, form: InvocationForm): string {
  const args = command.args.join(' ')
  switch (form) {
    case 'mounted':
      return `npm --prefix .spw/_workbench run spw -- ${args}`
    case 'workbench':
      return `npm run spw -- ${args}`
    default:
      return `spw ${args}`
  }
}

export async function discoverGrowWorkspace(): Promise<SpwWorkspace | null> {
  return tryDiscoverSpwWorkspace(process.cwd())
}

/**
 * Run each command in order, stopping at the first non-zero exit (as `&&`).
 * The exit code each command sets is read and then cleared, so the caller owns
 * the process exit code. With `quiet`, console output is captured per run.
 */
export async function runGrowCommands(
  commands: GrowCommand[],
  dispatch: GrowDispatch,
  options: { quiet?: boolean } = {},
): Promise<GrowRun[]> {
  const runs: GrowRun[] = []
  for (const command of commands) {
    const [name, ...args] = command.args
    const prior = process.exitCode
    process.exitCode = 0
    const output: string[] = []
    const restore = options.quiet ? captureConsole(output) : () => undefined
    let exitCode: number
    try {
      await dispatch(name!, args)
      exitCode = typeof process.exitCode === 'number' ? process.exitCode : 0
    } catch (error) {
      output.push(error instanceof Error ? error.message : String(error))
      if (!options.quiet) console.error(`spw ${name}: ${output[output.length - 1]}`)
      exitCode = 2
    } finally {
      restore()
      process.exitCode = prior
    }
    runs.push({ command: `spw ${command.args.join(' ')}`, exitCode, ...(options.quiet ? { output } : {}) })
    if (exitCode !== 0) break
  }
  return runs
}

export function growPassed(commands: GrowCommand[], runs: GrowRun[]): boolean {
  return runs.length === commands.length && runs.every(run => run.exitCode === 0)
}

function captureConsole(into: string[]): () => void {
  const log = console.log
  const error = console.error
  const push = (...parts: unknown[]) => {
    into.push(parts.map(String).join(' '))
  }
  console.log = push
  console.error = push
  return () => {
    console.log = log
    console.error = error
  }
}

/**
 * `spw quest` — walk the first steps into Spw in the terminal.
 *
 * The steps come from docs/learn/quest.spw, read by loadQuest in spw-seed; each
 * line is checked with checkStep, the same shapes every other host uses. The
 * last step, grow, runs read-only spw commands against the consumer root.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import {
  checkStep,
  formatLineReading,
  loadQuest,
  type Quest,
  type QuestCheckResult,
  type QuestStep,
} from '@spwashi/spw-seed'
import { setExitCode } from './exit'
import { printHelpPage } from './help'
import {
  discoverGrowWorkspace,
  formatGrowCommand,
  growPassed,
  invocationForm,
  parseGrowLine,
  runGrowCommands,
  type GrowDispatch,
  type GrowRun,
  type InvocationForm,
} from './quest-grow'

export const QUEST_FILE_REL = 'docs/learn/quest.spw'

interface QuestArgs {
  list: boolean
  json: boolean
  dryRun: boolean
  check?: { step: string; line?: string }
  questPath?: string
}

export interface QuestCliOptions {
  /** Runs one spw subcommand in this process (the command table's dispatcher). */
  dispatch: GrowDispatch
  /** Override for where quest.spw is found (tests, dist hosts). */
  questPath?: string
}

const tty = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code: string) => (text: string) => (tty ? `\x1b[${code}m${text}\x1b[0m` : text)
const bold = paint('1')
const dim = paint('2')
const green = paint('32')
const red = paint('31')

export function printQuestHelp(): void {
  printHelpPage({
    title: 'Spw Quest',
    usage: [
      'spw quest                        walk the steps (in a terminal)',
      'spw quest --list                 print the steps',
      'spw quest --json                 print the steps and each try line\'s check result',
      'spw quest --check <step> "<line>" check one line; exit 0 on pass, 1 on fail',
      'npm --prefix .spw/_workbench run spw -- quest',
    ],
    sections: [
      {
        title: 'Steps',
        lines: [
          'write, act, hold, name, point, ask, grow — read from docs/learn/quest.spw',
          'Each line is parsed with spw-seed and checked against the shape its step names.',
          'Press Enter at a prompt to take the step\'s try line.',
        ],
      },
      {
        title: 'Grow',
        lines: [
          'The last step runs spw lint .spw and spw resolve --from .spw against the consumer root.',
          '--dry-run      print the grow commands instead of running them',
          'Nothing in the quest writes files or commits.',
        ],
      },
      {
        title: 'Options',
        lines: [
          '--quest <path>  read steps from another quest.spw',
        ],
      },
    ],
  })
}

export async function runSpwQuestCli(argv: string[], options: QuestCliOptions): Promise<void> {
  const args = parseQuestArgs(argv.slice(2))
  const quest = loadQuest(await fs.readFile(await locateQuestFile(args.questPath ?? options.questPath), 'utf8'))

  if (args.check) {
    await runCheck(quest, args, options.dispatch)
    return
  }
  if (args.json) {
    console.log(JSON.stringify(questJson(quest), null, 2))
    return
  }
  if (args.list || !process.stdin.isTTY) {
    printList(quest)
    if (!args.list) {
      console.log(dim('Not a terminal: use spw quest --check <step> "<line>" or spw quest --json.'))
    }
    return
  }
  await walk(quest, args, options.dispatch)
}

function parseQuestArgs(args: string[]): QuestArgs {
  const out: QuestArgs = { list: false, json: false, dryRun: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--list') out.list = true
    else if (arg === '--json') out.json = true
    else if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--quest') out.questPath = requireValue(args, ++i, '--quest')
    else if (arg === '--check') {
      out.check = { step: requireValue(args, ++i, '--check') }
      const line = args[i + 1]
      if (line !== undefined && !line.startsWith('--')) {
        out.check.line = line
        i++
      }
    } else throw new Error(`spw quest: unknown argument ${arg}`)
  }
  return out
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index]
  if (value === undefined || value.startsWith('--')) throw new Error(`spw quest: ${flag} needs a value`)
  return value
}

/** quest.spw beside this CLI (source checkout or mounted workbench), else in the workspace's workbench. */
export async function locateQuestFile(explicit?: string): Promise<string> {
  if (explicit) return path.resolve(explicit)
  let dir = path.dirname(fileURLToPath(import.meta.url))
  while (true) {
    const candidate = path.join(dir, QUEST_FILE_REL)
    if (await isFile(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  const workspace = await discoverGrowWorkspace().catch(() => null)
  if (workspace) {
    const candidate = path.join(workspace.workbenchRoot, QUEST_FILE_REL)
    if (await isFile(candidate)) return candidate
  }
  throw new Error(`spw quest: cannot find ${QUEST_FILE_REL}; pass --quest <path>`)
}

async function isFile(target: string): Promise<boolean> {
  return fs.stat(target).then(stat => stat.isFile(), () => false)
}

// ── Non-interactive ─────────────────────────────────────────────────────────

async function runCheck(quest: Quest, args: QuestArgs, dispatch: GrowDispatch): Promise<void> {
  const { step: stepId } = args.check!
  const step = findStep(quest, stepId)
  const line = args.check!.line ?? step.try

  if (step.check === 'commands_pass') {
    const grow = await runGrow(line, dispatch, { dryRun: args.dryRun, quiet: args.json })
    if (args.json) console.log(JSON.stringify({ step: step.id, check: step.check, line, ...grow }, null, 2))
    else if (!args.dryRun) console.log(grow.pass ? green('pass') : red(`fail${grow.error ? ` — ${grow.error}` : ''}`))
    if (!args.dryRun) setExitCode(grow.pass ? 'ok' : 'assertion')
    return
  }

  const result = checkStep(quest, step.id, line)
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else printResult(result, quest)
  setExitCode(result.pass ? 'ok' : 'assertion')
}

function findStep(quest: Quest, stepId: string): QuestStep {
  const step = quest.steps.find(candidate => candidate.id === stepId)
  if (!step) throw new Error(`spw quest: no step "${stepId}" (steps: ${quest.steps.map(s => s.id).join(', ')})`)
  return step
}

/** Steps, check descriptions, and every try/then line's result. Grow is left to --check grow. */
export function questJson(quest: Quest) {
  const results: QuestCheckResult[] = []
  for (const step of quest.steps) {
    results.push(checkStep(quest, step.id, step.try, { role: 'try' }))
    for (const line of step.then) results.push(checkStep(quest, step.id, line, { role: 'then' }))
  }
  return { quest: quest.name, steps: quest.steps, checks: quest.checks, results }
}

function printList(quest: Quest): void {
  console.log(bold(`Spw quest — ${quest.steps.length} steps`))
  quest.steps.forEach((step, index) => {
    console.log('')
    console.log(`${index + 1}. ${bold(step.id)}`)
    console.log(`   try    ${step.try}`)
    for (const line of step.then) console.log(`   then   ${line}`)
    console.log(`   reads  ${step.reads}`)
    console.log(dim(`   check  ${step.check}`))
  })
  console.log('')
}

function printResult(result: QuestCheckResult, quest: Quest): void {
  const verdict = result.pass ? green('pass') : red('fail')
  console.log(`${verdict}  ${formatLineReading(result.reading)}`)
  if (!result.pass) {
    if (result.errors.length > 0) console.log(dim(`      parser: ${result.errors.join('; ')}`))
    console.log(dim(`      looks for: ${quest.checks[result.check] ?? result.check}`))
  }
}

// ── Grow ────────────────────────────────────────────────────────────────────

interface GrowOutcome {
  pass: boolean
  commands: string[]
  runs: GrowRun[]
  error?: string
}

async function runGrow(
  line: string,
  dispatch: GrowDispatch,
  options: { dryRun: boolean; quiet: boolean },
): Promise<GrowOutcome> {
  const workspace = await discoverGrowWorkspace()
  const form: InvocationForm = invocationForm(workspace)
  let commands
  try {
    commands = parseGrowLine(line)
  } catch (error) {
    return { pass: false, commands: [], runs: [], error: error instanceof Error ? error.message : String(error) }
  }
  const printed = commands.map(command => formatGrowCommand(command, form))

  if (options.dryRun) {
    if (!options.quiet) for (const text of printed) console.log(text)
    return { pass: false, commands: printed, runs: [] }
  }
  if (!workspace) {
    return {
      pass: false,
      commands: printed,
      runs: [],
      error: 'no .spw workspace from here; run spw init in a repository first',
    }
  }
  const runs = await runGrowCommands(commands, dispatch, { quiet: options.quiet })
  return { pass: growPassed(commands, runs), commands: printed, runs }
}

// ── Interactive walk ────────────────────────────────────────────────────────

async function walk(quest: Quest, args: QuestArgs, dispatch: GrowDispatch): Promise<void> {
  const prompt = openPrompt()
  try {
    console.log(bold(`Spw quest — ${quest.steps.length} steps.`) + ' Press Enter to take the try line, or type your own.')
    for (const [index, step] of quest.steps.entries()) {
      console.log('')
      const panel = [step.scene, step.speaker].filter(Boolean).join(' ')
      if (panel) console.log(dim(panel))
      console.log(bold(`${index + 1}/${quest.steps.length} ${step.id}`))
      console.log(`  try     ${step.try}`)
      console.log(`  reads   ${step.reads}`)

      const done = step.check === 'commands_pass'
        ? await walkGrow(step, prompt, args, dispatch)
        : await walkShape(quest, step, prompt)
      if (!done) return

      console.log(`  notice  ${step.notice}`)
      console.log(`  grow    ${step.grow}`)
    }
    console.log('')
    console.log('Quest done. Nothing was committed; read the diff before you commit.')
  } finally {
    prompt.close()
  }
}

async function walkShape(quest: Quest, step: QuestStep, prompt: Prompt): Promise<boolean> {
  while (true) {
    const typed = await prompt.ask('  > ')
    if (typed === null) return false
    const line = typed.trim() || step.try
    if (!typed.trim()) console.log(dim(`    ${line}`))
    const result = checkStep(quest, step.id, line)
    process.stdout.write('  ')
    printResult(result, quest)
    if (result.pass) break
    console.log(dim('  Try again, or press Enter for the try line.'))
  }
  for (const line of step.then) {
    const result = checkStep(quest, step.id, line, { role: 'then' })
    console.log(`  then    ${line}  ${dim(formatLineReading(result.reading))}`)
  }
  return true
}

async function walkGrow(step: QuestStep, prompt: Prompt, args: QuestArgs, dispatch: GrowDispatch): Promise<boolean> {
  const workspace = await discoverGrowWorkspace()
  if (!workspace) {
    console.log(dim('  No .spw workspace from here. In a repository: spw init, mount the workbench, then'))
    console.log(dim('  npm --prefix .spw/_workbench run spw -- quest'))
    return true
  }
  const form = invocationForm(workspace)
  for (const command of parseGrowLine(step.try)) console.log(dim(`    ${formatGrowCommand(command, form)}`))
  if (args.dryRun) return true
  const typed = await prompt.ask('  Enter to run them > ')
  if (typed === null) return false
  const grow = await runGrow(typed.trim() || step.try, dispatch, { dryRun: false, quiet: false })
  console.log(`  ${grow.pass ? green('pass') : red('fail')}${grow.error ? `  ${grow.error}` : ''}`)
  return true
}

interface Prompt {
  ask(question: string): Promise<string | null>
  close(): void
}

/** readline question that resolves null when input closes (Ctrl-D). */
function openPrompt(): Prompt {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let closed = false
  let pending: ((value: string | null) => void) | null = null
  rl.on('close', () => {
    closed = true
    pending?.(null)
  })
  return {
    ask(question) {
      if (closed) return Promise.resolve(null)
      return new Promise(resolve => {
        pending = resolve
        rl.question(question, answer => {
          pending = null
          resolve(answer)
        })
      })
    },
    close() {
      rl.close()
    },
  }
}

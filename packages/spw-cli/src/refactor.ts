/**
 * spw refactor — rename marks across a corpus, addressed by structure.
 *
 * Vocabulary migration is the refactor a workbench-mounting repository reaches
 * for first: a name chosen early spreads through hundreds of surfaces, and
 * changing it by hand is how a good rename gets abandoned. This drives the
 * seed's semantic-edit algebra, so a rename is planned as addressed edits —
 * the stance prefix is preserved, the rest of each surface stays byte-identical,
 * and re-running converges.
 *
 * Plan-first by default (effect.l0.measure): it prints what it would change.
 * `--write` applies (effect.l2.workspace). `--json` emits the plan for an agent
 * to review before granting the write.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  planSemanticEdits,
  applySemanticPlan,
  renameMark,
  renameParticle,
  type SemanticRule,
  type SemanticEdit,
  type EffectGrade,
} from '@spwashi/spw-seed'
import { collectSpwFiles } from './fs-walk'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'

interface RefactorArgs {
  targets: string[]
  /** Rename specs: `mark:from=to`, `anchor:from=to`, `case:from=to`, `mood:from=to`. */
  renames: string[]
  write: boolean
  json: boolean
  help: boolean
}

type RenameKind = 'mark' | 'anchor' | 'case' | 'mood'

const AIM_OF: Record<'anchor' | 'case' | 'mood', '>' | ':' | '!'> = {
  anchor: '>',
  case: ':',
  mood: '!',
}

function ruleFromSpec(spec: string): SemanticRule | { error: string } {
  // kind:from=to
  const colon = spec.indexOf(':')
  const eq = spec.indexOf('=', colon + 1)
  if (colon < 0 || eq < 0) {
    return { error: `expected kind:from=to, got "${spec}"` }
  }
  const kind = spec.slice(0, colon) as RenameKind
  const from = spec.slice(colon + 1, eq)
  const to = spec.slice(eq + 1)
  if (!from || !to) return { error: `empty from/to in "${spec}"` }

  if (kind === 'mark') return renameMark(from, to)
  if (kind === 'anchor' || kind === 'case' || kind === 'mood') {
    return renameParticle(AIM_OF[kind], from, to)
  }
  return { error: `unknown rename kind "${kind}" (use mark|anchor|case|mood)` }
}

export async function runSpwRefactorCli(argv: string[] = process.argv): Promise<void> {
  const rest = argv.slice(2)
  const args = parseRefactorArgs(rest[0] === 'refactor' ? rest.slice(1) : rest)

  if (args.help) {
    printRefactorHelp()
    return
  }

  const rules: SemanticRule[] = []
  for (const spec of args.renames) {
    const result = ruleFromSpec(spec)
    if ('error' in result) {
      console.error(`spw refactor: ${result.error}`)
      process.exitCode = 1
      return
    }
    rules.push(result)
  }
  if (rules.length === 0) {
    console.error('spw refactor: name at least one rename (--rename kind:from=to)')
    process.exitCode = 1
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const roots = args.targets.length > 0 ? args.targets : ['.']
  const files: string[] = []
  for (const root of roots) {
    const resolved = workspace ? await resolveWorkspacePath(workspace, root) : path.resolve(root)
    files.push(...await collectSpwFiles(resolved))
  }

  // Planning always sees the full l2 rename; the write gate is what --write
  // controls, not what the plan is allowed to contain. A plan that hid the
  // very edits it is meant to preview would be useless.
  const ceiling: EffectGrade = 'effect.l2.workspace'
  const report: Array<{
    file: string
    edits: SemanticEdit[]
    conflicts: number
    withheld: number
    wrote: boolean
  }> = []

  let totalEdits = 0
  let totalConflicts = 0

  for (const file of files) {
    const source = await fs.readFile(file, 'utf8')
    const plan = planSemanticEdits(source, rules, { ceiling })
    if (plan.edits.length === 0 && plan.conflicts.length === 0) continue

    let wrote = false
    if (args.write && plan.edits.length > 0) {
      await fs.writeFile(file, applySemanticPlan(source, plan), 'utf8')
      wrote = true
    }

    totalEdits += plan.edits.length
    totalConflicts += plan.conflicts.length
    report.push({
      file: workspace ? path.relative(workspace.consumerRoot, file) : file,
      edits: plan.edits,
      conflicts: plan.conflicts.length,
      withheld: plan.withheld.length,
      wrote,
    })
  }

  if (args.json) {
    console.log(JSON.stringify({
      mode: args.write ? 'write' : 'plan',
      files: report.length,
      totalEdits,
      totalConflicts,
      report,
    }, null, 2))
    return
  }

  const verb = args.write ? 'rewrote' : 'would rewrite'
  console.log(`spw refactor: ${verb} ${totalEdits} mark(s) in ${report.length} file(s)`
    + (totalConflicts > 0 ? ` · ${totalConflicts} conflict(s) withheld` : ''))
  for (const entry of report) {
    const mark = entry.wrote ? '✓' : '·'
    console.log(`  ${mark} ${entry.file}  (${entry.edits.length} edit${entry.edits.length === 1 ? '' : 's'}`
      + `${entry.conflicts > 0 ? `, ${entry.conflicts} conflict` : ''})`)
    for (const edit of entry.edits.slice(0, 6)) {
      console.log(`      ${edit.reason}`)
    }
  }
  if (!args.write && totalEdits > 0) {
    console.log('\n  plan only — pass --write to apply')
  }
}

function parseRefactorArgs(rest: string[]): RefactorArgs {
  const args: RefactorArgs = { targets: [], renames: [], write: false, json: false, help: false }
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i]!
    if (arg === '--help' || arg === '-h') args.help = true
    else if (arg === '--write') args.write = true
    else if (arg === '--json') args.json = true
    else if (arg === '--rename' || arg === '-r') { const v = rest[++i]; if (v) args.renames.push(v) }
    else if (arg.startsWith('--rename=')) args.renames.push(arg.slice('--rename='.length))
    else if (!arg.startsWith('-')) args.targets.push(arg)
  }
  return args
}

export function printRefactorHelp(): void {
  console.log(`spw refactor — rename marks across a corpus, addressed by structure

Usage:
  spw refactor [roots...] --rename <kind:from=to> [--rename ...] [--write] [--json]

Rename kinds:
  mark:from=to      annotation mark, any stance   (~#from → ~#to, $#from → $#to)
  anchor:from=to    deixis particle               (#>from → #>to)
  case:from=to      case particle                 (#:from → #:to)
  mood:from=to      mood particle                 (#!from → #!to)

Flags:
  --write           apply the edits (default is plan-only)
  --json            emit the plan as JSON for review
  -h, --help        this help

The stance prefix is always preserved; only the name changes. Every other byte
of each surface stays identical, and re-running a rename is a no-op.

Examples:
  spw refactor .spw --rename mark:status=phase
  spw refactor prompts docs --rename anchor:old_id=new_id --write
  spw refactor . -r case:layer=tier -r mood:draft=review --json`)
}

/**
 * spw refactor — rename marks and re-aim path citations across a corpus,
 * addressed by structure.
 *
 * Vocabulary migration is the refactor a workbench-mounting repository reaches
 * for first: a name chosen early spreads through hundreds of surfaces, and
 * changing it by hand is how a good rename gets abandoned. This drives the
 * seed's semantic-edit algebra, so a rename is planned as addressed edits —
 * the stance prefix is preserved, the rest of each surface stays byte-identical,
 * and re-running converges.
 *
 * Moving a file or directory is the second: `path:from=to` re-aims every
 * citation the parser finds (never a regex over text), keeping each one's
 * form, fragment and quotes. It does not move the file — the plan prints the
 * move to run — and it lists Markdown/HTML links it cannot own.
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
  buildRefactorPlanCard,
  type SemanticRule,
  type SemanticEdit,
  type EffectGrade,
} from '@spwashi/spw-seed'
import { collectSpwFiles } from './fs-walk'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'
import { formatJsonEnvelope } from './envelope'
import {
  findUnownedLinks,
  mayOwePathEdit,
  moveCards,
  pathRuleFor,
  resolvePathMoves,
  type PathSpec,
  type ResolvedPathMove,
} from './refactor-path'

interface RefactorArgs {
  targets: string[]
  /** Rename specs: `mark:from=to`, `anchor:from=to`, `case:from=to`, `mood:from=to`, `path:from=to`. */
  renames: string[]
  write: boolean
  json: boolean
  help: boolean
}

type RenameKind = 'mark' | 'anchor' | 'case' | 'mood' | 'path'

const AIM_OF: Record<'anchor' | 'case' | 'mood', '>' | ':' | '!'> = {
  anchor: '>',
  case: ':',
  mood: '!',
}

/** How many unowned links the text view prints before summarizing. */
const UNOWNED_PREVIEW = 20

function ruleFromSpec(spec: string): SemanticRule | { path: PathSpec } | { error: string } {
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
  if (kind === 'path') return { path: { from, to } }
  if (kind === 'anchor' || kind === 'case' || kind === 'mood') {
    return renameParticle(AIM_OF[kind], from, to)
  }
  return { error: `unknown rename kind "${kind}" (use mark|anchor|case|mood|path)` }
}

function fail(message: string): void {
  console.error(`spw refactor: ${message}`)
  process.exitCode = 1
}

export async function runSpwRefactorCli(argv: string[] = process.argv): Promise<void> {
  const rest = argv.slice(2)
  const args = parseRefactorArgs(rest[0] === 'refactor' ? rest.slice(1) : rest)

  if (args.help) {
    printRefactorHelp()
    return
  }

  const markRules: SemanticRule[] = []
  const pathSpecs: PathSpec[] = []
  for (const spec of args.renames) {
    const result = ruleFromSpec(spec)
    if ('error' in result) return fail(result.error)
    if ('path' in result) pathSpecs.push(result.path)
    else markRules.push(result)
  }
  if (markRules.length === 0 && pathSpecs.length === 0) {
    return fail('name at least one rename (--rename kind:from=to)')
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const consumerRoot = workspace?.consumerRoot ?? process.cwd()

  let moves: ResolvedPathMove[] = []
  if (pathSpecs.length > 0) {
    const resolved = await resolvePathMoves(pathSpecs, workspace, consumerRoot)
    if ('error' in resolved) return fail(resolved.error)
    moves = resolved
  }

  const roots = args.targets.length > 0 ? args.targets : ['.']
  const rootDirs: string[] = []
  const files: string[] = []
  for (const root of roots) {
    const resolved = workspace ? await resolveWorkspacePath(workspace, root) : path.resolve(root)
    rootDirs.push(resolved)
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

  for (const file of [...new Set(files)]) {
    const source = await fs.readFile(file, 'utf8')
    const rules = moves.length > 0 && mayOwePathEdit(source, file, moves)
      ? [...markRules, pathRuleFor(file, moves, consumerRoot)]
      : markRules
    if (rules.length === 0) continue
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
      file: path.relative(consumerRoot, file),
      edits: plan.edits,
      conflicts: plan.conflicts.length,
      withheld: plan.withheld.length,
      wrote,
    })
  }

  // The path rule's id and description name the moves, not the citing file.
  const ruleCards = [...markRules, ...(moves.length > 0 ? [pathRuleFor(consumerRoot, moves, consumerRoot)] : [])]
  const unowned = moves.length > 0 ? await findUnownedLinks(rootDirs, moves, consumerRoot) : []
  const card = buildRefactorPlanCard({
    write: args.write,
    rules: ruleCards.map(rule => ({
      id: rule.id,
      description: rule.description,
      effectGrade: rule.effectGrade,
    })),
    totalEdits,
    totalConflicts,
    renameSpecs: args.renames,
    report,
    moves: moveCards(moves, consumerRoot, process.cwd()),
    unowned,
  })

  if (args.json) {
    console.log(formatJsonEnvelope('refactor', card, {
      surface: card.surface,
      mode: card.mode,
      effect: card.effect,
      files: card.files,
      totalEdits: card.totalEdits,
      totalConflicts: card.totalConflicts,
      moves: card.moves.length,
      unowned: card.unowned.length,
    }))
    return
  }

  const verb = args.write ? 'rewrote' : 'would rewrite'
  const noun = markRules.length === 0 ? 'citation(s)' : pathSpecs.length === 0 ? 'mark(s)' : 'edit(s)'
  console.log(`spw refactor: ${verb} ${totalEdits} ${noun} in ${report.length} file(s)`
    + (totalConflicts > 0 ? ` · ${totalConflicts} conflict(s) withheld` : ''))
  console.log(`  surface ${card.surface}  effect ${card.effect}`)
  console.log(`  omitted ${card.omitted.join(', ')}`)
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
  printMovesAndUnowned(card.moves, card.unowned, args.write)
}

function printMovesAndUnowned(
  moves: ReturnType<typeof moveCards>,
  unowned: Awaited<ReturnType<typeof findUnownedLinks>>,
  wrote: boolean,
): void {
  const pending = moves.filter(move => move.state === 'pending')
  if (pending.length > 0) {
    console.log(`\n  move — spw refactor does not move files; ${wrote ? 'run' : 'after --write, run'}:`)
    for (const move of pending) console.log(`    ${move.command}`)
  }
  for (const move of moves.filter(candidate => candidate.state === 'moved')) {
    console.log(`\n  ${move.from} already sits at ${move.to}; citations still naming it are re-aimed`)
  }
  if (unowned.length > 0) {
    console.log(`\n  unowned links — Markdown/HTML naming the moved path, listed not edited (${unowned.length}):`)
    for (const link of unowned.slice(0, UNOWNED_PREVIEW)) {
      console.log(`    ${link.file}:${link.line}  ${link.text}`)
    }
    if (unowned.length > UNOWNED_PREVIEW) console.log(`    … ${unowned.length - UNOWNED_PREVIEW} more (--json lists all)`)
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
  console.log(`spw refactor — rename marks and re-aim path citations, addressed by structure

Usage:
  spw refactor [roots...] --rename <kind:from=to> [--rename ...] [--write] [--json]

Rename kinds:
  mark:from=to      annotation mark, any stance   (~#from → ~#to, $#from → $#to)
  anchor:from=to    deixis particle               (#>from → #>to)
  case:from=to      case particle                 (#:from → #:to)
  mood:from=to      mood particle                 (#!from → #!to)
  path:from=to      a file or directory moves     (~"./from.spw#x" → ~"./to.spw#x")

Flags:
  --write           apply the edits (default is plan-only)
  --json            emit spw.refactor.plan/1 in the CLI envelope for review
  -h, --help        this help

The stance prefix is always preserved; only the name changes. Every other byte
of each surface stays identical, and re-running a rename is a no-op.

Path renames:
  from/to are relative to the consumer root. Every citation the parser finds
  (pathRefs) that lands on from, or under it for a directory, is rewritten to
  reach to from the citing file — keeping its form (./ or ../ relative, bare,
  root-relative, /route), its #fragment and its quotes. A surface that moves
  with the directory has its outward relative links rebased too.
  spw refactor never moves the file: the plan prints the mv to run. Plan and
  write before the move, then move; running again after the move is a no-op.
  Markdown and HTML lines that name the path are listed, never edited.

Examples:
  spw refactor .spw --rename mark:status=phase
  spw refactor prompts docs --rename anchor:old_id=new_id --write
  spw refactor . -r case:layer=tier -r mood:draft=review --json
  spw refactor . --rename path:docs/old.spw=docs/guide/new.spw
  spw refactor . --rename path:prompts/drafts=prompts/archive/drafts --write`)
}

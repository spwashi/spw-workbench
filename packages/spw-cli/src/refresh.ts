/**
 * spw refresh — recompute a plan's cache block from the plan itself.
 *
 * A plan's `^["cache"]{}` block summarizes the rest of the document: how many
 * questions are open, when the stream last moved. It goes stale because nothing
 * recomputes it — the field was written once and the plan moved on. Across this
 * repository roughly a quarter of plans carry a cache block that lies.
 *
 * This drives the seed's derived-mark rules, so each field is recomputed from
 * the surface as an addressed edit: the mark and its stance are preserved, the
 * rest of the plan is untouched, and re-running converges. `spw plan check`
 * detects the drift; this is what closes it.
 *
 * Plan-first: prints what it would change. `--write` applies. `--json` emits
 * the plan for review.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  planSemanticEdits,
  applySemanticPlan,
  deriveMark,
  countOps,
  latestTimestamp,
  type SemanticRule,
  type SemanticEdit,
} from '@spwashi/spw-seed'
import { collectSpwFiles } from './fs-walk'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace } from './workspace'

interface RefreshArgs {
  targets: string[]
  write: boolean
  json: boolean
  help: boolean
}

/**
 * The derived fields of a plan cache block.
 *
 * Each names a mark and where its value comes from. New derivable fields join
 * here — the wiring is one line per field.
 */
const CACHE_DERIVERS: SemanticRule[] = [
  deriveMark('open_count', countOps('open', '?')),
  deriveMark('last_stream', latestTimestamp('stream')),
]

export async function runSpwRefreshCli(argv: string[] = process.argv): Promise<void> {
  const rest = argv.slice(2)
  const args = parseRefreshArgs(rest[0] === 'refresh' ? rest.slice(1) : rest)

  if (args.help) {
    printRefreshHelp()
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  // Default to the plan surfaces, since the cache block is a plan construct.
  const roots = args.targets.length > 0 ? args.targets : ['.agents/plans']
  const files: string[] = []
  for (const root of roots) {
    const resolved = workspace ? await resolveWorkspacePath(workspace, root) : path.resolve(root)
    files.push(...await collectSpwFiles(resolved))
  }

  const report: Array<{ file: string; edits: SemanticEdit[]; wrote: boolean }> = []
  let totalEdits = 0

  for (const file of files) {
    const source = await fs.readFile(file, 'utf8')
    const plan = planSemanticEdits(source, CACHE_DERIVERS)
    if (plan.edits.length === 0) continue

    let wrote = false
    if (args.write) {
      await fs.writeFile(file, applySemanticPlan(source, plan), 'utf8')
      wrote = true
    }
    totalEdits += plan.edits.length
    report.push({
      file: workspace ? path.relative(workspace.consumerRoot, file) : file,
      edits: plan.edits,
      wrote,
    })
  }

  if (args.json) {
    console.log(JSON.stringify({
      mode: args.write ? 'write' : 'plan',
      files: report.length,
      totalEdits,
      report,
    }, null, 2))
    return
  }

  const verb = args.write ? 'refreshed' : 'would refresh'
  console.log(`spw refresh: ${verb} ${totalEdits} field(s) in ${report.length} plan(s)`)
  for (const entry of report) {
    console.log(`  ${entry.wrote ? '✓' : '·'} ${entry.file}`)
    for (const edit of entry.edits) {
      console.log(`      ${edit.reason}: → ${edit.newText}`)
    }
  }
  if (!args.write && totalEdits > 0) {
    console.log('\n  plan only — pass --write to apply')
  }
}

function parseRefreshArgs(rest: string[]): RefreshArgs {
  const args: RefreshArgs = { targets: [], write: false, json: false, help: false }
  for (const arg of rest) {
    if (arg === '--help' || arg === '-h') args.help = true
    else if (arg === '--write') args.write = true
    else if (arg === '--json') args.json = true
    else if (!arg.startsWith('-')) args.targets.push(arg)
  }
  return args
}

export function printRefreshHelp(): void {
  console.log(`spw refresh — recompute a plan's cache block from the plan itself

Usage:
  spw refresh [roots...] [--write] [--json]

Recomputes derived cache fields — the ones that summarize the rest of the plan:
  ~#open_count    number of questions in the ^["open"] frame
  ~#last_stream   newest timestamp in the ^["stream"] frame

The mark and its stance are preserved; only the value changes; re-running is a
no-op. Defaults to .agents/plans when no root is given.

Flags:
  --write   apply the edits (default is plan-only)
  --json    emit the plan as JSON
  -h,--help this help`)
}

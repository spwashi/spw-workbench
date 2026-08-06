/**
 * spw mutate — apply mutation profiles to tree or REPL buffers.
 *
 * Hot / REPL role: effect.l1.memory compute, then effect.l2.workspace write
 * (paths) or return source for host (--stdin). Often follows an accepted pulse plan.
 * Contrast with pulse: plan-first under effect.l0.measure; single-file atomic --write.
 *
 * @see docs/runtime/md/pulse-mutate-beat.md
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { applyStencil, type StencilMaskMode } from '@spwashi/spw-seed'
import { runMutationAutomata } from '@spwashi/spw-seed'
import { applyBiasRewrites, biasRewriteRules } from './bias-apply'
import { collectSpwFiles } from './fs-walk'
import { printHelpPage } from './help'
import { getStencil } from './session/workspace-cache'
import { readStdin } from './stdio'
import { resolveWorkspacePath, tryDiscoverSpwWorkspace, type SpwWorkspace } from './workspace'

interface MutateCliArgs {
  targets: string[]
  profile: string
  quiet: boolean
  help: boolean
  json: boolean
  dryRun: boolean
  stdin: boolean
  asLabel: string
  /** Path to a bias surface whose edges drive a rewrite (the `--bias` mode). */
  biasPatch: string | null
  /** Bias mode is plan-only unless --write is given (it is corpus-wide find/replace). */
  write: boolean
  /** Session stencil id from pulse --cut (replan transfer). */
  fromStencil: string | null
  /** Mask gate for --from: soft | strict | off */
  maskMode: StencilMaskMode
}

export async function runSpwMutateCli(argv: string[] = process.argv): Promise<void> {
  const raw = argv.slice(2)
  const rest = raw[0] === 'mutate' ? raw.slice(1) : raw
  const args = parseMutateArgs(rest)

  if (args.help) {
    printMutateHelp()
    return
  }

  if (args.stdin) {
    await runStdinMutate(args)
    return
  }

  if (args.biasPatch) {
    await runBiasMutate(args)
    return
  }

  if (args.fromStencil) {
    await runStencilMutate(args)
    return
  }

  if (args.targets.length === 0) {
    printMutateHelp()
    process.exitCode = 1
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const files = await resolveTargets(args.targets, workspace)

  if (files.length === 0) {
    console.error('spw mutate: no .spw files matched the given targets')
    process.exitCode = 1
    return
  }

  const results: Array<Record<string, unknown>> = []
  let mutated = 0

  for (const file of files) {
    const before = await fs.readFile(file, 'utf8')
    const result = runMutationAutomata(before, {
      profile: args.profile,
      dryRun: false,
      effectCeiling: 'effect.l1.memory',
    })
    const rel = relLabel(file, workspace)
    const changed = result.changed

    if (args.json) {
      results.push({
        file: rel,
        changed,
        rules: result.rulesApplied,
        stop: result.stopReason,
        ...(args.dryRun ? { source: result.source } : {}),
      })
    }

    if (!changed) {
      if (!args.quiet && !args.json) console.log(`= ${rel}  (no change)`)
      continue
    }

    if (!args.dryRun) {
      await fs.writeFile(file, result.source, 'utf8')
      mutated += 1
      if (!args.json) console.log(`~ ${rel}  rules=${result.rulesApplied.join(',') || '(none)'}`)
    } else {
      mutated += 1
      if (!args.json) {
        console.log(`~ ${rel}  dry-run rules=${result.rulesApplied.join(',') || '(none)'}`)
      }
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          command: 'mutate',
          mode: args.dryRun ? 'dry-run' : 'write',
          profile: args.profile,
          files: files.length,
          mutated,
          results,
        },
        null,
        2,
      ),
    )
  } else if (!args.quiet) {
    console.error(
      `spw-mutate: files=${files.length} ${args.dryRun ? 'would-mutate' : 'mutated'}=${mutated} profile=${args.profile}`,
    )
  }
}

/**
 * Apply a banked stencil to targets by replan (mask-gated).
 * Never transfers donor byte offsets.
 */
async function runStencilMutate(args: MutateCliArgs): Promise<void> {
  const stencil = getStencil(args.fromStencil!)
  if (!stencil) {
    console.error(
      `spw mutate: no stencil "${args.fromStencil}" in session bank (pulse --cut first)`,
    )
    process.exitCode = 1
    return
  }
  if (args.targets.length === 0) {
    console.error('spw mutate --from: name at least one target file/dir')
    process.exitCode = 1
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const files = await resolveTargets(args.targets, workspace)
  if (files.length === 0) {
    console.error('spw mutate --from: no .spw files matched targets')
    process.exitCode = 1
    return
  }

  const results: Array<Record<string, unknown>> = []
  let mutated = 0
  let refused = 0

  for (const file of files) {
    const before = await fs.readFile(file, 'utf8')
    const rel = relLabel(file, workspace)
    const applied = applyStencil(before, stencil, {
      maskMode: args.maskMode,
      dryRun: args.dryRun,
      effectCeiling: 'effect.l1.memory',
    })

    if (!applied.ok || !applied.result) {
      refused += 1
      if (args.json) {
        results.push({
          file: rel,
          refused: true,
          reason: applied.refused,
          gate: applied.gate.findings,
        })
      } else if (!args.quiet) {
        console.log(`× ${rel}  refused: ${applied.refused}`)
      }
      continue
    }

    const result = applied.result
    const changed = result.changed
    if (args.json) {
      results.push({
        file: rel,
        refused: false,
        changed,
        stencil: stencil.id,
        rules: result.rulesApplied,
        stop: result.stopReason,
        gate: applied.gate.findings,
        ...(args.dryRun ? { source: result.source } : {}),
      })
    }

    if (!changed) {
      if (!args.quiet && !args.json) {
        console.log(`= ${rel}  (no change under stencil ${stencil.id})`)
      }
      continue
    }

    if (!args.dryRun) {
      await fs.writeFile(file, result.source, 'utf8')
      mutated += 1
      if (!args.json) {
        console.log(
          `~ ${rel}  stencil=${stencil.id} rules=${result.rulesApplied.join(',') || '(none)'}`,
        )
      }
    } else {
      mutated += 1
      if (!args.json) {
        console.log(
          `~ ${rel}  dry-run stencil=${stencil.id} rules=${result.rulesApplied.join(',') || '(none)'}`,
        )
      }
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          command: 'mutate',
          mode: 'from-stencil',
          stencil: stencil.id,
          profile: stencil.profile,
          maskMode: args.maskMode,
          dryRun: args.dryRun,
          files: files.length,
          mutated,
          refused,
          results,
        },
        null,
        2,
      ),
    )
  } else if (!args.quiet) {
    console.error(
      `spw-mutate: from=${stencil.id} files=${files.length} mutated=${mutated} refused=${refused} mask=${args.maskMode}`,
    )
  }
  if (refused > 0) process.exitCode = 1
}

/**
 * Rewrite consumer: read a bias surface as an ordered patch. Each `=@from{ @to }`
 * edge is a rewrite rule (boon → from→to, bane → the revert). Plan-only unless
 * --write is given — the rewrite is a corpus-wide textual find/replace.
 */
async function runBiasMutate(args: MutateCliArgs): Promise<void> {
  const patchSource = await fs.readFile(path.resolve(args.biasPatch!), 'utf8')
  const rules = biasRewriteRules(patchSource)

  if (rules.length === 0) {
    console.error(`spw mutate: no rewrite edges (=@from{ @to }) in ${args.biasPatch}`)
    process.exitCode = 1
    return
  }

  if (args.targets.length === 0) {
    console.error('spw mutate --bias: name at least one target file/dir to rewrite')
    process.exitCode = 1
    return
  }

  const workspace = await tryDiscoverSpwWorkspace()
  const files = await resolveTargets(args.targets, workspace)
  const applied = !args.write ? 'plan' : 'write'
  const results: Array<Record<string, unknown>> = []
  let touched = 0

  for (const file of files) {
    const before = await fs.readFile(file, 'utf8')
    const { text, hits } = applyBiasRewrites(before, rules)
    const rel = relLabel(file, workspace)
    if (hits === 0) {
      if (!args.quiet && !args.json) console.log(`= ${rel}  (no match)`)
      continue
    }
    touched += 1
    if (args.write) await fs.writeFile(file, text, 'utf8')
    if (args.json) results.push({ file: rel, hits, applied })
    else console.log(`~ ${rel}  ${applied === 'write' ? 'rewrote' : 'would rewrite'} hits=${hits}`)
  }

  if (args.json) {
    console.log(JSON.stringify({ command: 'mutate', mode: `bias:${applied}`, rules: rules.length, files: files.length, touched, results }, null, 2))
  } else if (!args.quiet) {
    console.error(`spw-mutate: bias rules=${rules.length} files=${files.length} ${applied === 'write' ? 'rewrote' : 'would-rewrite'}=${touched}${args.write ? '' : '  (plan-only; pass --write to apply)'}`)
  }
}

async function runStdinMutate(args: MutateCliArgs): Promise<void> {
  const source = await readStdin()
  if (!source && process.stdin.isTTY) {
    console.error('spw mutate: --stdin requires piped buffer (TTY empty)')
    process.exitCode = 1
    return
  }

  const result = runMutationAutomata(source, {
    profile: args.profile,
    dryRun: false,
    effectCeiling: 'effect.l1.memory',
  })

  const label = args.asLabel || '<stdin>'
  const payload = {
    command: 'mutate',
    mode: 'stdin',
    label,
    profile: args.profile,
    changed: result.changed,
    rules: result.rulesApplied,
    stop: result.stopReason,
    source: result.source,
    dryRun: true,
  }

  console.log(JSON.stringify(args.json ? payload : payload, null, args.json ? 2 : 0))

  if (!args.quiet) {
    console.error(
      `spw-mutate: stdin label=${label} changed=${result.changed} rules=${result.rulesApplied.join(',') || '(none)'} (host applies source)`,
    )
  }
}

async function resolveTargets(targets: string[], workspace: SpwWorkspace | null): Promise<string[]> {
  const out = new Set<string>()
  for (const target of targets) {
    const resolved = workspace ? await resolveWorkspacePath(workspace, target) : path.resolve(target)
    for (const file of await collectSpwFiles(resolved)) out.add(file)
  }
  return [...out].sort()
}

function relLabel(file: string, workspace: SpwWorkspace | null): string {
  return path.relative(workspace?.consumerRoot ?? process.cwd(), file)
}

function parseMutateArgs(args: string[]): MutateCliArgs {
  const targets: string[] = []
  let profile = 'layout_canonical'
  let quiet = false
  let help = false
  let json = false
  let dryRun = false
  let stdin = false
  let asLabel = '<stdin>'
  let biasPatch: string | null = null
  let write = false
  let fromStencil: string | null = null
  let maskMode: StencilMaskMode = 'soft'

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!
    if (arg === '--help' || arg === '-h') {
      help = true
      continue
    }
    if (arg === '--bias') {
      biasPatch = args[++i] ?? null
      continue
    }
    if (arg.startsWith('--bias=')) {
      biasPatch = arg.slice('--bias='.length)
      continue
    }
    if (arg === '--from' || arg === '--from-stencil') {
      fromStencil = args[++i] ?? null
      continue
    }
    if (arg.startsWith('--from=')) {
      fromStencil = arg.slice('--from='.length)
      continue
    }
    if (arg.startsWith('--from-stencil=')) {
      fromStencil = arg.slice('--from-stencil='.length)
      continue
    }
    if (arg === '--mask') {
      const next = (args[++i] ?? 'soft') as StencilMaskMode
      if (next === 'soft' || next === 'strict' || next === 'off') maskMode = next
      continue
    }
    if (arg.startsWith('--mask=')) {
      const next = arg.slice('--mask='.length) as StencilMaskMode
      if (next === 'soft' || next === 'strict' || next === 'off') maskMode = next
      continue
    }
    if (arg === '--write') {
      write = true
      continue
    }
    if (arg === '--profile' || arg === '-p') {
      profile = args[i + 1] ?? profile
      i += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      profile = arg.slice('--profile='.length)
      continue
    }
    if (arg === '--quiet' || arg === '-q') {
      quiet = true
      continue
    }
    if (arg === '--json') {
      json = true
      continue
    }
    if (arg === '--dry-run' || arg === '--plan') {
      dryRun = true
      continue
    }
    if (arg === '--stdin') {
      stdin = true
      continue
    }
    if (arg === '--as') {
      asLabel = args[++i] ?? asLabel
      continue
    }
    if (arg.startsWith('--as=')) {
      asLabel = arg.slice('--as='.length)
      continue
    }
    if (!arg.startsWith('--')) {
      targets.push(arg)
    }
  }

  return {
    targets,
    profile,
    quiet,
    help,
    json,
    dryRun,
    stdin,
    asLabel,
    biasPatch,
    write,
    fromStencil,
    maskMode,
  }
}

export function printMutateHelp(): void {
  printHelpPage({
    title: 'Spw Mutate — apply (hot / batch)',
    usage: [
      'spw mutate <target...> [--profile layout_canonical] [--dry-run] [--json] [--quiet]',
      'spw mutate --from <stencil-id> <target...> [--mask soft|strict|off] [--dry-run]',
      'spw mutate --stdin [--as buffer.spw] [--profile layout_canonical] [--json]',
      'spw mutate --bias <patch.spw> <target...> [--write]',
    ],
    sections: [
      {
        title: 'Hot / REPL role',
        lines: [
          'Apply after an accepted plan (often pulse under effect.l0.measure).',
          'Paths: effect.l1.memory rewrite → effect.l2.workspace direct write.',
          'REPL: --stdin stays effect.l1.memory — returns { source, changed, rules }.',
          '--from <id>: replan transfer from pulse --cut (mask-gated; never donor byte offsets).',
          'See docs/runtime/md/pulse-mutate-beat.md',
        ],
      },
      {
        title: 'Flags',
        lines: [
          '--profile / -p    Mutation profile (default layout_canonical)',
          '--from <id>       Apply banked stencil by replan (session cli-cache)',
          '--mask <mode>     soft|strict|off form gate for --from (default soft)',
          '--dry-run         effect.l1.memory only — no effect.l2.workspace write',
          '--stdin           Read buffer from stdin; never auto-writes disk',
          '--as <label>      Logical name for stdin buffer in reports',
          '--json            Machine envelope for hosts',
          '--quiet / -q      Suppress per-file noise',
          '--bias <file>     Bias surface rewrite (=@from{ @to }); plan-only unless --write',
          '--write           With --bias: apply the rewrite',
        ],
      },
      {
        title: 'vs pulse / beat',
        lines: [
          'pulse   effect.l0.measure (+ optional atomic l2.workspace --write); --cut',
          'mutate  l1.memory → l2.workspace; --from stencil replan',
          'beat    Timing only — no tree effect',
          'Default pulse write is never a workspace setting — collate first',
        ],
      },
      {
        title: 'Try',
        lines: [
          'spw pulse a.spw --cut',
          'spw mutate --from <id> b.spw --dry-run',
          'spw mutate prompts/index.spw --dry-run --json',
        ],
      },
    ],
  })
}

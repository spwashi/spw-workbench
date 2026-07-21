/**
 * Mutation beat / pulse CLI — topographical mutation probes for quick diff tests.
 *
 * Default is plan-only (dry-run): report differentials, mutation vectors, and
 * topography deltas without writing. Use --write for in-place S2 apply.
 *
 * @see packages/spw-seed/src/canonical/mutation-automata.ts
 * @see packages/spw-seed/src/canonical/topography-probe.ts
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  MUTATION_PROFILES,
  OPERATIONAL_SEQUENCES,
  FORM_LADDER_PROFILE,
  formatAllLadderNotations,
  formatBoundaryAxisTable,
  formatHigherOrderForms,
  formatMatrix,
  formatMobilityRules,
  formatSiteGraph,
  listBoundaryLadders,
  listOperatorLadders,
  mutationRulesAsSequenceContext,
  probeBoundaryLadder,
  probeMutationTopography,
  probeOperatorLadder,
  resolveLadderQuery,
  runHigherOrderForm,
  runMutationAutomata,
  runOperationalSequence,
  snapshotTopography,
  topographyDelta,
  walkReferenceProgression,
  computationalRuleIds,
  REFERENCE_PROGRESSIONS,
  type MutationAutomataConfig,
  type MutationProfileId,
  type SequenceRunResult,
  type TopographyDelta,
  type TopographyMutationProbe,
} from '@spwashi/spw-seed'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'

interface PulseArgs {
  targets: string[]
  profile: MutationProfileId | string
  /** Named operational sequence (overrides profile when set) */
  sequence: string | null
  /**
   * Form ladder probe (paired boundary / operator / all).
   */
  ladder: string | null
  /**
   * Form geometry: rules | hof | graph | walk | progressions
   */
  geometry: string | null
  /** Label used by --geometry walk */
  label: string
  /** Higher-order form or progression id for walk */
  form: string | null
  write: boolean
  check: boolean
  json: boolean
  unified: boolean
  matrix: boolean
  rules: string[]
  help: boolean
  full: boolean
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'release', 'build', '_workbench', '.agents'])
const DEFAULT_TARGETS = ['.spw']
const FULL_REPO_TARGETS = ['index.spw', '.spw', 'docs', 'lib', 'packages', 'prompts', 'src']

function parseArgs(argv: string[]): PulseArgs {
  const common = parseCommonFlags(argv.slice(2))
  const args = common.args
  const parsed: PulseArgs = {
    targets: [],
    profile: 'layout_canonical',
    sequence: null,
    ladder: null,
    geometry: null,
    label: 'x',
    form: null,
    write: false,
    check: false,
    json: false,
    unified: false,
    matrix: false,
    rules: [],
    help: common.flags.help,
    full: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--write' || arg === '-w') {
      parsed.write = true
      continue
    }
    if (arg === '--check') {
      parsed.check = true
      continue
    }
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (arg === '--diff' || arg === '--unified' || arg === '-u') {
      parsed.unified = true
      continue
    }
    if (arg === '--matrix' || arg === '-m') {
      parsed.matrix = true
      continue
    }
    if (arg === '--full') {
      parsed.full = true
      continue
    }
    if (arg === '--profile' || arg === '-p') {
      parsed.profile = args[i + 1] ?? 'layout_canonical'
      i += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      parsed.profile = arg.slice('--profile='.length)
      continue
    }
    if (arg === '--sequence' || arg === '-s') {
      parsed.sequence = args[i + 1] ?? null
      i += 1
      continue
    }
    if (arg.startsWith('--sequence=')) {
      parsed.sequence = arg.slice('--sequence='.length)
      continue
    }
    if (arg === '--ladder' || arg === '-l') {
      parsed.ladder = args[i + 1] ?? 'all'
      i += 1
      continue
    }
    if (arg.startsWith('--ladder=')) {
      parsed.ladder = arg.slice('--ladder='.length) || 'all'
      continue
    }
    if (arg === '--geometry' || arg === '-g') {
      parsed.geometry = args[i + 1] ?? 'hof'
      i += 1
      continue
    }
    if (arg.startsWith('--geometry=')) {
      parsed.geometry = arg.slice('--geometry='.length) || 'hof'
      continue
    }
    if (arg === '--label') {
      parsed.label = args[i + 1] ?? 'x'
      i += 1
      continue
    }
    if (arg.startsWith('--label=')) {
      parsed.label = arg.slice('--label='.length) || 'x'
      continue
    }
    if (arg === '--form') {
      parsed.form = args[i + 1] ?? null
      i += 1
      continue
    }
    if (arg.startsWith('--form=')) {
      parsed.form = arg.slice('--form='.length) || null
      continue
    }
    if (arg === '--rule' || arg === '-r') {
      const next = args[i + 1]
      if (next) parsed.rules.push(next)
      i += 1
      continue
    }
    if (arg.startsWith('--rule=')) {
      parsed.rules.push(arg.slice('--rule='.length))
      continue
    }
    if (!arg.startsWith('-')) {
      parsed.targets.push(arg)
    }
  }

  if (parsed.targets.length === 0) {
    parsed.targets.push(...(parsed.full ? FULL_REPO_TARGETS : DEFAULT_TARGETS))
  } else if (parsed.full) {
    parsed.targets = [...FULL_REPO_TARGETS, ...parsed.targets]
  }

  return parsed
}

export function printSpwPulseHelp(): void {
  const profiles = Object.keys(MUTATION_PROFILES).join(' | ')
  const sequences = Object.keys(OPERATIONAL_SEQUENCES).join(' | ')
  printHelpPage({
    title: 'Spw Pulse — topographical mutation probes',
    usage: [
      'npm run spw -- pulse [targets...] [flags]',
      'npm run spw:pulse -- [targets...] [flags]',
    ],
    sections: [
      {
        title: 'Flags',
        lines: [
          `--profile <id>     Mutation profile (${profiles})`,
          `--sequence <id>    Mutation fold/OT pipeline (${sequences})`,
          '--ladder <q>       Form ladder: boundary (frame|[]|body|{}), op (&|!), all|boundaries|ops',
          '--geometry <mode>  Label mobility geometry: rules|hof|graph|walk|progressions',
          '--label <id>       Label for --geometry walk (default x)',
          '--form <id>        HOF or progression id for walk (e.g. hof.select_then_path)',
          '--rule <id>        Enable extra rule id (repeatable); intersects with profile when both set',
          '--check            Exit 1 if any file would change (CI / quick test)',
          '--write, -w        Apply in place (S2 workspace write)',
          '--diff, -u         Print unified-ish before/after hunks for changing files',
          '--matrix, -m       Print step×metric mutation matrix after each change',
          '--json             Machine-readable probe report',
          '--full             Expand default targets across repo semantic surfaces',
        ],
      },
      {
        title: 'Defaults',
        lines: [
          'Plan-only dry-run (no write). Profile layout_canonical.',
          'Reports mutation vector + topography delta (parse health, depths, containers).',
          '--sequence uses fold (serial) or OT-compose (parallel_plan) algebra.',
          'Use --check for quick differential regression tests.',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'npm run spw:pulse -- docs/theory/spw/onf.spw',
          'npm run spw:pulse -- --profile equiv_scripts --check .spw',
          'npm run spw:pulse -- --sequence layout_then_script --matrix --diff file.spw',
          'npm run spw:pulse -- --ladder frame',
          'npm run spw:pulse -- --ladder "[]"',
          'npm run spw:pulse -- --ladder "&"',
          'npm run spw:pulse -- --ladder boundaries --matrix',
          'npm run spw:pulse -- --ladder all',
          'npm run spw:pulse -- --geometry hof',
          'npm run spw:pulse -- --geometry walk --form hof.select_then_path --label topic',
          'npm run spw:pulse -- --geometry graph',
          'npm run spw:pulse -- --sequence script_then_layout --check .spw',
        ],
      },
    ],
  })
}

function runGeometryMode(cli: PulseArgs): void {
  const mode = (cli.geometry ?? 'hof').toLowerCase()

  if (mode === 'rules') {
    if (cli.json) {
      console.log(JSON.stringify({ computational: computationalRuleIds() }, null, 2))
      return
    }
    console.log('# Mobility rules (label geometry)\n')
    console.log(formatMobilityRules())
    console.log('\n# Computational apply() available:')
    console.log(computationalRuleIds().join('\n'))
    return
  }

  if (mode === 'hof' || mode === 'forms') {
    if (cli.json) {
      console.log(JSON.stringify({ note: 'see HIGHER_ORDER_FORMS' }, null, 2))
      return
    }
    console.log('# Higher-order compositional forms\n')
    console.log(formatHigherOrderForms())
    return
  }

  if (mode === 'graph') {
    console.log('# Label site graph (from mobility rules)\n')
    console.log(formatSiteGraph())
    return
  }

  if (mode === 'progressions' || mode === 'refs') {
    console.log('# Reference progressions\n')
    for (const p of REFERENCE_PROGRESSIONS) {
      const w = walkReferenceProgression(p.id, cli.label)
      console.log(`${p.id}  [${p.status}]`)
      console.log(`  ${p.description}`)
      console.log(`  waypoints: ${p.waypoints.map(pt => `${pt.site}@${pt.liminal}`).join(' → ')}`)
      if (w) {
        console.log(`  dry-walk: ${w.completed ? 'complete' : 'stopped'} → ${w.source}`)
      }
      console.log('')
    }
    return
  }

  if (mode === 'walk') {
    const formId = cli.form ?? 'hof.select_then_path'
    if (formId.startsWith('ref.')) {
      const w = walkReferenceProgression(formId, cli.label)
      if (!w) {
        console.error(`spw-pulse: unknown progression ${formId}`)
        process.exitCode = 1
        return
      }
      if (cli.json) {
        console.log(JSON.stringify(w, null, 2))
        return
      }
      console.log(`walk ${formId} label=${cli.label} completed=${w.completed}`)
      for (const s of w.steps) {
        console.log(
          s.ok
            ? `  ✓ ${s.ruleId}: ${s.before} → ${s.after}`
            : `  ✗ ${s.ruleId}: ${s.reason}`,
        )
      }
      console.log(`  source: ${w.source}`)
      return
    }

    const run = runHigherOrderForm(formId, cli.label)
    if (!run) {
      console.error(
        `spw-pulse: unknown form ${formId}. Try hof.select_then_path | hof.ground_then_publish | hof.membrane_to_observer | hof.path_deepen | hof.label_orbit_frame_capsule_scope | hof.action_aperture_cycle`,
      )
      process.exitCode = 1
      return
    }
    if (cli.json) {
      console.log(JSON.stringify(run, null, 2))
      return
    }
    console.log(`walk ${formId} label=${cli.label} completed=${run.completed}`)
    console.log(`  ${run.form.composition}`)
    console.log(`  liminal: ${run.form.liminalPath.join(' → ')}`)
    for (const s of run.steps) {
      console.log(
        s.ok
          ? `  ✓ ${s.ruleId}: ${s.before} → ${s.after}`
          : `  ✗ ${s.ruleId}: ${s.reason}`,
      )
    }
    console.log(`  source: ${run.source}`)
    return
  }

  console.error(`spw-pulse: unknown --geometry mode "${mode}". Use rules|hof|graph|walk|progressions`)
  process.exitCode = 1
}

function runLadderMode(cli: PulseArgs): void {
  const q = cli.ladder ?? 'all'
  const resolved = resolveLadderQuery(q)

  if (cli.matrix && (resolved.mode === 'all' || resolved.mode === 'boundaries')) {
    console.log('# Paired boundary → axis hypotheses (selection, path, ref, label, ground, fold)')
    console.log(formatBoundaryAxisTable())
    console.log('')
  }

  if (resolved.mode === 'all') {
    if (cli.json) {
      console.log(
        JSON.stringify(
          {
            profile: FORM_LADDER_PROFILE,
            boundaries: listBoundaryLadders().map(l => ({
              id: l.boundary,
              notation: l.notation,
              axes: l.axes,
              probe: probeBoundaryLadder(l.boundary),
            })),
            operators: listOperatorLadders().map(l => ({
              id: l.operator,
              notation: l.notation,
              preferredBoundary: l.preferredBoundary,
              probe: probeOperatorLadder(l.operator),
            })),
            boundaryAxes: formatBoundaryAxisTable(),
          },
          null,
          2,
        ),
      )
      return
    }
    console.log(formatAllLadderNotations())
    return
  }

  if (resolved.mode === 'boundaries') {
    if (cli.json) {
      console.log(JSON.stringify({ profile: FORM_LADDER_PROFILE, boundaries: listBoundaryLadders() }, null, 2))
      return
    }
    console.log(`# Paired-boundary ladders (${FORM_LADDER_PROFILE.status})`)
    console.log(`# included kinds: ${FORM_LADDER_PROFILE.includedKinds.join(', ')}\n`)
    if (resolved.legacyAlias) {
      console.log('# note: "brace" is a legacy query alias; this profile explicitly includes Capsule.\n')
    }
    for (const l of listBoundaryLadders()) {
      console.log(`${l.boundary}  [${l.axes.join(', ')}]`)
      console.log(`  empty: ${l.emptySurface} → occupancy=${l.emptyState.occupancy}, payload=${l.emptyState.payload}`)
      console.log(`  ${l.notation}`)
      console.log('')
    }
    return
  }

  if (resolved.mode === 'ops') {
    if (cli.json) {
      console.log(JSON.stringify(listOperatorLadders(), null, 2))
      return
    }
    console.log('# Operator ladders (compose with boundaries)\n')
    for (const l of listOperatorLadders()) {
      console.log(`${l.operator}  ${l.name}  → preferred ${l.preferredBoundary}`)
      console.log(`  ${l.notation}`)
      console.log('')
    }
    return
  }

  // one ladder
  if (!resolved.ladder) {
    console.error(
      `spw-pulse: unknown ladder "${q}". Try: frame body scope capsule stream nrange [] {} () ` +
        `or operators ${listOperatorLadders().map(l => l.operator).join(' ')} ` +
        `or all|boundaries|ops (brace is a legacy alias)`,
    )
    process.exitCode = 1
    return
  }

  const probe =
    resolved.ladder.kind === 'boundary'
      ? probeBoundaryLadder(resolved.ladder.boundary)
      : probeOperatorLadder(resolved.ladder.operator)

  if (!probe) {
    process.exitCode = 1
    return
  }

  if (cli.json) {
    console.log(JSON.stringify(probe, null, 2))
    return
  }

  for (const line of probe.findings) {
    console.log(line)
  }
  if (cli.matrix && resolved.ladder.kind === 'boundary') {
    console.log('')
    console.log(formatBoundaryAxisTable())
  }
}

async function collectSpwFiles(target: string): Promise<string[]> {
  const absolute = path.resolve(target)
  let stats
  try {
    stats = await fs.stat(absolute)
  } catch {
    return []
  }

  if (stats.isFile()) {
    return absolute.endsWith('.spw') ? [absolute] : []
  }
  if (!stats.isDirectory()) return []

  const entries = await fs.readdir(absolute, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
    const entryPath = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSpwFiles(entryPath)))
    } else if (entry.isFile() && entry.name.endsWith('.spw')) {
      files.push(entryPath)
    }
  }
  return files
}

function buildConfig(cli: PulseArgs): MutationAutomataConfig {
  const config: MutationAutomataConfig = {
    profile: cli.profile,
    dryRun: !cli.write,
    effectCeiling: cli.write ? 'S2' : 'S1',
  }
  // measure_only stays S0 plan
  if (cli.profile === 'measure_only') {
    config.dryRun = true
    config.effectCeiling = 'S0'
  }
  if (cli.rules.length > 0) {
    config.enabledRules = cli.rules
  }
  // When writing, actually apply
  if (cli.write) {
    config.dryRun = false
    config.effectCeiling = 'S1' // in-memory apply; file write is separate S2
  }
  return config
}

function formatUnified(rel: string, before: string, after: string): string {
  const bLines = before.split('\n')
  const aLines = after.split('\n')
  const lines = [`--- a/${rel}`, `+++ b/${rel}`]
  // Simple full-file context when small; otherwise prefix/suffix compact
  if (bLines.length + aLines.length < 80) {
    for (const line of bLines) lines.push(`-${line}`)
    for (const line of aLines) lines.push(`+${line}`)
    return lines.join('\n')
  }
  // Compact: show first differing region only
  let i = 0
  while (i < bLines.length && i < aLines.length && bLines[i] === aLines[i]) i++
  let j = 0
  while (
    j < bLines.length - i &&
    j < aLines.length - i &&
    bLines[bLines.length - 1 - j] === aLines[aLines.length - 1 - j]
  ) {
    j++
  }
  lines.push(`@@ -${i + 1},${bLines.length - i - j} +${i + 1},${aLines.length - i - j} @@`)
  for (let k = i; k < bLines.length - j; k++) lines.push(`-${bLines[k]}`)
  for (let k = i; k < aLines.length - j; k++) lines.push(`+${aLines[k]}`)
  return lines.join('\n')
}

export type PulseWriteStatus =
  | 'not_requested'
  | 'unchanged'
  | 'written'
  | 'blocked_health_regression'
  | 'blocked_structure_regression'
  | 'blocked_conflict'
  | 'blocked_stale_source'

export function decidePulseWriteStatus(input: {
  requested: boolean
  changed: boolean
  healthRegressed: boolean
  structureMoved: boolean
  layoutOnlyProfile: boolean
  conflicts: number
  sourceUnchanged: boolean
}): PulseWriteStatus {
  if (!input.requested) return 'not_requested'
  if (!input.changed) return 'unchanged'
  if (input.healthRegressed) return 'blocked_health_regression'
  if (input.layoutOnlyProfile && input.structureMoved) return 'blocked_structure_regression'
  if (input.conflicts > 0) return 'blocked_conflict'
  if (!input.sourceUnchanged) return 'blocked_stale_source'
  return 'written'
}

interface FilePulseReport {
  file: string
  changed: boolean
  stopReason: string
  profile: string
  sequence: string | null
  findings: string[]
  vector: TopographyMutationProbe['vector']
  plannedDelta: TopographyMutationProbe['plannedDelta']
  beforeHealth: string
  afterHealth: string
  plannedHash: string
  inputHash: string
  matrix?: string
  sequenceConflicts?: number
  writeStatus: PulseWriteStatus
}

export async function runSpwPulseCli(argv: string[] = process.argv): Promise<void> {
  const cli = parseArgs(argv)
  if (cli.help) {
    printSpwPulseHelp()
    return
  }

  if (cli.geometry !== null) {
    runGeometryMode(cli)
    return
  }

  if (cli.ladder !== null) {
    runLadderMode(cli)
    return
  }

  if (cli.sequence && !(cli.sequence in OPERATIONAL_SEQUENCES)) {
    console.error(
      `spw-pulse: unknown sequence "${cli.sequence}". Known: ${Object.keys(OPERATIONAL_SEQUENCES).join(', ')}`,
    )
    process.exitCode = 1
    return
  }

  const repoRoot = process.cwd()
  const fileSet = new Set<string>()
  for (const target of cli.targets) {
    for (const file of await collectSpwFiles(target)) fileSet.add(file)
  }
  const files = Array.from(fileSet).sort()
  if (files.length === 0) {
    console.log('spw-pulse: no .spw files found.')
    return
  }

  const config = buildConfig(cli)
  const seqCtx = mutationRulesAsSequenceContext(config)
  const reports: FilePulseReport[] = []
  let wouldChange = 0
  let wrote = 0
  let healthRegressions = 0
  let structureMoves = 0
  let blockedWrites = 0

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8')
    const rel = path.relative(repoRoot, file)

    let plannedSource: string
    let plannedHash: string
    let inputHash: string
    let vector: TopographyMutationProbe['vector']
    let stopReason: string
    let profileLabel: string
    let matrixText: string | undefined
    let sequenceConflicts = 0
    let seqResult: SequenceRunResult | null = null

    if (cli.sequence) {
      seqResult = runOperationalSequence(original, cli.sequence, seqCtx)
      plannedSource = seqResult.source
      plannedHash = seqResult.outputHash
      inputHash = seqResult.inputHash
      vector = seqResult.vector
      stopReason = seqResult.changed ? 'sequence_applied' : 'fixed_point'
      profileLabel = `seq:${cli.sequence}`
      sequenceConflicts = seqResult.conflicts.length
      if (cli.matrix || cli.json) {
        matrixText = formatMatrix(seqResult.matrix)
      }
    } else {
      const planned = runMutationAutomata(original, {
        ...config,
        dryRun: false,
        effectCeiling: 'S1',
      })
      plannedSource = planned.source
      plannedHash = planned.outputHash
      inputHash = planned.inputHash
      vector = planned.vector
      stopReason = planned.stopReason
      profileLabel = planned.profile
      if (cli.matrix) {
        matrixText = formatMatrix(
          // single-row matrix from profile vector
          {
            rows: [planned.profile],
            cols: [
              'layout_delta',
              'token_delta',
              'structure_delta',
              'label_delta',
              'reference_delta',
              'script_delta',
              'edit_count',
              'bytes_delta',
            ] as const,
            data: [[
              planned.vector.layout_delta,
              planned.vector.token_delta,
              planned.vector.structure_delta,
              planned.vector.label_delta,
              planned.vector.reference_delta,
              planned.vector.script_delta,
              planned.vector.edit_count,
              planned.vector.bytes_delta,
            ]],
          },
        )
      }
    }

    const beforeTopo = snapshotTopography(original)
    const afterTopo = snapshotTopography(plannedSource)
    const plannedDelta: TopographyDelta = topographyDelta(beforeTopo, afterTopo)

    // Profile path still uses full probe findings; sequence uses topo delta directly
    const probe = cli.sequence
      ? null
      : probeMutationTopography(original, config)
    const findings = probe?.findings ?? [
      `stop=${stopReason} sequence=${cli.sequence} changed=${plannedSource !== original}`,
      `vector edits=${vector.edit_count} layout=${vector.layout_delta} script=${vector.script_delta} bytes=${vector.bytes_delta}`,
      `topo health ${plannedDelta.parseHealthBefore} → ${plannedDelta.parseHealthAfter}` +
        (plannedDelta.healthRegressed ? ' (REGRESSED)' : ' (stable)'),
      plannedDelta.layoutOnlyCandidate
        ? 'topo layout-only candidate: structure stable, surface metrics moved'
        : plannedDelta.structureMoved
          ? `topo structure moved: astDepthΔ=${plannedDelta.maxAstDepthDelta ?? 'n/a'}`
          : 'topo structure stable',
    ]

    const changed = plannedSource !== original
    if (changed) wouldChange += 1
    if (plannedDelta.healthRegressed) healthRegressions += 1
    if (plannedDelta.structureMoved) structureMoves += 1

    const layoutOnlyProfile =
      !cli.sequence && ['layout_canonical', 'layout_full', 'measure_only'].includes(profileLabel)
    let writeStatus = decidePulseWriteStatus({
      requested: cli.write,
      changed,
      healthRegressed: plannedDelta.healthRegressed,
      structureMoved: plannedDelta.structureMoved,
      layoutOnlyProfile,
      conflicts: sequenceConflicts,
      sourceUnchanged: true,
    })
    if (cli.write && changed) {
      if (writeStatus === 'written') {
        // Re-resolve the exact source precondition immediately before S2 write.
        const current = await fs.readFile(file, 'utf8')
        writeStatus = decidePulseWriteStatus({
          requested: true,
          changed: true,
          healthRegressed: false,
          structureMoved: plannedDelta.structureMoved,
          layoutOnlyProfile,
          conflicts: 0,
          sourceUnchanged: current === original,
        })
        if (writeStatus === 'written') {
          await fs.writeFile(file, plannedSource, 'utf8')
          wrote += 1
        }
      }
      if (writeStatus !== 'written') blockedWrites += 1
    }

    reports.push({
      file: rel,
      changed,
      stopReason,
      profile: profileLabel,
      sequence: cli.sequence,
      findings,
      vector,
      plannedDelta,
      beforeHealth: beforeTopo.parseHealth,
      afterHealth: afterTopo.parseHealth,
      plannedHash,
      inputHash,
      matrix: matrixText,
      sequenceConflicts,
      writeStatus,
    })

    if (!cli.json && changed) {
      const tag = writeStatus === 'written'
        ? 'pulsed'
        : cli.write ? 'blocked-write' : 'would-pulse'
      console.log(
        `${tag}: ${rel}  health=${beforeTopo.parseHealth}→${afterTopo.parseHealth}` +
          `  edits=${vector.edit_count}  bytesΔ=${vector.bytes_delta}` +
          (cli.sequence ? `  seq=${cli.sequence}` : '') +
          (plannedDelta.layoutOnlyCandidate ? '  [layout-only?]' : '') +
          (plannedDelta.structureMoved ? '  [structure]' : '') +
          (plannedDelta.healthRegressed ? '  [HEALTH REGRESS]' : '') +
          (sequenceConflicts > 0 ? `  [OT conflicts=${sequenceConflicts}]` : '') +
          (cli.write ? `  [${writeStatus}]` : ''),
      )
      for (const line of findings.slice(0, 4)) {
        console.log(`  · ${line}`)
      }
      if (seqResult) {
        for (const step of seqResult.steps) {
          if (!step.differential.identity) {
            console.log(
              `  → ${step.id}: edits=${step.differential.edits.length} bytesΔ=${step.differential.vector.bytes_delta}`,
            )
          }
        }
      }
      if (cli.matrix && matrixText) {
        console.log(matrixText)
      }
      if (cli.unified) {
        console.log(formatUnified(rel, original, plannedSource))
      }
    }
  }

  if (cli.json) {
    console.log(
      JSON.stringify(
        {
          profile: config.profile,
          sequence: cli.sequence,
          write: cli.write,
          files: reports.length,
          wouldChange,
          wrote,
          blockedWrites,
          healthRegressions,
          structureMoves,
          reports,
        },
        null,
        2,
      ),
    )
  } else {
    console.log(
      `spw-pulse: files=${files.length} would-change=${wouldChange}` +
        (cli.write ? ` wrote=${wrote}` : ' (dry-run)') +
        (cli.write ? ` blocked-writes=${blockedWrites}` : '') +
        ` health-regressions=${healthRegressions} structure-moves=${structureMoves}` +
        (cli.sequence ? ` sequence=${cli.sequence}` : ` profile=${cli.profile}`),
    )
  }

  if (cli.check && wouldChange > 0) {
    const label = cli.sequence ? `sequence ${cli.sequence}` : `profile ${cli.profile}`
    console.error(`spw-pulse: ${wouldChange} file(s) would change under ${label}.`)
    process.exitCode = 1
  }
  if (cli.write && blockedWrites > 0) {
    console.error(`spw-pulse: refused ${blockedWrites} write(s); inspect writeStatus and planned deltas.`)
    process.exitCode = 1
  }
}

/**
 * Mutation beat / pulse CLI — topographical mutation probes for quick diff tests.
 *
 * Default is plan-only (dry-run): report differentials, mutation vectors, and
 * topography deltas without writing. --write performs one guarded atomic file
 * replacement; multi-file, external, and mounted-infrastructure writes refuse.
 *
 * @see packages/spw-seed/src/canonical/mutation-automata.ts
 * @see packages/spw-seed/src/canonical/topography-probe.ts
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  BUILTIN_MUTATION_RULES,
  MUTATION_PROFILES,
  OPERATIONAL_SEQUENCES,
  FORM_LADDER_PROFILE,
  FORM_GEOMETRY_PROFILE,
  FORM_MOBILITY_APPLICATION_PROFILE,
  HIGHER_ORDER_FORMS,
  MOBILITY_RULES,
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
  probeOperatorLadder,
  resolveLadderQuery,
  runHigherOrderForm,
  runMutationAutomata,
  runOperationalSequence,
  resolveMutationRules,
  snapshotTopography,
  topographyDelta,
  walkReferenceProgression,
  computationalRuleIds,
  labelSiteGraph,
  REFERENCE_PROGRESSIONS,
  type MutationAutomataConfig,
  type MutationMatrix,
  type MutationProfileId,
  type MutationRunResult,
  type ParseHealth,
  type SequenceRunResult,
  type TopographyDelta,
} from '@spwashi/spw-seed'
import { parseCommonFlags } from './args'
import { printHelpPage } from './help'
import {
  discoverSpwWorkspace,
  findWorkspaceRoot,
  isWithin,
  relativeToConsumer,
  resolveWorkspacePath,
} from './workspace'

interface PulseArgs {
  targets: string[]
  explicitTargets: string[]
  profile: MutationProfileId | string
  profileExplicit: boolean
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
  labelExplicit: boolean
  /** Higher-order form or progression id for walk */
  form: string | null
  formExplicit: boolean
  write: boolean
  acceptSemanticRisk: boolean
  check: boolean
  json: boolean
  unified: boolean
  matrix: boolean
  rules: string[]
  help: boolean
  full: boolean
  includeWorkbench: boolean
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '_workbench', '.agents'])
const DEFAULT_TARGETS = ['.spw']
const FULL_REPO_TARGETS = ['index.spw', '.spw', 'docs', 'lib', 'packages', 'prompts', 'src']
export const SPW_PULSE_SCHEMA_VERSION = 1 as const
export const SPW_PULSE_SURFACE = 'spw.pulse' as const

export type PulseTransportMode =
  | 'error'
  | 'mutation'
  | 'rules'
  | 'hof'
  | 'graph'
  | 'progressions'
  | 'walk'
  | 'ladder'

export interface PulseTransportHeader {
  schemaVersion: typeof SPW_PULSE_SCHEMA_VERSION
  surface: typeof SPW_PULSE_SURFACE
  mode: PulseTransportMode
  ok: boolean
}

export interface PulseErrorEnvelope extends PulseTransportHeader {
  mode: 'error'
  ok: false
  errors: string[]
}

export type PulseObservationMode = Exclude<PulseTransportMode, 'error' | 'mutation'>

export type PulseObservationEnvelope<
  Mode extends PulseObservationMode = PulseObservationMode,
  Payload extends Record<string, unknown> = Record<string, unknown>,
> = PulseTransportHeader & { mode: Mode; ok: true } & Payload

export interface PulseExecutionEvidence {
  planEffectCeiling:
    | 'effect.l0.measure'
    | 'effect.l1.memory'
  workspaceEffectCeiling: 'effect.l2.workspace' | null
  crossAuthorityBoundary: 'effect.l3.external'
  writeProtocol: 'single_file_atomic_replace'
  concurrencyGuard: 'best_effort_source_recheck'
  writeCapability: 'layout_canonical_only'
  semanticEquivalence: 'not_claimed'
  semanticRiskAcknowledged: boolean
  multiFileWrite: 'refused_without_transaction'
  externalWrite: 'refused_cross_authority'
  mountedInfrastructureWrite: 'refused_infrastructure_authority'
}

export interface PulseMutationEnvelope extends PulseTransportHeader {
  mode: 'mutation'
  ok: boolean
  errors: string[]
  warnings: string[]
  workspace: {
    mode: 'canonical' | 'mounted-consumer'
    rootSource: 'manifest' | 'fallback'
    consumerRoot: '.'
  }
  execution: PulseExecutionEvidence
  targetSelectors: string[]
  profile: string
  sequence: string | null
  write: boolean
  files: number
  wouldChange: number
  wrote: number
  blockedWrites: number
  planFailures: number
  healthRegressions: number
  structureMoves: number
  reports: PulseFileReport[]
}

export type PulseEnvelope =
  | PulseErrorEnvelope
  | PulseMutationEnvelope
  | PulseObservationEnvelope

function parseArgs(argv: string[]): PulseArgs {
  const common = parseCommonFlags(argv.slice(2))
  const args = common.args
  const parsed: PulseArgs = {
    targets: [],
    explicitTargets: [],
    profile: 'layout_canonical',
    profileExplicit: false,
    sequence: null,
    ladder: null,
    geometry: null,
    label: 'x',
    labelExplicit: false,
    form: null,
    formExplicit: false,
    write: false,
    acceptSemanticRisk: false,
    check: false,
    json: false,
    unified: false,
    matrix: false,
    rules: [],
    help: common.flags.help,
    full: false,
    includeWorkbench: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--write' || arg === '-w') {
      parsed.write = true
      continue
    }
    if (arg === '--accept-semantic-risk') {
      parsed.acceptSemanticRisk = true
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
    if (arg === '--include-workbench') {
      parsed.includeWorkbench = true
      continue
    }
    if (arg === '--profile' || arg === '-p') {
      const next = args[i + 1]
      if (!next || next.startsWith('-')) {
        throw new Error(`${arg} requires a profile id`)
      }
      parsed.profile = next
      parsed.profileExplicit = true
      i += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      parsed.profile = arg.slice('--profile='.length)
      parsed.profileExplicit = true
      continue
    }
    if (arg === '--sequence' || arg === '-s') {
      const next = args[i + 1]
      if (!next || next.startsWith('-')) {
        throw new Error(`${arg} requires a sequence id`)
      }
      parsed.sequence = next
      i += 1
      continue
    }
    if (arg.startsWith('--sequence=')) {
      parsed.sequence = arg.slice('--sequence='.length)
      continue
    }
    if (arg === '--ladder' || arg === '-l') {
      const next = args[i + 1]
      parsed.ladder = next && !next.startsWith('-') ? next : 'all'
      if (next && !next.startsWith('-')) i += 1
      continue
    }
    if (arg.startsWith('--ladder=')) {
      parsed.ladder = arg.slice('--ladder='.length) || 'all'
      continue
    }
    if (arg === '--geometry' || arg === '-g') {
      const next = args[i + 1]
      parsed.geometry = next && !next.startsWith('-') ? next : 'hof'
      if (next && !next.startsWith('-')) i += 1
      continue
    }
    if (arg.startsWith('--geometry=')) {
      parsed.geometry = arg.slice('--geometry='.length) || 'hof'
      continue
    }
    if (arg === '--label') {
      const next = args[i + 1]
      if (!next || next.startsWith('-')) throw new Error('--label requires an id')
      parsed.label = next
      parsed.labelExplicit = true
      i += 1
      continue
    }
    if (arg.startsWith('--label=')) {
      const value = arg.slice('--label='.length)
      if (!value) throw new Error('--label requires an id')
      parsed.label = value
      parsed.labelExplicit = true
      continue
    }
    if (arg === '--form') {
      const next = args[i + 1]
      if (!next || next.startsWith('-')) throw new Error('--form requires an id')
      parsed.form = next
      parsed.formExplicit = true
      i += 1
      continue
    }
    if (arg.startsWith('--form=')) {
      const value = arg.slice('--form='.length)
      if (!value) throw new Error('--form requires an id')
      parsed.form = value
      parsed.formExplicit = true
      continue
    }
    if (arg === '--rule' || arg === '-r') {
      const next = args[i + 1]
      if (!next || next.startsWith('-')) {
        throw new Error(`${arg} requires a rule id`)
      }
      parsed.rules.push(next)
      i += 1
      continue
    }
    if (arg.startsWith('--rule=')) {
      parsed.rules.push(arg.slice('--rule='.length))
      continue
    }
    if (!arg.startsWith('-')) {
      parsed.targets.push(arg)
      parsed.explicitTargets.push(arg)
      continue
    }
    throw new Error(`unknown option "${arg}"`)
  }

  if (parsed.targets.length === 0) {
    parsed.targets.push(...(parsed.full ? FULL_REPO_TARGETS : DEFAULT_TARGETS))
  } else if (parsed.full) {
    parsed.targets = [...FULL_REPO_TARGETS, ...parsed.targets]
  }

  return parsed
}

function validatePulseArgs(cli: PulseArgs): string[] {
  const errors: string[] = []
  const observationMode = cli.geometry !== null || cli.ladder !== null
  if (cli.geometry !== null && cli.ladder !== null) {
    errors.push('--geometry and --ladder are mutually exclusive')
  }
  if (cli.write && cli.check) {
    errors.push('--check and --write are incompatible')
  }
  if (cli.json && cli.unified) {
    errors.push('--diff and --json are incompatible')
  }
  if (cli.write && cli.profile === 'measure_only') {
    errors.push('profile measure_only cannot be used with --write')
  }
  if (cli.write && !cli.acceptSemanticRisk) {
    errors.push('--write requires --accept-semantic-risk; semantic equivalence is not claimed')
  }
  if (!cli.write && cli.acceptSemanticRisk) {
    errors.push('--accept-semantic-risk is only available with --write')
  }
  if (cli.write && cli.profile !== 'layout_canonical') {
    errors.push('--write is limited to profile layout_canonical')
  }
  if (cli.write && cli.sequence !== null) {
    errors.push('--write is not available for operational sequences')
  }
  if (cli.write && cli.rules.length > 0) {
    errors.push('--write is not available with --rule restrictions')
  }
  if (!Object.hasOwn(MUTATION_PROFILES, cli.profile)) {
    errors.push(
      `unknown profile "${cli.profile}". Known: ${Object.keys(MUTATION_PROFILES).join(', ')}`,
    )
  }
  if (cli.sequence !== null && !Object.hasOwn(OPERATIONAL_SEQUENCES, cli.sequence)) {
    errors.push(
      `unknown sequence "${cli.sequence}". Known: ${Object.keys(OPERATIONAL_SEQUENCES).join(', ')}`,
    )
  }
  if (cli.sequence !== null && cli.profileExplicit) {
    errors.push('--profile does not compose with --sequence')
  }
  if (cli.sequence !== null && cli.rules.length > 0) {
    errors.push('--rule does not compose with --sequence')
  }
  if (observationMode) {
    if (cli.write) errors.push('--write is only available in mutation mode')
    if (cli.check) errors.push('--check is only available in mutation mode')
    if (cli.full) errors.push('--full is only available in mutation mode')
    if (cli.unified) errors.push('--diff is only available in mutation mode')
    if (cli.sequence !== null) errors.push('--sequence is only available in mutation mode')
    if (cli.profileExplicit) errors.push('--profile is only available in mutation mode')
    if (cli.rules.length > 0) errors.push('--rule is only available in mutation mode')
    if (cli.includeWorkbench) {
      errors.push('--include-workbench is only available in mutation mode')
    }
    if (cli.explicitTargets.length > 0) {
      errors.push('file targets are only available in mutation mode')
    }
  }
  if (cli.geometry !== null && cli.matrix) {
    errors.push('--matrix is available in mutation and ladder modes, not geometry mode')
  }
  if (cli.geometry === null && cli.labelExplicit) {
    errors.push('--label is only available in geometry mode')
  }
  if (cli.geometry === null && cli.formExplicit) {
    errors.push('--form is only available in geometry mode')
  }
  const geometryMode = cli.geometry?.toLowerCase()
  if (cli.labelExplicit && !['walk', 'progressions', 'refs'].includes(geometryMode ?? '')) {
    errors.push('--label is only meaningful for geometry walk or progressions')
  }
  if (cli.formExplicit && geometryMode !== 'walk') {
    errors.push('--form is only meaningful for geometry walk')
  }
  if (cli.write && cli.includeWorkbench) {
    errors.push('mounted-infrastructure writes cross authority and are not supported')
  }
  const knownRuleIds = new Set(BUILTIN_MUTATION_RULES.map(rule => rule.id))
  for (const ruleId of cli.rules) {
    if (!knownRuleIds.has(ruleId)) {
      errors.push(
        `unknown rule "${ruleId}". Known: ${Array.from(knownRuleIds).join(', ')}`,
      )
    }
  }
  return errors
}

function failPulse(messages: string | string[], json = false): void {
  const errors = Array.isArray(messages) ? messages : [messages]
  if (json) {
    const envelope = {
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: SPW_PULSE_SURFACE,
      mode: 'error',
      ok: false,
      errors,
    } satisfies PulseErrorEnvelope
    console.log(JSON.stringify(envelope, null, 2))
  } else {
    for (const message of errors) console.error(`spw-pulse: ${message}`)
  }
  process.exitCode = 1
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
          '--label <id>       Label for geometry walk/progressions (default x)',
          '--form <id>        HOF or progression id for walk (e.g. hof.select_then_path)',
          '--rule <id>        Restrict the selected profile to rule ids (repeatable)',
          '--check            Exit 1 if any file would change (CI / quick test)',
          '--write, -w        Atomically replace one parse-complete consumer file',
          '--accept-semantic-risk  Required for --write; equivalence is not claimed',
          '--diff, -u         Print unified-ish before/after hunks for changing files',
          '--matrix, -m       Print step×metric mutation matrix after each change',
          '--json             Machine-readable probe report',
          '--full             Expand default targets across repo semantic surfaces',
          '--include-workbench  Permit plan-only inspection of mounted infrastructure',
        ],
      },
      {
        title: 'Defaults',
        lines: [
          'Plan-only dry-run (no write). Profile layout_canonical.',
          '--write is limited to layout_canonical and refuses sequences or rule restrictions.',
          '--write refuses multiple files and external or mounted authority.',
          'Effect slugs: effect.l0.measure → l1.memory → l2.workspace → l3.external.',
          'Reports mutation vector + topography delta (parse health, depths, containers).',
          '--sequence uses fold (serial) or OT-compose (parallel_plan) algebra.',
          'equiv_scripts is a legacy compatibility-preview id; equivalence is not claimed.',
          'Use --check for quick differential regression tests.',
        ],
      },
      {
        title: 'Examples',
        lines: [
          'npm run spw:pulse -- docs/theory/spw/onf.spw',
          'npm run spw:pulse -- --profile equiv_scripts --check .spw',
          'npm run spw:pulse -- --write --accept-semantic-risk file.spw',
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
      console.log(JSON.stringify({
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'rules',
        ok: true,
        interpretationProfile: FORM_GEOMETRY_PROFILE,
        applicationProfile: FORM_MOBILITY_APPLICATION_PROFILE,
        rules: MOBILITY_RULES.map(({ apply, ...rule }) => ({
          ...rule,
          computational: typeof apply === 'function',
        })),
        computational: computationalRuleIds(),
      }, null, 2))
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
      console.log(JSON.stringify({
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'hof',
        ok: true,
        interpretationProfile: FORM_GEOMETRY_PROFILE,
        applicationProfile: FORM_MOBILITY_APPLICATION_PROFILE,
        forms: HIGHER_ORDER_FORMS,
      }, null, 2))
      return
    }
    console.log('# Higher-order compositional forms\n')
    console.log(formatHigherOrderForms())
    return
  }

  if (mode === 'graph') {
    if (cli.json) {
      console.log(JSON.stringify({
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'graph',
        ok: true,
        interpretationProfile: FORM_GEOMETRY_PROFILE,
        edges: labelSiteGraph(),
      }, null, 2))
      return
    }
    console.log('# Label site graph (from mobility rules)\n')
    console.log(formatSiteGraph())
    return
  }

  if (mode === 'progressions' || mode === 'refs') {
    if (cli.json) {
      console.log(JSON.stringify({
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'progressions',
        ok: true,
        interpretationProfile: FORM_GEOMETRY_PROFILE,
        applicationProfile: FORM_MOBILITY_APPLICATION_PROFILE,
        progressions: REFERENCE_PROGRESSIONS.map(progression => ({
          progression,
          walk: walkReferenceProgression(progression.id, cli.label),
        })),
      }, null, 2))
      return
    }
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
        failPulse(`unknown progression ${formId}`, cli.json)
        return
      }
      if (cli.json) {
        console.log(JSON.stringify({
          schemaVersion: SPW_PULSE_SCHEMA_VERSION,
          surface: SPW_PULSE_SURFACE,
          mode: 'walk',
          ok: true,
          kind: 'progression',
          interpretationProfile: FORM_GEOMETRY_PROFILE,
          applicationProfile: FORM_MOBILITY_APPLICATION_PROFILE,
          walk: w,
        }, null, 2))
        return
      }
      console.log(`walk ${formId} label=${cli.label} completed=${w.completed}`)
      for (const s of w.steps) {
        const evidence = s.receipt
          ? ` health=${s.receipt.beforeHealth}→${s.receipt.afterHealth}` +
            ` inverse=${s.receipt.inverse.status}`
          : ''
        console.log(
          s.ok
            ? `  ✓ ${s.ruleId}: ${s.before} → ${s.after}${evidence}`
            : `  ✗ ${s.ruleId}: ${s.reason}`,
        )
      }
      console.log(`  source: ${w.source}`)
      return
    }

    const run = runHigherOrderForm(formId, cli.label)
    if (!run) {
      const knownForms = HIGHER_ORDER_FORMS.map(form => form.id).join(' | ')
      failPulse(`unknown form ${formId}. Try ${knownForms}`, cli.json)
      return
    }
    if (cli.json) {
      console.log(JSON.stringify({
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'walk',
        ok: true,
        kind: 'higher_order_form',
        interpretationProfile: FORM_GEOMETRY_PROFILE,
        applicationProfile: FORM_MOBILITY_APPLICATION_PROFILE,
        walk: run,
      }, null, 2))
      return
    }
    console.log(`walk ${formId} label=${cli.label} completed=${run.completed}`)
    console.log(`  ${run.form.composition}`)
    console.log(`  liminal: ${run.form.liminalPath.join(' → ')}`)
    for (const s of run.steps) {
      const evidence = s.receipt
        ? ` health=${s.receipt.beforeHealth}→${s.receipt.afterHealth}` +
          ` inverse=${s.receipt.inverse.status}`
        : ''
      console.log(
        s.ok
          ? `  ✓ ${s.ruleId}: ${s.before} → ${s.after}${evidence}`
          : `  ✗ ${s.ruleId}: ${s.reason}`,
      )
    }
    console.log(`  source: ${run.source}`)
    return
  }

  failPulse(
    `unknown --geometry mode "${mode}". Use rules|hof|graph|walk|progressions`,
    cli.json,
  )
}

function runLadderMode(cli: PulseArgs): void {
  const q = cli.ladder ?? 'all'
  const resolved = resolveLadderQuery(q)

  if (!cli.json && cli.matrix && (resolved.mode === 'all' || resolved.mode === 'boundaries')) {
    console.log('# Paired boundary → axis hypotheses (selection, path, ref, label, ground, fold)')
    console.log(formatBoundaryAxisTable())
    console.log('')
  }

  if (resolved.mode === 'all') {
    if (cli.json) {
      console.log(
        JSON.stringify(
          {
            schemaVersion: SPW_PULSE_SCHEMA_VERSION,
            surface: SPW_PULSE_SURFACE,
            mode: 'ladder',
            kind: 'all',
            ok: true,
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
            axisMatrix: cli.matrix
              ? listBoundaryLadders().map(({ boundary, axes }) => ({ boundary, axes }))
              : undefined,
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
      console.log(JSON.stringify({
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'ladder',
        kind: 'boundaries',
        ok: true,
        profile: FORM_LADDER_PROFILE,
        boundaries: listBoundaryLadders(),
        axisMatrix: cli.matrix
          ? listBoundaryLadders().map(({ boundary, axes }) => ({ boundary, axes }))
          : undefined,
      }, null, 2))
      return
    }
    console.log(`# Paired-boundary ladders (${FORM_LADDER_PROFILE.status})`)
    console.log(`# included boundary kinds: ${FORM_LADDER_PROFILE.includedBoundaryKinds.join(', ')}\n`)
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
      console.log(JSON.stringify({
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'ladder',
        kind: 'operators',
        ok: true,
        profile: FORM_LADDER_PROFILE,
        operators: listOperatorLadders(),
      }, null, 2))
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
    failPulse(
      `unknown ladder "${q}". Try: frame body scope capsule stream nrange [] {} () ` +
        `or operators ${listOperatorLadders().map(l => l.operator).join(' ')} ` +
        `or all|boundaries|ops (brace is a legacy alias)`,
      cli.json,
    )
    return
  }

  const probe =
    resolved.ladder.kind === 'boundary'
      ? probeBoundaryLadder(resolved.ladder.boundary)
      : probeOperatorLadder(resolved.ladder.operator)

  if (!probe) {
    failPulse(`unable to probe ladder "${q}"`, cli.json)
    return
  }

  if (cli.json) {
    console.log(JSON.stringify({
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: SPW_PULSE_SURFACE,
      mode: 'ladder',
      kind: 'probe',
      ok: true,
      profile: FORM_LADDER_PROFILE,
      probe,
    }, null, 2))
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

async function collectSpwFiles(
  target: string,
  options: { allowMissing: boolean; includeWorkbench: boolean },
  rootRequest = true,
): Promise<string[]> {
  const absolute = path.resolve(target)
  let stats
  try {
    stats = await fs.stat(absolute)
  } catch (error) {
    const code = nodeErrorCode(error)
    if (rootRequest && options.allowMissing && (code === 'ENOENT' || code === 'ENOTDIR')) {
      return []
    }
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      throw new Error(`Pulse target is missing: ${target}`)
    }
    throw error
  }

  if (stats.isFile()) {
    return absolute.endsWith('.spw') ? [absolute] : []
  }
  if (!stats.isDirectory()) return []

  const entries = await fs.readdir(absolute, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.spw-pulse-')) &&
      !(options.includeWorkbench && entry.name === '_workbench')
    ) continue
    const entryPath = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSpwFiles(
        entryPath,
        { ...options, allowMissing: false },
        false,
      )))
    } else if (entry.isFile() && entry.name.endsWith('.spw')) {
      files.push(entryPath)
    }
  }
  return files
}

async function realPathOrResolved(target: string): Promise<string> {
  try {
    return await fs.realpath(target)
  } catch (error) {
    const code = nodeErrorCode(error)
    if (code === 'ENOENT' || code === 'ENOTDIR') return path.resolve(target)
    throw error
  }
}

function nodeErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined
}

type PulseMutationConfig = MutationAutomataConfig & {
  profile: string
  dryRun: boolean
  effectCeiling: 'S0' | 'S1'
}

function buildConfig(cli: PulseArgs): PulseMutationConfig {
  const config: PulseMutationConfig = {
    profile: cli.profile,
    dryRun: !cli.write,
    effectCeiling: cli.profile === 'measure_only' ? 'S0' : 'S1',
  }
  if (cli.profile === 'measure_only') {
    config.dryRun = true
  }
  if (cli.rules.length > 0) {
    config.enabledRules = cli.rules
  }
  return config
}

function executionEvidence(
  cli: PulseArgs,
  config: PulseMutationConfig,
): PulseExecutionEvidence {
  return {
    planEffectCeiling: config.effectCeiling === 'S0'
      ? 'effect.l0.measure'
      : 'effect.l1.memory',
    workspaceEffectCeiling: cli.write
      ? 'effect.l2.workspace'
      : null,
    crossAuthorityBoundary: 'effect.l3.external',
    writeProtocol: 'single_file_atomic_replace',
    concurrencyGuard: 'best_effort_source_recheck',
    writeCapability: 'layout_canonical_only',
    semanticEquivalence: 'not_claimed',
    semanticRiskAcknowledged: cli.acceptSemanticRisk,
    multiFileWrite: 'refused_without_transaction',
    externalWrite: 'refused_cross_authority',
    mountedInfrastructureWrite: 'refused_infrastructure_authority',
  }
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
  | 'ready'
  | 'written'
  | 'blocked_plan'
  | 'blocked_unhealthy_source'
  | 'blocked_non_layout_evidence'
  | 'blocked_health_regression'
  | 'blocked_structure_regression'
  | 'blocked_conflict'
  | 'blocked_stale_source'
  | 'blocked_batch'
  | 'blocked_io'

export function isAcceptedPulseTerminalState(stopReason: string): boolean {
  return stopReason === 'fixed_point'
}

export function decidePulseWriteStatus(input: {
  requested: boolean
  changed: boolean
  planComplete: boolean
  parseHealthy: boolean
  layoutOnlyEvidence: boolean
  healthRegressed: boolean
  structureMoved: boolean
  conflicts: number
  sourceUnchanged: boolean
}): PulseWriteStatus {
  if (!input.requested) return 'not_requested'
  if (!input.planComplete) return 'blocked_plan'
  if (input.healthRegressed) return 'blocked_health_regression'
  if (!input.parseHealthy) return 'blocked_unhealthy_source'
  if (input.structureMoved) return 'blocked_structure_regression'
  if (input.changed && !input.layoutOnlyEvidence) return 'blocked_non_layout_evidence'
  if (input.conflicts > 0) return 'blocked_conflict'
  if (!input.sourceUnchanged) return 'blocked_stale_source'
  if (!input.changed) return 'unchanged'
  return 'ready'
}

function hasLayoutOnlyEvidence(
  vector: MutationRunResult['vector'],
  plannedDelta: TopographyDelta,
  changed: boolean,
): boolean {
  return changed &&
    plannedDelta.layoutOnlyCandidate &&
    vector.layout_delta > 0 &&
    vector.token_delta === 0 &&
    vector.structure_delta === 0 &&
    vector.label_delta === 0 &&
    vector.reference_delta === 0 &&
    vector.script_delta === 0
}

export interface PulseFileReport {
  file: string
  /** @deprecated Transport compatibility alias for wouldChange. */
  changed: boolean
  wouldChange: boolean
  workspaceApplied: boolean
  stopReason: string
  planComplete: boolean
  profile: string
  sequence: string | null
  findings: string[]
  vector: MutationRunResult['vector']
  plannedDelta: TopographyDelta
  layoutOnlyEvidence: boolean
  beforeHealth: ParseHealth
  afterHealth: ParseHealth
  plannedHash: string
  inputHash: string
  matrix?: MutationMatrix
  sequenceConflicts?: number
  writeStatus: PulseWriteStatus
}

interface PlannedPulseFile {
  absolutePath: string
  original: string
  originalBytes: Buffer
  plannedSource: string
  identity: PulseFileIdentity | null
  sequenceResult: SequenceRunResult | null
  report: PulseFileReport
}

interface PulseFileIdentity {
  dev: number
  ino: number
  mode: number
}

class PulseStaleSourceError extends Error {
  constructor(file: string) {
    super(`Source changed after pulse planning: ${file}`)
    this.name = 'PulseStaleSourceError'
  }
}

async function captureFileIdentity(file: string): Promise<PulseFileIdentity> {
  const stat = await fs.lstat(file)
  if (!stat.isFile()) throw new Error('Pulse writes require a regular file')
  if (stat.nlink !== 1) throw new Error('Pulse writes refuse files with multiple hard links')
  return { dev: stat.dev, ino: stat.ino, mode: stat.mode & 0o7777 }
}

function decodeUtf8Exactly(bytes: Buffer, file: string): string {
  const source = bytes.toString('utf8')
  if (!Buffer.from(source, 'utf8').equals(bytes)) {
    throw new Error(`Pulse source must be valid UTF-8: ${file}`)
  }
  return source
}

function sameFileIdentity(left: PulseFileIdentity, right: PulseFileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode
}

async function assertWritePrecondition(
  authority: { realConsumer: string; realWorkbench: string | null },
  planned: PlannedPulseFile,
): Promise<void> {
  if (!planned.identity) throw new Error('Pulse write identity was not captured during planning')
  const [currentIdentity, currentBytes, realFile] = await Promise.all([
    captureFileIdentity(planned.absolutePath),
    fs.readFile(planned.absolutePath),
    fs.realpath(planned.absolutePath),
  ])
  if (
    !sameFileIdentity(planned.identity, currentIdentity) ||
    !currentBytes.equals(planned.originalBytes)
  ) {
    throw new PulseStaleSourceError(planned.report.file)
  }
  if (!isWithin(authority.realConsumer, realFile)) {
    throw new Error(`Pulse write authority moved outside the consumer: ${planned.report.file}`)
  }
  if (authority.realWorkbench && isWithin(authority.realWorkbench, realFile)) {
    throw new Error(`Pulse write authority moved into mounted infrastructure: ${planned.report.file}`)
  }
}

async function resolveWriteAuthority(
  workspace: Awaited<ReturnType<typeof discoverSpwWorkspace>>,
): Promise<{ realConsumer: string; realWorkbench: string | null }> {
  const [realConsumer, realWorkbench] = await Promise.all([
    fs.realpath(workspace.consumerRoot),
    workspace.mode === 'mounted-consumer'
      ? realPathOrResolved(workspace.workbenchRoot)
      : Promise.resolve(null),
  ])
  return { realConsumer, realWorkbench }
}

async function replaceFileAtomically(
  workspace: Awaited<ReturnType<typeof discoverSpwWorkspace>>,
  planned: PlannedPulseFile,
): Promise<{ cleanupWarnings: string[] }> {
  if (!planned.identity) throw new Error('Pulse write identity was not captured during planning')
  const authority = await resolveWriteAuthority(workspace)
  const tempDirectory = await fs.mkdtemp(path.join(path.dirname(planned.absolutePath), '.spw-pulse-'))
  const tempFile = path.join(tempDirectory, `${path.basename(planned.absolutePath)}.staged`)
  let handle: Awaited<ReturnType<typeof fs.open>> | null = null
  let failure: unknown = null
  const cleanupWarnings: string[] = []
  try {
    handle = await fs.open(tempFile, 'wx', planned.identity.mode)
    await handle.writeFile(planned.plannedSource, 'utf8')
    await handle.chmod(planned.identity.mode)
    await handle.sync()
    await handle.close()
    handle = null

    const stagedBytes = await fs.readFile(tempFile)
    const expectedBytes = Buffer.from(planned.plannedSource, 'utf8')
    if (!stagedBytes.equals(expectedBytes)) {
      throw new Error(`Staged pulse bytes changed before replacement: ${planned.report.file}`)
    }
    // Keep the consumer source check as the final awaited operation before
    // the atomic pathname swap. This is a best-effort compare-and-swap guard.
    await assertWritePrecondition(authority, planned)
    await fs.rename(tempFile, planned.absolutePath)
  } catch (error) {
    failure = error
  } finally {
    if (handle) {
      try {
        await handle.close()
      } catch (error) {
        cleanupWarnings.push(`close staged file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    try {
      await fs.unlink(tempFile)
    } catch (error) {
      if (nodeErrorCode(error) !== 'ENOENT') {
        cleanupWarnings.push(`unlink staged file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    try {
      await fs.rmdir(tempDirectory)
    } catch (error) {
      if (nodeErrorCode(error) !== 'ENOENT') {
        cleanupWarnings.push(`remove staging directory: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  if (failure !== null) {
    const error = failure instanceof Error ? failure : new Error(String(failure))
    Object.assign(error, { cleanupWarnings })
    throw error
  }
  return { cleanupWarnings }
}

function cleanupWarningsFrom(error: unknown): string[] {
  if (
    typeof error === 'object' &&
    error !== null &&
    'cleanupWarnings' in error &&
    Array.isArray(error.cleanupWarnings)
  ) {
    return error.cleanupWarnings.filter((warning): warning is string => typeof warning === 'string')
  }
  return []
}

export interface SpwPulseRunOptions {
  /** Discovery start without mutating process.cwd(); useful to editors and tests. */
  cwd?: string
}

export async function runSpwPulseCli(
  argv: string[] = process.argv,
  options: SpwPulseRunOptions = {},
): Promise<void> {
  let cli: PulseArgs
  try {
    cli = parseArgs(argv)
  } catch (error) {
    failPulse(
      error instanceof Error ? error.message : String(error),
      argv.slice(2).includes('--json'),
    )
    return
  }
  if (cli.help) {
    printSpwPulseHelp()
    return
  }

  const validationErrors = validatePulseArgs(cli)
  if (validationErrors.length > 0) {
    failPulse(validationErrors, cli.json)
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

  const config = buildConfig(cli)
  if (!cli.sequence && resolveMutationRules(config).length === 0) {
    failPulse(
      `profile ${cli.profile} and the requested rule restriction resolve to an empty pipeline`,
      cli.json,
    )
    return
  }
  const seqCtx = mutationRulesAsSequenceContext(config)

  let workspace: Awaited<ReturnType<typeof discoverSpwWorkspace>>
  let resolvedTargets: Array<{ selector: string; path: string; optional: boolean }>
  try {
    workspace = await discoverSpwWorkspace(options.cwd ?? process.cwd())
    const explicitTargets = new Set(cli.explicitTargets)
    const workbenchBoundary = workspace.mode === 'mounted-consumer'
      ? await realPathOrResolved(workspace.workbenchRoot)
      : null
    resolvedTargets = await Promise.all(cli.targets.map(async selector => {
      const declaredRoot = findWorkspaceRoot(workspace, selector)
      const target = await resolveWorkspacePath(workspace, selector)
      const targetBoundary = await realPathOrResolved(target)
      const infrastructure = workbenchBoundary !== null &&
        (declaredRoot?.role === 'infrastructure' || isWithin(workbenchBoundary, targetBoundary))

      if (infrastructure && !cli.includeWorkbench) {
        throw new Error(
          `Pulse target is mounted infrastructure; pass --include-workbench for plan-only inspection: ${selector}`,
        )
      }
      if (cli.write && infrastructure) {
        throw new Error(`Mounted-infrastructure writes cross authority and are not supported: ${selector}`)
      }
      if (cli.write && declaredRoot?.role === 'external') {
        throw new Error(`External-root writes cross authority and are not supported: ${selector}`)
      }

      return { selector, path: target, optional: !explicitTargets.has(selector) }
    }))
  } catch (error) {
    failPulse(error instanceof Error ? error.message : String(error), cli.json)
    return
  }

  const filesByIdentity = new Map<string, string>()
  try {
    for (const target of resolvedTargets) {
      const targetFiles = await collectSpwFiles(target.path, {
        allowMissing: target.optional,
        includeWorkbench: cli.includeWorkbench,
      })
      if (!target.optional && targetFiles.length === 0) {
        throw new Error(`Explicit target contains no .spw files: ${target.selector}`)
      }
      for (const file of targetFiles) {
        const identity = await fs.realpath(file)
        if (!filesByIdentity.has(identity)) filesByIdentity.set(identity, file)
      }
    }
  } catch (error) {
    failPulse(error instanceof Error ? error.message : String(error), cli.json)
    return
  }
  const files = Array.from(filesByIdentity.values()).sort()
  if (files.length === 0) {
    if (cli.json) {
      const envelope = {
        schemaVersion: SPW_PULSE_SCHEMA_VERSION,
        surface: SPW_PULSE_SURFACE,
        mode: 'mutation',
        ok: true,
        errors: [],
        warnings: [],
        workspace: {
          mode: workspace.mode,
          rootSource: workspace.rootSource,
          consumerRoot: '.' as const,
        },
        execution: executionEvidence(cli, config),
        targetSelectors: cli.targets,
        profile: config.profile,
        sequence: cli.sequence,
        write: cli.write,
        files: 0,
        wouldChange: 0,
        wrote: 0,
        blockedWrites: 0,
        planFailures: 0,
        healthRegressions: 0,
        structureMoves: 0,
        reports: [],
      } satisfies PulseMutationEnvelope
      console.log(JSON.stringify(envelope, null, 2))
    } else {
      console.log('spw-pulse: no .spw files found.')
    }
    return
  }

  const plannedFiles: PlannedPulseFile[] = []
  let wouldChange = 0
  let planFailures = 0
  let healthRegressions = 0
  let structureMoves = 0

  try {
    for (const file of files) {
      const rel = relativeToConsumer(workspace, file)
      const [originalBytes, identity] = await Promise.all([
        fs.readFile(file),
        cli.write ? captureFileIdentity(file) : Promise.resolve(null),
      ])
      const original = decodeUtf8Exactly(originalBytes, rel)

      let plannedSource: string
      let plannedHash: string
      let inputHash: string
      let vector: MutationRunResult['vector']
      let stopReason: string
      let planComplete: boolean
      let profileLabel: string
      let matrix: MutationMatrix | undefined
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
        planComplete = sequenceConflicts === 0
        if (cli.matrix || cli.json) {
          matrix = seqResult.matrix
        }
      } else {
        const planned = runMutationAutomata(original, config)
        plannedSource = planned.plannedSource
        plannedHash = planned.plannedOutputHash
        inputHash = planned.inputHash
        vector = planned.vector
        stopReason = planned.stopReason
        planComplete = isAcceptedPulseTerminalState(planned.stopReason)
        profileLabel = planned.profile
        if (cli.matrix || cli.json) {
          matrix = {
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
          }
        }
      }

      const beforeTopo = snapshotTopography(original)
      const afterTopo = snapshotTopography(plannedSource)
      const plannedDelta: TopographyDelta = topographyDelta(beforeTopo, afterTopo)
      const changed = plannedSource !== original
      const layoutOnlyEvidence = hasLayoutOnlyEvidence(vector, plannedDelta, changed)
      const parseHealthy =
        beforeTopo.parseHealth === 'complete_structured' &&
        afterTopo.parseHealth === 'complete_structured'
      const findings = [
        `phase=planning stop=${stopReason} profile=${profileLabel} planComplete=${planComplete}` +
          ` plan.workspaceApplied=false wouldChange=${changed}`,
        `vector edits=${vector.edit_count} layout=${vector.layout_delta} script=${vector.script_delta} bytes=${vector.bytes_delta}`,
        `topo health ${plannedDelta.parseHealthBefore} → ${plannedDelta.parseHealthAfter}` +
          (plannedDelta.healthRegressed
            ? ' (REGRESSED)'
            : plannedDelta.parseHealthChanged ? ' (changed)' : ' (stable)'),
        layoutOnlyEvidence
          ? 'layout-only evidence: topography stable and non-layout mutation axes are zero'
          : plannedDelta.layoutOnlyCandidate
            ? 'topography-stable candidate: semantic equivalence is not established'
            : plannedDelta.structureMoved
              ? `topo structure moved: astDepthΔ=${plannedDelta.maxAstDepthDelta ?? 'n/a'}`
              : 'topo structure stable',
      ]

      if (changed) wouldChange += 1
      if (!planComplete) planFailures += 1
      if (plannedDelta.healthRegressed) healthRegressions += 1
      if (plannedDelta.structureMoved) structureMoves += 1

      const writeStatus = decidePulseWriteStatus({
        requested: cli.write,
        changed,
        planComplete,
        parseHealthy,
        layoutOnlyEvidence,
        healthRegressed: plannedDelta.healthRegressed,
        structureMoved: plannedDelta.structureMoved,
        conflicts: sequenceConflicts,
        sourceUnchanged: true,
      })

      plannedFiles.push({
        absolutePath: file,
        original,
        originalBytes,
        plannedSource,
        identity,
        sequenceResult: seqResult,
        report: {
          file: rel,
          changed,
          wouldChange: changed,
          workspaceApplied: false,
          stopReason,
          planComplete,
          profile: profileLabel,
          sequence: cli.sequence,
          findings,
          vector,
          plannedDelta,
          layoutOnlyEvidence,
          beforeHealth: beforeTopo.parseHealth,
          afterHealth: afterTopo.parseHealth,
          plannedHash,
          inputHash,
          matrix,
          sequenceConflicts,
          writeStatus,
        },
      })
    }
  } catch (error) {
    failPulse(error instanceof Error ? error.message : String(error), cli.json)
    return
  }

  let wrote = 0
  const writeErrors: string[] = []
  const writeWarnings: string[] = []
  const changedFiles = plannedFiles.filter(({ report }) => report.wouldChange)
  const blockedPreflightFiles = plannedFiles.filter(({ report }) =>
    report.writeStatus.startsWith('blocked_'))
  if (cli.write) {
    if (blockedPreflightFiles.length > 0) {
      for (const planned of changedFiles) {
        if (planned.report.writeStatus === 'ready') {
          planned.report.writeStatus = 'blocked_batch'
        }
      }
      writeErrors.push(
        `batch preflight blocked by ${blockedPreflightFiles.length} unsafe file plan(s)`,
      )
    } else if (changedFiles.length > 1) {
      for (const planned of changedFiles) {
        if (planned.report.writeStatus === 'ready') {
          planned.report.writeStatus = 'blocked_batch'
        }
      }
      writeErrors.push(
        'multi-file writes are disabled until a recoverable transaction protocol exists',
      )
    } else if (changedFiles.length === 1) {
      const [planned] = changedFiles
      if (planned.report.writeStatus === 'ready') {
        try {
          const result = await replaceFileAtomically(workspace, planned)
          writeWarnings.push(...result.cleanupWarnings)
          planned.report.writeStatus = 'written'
          planned.report.workspaceApplied = true
          wrote = 1
        } catch (error) {
          writeWarnings.push(...cleanupWarningsFrom(error))
          if (error instanceof PulseStaleSourceError) {
            planned.report.writeStatus = 'blocked_stale_source'
          } else {
            planned.report.writeStatus = 'blocked_io'
          }
          writeErrors.push(error instanceof Error ? error.message : String(error))
        }
      } else {
        writeErrors.push(
          `write preflight blocked ${planned.report.file}: ${planned.report.writeStatus}`,
        )
      }
    }
  }

  const reports = plannedFiles.map(({ report }) => report)
  const blockedWrites = cli.write
    ? reports.filter(report => report.writeStatus.startsWith('blocked_')).length
    : 0
  const outcomeErrors = [...writeErrors]
  if (planFailures > 0) {
    outcomeErrors.push(`${planFailures} file plan(s) did not reach an accepted terminal state`)
  }
  if (cli.check && wouldChange > 0) {
    const label = cli.sequence ? `sequence ${cli.sequence}` : `profile ${cli.profile}`
    outcomeErrors.push(`${wouldChange} file(s) would change under ${label}`)
  }
  if (cli.write && blockedWrites > 0 && writeErrors.length === 0) {
    outcomeErrors.push(`refused ${blockedWrites} write(s); inspect writeStatus and planned deltas`)
  }

  if (!cli.json) {
    for (const planned of plannedFiles) {
      const { report } = planned
      if (!report.wouldChange && !report.writeStatus.startsWith('blocked_')) continue

      const tag = report.writeStatus === 'written'
        ? 'pulsed'
        : cli.write ? 'blocked-write' : 'would-pulse'
      console.log(
        `${tag}: ${report.file}  health=${report.beforeHealth}→${report.afterHealth}` +
          `  edits=${report.vector.edit_count}  bytesΔ=${report.vector.bytes_delta}` +
          (cli.sequence ? `  seq=${cli.sequence}` : '') +
          (report.layoutOnlyEvidence
            ? '  [layout-evidence]'
            : report.plannedDelta.layoutOnlyCandidate ? '  [topography-stable?]' : '') +
          (report.plannedDelta.structureMoved ? '  [structure]' : '') +
          (report.plannedDelta.healthRegressed ? '  [HEALTH REGRESS]' : '') +
          ((report.sequenceConflicts ?? 0) > 0
            ? `  [OT conflicts=${report.sequenceConflicts}]`
            : '') +
          (cli.write ? `  [${report.writeStatus}]` : ''),
      )
      for (const line of report.findings.slice(0, 4)) {
        console.log(`  · ${line}`)
      }
      if (planned.sequenceResult) {
        for (const step of planned.sequenceResult.steps) {
          if (!step.differential.identity) {
            console.log(
              `  → ${step.id}: edits=${step.differential.edits.length} bytesΔ=${step.differential.vector.bytes_delta}`,
            )
          }
        }
      }
      if (cli.matrix && report.matrix) {
        console.log(formatMatrix(report.matrix))
      }
      if (cli.unified) {
        console.log(formatUnified(report.file, planned.original, planned.plannedSource))
      }
    }
  }

  if (!cli.json) {
    for (const warning of writeWarnings) console.error(`spw-pulse warning: ${warning}`)
  }

  if (cli.json) {
    const envelope = {
      schemaVersion: SPW_PULSE_SCHEMA_VERSION,
      surface: SPW_PULSE_SURFACE,
      mode: 'mutation',
      ok: outcomeErrors.length === 0,
      errors: outcomeErrors,
      warnings: writeWarnings,
      workspace: {
        mode: workspace.mode,
        rootSource: workspace.rootSource,
        consumerRoot: '.' as const,
      },
      execution: executionEvidence(cli, config),
      targetSelectors: cli.targets,
      profile: config.profile,
      sequence: cli.sequence,
      write: cli.write,
      files: reports.length,
      wouldChange,
      wrote,
      blockedWrites,
      planFailures,
      healthRegressions,
      structureMoves,
      reports,
    } satisfies PulseMutationEnvelope
    console.log(JSON.stringify(envelope, null, 2))
  } else {
    console.log(
      `spw-pulse: files=${files.length} would-change=${wouldChange}` +
        (cli.write ? ` wrote=${wrote}` : ' (dry-run)') +
        (cli.write ? ` blocked-writes=${blockedWrites}` : '') +
        ` health-regressions=${healthRegressions} structure-moves=${structureMoves}` +
        ` plan-failures=${planFailures}` +
        (cli.sequence ? ` sequence=${cli.sequence}` : ` profile=${cli.profile}`),
    )
  }

  if (outcomeErrors.length > 0) {
    if (!cli.json) {
      for (const error of outcomeErrors) console.error(`spw-pulse: ${error}.`)
    }
    process.exitCode = 1
  }
}

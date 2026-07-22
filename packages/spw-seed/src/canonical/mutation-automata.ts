/**
 * Configurable operational mutation automata.
 *
 * Scripts and layout rewrites plan **differentials** (ordered SourceEdit[]),
 * then optionally apply in memory (S1) or under external write authority (S2).
 * The automaton iterates until a fixed point or a named stop reason.
 *
 * @see docs/theory/spw/operational-topography.spw — indentation_pulse, mutation_profile
 * @see docs/theory/spw/mutation-automata.spw
 */

import { canonicalize, hashString, type CanonicalOptions } from './canonicalize'
import {
  applyEdits,
  differentialFromSources,
  effectGradeAtMost,
  mergeVectors,
  zeroVector,
  type DifferentialStratum,
  type EffectGrade,
  type MutationVector,
  type SourceDifferential,
  type SourceEdit,
} from './differential'

// ── Stop reasons (topography pulse_stop) ───────────────────────

export type MutationStopReason =
  | 'fixed_point'
  | 'idempotence_failure'
  | 'budget_exhausted'
  | 'authority_failure'
  | 'conflict'
  | 'cancellation'
  | 'rule_error'

// ── Rules ──────────────────────────────────────────────────────

export interface MutationRule {
  id: string
  description: string
  stratum: DifferentialStratum
  /** Minimum effect grade to *apply* this rule to workspace (plan is always S0/S1) */
  effectGrade: EffectGrade
  /** Pure transform: source → source */
  transform: (source: string, ctx: MutationContext) => string
}

export interface MutationContext {
  step: number
  options: CanonicalOptions
  /** Extra free-form config bag for custom rules */
  params: Record<string, unknown>
}

export interface MutationAutomataConfig {
  /**
   * Named profile: layout_canonical | layout_full | equiv_scripts | measure_only
   * Combined with enabledRules / disabledRules.
   */
  profile?: MutationProfileId | string
  /** Enable only these rule ids (intersect with profile when both set) */
  enabledRules?: string[]
  /** Disable rule ids after profile resolution */
  disabledRules?: string[]
  /** Max automaton steps (each step may run multiple rules in order) */
  maxSteps?: number
  /**
   * After one full pipeline pass, require a second pass to be identity
   * (idempotence check). Default true for layout profiles.
   */
  requireIdempotence?: boolean
  /**
   * Maximum effect grade allowed for application.
   * Planning always runs; apply is skipped when dryRun or ceiling is S0.
   * Default S1 (in-memory only).
   */
  effectCeiling?: EffectGrade
  /**
   * When true, plan differentials but never rewrite the returned source
   * (S0 measure). When false and ceiling ≥ S1, apply in memory.
   */
  dryRun?: boolean
  /** Options forwarded to canonicalize-based rules */
  canonicalOptions?: Partial<CanonicalOptions>
  /** Extra rules registered for this run */
  customRules?: MutationRule[]
  /** Free-form params for custom rules */
  params?: Record<string, unknown>
}

export type MutationProfileId =
  | 'layout_canonical'
  | 'layout_full'
  | 'equiv_scripts'
  | 'measure_only'

export interface MutationStep {
  step: number
  ruleId: string
  differential: SourceDifferential
  applied: boolean
  skippedReason?: string
}

export interface MutationRunResult {
  /** Source after in-memory apply (equals input when dryRun or no edits) */
  source: string
  /** Virtual fixed-point source produced by the plan, whether or not it applied. */
  plannedSource: string
  inputHash: string
  outputHash: string
  plannedOutputHash: string
  changed: boolean
  wouldChange: boolean
  /** One coordinate-stable differential from input to plannedSource. */
  plannedDifferential: SourceDifferential
  stopReason: MutationStopReason
  steps: MutationStep[]
  vector: MutationVector
  profile: string
  /** Resolved profile rules before authority evaluation. */
  rulesResolved: string[]
  /** Rules evaluated to produce the plan. */
  rulesPlanned: string[]
  /** Rules that produced at least one applied, non-identity step. */
  rulesApplied: string[]
  /** Rules preventing atomic application under the requested ceiling. */
  rulesBlocked: Array<{ ruleId: string; effectGrade: EffectGrade }>
  /** @deprecated Use rulesPlanned; retained for transport compatibility. */
  rulesRun: string[]
  effectCeiling: EffectGrade
  dryRun: boolean
  /** True when output would require S2 workspace write to persist */
  requiresWriteAuthority: boolean
}

// ── Built-in rule catalog ──────────────────────────────────────

const DEFAULT_CANONICAL: CanonicalOptions = {
  normalizeNewlines: true,
  trimTrailingWhitespace: true,
  ensureFinalNewline: true,
  collapseBlankLines: false,
  indentBraces: false,
  indentSize: 2,
  alignComments: false,
  commentColumn: 40,
  blankLineBetweenFrames: false,
}

function canonSlice(
  source: string,
  ctx: MutationContext,
  slice: Partial<CanonicalOptions>,
): string {
  return canonicalize(source, { ...ctx.options, ...slice }).source
}

/** Equiv script rewrites (from CLI format --mode equiv). */
export function applyEquivScriptTransforms(source: string): {
  source: string
  counts: { seqAliasToLs: number; dotPostfixNormalized: number; wildcardExpanded: number }
} {
  const counts = { seqAliasToLs: 0, dotPostfixNormalized: 0, wildcardExpanded: 0 }
  let next = source

  next = next.replace(/npm run spw:seq --/g, () => {
    counts.seqAliasToLs += 1
    return 'npm run spw:ls --'
  })

  next = next.replace(/\.\*/g, () => {
    counts.wildcardExpanded += 1
    return '*()'
  })

  next = next.replace(/\.([!?~@&*=%#$^_])/g, (_match, token: string) => {
    counts.dotPostfixNormalized += 1
    return token
  })

  return { source: next, counts }
}

export const BUILTIN_MUTATION_RULES: readonly MutationRule[] = [
  {
    id: 'normalize_newlines',
    description: 'Normalize CRLF/CR to LF',
    stratum: 'source',
    effectGrade: 'S1',
    transform: (s, ctx) =>
      canonSlice(s, ctx, {
        normalizeNewlines: true,
        trimTrailingWhitespace: false,
        ensureFinalNewline: false,
        collapseBlankLines: false,
        indentBraces: false,
        alignComments: false,
        blankLineBetweenFrames: false,
      }),
  },
  {
    id: 'trim_trailing_whitespace',
    description: 'Strip trailing whitespace per line',
    stratum: 'layout',
    effectGrade: 'S1',
    transform: (s, ctx) =>
      canonSlice(s, ctx, {
        normalizeNewlines: false,
        trimTrailingWhitespace: true,
        ensureFinalNewline: false,
        collapseBlankLines: false,
        indentBraces: false,
        alignComments: false,
        blankLineBetweenFrames: false,
      }),
  },
  {
    id: 'ensure_final_newline',
    description: 'Ensure file ends with a single newline',
    stratum: 'layout',
    effectGrade: 'S1',
    transform: (s, ctx) =>
      canonSlice(s, ctx, {
        normalizeNewlines: false,
        trimTrailingWhitespace: false,
        ensureFinalNewline: true,
        collapseBlankLines: false,
        indentBraces: false,
        alignComments: false,
        blankLineBetweenFrames: false,
      }),
  },
  {
    id: 'collapse_blank_lines',
    description: 'Collapse runs of blank lines to at most one',
    stratum: 'layout',
    effectGrade: 'S1',
    transform: (s, ctx) =>
      canonSlice(s, ctx, {
        normalizeNewlines: false,
        trimTrailingWhitespace: false,
        ensureFinalNewline: false,
        collapseBlankLines: true,
        indentBraces: false,
        alignComments: false,
        blankLineBetweenFrames: false,
      }),
  },
  {
    id: 'indent_braces',
    description: 'Indent by brace/bracket depth',
    stratum: 'layout',
    effectGrade: 'S1',
    transform: (s, ctx) =>
      canonSlice(s, ctx, {
        normalizeNewlines: true,
        trimTrailingWhitespace: true,
        ensureFinalNewline: false,
        collapseBlankLines: false,
        indentBraces: true,
        alignComments: false,
        blankLineBetweenFrames: false,
      }),
  },
  {
    id: 'align_comments',
    description: 'Align trailing # comments within blocks',
    stratum: 'layout',
    effectGrade: 'S1',
    transform: (s, ctx) =>
      canonSlice(s, ctx, {
        normalizeNewlines: false,
        trimTrailingWhitespace: false,
        ensureFinalNewline: false,
        collapseBlankLines: false,
        indentBraces: false,
        alignComments: true,
        blankLineBetweenFrames: false,
      }),
  },
  {
    id: 'blank_line_between_frames',
    description: 'Exactly one blank line between top-level ^ frames',
    stratum: 'layout',
    effectGrade: 'S1',
    transform: (s, ctx) =>
      canonSlice(s, ctx, {
        normalizeNewlines: false,
        trimTrailingWhitespace: false,
        ensureFinalNewline: false,
        collapseBlankLines: false,
        indentBraces: false,
        alignComments: false,
        blankLineBetweenFrames: true,
      }),
  },
  {
    id: 'equiv_seq_alias',
    description: 'Rewrite npm run spw:seq -- → spw:ls --',
    stratum: 'script',
    effectGrade: 'S1',
    transform: s => s.replace(/npm run spw:seq --/g, 'npm run spw:ls --'),
  },
  {
    id: 'equiv_wildcard',
    description: 'Rewrite .* → *()',
    stratum: 'script',
    effectGrade: 'S1',
    transform: s => s.replace(/\.\*/g, '*()'),
  },
  {
    id: 'equiv_dot_postfix',
    description: 'Normalize .! / .? style postfix sugar to bare sigil',
    stratum: 'script',
    effectGrade: 'S1',
    transform: s => s.replace(/\.([!?~@&*=%#$^_])/g, '$1'),
  },
  {
    id: 'layout_bundle',
    description: 'Single-pass canonical layout bundle (newlines + trim + final nl)',
    stratum: 'layout',
    effectGrade: 'S1',
    transform: (s, ctx) =>
      canonicalize(s, {
        ...ctx.options,
        normalizeNewlines: true,
        trimTrailingWhitespace: true,
        ensureFinalNewline: true,
      }).source,
  },
]

const RULE_BY_ID = new Map(BUILTIN_MUTATION_RULES.map(r => [r.id, r]))

export const MUTATION_PROFILES: Record<
  MutationProfileId,
  { rules: string[]; effectCeiling: EffectGrade; dryRun?: boolean; requireIdempotence?: boolean }
> = {
  layout_canonical: {
    rules: ['layout_bundle'],
    effectCeiling: 'S1',
    requireIdempotence: true,
  },
  layout_full: {
    rules: [
      'normalize_newlines',
      'trim_trailing_whitespace',
      'indent_braces',
      'align_comments',
      'blank_line_between_frames',
      'collapse_blank_lines',
      'ensure_final_newline',
    ],
    effectCeiling: 'S1',
    requireIdempotence: true,
  },
  equiv_scripts: {
    rules: [
      'equiv_seq_alias',
      'equiv_wildcard',
      'equiv_dot_postfix',
      'layout_bundle',
    ],
    effectCeiling: 'S1',
    requireIdempotence: true,
  },
  measure_only: {
    rules: ['layout_bundle'],
    effectCeiling: 'S0',
    dryRun: true,
    requireIdempotence: false,
  },
}

// ── Resolution ─────────────────────────────────────────────────

export function resolveMutationRules(config: MutationAutomataConfig = {}): MutationRule[] {
  const catalog = new Map(RULE_BY_ID)
  for (const custom of config.customRules ?? []) {
    catalog.set(custom.id, custom)
  }

  let ids: string[]
  if (config.profile && Object.hasOwn(MUTATION_PROFILES, config.profile)) {
    ids = [...MUTATION_PROFILES[config.profile as MutationProfileId].rules]
  } else if (config.enabledRules?.length) {
    ids = [...config.enabledRules]
  } else {
    ids = [...MUTATION_PROFILES.layout_canonical.rules]
  }

  if (config.enabledRules?.length && config.profile) {
    const allow = new Set(config.enabledRules)
    ids = ids.filter(id => allow.has(id))
  }

  if (config.disabledRules?.length) {
    const deny = new Set(config.disabledRules)
    ids = ids.filter(id => !deny.has(id))
  }

  // Append custom-only ids not already in list
  for (const custom of config.customRules ?? []) {
    if (!ids.includes(custom.id)) ids.push(custom.id)
  }

  const rules: MutationRule[] = []
  for (const id of ids) {
    const rule = catalog.get(id)
    if (rule) rules.push(rule)
  }
  return rules
}

// ── Plan + run ─────────────────────────────────────────────────

/**
 * Plan a single rule differential without applying.
 */
export function planRuleDifferential(
  source: string,
  rule: MutationRule,
  ctx: MutationContext,
): SourceDifferential {
  const after = rule.transform(source, ctx)
  return differentialFromSources(source, after, rule.id, rule.stratum, hashString)
}

/**
 * Plan one pipeline pass: sequential rules, each planned against the
 * post-apply virtual source of the previous rule (compose transforms).
 * Returns composed edits relative to the original source when possible;
 * for multi-rule passes we re-diff original → final for a single compact plan.
 */
export function planMutationPass(
  source: string,
  rules: readonly MutationRule[],
  ctx: MutationContext,
): {
  intermediate: MutationStep[]
  finalSource: string
  composed: SourceDifferential
  vector: MutationVector
} {
  let current = source
  const intermediate: MutationStep[] = []
  let vector = zeroVector()

  for (const rule of rules) {
    const diff = planRuleDifferential(current, rule, ctx)
    intermediate.push({
      step: ctx.step,
      ruleId: rule.id,
      differential: diff,
      applied: false,
    })
    if (!diff.identity) {
      current = applyEdits(current, diff.edits)
      vector = mergeVectors(vector, diff.vector)
    }
  }

  const composed = differentialFromSources(
    source,
    current,
    'pipeline_pass',
    'operation',
    hashString,
  )

  return { intermediate, finalSource: current, composed, vector }
}

/**
 * Run the mutation automaton to a fixed point or stop reason.
 *
 * - dryRun / effectCeiling S0: plan only; returned source equals input
 * - effectCeiling ≥ S1: apply in memory (S1)
 * - requiresWriteAuthority: true when changed and caller must persist (S2)
 */
export function runMutationAutomata(
  source: string,
  config: MutationAutomataConfig = {},
): MutationRunResult {
  const profileId =
    Object.hasOwn(MUTATION_PROFILES, config.profile as PropertyKey)
      ? (config.profile as MutationProfileId)
      : config.profile
        ? String(config.profile)
        : 'layout_canonical'

  const profileDefaults =
    Object.hasOwn(MUTATION_PROFILES, profileId)
      ? MUTATION_PROFILES[profileId as MutationProfileId]
      : MUTATION_PROFILES.layout_canonical

  const effectCeiling = config.effectCeiling ?? profileDefaults.effectCeiling ?? 'S1'
  const dryRun = config.dryRun ?? profileDefaults.dryRun ?? false
  const maxSteps = config.maxSteps ?? 8
  const requireIdempotence = config.requireIdempotence ?? profileDefaults.requireIdempotence ?? true

  const rules = resolveMutationRules({
    ...config,
    profile: Object.hasOwn(MUTATION_PROFILES, profileId) ? profileId : config.profile,
  })

  const options: CanonicalOptions = {
    ...DEFAULT_CANONICAL,
    ...config.canonicalOptions,
  }

  const inputHash = hashString(source)
  const steps: MutationStep[] = []
  let current = source
  let plannedSource = source
  let vector = zeroVector()
  let stopReason: MutationStopReason = 'fixed_point'
  const rulesResolved = rules.map(rule => rule.id)
  const planOnly = dryRun || effectCeiling === 'S0'
  const blockedRules = planOnly
    ? []
    : rules.filter(rule => !effectGradeAtMost(rule.effectGrade, effectCeiling))
  const canApply = !planOnly && blockedRules.length === 0
  const blockedReason = blockedRules.length > 0
    ? `atomic profile blocked by ${blockedRules.map(rule => `${rule.id}:${rule.effectGrade}`).join(',')}`
    : undefined

  try {
    for (let step = 0; step < maxSteps; step++) {
      const ctx: MutationContext = {
        step,
        options,
        params: config.params ?? {},
      }

      const pass = planMutationPass(current, rules, ctx)
      plannedSource = pass.finalSource
      for (const s of pass.intermediate) {
        const changedStep = !s.differential.identity
        steps.push({
          ...s,
          applied: canApply && changedStep,
          ...(!canApply && changedStep
            ? { skippedReason: blockedReason ?? 'plan_only' }
            : {}),
        })
      }
      vector = mergeVectors(vector, pass.vector)

      if (pass.finalSource === current) {
        stopReason = blockedRules.length > 0 ? 'authority_failure' : 'fixed_point'
        break
      }

      if (!canApply && !planOnly) {
        stopReason = 'authority_failure'
        break
      }

      // Plan-only runs advance a virtual source to the same fixed point as an
      // in-memory run while retaining the original returned `source` and
      // marking every step unapplied.
      current = pass.finalSource

      if (requireIdempotence) {
        const check = planMutationPass(current, rules, {
          ...ctx,
          step: step + 1,
        })
        if (check.finalSource !== current) {
          // Not yet idempotent — continue loop
          if (step + 1 >= maxSteps) {
            stopReason = 'idempotence_failure'
          }
          continue
        }
        stopReason = 'fixed_point'
        break
      }

      if (step + 1 >= maxSteps) {
        stopReason = 'budget_exhausted'
      }
    }

    if (steps.length > 0 && stopReason === 'fixed_point') {
      const lastChanged = steps.some(s => !s.differential.identity)
      if (!lastChanged && current === source) {
        stopReason = 'fixed_point'
      }
    }
  } catch {
    stopReason = 'rule_error'
  }

  const resultSource = canApply ? current : source
  const plannedDifferential = differentialFromSources(
    source,
    plannedSource,
    'mutation_run',
    'operation',
    hashString,
  )
  const rulesApplied = [...new Set(
    steps.filter(step => step.applied).map(step => step.ruleId),
  )]

  return {
    source: resultSource,
    plannedSource,
    inputHash,
    outputHash: hashString(resultSource),
    plannedOutputHash: hashString(plannedSource),
    changed: resultSource !== source,
    wouldChange: plannedSource !== source,
    plannedDifferential,
    stopReason,
    steps,
    vector,
    profile: String(profileId),
    rulesResolved,
    rulesPlanned: rulesResolved,
    rulesApplied,
    rulesBlocked: blockedRules.map(rule => ({
      ruleId: rule.id,
      effectGrade: rule.effectGrade,
    })),
    rulesRun: rulesResolved,
    effectCeiling,
    dryRun: planOnly,
    requiresWriteAuthority: plannedSource !== source,
  }
}

/**
 * Plan-only convenience: same as measure_only profile / dryRun.
 */
export function planMutation(
  source: string,
  config: MutationAutomataConfig = {},
): MutationRunResult {
  return runMutationAutomata(source, {
    ...config,
    dryRun: true,
    effectCeiling: config.effectCeiling ?? 'S0',
  })
}

/**
 * Collect all non-identity edits from a run (for LSP TextEdit mapping).
 */
export function collectPlannedEdits(result: MutationRunResult): SourceEdit[] {
  return result.plannedDifferential.edits.map(edit => ({ ...edit }))
}

export { applyEdits, differentialFromSources }
export type { SourceEdit, SourceDifferential, MutationVector, DifferentialStratum, EffectGrade }

/**
 * Build operational-sequence context from builtin (+ optional custom) rules.
 * Used by runOperationalSequence / pulse --sequence.
 */
export function mutationRulesAsSequenceContext(
  config: MutationAutomataConfig = {},
): { rules: Map<string, (source: string) => string> } {
  const options: CanonicalOptions = {
    ...DEFAULT_CANONICAL,
    ...config.canonicalOptions,
  }
  const ctx: MutationContext = {
    step: 0,
    options,
    params: config.params ?? {},
  }
  const rules = new Map<string, (source: string) => string>()
  for (const rule of BUILTIN_MUTATION_RULES) {
    rules.set(rule.id, (source: string) => rule.transform(source, ctx))
  }
  for (const rule of config.customRules ?? []) {
    rules.set(rule.id, (source: string) => rule.transform(source, ctx))
  }
  return { rules }
}

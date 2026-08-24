/**
 * Versioned corpus-refactor plan card.
 *
 * This is the reviewable product hosts already open. Selection hashes,
 * parent plans, worktree apply, and rebase remain named omissions until that
 * lifecycle lands — they are not silently implied by JSON.
 */

import type { EffectGrade } from '../canonical/differential'
import type { SemanticEdit } from '../canonical/semantic-edit'

export const REFACTOR_PLAN_SURFACE = 'spw.refactor.plan/1' as const

export const REFACTOR_PLAN_OMISSIONS = [
  'selection_hashes',
  'parent_plan',
  'worktree_apply',
  'rebase',
] as const

export type RefactorPlanMode = 'plan' | 'write'
export type RefactorRenameKind = 'mark' | 'anchor' | 'case' | 'mood'

export interface RefactorPlanRuleCard {
  id: string
  description: string
  effectGrade: EffectGrade
}

export interface RefactorPlanFileCard {
  file: string
  edits: SemanticEdit[]
  conflicts: number
  withheld: number
  wrote: boolean
}

export interface RefactorPlanCard {
  surface: typeof REFACTOR_PLAN_SURFACE
  mode: RefactorPlanMode
  effect: EffectGrade
  write: boolean
  rules: RefactorPlanRuleCard[]
  files: number
  totalEdits: number
  totalConflicts: number
  omitted: readonly string[]
  next: string[]
  report: RefactorPlanFileCard[]
}

export interface BuildRefactorPlanCardInput {
  write: boolean
  rules: RefactorPlanRuleCard[]
  totalEdits: number
  totalConflicts: number
  report: RefactorPlanFileCard[]
  renameSpecs?: string[]
}

export function buildRefactorPlanCard(input: BuildRefactorPlanCardInput): RefactorPlanCard {
  const mode: RefactorPlanMode = input.write ? 'write' : 'plan'
  const effect: EffectGrade = input.write ? 'effect.l2.workspace' : 'effect.l0.measure'
  const next: string[] = []
  if (!input.write && input.totalEdits > 0 && input.renameSpecs?.length) {
    next.push(`spw refactor . ${input.renameSpecs.map(spec => `--rename ${spec}`).join(' ')} --write`)
  }

  return {
    surface: REFACTOR_PLAN_SURFACE,
    mode,
    effect,
    write: input.write,
    rules: input.rules,
    files: input.report.length,
    totalEdits: input.totalEdits,
    totalConflicts: input.totalConflicts,
    omitted: [...REFACTOR_PLAN_OMISSIONS],
    next,
    report: input.report,
  }
}

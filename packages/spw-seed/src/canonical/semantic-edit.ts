/**
 * Semantic edits — patches addressed by what a node *is*, not by where its
 * text happens to sit.
 *
 * The mutation rules that came before take a whole document and return a whole
 * document. That contract has a ceiling: a rule cannot say "the value of the
 * mark named `status` inside the cache frame", so every rule that can be
 * written safely is a layout rule. It also makes the operational-transform
 * suite next door unreachable — composing and rebasing patches is meaningless
 * when each rule returns a new document and the last writer wins.
 *
 * A semantic rule instead names a *selector* — the same vocabulary `spw query`
 * uses — and returns edits. Three things follow:
 *
 *   - Rules become data. A selector can be read, explained, and authored by
 *     something other than the person who compiled the tool, which is what a
 *     consuming repository or a coding agent needs in order to propose a
 *     refactor rather than merely run one.
 *   - Patches become values. An edit list can be composed with another,
 *     rebased over a surface that moved, stored, or reviewed before it lands.
 *   - Edits carry their reason and their cost. Every edit says why it exists
 *     and what effect grade it demands, so applying a patch is a decision with
 *     evidence rather than a leap.
 *
 * Where the replacement text comes from is deliberately not this module's
 * business. A rewriter may compute it from the tree, evaluate it through the
 * runtime, or receive it from an agent; the selector locates, the rewriter
 * decides.
 *
 * @spw:portable:seed - No DOM or app-specific imports allowed
 */

import type { ASTNode } from '../types/ast'
import type { SpwPattern } from '../query/types'
import { matchAll } from '../query/match'
import { parse } from '../parser'
import {
  applyEdits,
  effectGradeAtMost,
  type DifferentialStratum,
  type EffectGrade,
  type SourceEdit,
} from './differential'

/** A replacement a rule proposes for one matched node. */
export interface SemanticRewrite {
  /** Byte range to replace. Defaults to the matched node's own span. */
  range?: { start: number; end: number }
  newText: string
  /** Why this edit exists — carried into the plan for review. */
  reason: string
}

/** What a rule targets, what it costs, and how it rewrites. */
export interface SemanticRule {
  id: string
  description: string
  /** Selector in the vocabulary `spw query` already speaks. */
  select: SpwPattern
  /** Which layer the edit moves — shared with the differential vocabulary. */
  stratum: DifferentialStratum
  /** The permission this patch demands to touch a workspace. */
  effectGrade: EffectGrade
  /** Return a replacement for a matched node, or null to leave it alone. */
  rewrite(node: ASTNode, source: string): SemanticRewrite | null
}

export interface SemanticEdit extends SourceEdit {
  reason: string
  nodeType: string
  effectGrade: EffectGrade
}

/** Edits that claim overlapping ground; withheld rather than silently ordered. */
export interface SemanticConflict {
  reason: string
  edits: SemanticEdit[]
}

export interface SemanticPlan {
  /** Non-overlapping, ordered, safe to apply together. */
  edits: SemanticEdit[]
  /** Overlapping claims, excluded from `edits` and reported instead. */
  conflicts: SemanticConflict[]
  /** Rules whose effect grade exceeds what the caller allowed. */
  withheld: Array<{ ruleId: string; effectGrade: EffectGrade; reason: string }>
  /** Nodes matched by any selector, whether or not they produced an edit. */
  matched: number
}

export interface SemanticPlanOptions {
  /**
   * Highest effect grade permitted. Rules above it are withheld with a reason
   * rather than dropped, so a plan shows what it declined to do.
   */
  ceiling?: EffectGrade
  /** Reuse an already-parsed tree instead of parsing again. */
  ast?: ASTNode | null
}

const DEFAULT_CEILING: EffectGrade = 'effect.l2.workspace'

function nodeSpan(node: ASTNode): { start: number; end: number } | null {
  const span = (node as { span?: { start?: { offset: number }; end?: { offset: number } } }).span
  if (!span?.start || !span.end) return null
  return { start: span.start.offset, end: span.end.offset }
}

/**
 * Plan the edits a set of rules would make to one surface.
 *
 * Planning never writes and never throws on conflict: two rules claiming the
 * same ground is information about the rules, so it is reported. The returned
 * `edits` are always safe to apply together.
 */
export function planSemanticEdits(
  source: string,
  rules: readonly SemanticRule[],
  options: SemanticPlanOptions = {},
): SemanticPlan {
  const ceiling = options.ceiling ?? DEFAULT_CEILING
  const ast = options.ast !== undefined ? options.ast : parse(source).ast ?? null

  const plan: SemanticPlan = { edits: [], conflicts: [], withheld: [], matched: 0 }
  if (!ast) return plan

  const proposed: SemanticEdit[] = []

  for (const rule of rules) {
    if (!effectGradeAtMost(rule.effectGrade, ceiling)) {
      plan.withheld.push({
        ruleId: rule.id,
        effectGrade: rule.effectGrade,
        reason: `demands ${rule.effectGrade}, ceiling is ${ceiling}`,
      })
      continue
    }

    for (const match of matchAll(ast, rule.select)) {
      plan.matched += 1

      const rewrite = rule.rewrite(match.node, source)
      if (!rewrite) continue

      const range = rewrite.range ?? nodeSpan(match.node)
      if (!range || range.end < range.start) continue

      // A rewrite that changes nothing is not an edit.
      if (source.slice(range.start, range.end) === rewrite.newText) continue

      proposed.push({
        start: range.start,
        end: range.end,
        newText: rewrite.newText,
        ruleId: rule.id,
        stratum: rule.stratum,
        reason: rewrite.reason,
        nodeType: match.node.type,
        effectGrade: rule.effectGrade,
      })
    }
  }

  return { ...plan, ...partitionOverlaps(proposed) }
}

/**
 * Split proposed edits into those that can be applied together and those that
 * contend for the same ground.
 *
 * Contending edits are withheld as a group. Picking a winner would make the
 * outcome depend on rule order, which is exactly the property that makes
 * whole-document rules unsafe to compose.
 */
function partitionOverlaps(
  proposed: readonly SemanticEdit[],
): { edits: SemanticEdit[]; conflicts: SemanticConflict[] } {
  const ordered = [...proposed].sort((a, b) => a.start - b.start || a.end - b.end)
  const edits: SemanticEdit[] = []
  const conflicts: SemanticConflict[] = []

  let group: SemanticEdit[] = []
  let groupEnd = -1

  const flush = (): void => {
    if (group.length === 1) edits.push(group[0]!)
    else if (group.length > 1) {
      conflicts.push({
        reason: `${group.length} edits claim overlapping ranges`,
        edits: group,
      })
    }
    group = []
  }

  for (const edit of ordered) {
    if (group.length > 0 && edit.start < groupEnd) {
      group.push(edit)
      groupEnd = Math.max(groupEnd, edit.end)
      continue
    }
    flush()
    group = [edit]
    groupEnd = edit.end
  }
  flush()

  return { edits, conflicts }
}

/** Apply a plan's safe edits. Conflicts and withheld rules are not applied. */
export function applySemanticPlan(source: string, plan: SemanticPlan): string {
  return applyEdits(source, plan.edits)
}

// ── Rule factories ──────────────────────────────────────────────
//
// Vocabulary migration is the refactor a consuming repository reaches for
// first: a name was chosen early, the corpus grew around it, and changing it
// by hand across hundreds of surfaces is how a good rename gets abandoned.

/**
 * Rewrite only the trailing name of a mark as it appears in the source.
 *
 * Read from the source rather than from the token's value: a name token's span
 * covers the whole mark (`~#status`) while its value is the bare name
 * (`status`), so building a replacement from the value silently drops the
 * sigil and turns a rename into a deletion of the mark.
 */
function renamedMarkText(sourceText: string, to: string): string {
  return sourceText.replace(/[A-Za-z_]\w*$/, to)
}

/** The source range of a mark's name token, when it carries one. */
function nameRange(node: ASTNode): { start: number; end: number } | null {
  const name = (node as { name?: { span?: { start: { offset: number }; end: { offset: number } } } }).name
  if (!name?.span) return null
  return { start: name.span.start.offset, end: name.span.end.offset }
}

/**
 * Rename an annotation mark — `~#from` becomes `~#to` — wherever it appears.
 *
 * The stance prefix is preserved rather than rewritten, so `~#goal` and
 * `$#goal` both keep their stance through a rename of the name.
 */
export function renameMark(from: string, to: string): SemanticRule {
  return {
    id: `rename_mark:${from}→${to}`,
    description: `Rename annotation mark ${from} to ${to}`,
    select: { nodeType: 'Annotation', value: from },
    stratum: 'reference',
    effectGrade: 'effect.l2.workspace',
    rewrite(node, source) {
      const range = nameRange(node)
      if (!range) return null
      return {
        range,
        newText: renamedMarkText(source.slice(range.start, range.end), to),
        reason: `mark ${from} renamed to ${to}`,
      }
    },
  }
}

/**
 * Rename a particle of one aim — `#>from` becomes `#>to`.
 *
 * Scoped by aim so a deixis anchor and a case mark that happen to share a name
 * are not renamed together; they are different words that look alike.
 */
export function renameParticle(aim: '>' | ':' | '!', from: string, to: string): SemanticRule {
  return {
    id: `rename_particle:#${aim}${from}→${to}`,
    description: `Rename ${aim === '>' ? 'anchor' : aim === ':' ? 'case' : 'mood'} ${from} to ${to}`,
    select: { nodeType: 'Particle', aim, value: from },
    stratum: 'reference',
    effectGrade: 'effect.l2.workspace',
    rewrite(node, source) {
      const range = nameRange(node)
      if (!range) return null
      return {
        range,
        newText: renamedMarkText(source.slice(range.start, range.end), to),
        reason: `#${aim}${from} renamed to #${aim}${to}`,
      }
    },
  }
}

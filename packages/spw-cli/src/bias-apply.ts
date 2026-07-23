/**
 * bias-apply — turn bias edges into rewrite operations.
 *
 * This is the shared core the *rewrite* consumers use: `mutate` reads a bias
 * surface as an ordered patch, and `expand` reads a template edge as a
 * fold/unfold. Both call `biasRewriteRules` to lift edges into rules and
 * `applyBiasRewrites` to apply them textually. readBias stays verb-neutral in
 * seed; the verb ("rewrite") lives here, in the consumer.
 */
import type { BiasTarget } from '@spwashi/spw-seed'
import { biasSites } from './bias-edges'

/** A directed rewrite lifted from a bias edge: replace `from` with `to`. */
export interface RewriteRule {
  from: string
  to: string
  /** boon → forward (from→to); bane → inverse (to→from, a revert). */
  sign: 'forward' | 'inverse'
}

/** Reconstruct the surface token for a pole so rewrites act on real syntax. */
export function poleToken(pole: BiasTarget): string {
  switch (pole.kind) {
    case 'ref':
      return `@${pole.value}`
    case 'path':
      return `~"${pole.value}"`
    case 'literal':
      return `"${pole.value}"`
    default:
      return pole.value
  }
}

/**
 * Lift the bias edges in a surface into rewrite rules, in source order (a body
 * sequence is an ordered patch). Only edges with both an anchor (from-pole) and
 * a first target (to-pole) are rewrites; reflexive/labeled edges are skipped —
 * they are resolution or template edges, not rewrites.
 */
export function biasRewriteRules(source: string): RewriteRule[] {
  const rules: RewriteRule[] = []
  for (const { edge } of biasSites(source)) {
    if (!edge.anchor || edge.targets.length === 0) continue
    rules.push({
      from: poleToken(edge.anchor),
      to: poleToken(edge.targets[0]!),
      sign: edge.sign,
    })
  }
  return rules
}

export interface ApplyResult {
  text: string
  hits: number
}

/**
 * Apply rewrite rules to text, in order. Inverse-signed rules swap direction
 * (the revert). Textual, occurrence-based — deliberately simple and previewable.
 */
export function applyBiasRewrites(text: string, rules: readonly RewriteRule[]): ApplyResult {
  let out = text
  let hits = 0
  for (const rule of rules) {
    const [find, replace] = rule.sign === 'inverse' ? [rule.to, rule.from] : [rule.from, rule.to]
    if (!find) continue
    const parts = out.split(find)
    hits += parts.length - 1
    out = parts.join(replace)
  }
  return { text: out, hits }
}

/**
 * Positive-ground checks: emit body should fill the wanted field,
 * not spine itself with opposite-lists.
 */

const NEGATION_SPINE =
  /(?:^|[\n;])\s*(?:do\s+not|don't|dont|never|avoid|without\s+being|not\s+(?:a|an|the|too|so|overly)\b|no\s+(?:stiff|robotic|generic|carnival|corporate|slang))/gi

const OPPOSITE_LIST = /\bnot\s+[\w-]+(?:\s*,\s*not\s+[\w-]+){1,}/gi

export function countNegationSpine(text: string): number {
  if (!text.trim()) return 0
  const a = text.match(NEGATION_SPINE) ?? []
  const b = text.match(OPPOSITE_LIST) ?? []
  return a.length + b.length
}

export function estimateSentences(text: string): number {
  const parts = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
  return parts.length
}

export function holdPositive(text: string): { ok: boolean; hits: number; warnings: string[] } {
  const hits = countNegationSpine(text)
  const warnings: string[] = []
  if (hits > 0) {
    warnings.push(
      `positive_ground: ${hits} negation-spine hit(s) — prefer filling the wanted field over opposite-lists`,
    )
  }
  return { ok: hits === 0, hits, warnings }
}

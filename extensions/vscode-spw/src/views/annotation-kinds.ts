/**
 * Annotation-kind tables shared by the Concepts tree, the Atlas and the
 * landmark quick pick. Nothing here imports `vscode`, so it runs under test.
 * It covers two things: how an entry reads in source, and which
 * spirit-sequence phase holds it.
 */

import type { SpwAnnotationKind } from '../lsp/custom-requests'

type Kind = SpwAnnotationKind

/** The fields a label, key or phase is read from: a client entry and a wire record both have them. */
interface KindedEntry {
  kind: Kind
  name: string
  body?: string
}

/** The sigil each kind is written with. */
export const KIND_PREFIX: Record<Kind, string> = {
  topic: '#',
  lens: '#:',
  intent: '#!',
  anchor: '#>',
  prompt_root: '##>',
  apposition: '~#',
}

/** An entry as it reads in source: `#:depth`, `##>root`, `~#lens(living system)`. */
export function annotationLabel(entry: KindedEntry): string {
  const head = `${KIND_PREFIX[entry.kind]}${entry.name}`
  return entry.kind === 'apposition' ? `${head}(${entry.body ?? ''})` : head
}

/**
 * The key an entry is grouped under. A reading has the same name as a
 * concept only by coincidence: `~#lens(…)` is not another `#:lens`. So
 * readings get their own `~#name(…)` key, and they never take part in
 * co-occurrence.
 */
export function conceptKey(entry: KindedEntry): string {
  return entry.kind === 'apposition' ? `~#${entry.name}(…)` : entry.name
}

export interface SpiritPhase {
  sigil: string
  label: string
  color: string
}

/**
 * Spirit-sequence phase for each annotation kind. The spirit sequence ?~@&*^
 * runs wonder → potential → observer → merge → collapse → integration. Each
 * kind maps to a phase by its semantic role:
 *   - lens (#:)    → ? wonder (probing, measurement)
 *   - topic (#)    → ~ potential (naming, superposition)
 *   - prompt_root (##>) → @ observer (navigation landmark, perspective)
 *   - apposition (~#name(…)) → @ observer (a reading held from outside; its parens are the @ container)
 *   - intent (#!)  → ! action (injection, effect)
 *   - anchor (#>)  → ^ integration (framing, binding)
 */
export const KIND_PHASE: Record<Kind, SpiritPhase> = {
  lens:        { sigil: '?', label: 'Wonder',      color: 'spw.phaseWonder' },
  topic:       { sigil: '~', label: 'Potential',   color: 'spw.phaseWonder' },
  prompt_root: { sigil: '@', label: 'Observer',    color: 'spw.phaseMeta' },
  apposition:  { sigil: '@', label: 'Observer',    color: 'spw.phaseMeta' },
  intent:      { sigil: '!', label: 'Action',      color: 'spw.phaseAction' },
  anchor:      { sigil: '^', label: 'Integration', color: 'spw.phaseIntegration' },
}

export interface PhaseBucket<T> {
  phase: SpiritPhase
  /** Every kind this phase holds, so that two kinds sharing a phase still produce one row. */
  kinds: Kind[]
  entries: T[]
}

/**
 * Entries bucketed by phase, in spirit order (the key order of `KIND_PHASE`).
 * There is one bucket per phase, not per kind, so the buckets partition the
 * entries and their shares add up to the whole. Empty phases are kept; a
 * caller that wants them gone filters them out.
 */
export function bucketByPhase<T extends { kind: Kind }>(entries: readonly T[]): PhaseBucket<T>[] {
  const buckets = new Map<string, PhaseBucket<T>>()
  for (const [kind, phase] of Object.entries(KIND_PHASE) as Array<[Kind, SpiritPhase]>) {
    const bucket = buckets.get(phase.sigil)
    if (bucket) bucket.kinds.push(kind)
    else buckets.set(phase.sigil, { phase, kinds: [kind], entries: [] })
  }
  for (const entry of entries) buckets.get(KIND_PHASE[entry.kind].sigil)?.entries.push(entry)
  return [...buckets.values()]
}

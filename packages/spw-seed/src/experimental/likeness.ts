/**
 * Likeness — what a subtree is the same as, at a chosen rung of a ladder.
 *
 * Two forms can be alike in more or less: in content (the same words built the
 * same way), in shape (the same build with the words erased), in skeleton (the
 * same containers, everything else erased: nest-path.ts), or in census (the
 * same counts, order erased too: fingerprint.ts). Each rung keeps less than
 * the one before, so forms alike at one rung are alike at every rung below it.
 * This repo already reads a surface at the coarser rungs one tool at a time;
 * here the finer two are computed for every subtree at once, as bottom-up
 * passes over the parse columns, so a shader could run them band by band.
 *
 * A key is the first 32 bits of SHA-256 (content-hash.ts, the one hash home),
 * so equal keys nominate and do not prove: a reader that groups by a key
 * compares the columns before it calls two subtrees alike (rhymes.ts does).
 *
 * @see packages/spw-seed/src/experimental/parse-columns.ts
 * @see packages/spw-seed/src/canonical/nest-path.ts — the skeleton rung
 * @see packages/spw-seed/src/canonical/fingerprint.ts — the census rung
 */

import { reduceUp, wordUnit, type ParseColumns } from './parse-columns'

/** Rungs computed per subtree here, finest first; skeleton and census are read by their own tools. (Rung, not grain: a grain is what a step moves by, wonder_trial_grain.) */
export const LIKENESS_RUNGS = ['content', 'shape'] as const
export type LikenessRung = (typeof LIKENESS_RUNGS)[number]

const held = new WeakMap<ParseColumns, Partial<Record<LikenessRung, Uint32Array>>>()

function shapeKeys(tree: ParseColumns): Uint32Array {
  return reduceUp(tree, (row, children) =>
    wordUnit(`s\0${tree.kind[row]}\0${tree.glyphs[tree.glyph[row]!]}\0${children.join(',')}`))
}

function contentKeys(tree: ParseColumns, shape: Uint32Array): Uint32Array {
  return reduceUp(tree, (row, children) =>
    wordUnit(`c\0${shape[row]}\0${tree.word[row]}\0${children.join(',')}`))
}

/** One key per row: two rows with equal keys head subtrees alike at the rung (unless 32 bits collide). */
export function likeness(tree: ParseColumns, rung: LikenessRung): Uint32Array {
  let keys = held.get(tree)
  if (!keys) held.set(tree, (keys = {}))
  const known = keys[rung]
  if (known) return known
  const computed = rung === 'shape' ? shapeKeys(tree) : contentKeys(tree, likeness(tree, 'shape'))
  keys[rung] = computed
  return computed
}

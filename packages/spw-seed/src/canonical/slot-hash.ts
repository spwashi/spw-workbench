/**
 * A slot hash: one hash component per slot of a line, under a seed.
 *
 * Two lines that share a word share the word's component, so a layout that
 * maps components to dimensions puts shared ground near itself; a new seed
 * moves every component at once, so a seed is a whole arrangement. Each
 * component is a prefix of SHA-256 over the seed, the slot's key and its text
 * (content-hash.ts, the one hash home), so the same line under the same seed
 * hashes alike in node and in a browser.
 *
 * How a slot hash is written (positional, #-led, or shaped like its line) is an
 * open trial: interpretation-trials, wonder_trial_hash_format. A join hashes
 * its own slots, which are empty; hash its sides through reading.compound.
 */

import { readLine, type SlotReading } from '../line/read'
import { SLOT_KEYS, type SlotKey } from '../line/names'
import { textHash } from './content-hash'

export interface SlotHashOptions {
  /** A static seed keeps an arrangement; a random one varies it. */
  seed?: string
  /** Hex characters per component (at least 8 are hashed, for the unit value). */
  length?: number
}

export interface SlotHash {
  seed: string
  /** The slots in the order the line wrote them. */
  order: SlotKey[]
  /** Each written slot's component; null where the line has no such slot. */
  components: Record<SlotKey, string | null>
  /** Each component's first 32 bits as a number in [0, 1). */
  unit: Record<SlotKey, number | null>
  /** Units in the fixed order word, mode, body, scene, concept; 0.5 where a slot is absent. */
  vector: number[]
}

const UNIT = 2 ** 32

export function slotHash(input: SlotReading | string, options: SlotHashOptions = {}): SlotHash {
  const reading = typeof input === 'string' ? readLine(input) : input
  const seed = options.seed ?? ''
  const length = Math.max(1, options.length ?? 8)
  const components = {} as Record<SlotKey, string | null>
  const unit = {} as Record<SlotKey, number | null>
  for (const key of SLOT_KEYS) {
    const text = key === 'word' ? (reading.word.text || null) : (reading.slots[key]?.text ?? null)
    if (text === null) {
      components[key] = null
      unit[key] = null
      continue
    }
    const full = textHash(`${seed}\0${key}\0${text}`, Math.max(8, length))
    components[key] = full.slice(0, length)
    unit[key] = parseInt(full.slice(0, 8), 16) / UNIT
  }
  return {
    seed,
    order: [...reading.order],
    components,
    unit,
    vector: SLOT_KEYS.map(key => unit[key] ?? 0.5),
  }
}

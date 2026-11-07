/**
 * line/ — slot reading: one line's word and pair slots, read in any order and
 * written back without losing a byte. A browser-safe text reader; the parser's
 * agreement with it is tracked in brace-slot-reading.
 */

export { readLine, readAt, readRange } from './read'
export type { SlotReading, SlotSpan, LinePart, LineCompound } from './read'
export { writeLine, writeAt, joinParts } from './write'
export type { LineChange } from './write'
export {
  SLOT_KEYS,
  SLOT_NAMES,
  PAIRS,
  JOIN_MARKS,
  BONDS,
  SEPARATORS,
  VALENCE_WORDS,
} from './names'
export type { SlotKey, PairKey, JoinMark, BondName, Separator } from './names'

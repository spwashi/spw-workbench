/**
 * Writing a slot reading back: a change replaces only the bytes of the slots it
 * names, so a line keeps its author's order, spacing and every unread byte.
 *
 * With no change the source comes back as it was. A string replaces a slot's
 * text inside its braces (an empty string keeps the braces); null removes the
 * slot with its braces; a slot the line lacks is added after the last slot that
 * was read, before anything unread. A join's sides are written through
 * writeAt with the path 'a' or 'b'.
 */

import { PAIRS, type PairKey, type Separator, type SlotKey } from './names'
import { readAt, type SlotReading } from './read'

export interface LineChange {
  /** The leading valence chain, written as one string: 'bone.boon'. */
  charge?: string | null
  slots?: Partial<Record<SlotKey, string | null>>
  /** The body's parts, joined back with the body's own separator. */
  parts?: readonly string[]
}

interface Splice {
  start: number
  end: number
  text: string
  /** Order among inserts at one offset: lower is written first. */
  rank: number
}

const PAIR_ORDER: readonly PairKey[] = ['mode', 'body', 'scene', 'concept']

/** Join parts with a separator as a body writes it: a.b, a; b, a, b, a ~> b. */
export function joinParts(parts: readonly string[], separator: Separator): string {
  const mark = separator || '.'
  const glue = mark === '.' ? '.' : mark === '~>' ? ' ~> ' : `${mark} `
  return parts.join(glue)
}

/** The source with `change` written into this reading's slots; every other byte as it was. */
export function writeLine(reading: SlotReading, change: LineChange = {}): string {
  const { source } = reading
  const splices: Splice[] = []
  const first = Math.min(reading.word.start, ...Object.values(reading.slots).map(span => span!.start))

  if (change.charge !== undefined) {
    const span = reading.chargeSpan
    if (span && change.charge === null) splices.push({ start: span.start, end: first, text: '', rank: 0 })
    else if (span) splices.push({ start: span.start, end: span.end, text: change.charge ?? '', rank: 0 })
    else if (change.charge) splices.push({ start: first, end: first, text: `${change.charge} `, rank: -1 })
  }

  const word = change.slots?.word
  if (word !== undefined) splices.push({ start: reading.word.start, end: reading.word.end, text: word ?? '', rank: 0 })

  PAIR_ORDER.forEach((key, rank) => {
    const value =
      key === 'body' && change.slots?.body === undefined && change.parts
        ? joinParts(change.parts, reading.separator)
        : change.slots?.[key]
    if (value === undefined) return
    const span = reading.slots[key]
    if (value === null) {
      if (span) splices.push({ start: span.start, end: span.end, text: '', rank })
    } else if (span) {
      splices.push({ start: span.innerStart, end: span.innerEnd, text: value, rank })
    } else {
      const { open, close } = PAIRS[key]
      splices.push({ start: reading.restStart, end: reading.restStart, text: `${open}${value}${close}`, rank })
    }
  })

  // Right to left, so earlier offsets stay true; inserts at one offset keep pair order.
  splices.sort((a, b) => b.start - a.start || b.rank - a.rank)
  let out = source
  for (const splice of splices) out = out.slice(0, splice.start) + splice.text + out.slice(splice.end)
  return out
}

/** Write a change at a path ('a' or 'b' for a join's side, a number for a body part); the whole text comes back. */
export function writeAt(text: string, path: ReadonlyArray<'a' | 'b' | number>, change: LineChange): string {
  const reading = readAt(text, path)
  return reading ? writeLine(reading, change) : text
}

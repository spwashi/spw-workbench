/**
 * Slot reading: what each brace pair of one line names, wherever it sits.
 *
 * A text reader, not the parser. It reads one line into its word and the four
 * pair slots — mode [ ], body { }, scene ( ), concept < > — with offsets, so a
 * writer can change one slot and leave every other byte as written. Pairs after
 * the word may come in any order, once each (the owner's call of 2026-11-05);
 * a scene or concept may lead the word. What it does not read is kept in
 * `rest`, never dropped. The parser's own reading of the same lines is held to
 * this table by brace-slot-reading's consumer_reader_parity.
 *
 * Joins are provisional (interpretation-trials, wonder_trial_joins): ~ ^ & @
 * join two lines only when spaced alike on both sides (a@b, a @ b); a mark
 * that touches one side stays with that word (plan = @plan, door~).
 */

import { scan, type LiteToken } from '../lite/scan'
import {
  BONDS,
  JOIN_MARKS,
  PAIR_OF_BOUND,
  SEPARATORS,
  VALENCE_WORDS,
  type BondName,
  type JoinMark,
  type PairKey,
  type Separator,
  type SlotKey,
} from './names'

/** One slot as written. For a pair, start/end include the braces and inner is the trimmed text between them. */
export interface SlotSpan {
  text: string
  start: number
  end: number
  innerStart: number
  innerEnd: number
}

/** One part of a body, read as a line of its own. */
export interface LinePart {
  text: string
  start: number
  end: number
  reading: SlotReading
}

export interface LineCompound {
  mark: JoinMark
  bond: BondName
  /** Whether the mark is spaced (a @ b) rather than tight (a@b). */
  spaced: boolean
  /** Offset of the mark in the source. */
  at: number
  left: SlotReading
  right: SlotReading
}

export interface SlotReading {
  /** The whole text read from; every offset below is into it. */
  source: string
  /** The range this reading covers. */
  start: number
  end: number
  /** A leading valence chain: bone.boon home[x] has charge ['bone', 'boon']. */
  charge: string[]
  chargeSpan?: { start: number; end: number }
  /** Pairs written before the word: <person>home, (atlas)home. */
  lead: Array<'scene' | 'concept'>
  /** The word; empty text, at the place a word would go, when none is written. */
  word: SlotSpan
  slots: Partial<Record<PairKey, SlotSpan>>
  /** Every slot in the order it was written, the word included when written. */
  order: SlotKey[]
  /** The body's parts, nesting and quotes respected; empty without a body. */
  parts: LinePart[]
  separator: Separator
  /** Two readings joined by a mark; the slots above are then empty. */
  compound?: LineCompound
  /** What no slot read, as written: the rest of this range, and for a whole line, every later line. */
  rest: string
  restStart: number
  /** Whether nothing but whitespace was left unread at this level. */
  whole: boolean
}

const WORD_CHAR = /[A-Za-z0-9_]/
const SPACE = /\s/
const CHARGE = new RegExp(`^((?:${VALENCE_WORDS.join('|')})(?:\\.(?:${VALENCE_WORDS.join('|')}))*)(?:\\s+|(?=\\[))`)

/** Read the first line of `text`; later lines are kept in rest. */
export function readLine(text: string): SlotReading {
  const newline = text.indexOf('\n')
  const reading = readRange(text, 0, newline < 0 ? text.length : newline)
  const rest = text.slice(reading.restStart)
  return { ...reading, rest, whole: reading.whole && !rest.trim() }
}

/** The reading at a path: 'a' and 'b' are the two sides of a join, a number is a body part. */
export function readAt(text: string, path: ReadonlyArray<'a' | 'b' | number>): SlotReading | null {
  let reading: SlotReading | undefined = readLine(text)
  for (const step of path) {
    if (!reading) return null
    if (step === 'a' || step === 'b') reading = step === 'a' ? reading.compound?.left : reading.compound?.right
    else reading = reading.parts[step]?.reading
  }
  return reading ?? null
}

/** Read the range [start, end) of `source` as one expression. */
export function readRange(source: string, start: number, end: number): SlotReading {
  const tokens = tokensOf(source, start, end)
  const compound = joinOf(source, start, end, tokens)
  if (compound) return compound

  let at = skipSpace(source, start, end)
  const reading: SlotReading = {
    source,
    start,
    end,
    charge: [],
    lead: [],
    word: { text: '', start: at, end: at, innerStart: at, innerEnd: at },
    slots: {},
    order: [],
    parts: [],
    separator: '',
    rest: '',
    restStart: end,
    whole: true,
  }

  const charge = CHARGE.exec(source.slice(at, end))
  if (charge) {
    reading.charge = charge[1]!.split('.')
    reading.chargeSpan = { start: at, end: at + charge[1]!.length }
    at = skipSpace(source, at + charge[0].length, end)
  }

  // A scene or concept may lead the word: <person>home reads home as a person's.
  for (;;) {
    const pair = pairAt(source, at, end, tokens)
    if (!pair || (pair.key !== 'scene' && pair.key !== 'concept') || reading.slots[pair.key]) break
    reading.slots[pair.key] = pair.span
    reading.lead.push(pair.key)
    reading.order.push(pair.key)
    at = skipSpace(source, pair.span.end, end)
  }

  let wordEnd = at
  while (wordEnd < end && !'[{<('.includes(source[wordEnd]!) && !SPACE.test(source[wordEnd]!)) wordEnd++
  reading.word = { text: source.slice(at, wordEnd), start: at, end: wordEnd, innerStart: at, innerEnd: wordEnd }
  if (wordEnd > at) reading.order.push('word')

  // After the word, each pair names its slot wherever it sits, once each.
  let read = wordEnd
  for (;;) {
    const next = skipSpace(source, read, end)
    const pair = pairAt(source, next, end, tokens)
    if (!pair || reading.slots[pair.key]) break
    // <…> followed directly by a word is a relation (bagel<scent>coffee), not a slot.
    if (pair.key === 'concept' && WORD_CHAR.test(source[pair.span.end] ?? '') && pair.span.end < end) break
    reading.slots[pair.key] = pair.span
    reading.order.push(pair.key)
    read = pair.span.end
  }

  const body = reading.slots.body
  if (body) {
    const { separator, parts } = partsOf(source, body.innerStart, body.innerEnd)
    reading.separator = separator
    reading.parts = parts
  }

  reading.restStart = read
  reading.rest = source.slice(read, end)
  reading.whole = !reading.rest.trim()
  return reading
}

/** Tokens of a range, offsets absolute. Apostrophes are masked so prose (don't) opens no string. */
function tokensOf(source: string, start: number, end: number): LiteToken[] {
  const masked = source.slice(start, end).replace(/'/g, '_')
  return scan(masked).map(token => ({ ...token, start: token.start + start, end: token.end + start }))
}

function skipSpace(source: string, at: number, end: number): number {
  while (at < end && SPACE.test(source[at]!)) at++
  return at
}

/** The pair slot opening at `at`, matched to its close, or null when none opens there or it never closes. */
function pairAt(
  source: string,
  at: number,
  end: number,
  tokens: LiteToken[],
): { key: PairKey; span: SlotSpan } | null {
  const index = tokens.findIndex(token => token.start === at)
  const open = tokens[index]
  const key = open?.kind === 'open' && open.bound ? PAIR_OF_BOUND[open.bound] : undefined
  if (!open || !key) return null
  const stack: string[] = []
  for (let i = index; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token.end > end) break
    if (token.kind === 'open' && token.bound) stack.push(token.bound)
    else if (token.kind === 'close' && token.bound && token.bound === stack[stack.length - 1]) {
      stack.pop()
      if (!stack.length) {
        const innerStart = skipSpace(source, open.end, token.start)
        let innerEnd = token.start
        while (innerEnd > innerStart && SPACE.test(source[innerEnd - 1]!)) innerEnd--
        return {
          key,
          span: { text: source.slice(innerStart, innerEnd), start: open.start, end: token.end, innerStart, innerEnd },
        }
      }
    }
  }
  return null
}

/** Offsets in [start, end) that sit outside every pair and quote. */
function topLevel(start: number, end: number, tokens: LiteToken[]): (offset: number) => boolean {
  const covered = new Uint8Array(end - start)
  let depth = 0
  for (const token of tokens) {
    if (token.end > end) break
    const inside = depth > 0 || token.kind === 'string' || token.kind === 'phrase'
    if (token.kind === 'open' && token.bound) depth++
    else if (token.kind === 'close' && token.bound) depth = Math.max(0, depth - 1)
    if (inside || token.kind === 'open' || token.kind === 'close') covered.fill(1, token.start - start, token.end - start)
  }
  return offset => offset >= start && offset < end && covered[offset - start] === 0
}

/** The last join mark outside every pair, spaced alike on both sides with text on each, or null. */
function joinOf(source: string, start: number, end: number, tokens: LiteToken[]): SlotReading | null {
  const top = topLevel(start, end, tokens)
  let mark: LiteToken | undefined
  for (const token of tokens) {
    if (token.kind !== 'operator' || !(JOIN_MARKS as readonly string[]).includes(token.value) || !top(token.start)) continue
    const before = source.slice(start, token.start)
    const after = source.slice(token.end, end)
    if (!before.trim() || !after.trim()) continue
    if (SPACE.test(before[before.length - 1]!) !== SPACE.test(after[0]!)) continue
    mark = token
  }
  if (!mark) return null
  let leftEnd = mark.start
  while (leftEnd > start && SPACE.test(source[leftEnd - 1]!)) leftEnd--
  const left = readRange(source, start, leftEnd)
  const right = readRange(source, mark.end, end)
  const value = mark.value as JoinMark
  const at = skipSpace(source, start, end)
  return {
    source,
    start,
    end,
    charge: [],
    lead: [],
    word: { text: '', start: at, end: at, innerStart: at, innerEnd: at },
    slots: {},
    order: [],
    parts: [],
    separator: '',
    compound: { mark: value, bond: BONDS[value], spaced: SPACE.test(source[mark.end] ?? ''), at: mark.start, left, right },
    rest: right.rest,
    restStart: right.restStart,
    whole: left.whole && right.whole,
  }
}

/** A body's parts: split by the first separator, in precedence order, that occurs outside every pair and quote. */
function partsOf(source: string, start: number, end: number): { separator: Separator; parts: LinePart[] } {
  if (start >= end) return { separator: '', parts: [] }
  const top = topLevel(start, end, tokensOf(source, start, end))
  for (const separator of SEPARATORS) {
    const cuts: number[] = []
    for (let i = start; i <= end - separator.length; i++) {
      // A tight dot is a part boundary; .. is a connector, not two of them.
      const range = separator === '.' && (source[i + 1] === '.' || source[i - 1] === '.')
      if (top(i) && source.startsWith(separator, i) && !range) {
        cuts.push(i)
        i += separator.length - 1
      }
    }
    if (!cuts.length) continue
    const parts: LinePart[] = []
    let from = start
    for (const cut of [...cuts, end]) {
      pushPart(source, from, cut, parts)
      from = cut + separator.length
    }
    return { separator, parts }
  }
  const parts: LinePart[] = []
  pushPart(source, start, end, parts)
  return { separator: '', parts }
}

function pushPart(source: string, from: number, to: number, parts: LinePart[]): void {
  const start = skipSpace(source, from, to)
  let end = to
  while (end > start && SPACE.test(source[end - 1]!)) end--
  if (end > start) parts.push({ text: source.slice(start, end), start, end, reading: readRange(source, start, end) })
}

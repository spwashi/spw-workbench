/**
 * A line said in names: every mark by the name a reader gives it, every slot by
 * its name, every join by its name, and a body that holds another pair closed
 * aloud.
 *
 * A screen reader at its default punctuation says ~garden[care]{seed, water} as
 * "garden care seed water": the mark, the slots and the join are gone. This
 * reads the same line through the slot reader (line/read.ts) and gives it back
 * as clauses, each with the span it says, and as one string a host can use as
 * an accessible name:
 *
 *   potential garden, mode care, definition, list of 2: seed, water
 *
 * Three lines that differ only in their join are said differently, a nested
 * body says where it ends ("end garden"), and a pair label is said as the
 * body's name on both ends. Every written character that is not a space lies
 * inside a clause's span, so nothing written goes unsaid; what the slot reader
 * left unread is said as written and counted.
 *
 * The words come from tables a host may replace (names, in options). The
 * defaults are the reader names of docs/theory/spw/operators.spw and the slot
 * reader's own words for a join. No connective words are added: a line is said
 * in the names of its parts.
 *
 * Experimental: how a line is best said is for a listener to judge
 * (wonder_trial_said), and spw.spoken/1 may change. Nothing here was heard.
 */

import { readRange, type SlotReading, type SlotSpan } from '../line/read'
import { BONDS, PAIRS, SLOT_NAMES, type JoinMark, type PairKey, type Separator, type SlotKey } from '../line/names'
import { scanPairLabels, type BraceEdge } from './pair-labels'

export const SPOKEN_SCHEMA = 'spw.spoken/1' as const

/** The words a line is said in. */
export interface SpokenNames {
  /** A leading mark, longest first: '~' potential, '#>' anchor. */
  marks: Readonly<Record<string, string>>
  /** The four pairs. */
  slots: Readonly<Record<PairKey, string>>
  /** What a body's parts are joined by; '' is parts set beside each other. */
  joins: Readonly<Record<Separator, string>>
  /** A mark between two lines. */
  bonds: Readonly<Record<JoinMark, string>>
  /** Said before a body's name when it closes. */
  end: string
  /** Said before a pair label. */
  labeled: string
  /** Said before a key, before what follows a key, and before what no slot read. */
  key: string
  unread: string
  charge: string
}

/**
 * Operator names as learn/readers.ts holds them (spoken.test.ts keeps the two
 * equal), with the three marks whose aims are settled: #> anchor, #: lens, #! focus.
 */
const MARK_NAMES: Readonly<Record<string, string>> = Object.freeze({
  '~': 'potential',
  '#': 'vibration',
  '.': 'ground',
  '?': 'wonder',
  '!': 'action',
  '*': 'value',
  '&': 'subject',
  '@': 'perspective',
  '^': 'ascension',
  $: 'substrate',
  '%': 'measure',
  '=': 'configuration',
  '<>': 'coupling',
  '#>': 'anchor',
  '#:': 'lens',
  '#!': 'focus',
})

const JOIN_NAMES: Readonly<Record<Separator, string>> = Object.freeze({
  ';': 'sequence',
  ',': 'list',
  '~>': 'movement',
  '.': 'tight',
  '': 'beside',
})

const slotColumn = (column: 'reader' | 'site'): Readonly<Record<PairKey, string>> =>
  Object.freeze({
    mode: SLOT_NAMES.mode[column],
    body: SLOT_NAMES.body[column],
    scene: SLOT_NAMES.scene[column],
    concept: SLOT_NAMES.concept[column],
  })

/** Slots by the names a reader gives them: mode, definition, scene, concept. */
export const SPOKEN_NAMES: SpokenNames = Object.freeze({
  marks: MARK_NAMES,
  slots: slotColumn('reader'),
  joins: JOIN_NAMES,
  bonds: BONDS,
  end: 'end',
  labeled: 'labeled',
  key: 'key',
  unread: 'unread',
  charge: 'charge',
})

/** Slots by the keys a consumer's slot reader has used: mode, body, scope, projection. */
export const SPOKEN_NAMES_SITE: SpokenNames = Object.freeze({ ...SPOKEN_NAMES, slots: slotColumn('site') })

export type SpokenRole =
  | 'charge'
  | 'mark'
  | 'word'
  | 'key'
  | 'slot'
  | 'join'
  | 'label'
  | 'bond'
  | 'end'
  | 'unread'

export interface SpokenClause {
  role: SpokenRole
  /** What is said. Clauses are in the order they are said: a join is named before its first part. */
  says: string
  /** The written text this clause says, [start, end) in the source. An end clause has the close brace. */
  start: number
  end: number
  /** How many bodies of the line this clause sits in. */
  depth: number
  /** For a slot or an end: which pair. */
  slot?: PairKey
  /** For a join: how many parts follow. */
  parts?: number
}

export interface SpokenLine {
  schema: typeof SPOKEN_SCHEMA
  source: string
  clauses: SpokenClause[]
  /** The clauses as one string, for an accessible name or a text face. */
  text: string
  /** Written spans another clause speaks for: the separators of a named join, a body's close when no end is said. */
  implied: Array<[number, number]>
  /** Characters no slot read, said as written. */
  unread: number
  /** The deepest body said. */
  depth: number
}

export interface SpokenOptions {
  names?: SpokenNames
  /** When a body's close is said: where it held another pair (the default), always, or never. */
  ends?: 'nested' | 'all' | 'none'
  /** Whether a join says how many parts it has. Default true. */
  counts?: boolean
  /** How a written word is said. The default says an underscore as a gap: kept_place is said kept place. */
  word?: (written: string) => string
}

interface Ctx {
  source: string
  names: SpokenNames
  marks: string[]
  ends: 'nested' | 'all' | 'none'
  counts: boolean
  word: (written: string) => string
  clauses: SpokenClause[]
  /** Labels by the offset of the brace that carries them. */
  labelAt: Map<number, BraceEdge>
  /** A repeated close label, by where it starts: said by its body's end, never as a word. */
  skip: Map<number, number>
  implied: Array<[number, number]>
  unread: number
  deepest: number
}

const SPACE = /\s/

const trimSpan = (source: string, start: number, end: number): [number, number] => {
  while (start < end && SPACE.test(source[start])) start++
  while (end > start && SPACE.test(source[end - 1])) end--
  return [start, end]
}

const unquote = (text: string): string =>
  text.length >= 2 && (text[0] === '"' || text[0] === '`') && text[text.length - 1] === text[0] ? text.slice(1, -1) : text

function push(ctx: Ctx, clause: SpokenClause): void {
  if (clause.end > clause.start || clause.role === 'end') ctx.clauses.push(clause)
}

/** Where the clauses pushed since `from` end: a reading is never read again over what it said. */
function saidTo(ctx: Ctx, from: number): number {
  let end = 0
  for (let i = from; i < ctx.clauses.length; i++) end = Math.max(end, ctx.clauses[i].end)
  return end
}

/** Say a word: its leading mark by name, a key's colon dropped, the rest as written. */
function sayWord(ctx: Ctx, word: SlotSpan, depth: number): string {
  const { source, names } = ctx
  let at = word.start
  let end = word.end
  for (;;) {
    const mark = ctx.marks.find((m) => source.startsWith(m, at) && at + m.length <= end)
    if (!mark) break
    push(ctx, { role: 'mark', says: names.marks[mark], start: at, end: at + mark.length, depth })
    at += mark.length
  }
  const isKey = end - at > 1 && source[end - 1] === ':'
  if (isKey) end -= 1
  if (end <= at) return ''
  const written = unquote(source.slice(at, end))
  if (!/[A-Za-z0-9]/.test(written)) {
    // Marks with no word among them: a stray close, a run of punctuation. Said as written, and counted.
    push(ctx, { role: 'unread', says: `${names.unread} ${source.slice(at, word.end)}`, start: at, end: word.end, depth })
    ctx.unread += word.end - at
    return ''
  }
  const says = ctx.word(written)
  push(ctx, { role: isKey ? 'key' : 'word', says: isKey ? `${names.key} ${says}` : says, start: at, end: isKey ? end + 1 : end, depth })
  return says
}

/** Say [start, end) as one reading after another: what a reading leaves on the line is read again, beside it. */
function sayRange(ctx: Ctx, start: number, end: number, depth: number, raw = false): void {
  let at = start
  let guard = 0
  while (guard++ < 4096) {
    const [from, to] = trimSpan(ctx.source, at, end)
    if (from >= to) return
    const skipTo = ctx.skip.get(from)
    if (skipTo !== undefined) {
      at = skipTo
      continue
    }
    const quote = ctx.source[from]
    if (quote === '"' || quote === '`') {
      // A quoted run is one word, said without its quotes.
      let stop = from + 1
      while (stop < to && ctx.source[stop] !== quote) stop += ctx.source[stop] === '\\' ? 2 : 1
      stop = Math.min(stop + 1, to)
      push(ctx, { role: 'word', says: unquote(ctx.source.slice(from, stop)), start: from, end: stop, depth })
      at = stop
      continue
    }
    const mark = ctx.clauses.length
    const reading = raw ? null : readRange(ctx.source, from, to)
    const read = reading ? sayReading(ctx, reading, depth) : false
    const rest = reading ? Math.max(reading.restStart, saidTo(ctx, mark), from) : from
    if (!read || rest <= from) {
      // Nothing the slot reader took: say one written run as it stands and go on.
      let stop = from
      while (stop < to && !SPACE.test(ctx.source[stop])) stop++
      push(ctx, { role: 'unread', says: `${ctx.names.unread} ${ctx.source.slice(from, stop)}`, start: from, end: stop, depth })
      ctx.unread += stop - from
      at = stop
      continue
    }
    at = rest
  }
}

/** Say one reading. Returns whether it said anything. */
function sayReading(ctx: Ctx, reading: SlotReading, depth: number): boolean {
  const { source, names } = ctx
  const before = ctx.clauses.length
  ctx.deepest = Math.max(ctx.deepest, depth)

  if (reading.compound) {
    const { left, right, mark, at } = reading.compound
    // Each side is said with whatever it left on its own stretch: }!x: ^~x has a left side of two readings.
    const side = (reading: SlotReading): void => {
      const from = ctx.clauses.length
      const said = sayReading(ctx, reading, depth)
      const rest = said ? Math.max(reading.restStart, saidTo(ctx, from)) : reading.start
      if (rest < reading.end) sayRange(ctx, rest, reading.end, depth, !said)
    }
    side(left)
    push(ctx, { role: 'bond', says: names.bonds[mark], start: at, end: at + mark.length, depth })
    side(right)
    return ctx.clauses.length > before
  }

  if (reading.chargeSpan) {
    push(ctx, { role: 'charge', says: `${names.charge} ${reading.charge.join(' ')}`, start: reading.chargeSpan.start, end: reading.chargeSpan.end, depth })
  }

  let head = ''
  for (const key of reading.order as SlotKey[]) {
    if (key === 'word') {
      head = sayWord(ctx, reading.word, depth)
      continue
    }
    const span = reading.slots[key]
    if (!span) continue
    const openAt = span.start
    const closeAt = span.end - PAIRS[key].close.length
    if (key !== 'body') {
      const [from, to] = trimSpan(source, span.innerStart, span.innerEnd)
      const inner = unquote(source.slice(from, to))
      push(ctx, { role: 'slot', slot: key, says: inner ? `${names.slots[key]} ${inner}` : names.slots[key], start: openAt, end: span.end, depth })
      continue
    }

    // A body: its name, its label when it has one, its join, its parts, and its close.
    let innerStart = span.innerStart
    let innerEnd = span.innerEnd
    const openLabel = ctx.labelAt.get(openAt)
    const closeLabel = ctx.labelAt.get(closeAt)
    push(ctx, { role: 'slot', slot: 'body', says: names.slots.body, start: openAt, end: openAt + 1, depth })
    if (openLabel?.label) {
      const labelEnd = innerStart + 1 + openLabel.label.length
      push(ctx, { role: 'label', says: `${names.labeled} ${ctx.word(openLabel.label)}`, start: innerStart, end: labelEnd, depth })
      innerStart = labelEnd
    }
    if (closeLabel?.label) innerEnd = closeLabel.spelling === 'mirrored' ? innerEnd - closeLabel.label.length - 1 : innerEnd

    const parts = reading.parts.filter((part) => part.start >= innerStart && part.end <= innerEnd)
    const joined = reading.separator !== '' && parts.length === reading.parts.length
    const clausesBefore = ctx.clauses.length
    if (joined) {
      const joinName = names.joins[reading.separator]
      // The first separator is the join clause's own span when the join is named.
      for (let i = joinName ? 1 : 0; i + 1 < parts.length; i++) ctx.implied.push([parts[i].end, parts[i + 1].start])
      ctx.implied.push([parts[parts.length - 1].end, innerEnd])
      if (joinName) {
        const [from, to] = trimSpan(source, parts[0].end, parts[1]?.start ?? parts[0].end)
        push(ctx, {
          role: 'join',
          says: ctx.counts ? `${joinName} of ${parts.length}` : joinName,
          start: from,
          end: to,
          depth: depth + 1,
          parts: parts.length,
        })
      }
      for (const part of parts) sayRange(ctx, part.start, part.end, depth + 1)
    } else {
      sayRange(ctx, innerStart, innerEnd, depth + 1)
    }

    const held = ctx.clauses.slice(clausesBefore).some((c) => c.role === 'slot')
    const label = openLabel?.label ?? closeLabel?.label
    if (closeLabel?.label && closeLabel.spelling === 'mirrored') {
      ctx.implied.push([closeAt - closeLabel.label.length - 1, closeAt])
    }
    const closed = source[closeAt] === PAIRS.body.close
    if (closed && (ctx.ends === 'all' || label || (ctx.ends === 'nested' && held))) {
      const name = label ? ctx.word(label) : head
      push(ctx, { role: 'end', slot: 'body', says: name ? `${names.end} ${name}` : names.end, start: closeAt, end: span.end, depth })
    } else if (closed) {
      ctx.implied.push([closeAt, span.end])
    }
  }
  return ctx.clauses.length > before
}

function joinText(clauses: SpokenClause[]): string {
  let text = ''
  let last: SpokenClause | undefined
  for (const clause of clauses) {
    if (!clause.says) continue
    if (!last) text = clause.says
    else if (last.role === 'mark' || last.role === 'charge') text += ` ${clause.says}`
    else if (last.role === 'join') text += `: ${clause.says}`
    else if (clause.role === 'end' || clause.depth < last.depth) text += `; ${clause.says}`
    else text += `, ${clause.says}`
    last = clause
  }
  return text
}

/**
 * Say the first line of `text`. Later lines are not read: a surface is said a
 * line at a time, by whatever walks it.
 */
export function spokenLine(text: string, options: SpokenOptions = {}): SpokenLine {
  const newline = text.indexOf('\n')
  const source = newline < 0 ? text : text.slice(0, newline)
  const names = options.names ?? SPOKEN_NAMES
  const scan = scanPairLabels(source)
  const labelAt = new Map<number, BraceEdge>()
  for (const pair of scan.pairs) {
    if (pair.kind !== '{' || !pair.label) continue
    labelAt.set(pair.open.at, pair.open)
    labelAt.set(pair.close.at, pair.close)
  }
  const skip = new Map<number, number>()
  for (const [at, edge] of labelAt) {
    if (edge.edge === 'close' && edge.spelling === 'repeated' && edge.label) skip.set(at + 1, at + 2 + edge.label.length)
  }
  const ctx: Ctx = {
    source,
    names,
    marks: Object.keys(names.marks).sort((a, b) => b.length - a.length),
    ends: options.ends ?? 'nested',
    counts: options.counts ?? true,
    word: options.word ?? ((written) => written.replace(/_/g, ' ').trim() || written),
    clauses: [],
    labelAt,
    skip,
    implied: [],
    unread: 0,
    deepest: 0,
  }
  sayRange(ctx, 0, source.length, 0)
  return { schema: SPOKEN_SCHEMA, source, clauses: ctx.clauses, text: joinText(ctx.clauses), implied: ctx.implied, unread: ctx.unread, depth: ctx.deepest }
}

/** Offsets of written characters that are not space, lie in no clause, and are spoken for by none: written and not said. */
export function unsaid(line: SpokenLine): number[] {
  const said = new Uint8Array(line.source.length)
  for (const clause of line.clauses) for (let i = clause.start; i < clause.end; i++) said[i] = 1
  for (const [start, end] of line.implied) for (let i = start; i < end; i++) said[i] = 1
  const out: number[] = []
  for (let i = 0; i < line.source.length; i++) if (!said[i] && !SPACE.test(line.source[i])) out.push(i)
  return out
}

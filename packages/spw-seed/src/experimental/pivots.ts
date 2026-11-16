/**
 * Pivots — each fragment of a line, what surrounds it, and the lines one nuance away.
 *
 * A fragment is a name the line holds: foo and bar in =foo@(<bar>). What surrounds
 * it is data: the marks written before it and after it (a prefix acts before the
 * name is read, a postfix on what it yields, as act-chains.spw reads side), the
 * walls around it outermost first (mode [ ], body { }, scene ( ), concept < >),
 * and which side of which bond it sits on. A pivot changes one of these and says
 * which: a mark moved to the other side, a mark turned to its neighbour in an order
 * the host supplies, the innermost wall turned, a bond's mark or spacing changed,
 * the two sides of a bond exchanged, or a tight bond's mark written onto one side.
 *
 * A mark can sit on the name (=foo) or outside the walls that hold it (=(foo),
 * (foo)=); the second kind is a fragment's outside marks, and it moves and turns
 * the same way.
 *
 * Nothing here is a new reading of a line. Fragments come from the line reader
 * (line/read.ts) and every pivot is written by writeLine, so a host that already
 * reads lines with readLine reads these. Each pivot is read back three ways and
 * says which hold: the line reader reads it whole, finds the fragment where the
 * pivot put it, and finds every name the line held (a pivot loses no name); the
 * parser reads it with no error, no warning and no more statements than the line
 * it came from; the spoken reader names each mark it moved, as a mark or a bond,
 * as often as before (and once more for a turn). A pivot the line reader
 * does not read back is marked not read, and a host shows it without a reading.
 *
 * Two marks are never read as one: a run before a name is its marks in turn. A
 * bond written tight between two expressions (=foo@(<bar>)) touches both; whether
 * its mark belongs after the left or before the right is open (act-chains.spw), so
 * a bond lists both attachments as readings, offers each written out
 * (=foo@ (<bar>), =foo @(<bar>)) as a pivot, and decides neither.
 *
 * Words come from a replaceable table (PIVOT_NAMES), seeded from the spoken
 * reader's mark names and the line reader's slot and bond names; a host passes
 * its own, and its own order of marks for turns (a ring, a progression).
 *
 * Experimental (spw.pivots/1).
 */

import { lex } from '../lexer'
import { parse } from '../parser'
import { readLine, writeLine, type SlotReading } from '../line'
import { BONDS, JOIN_MARKS, PAIRS, SLOT_NAMES, type BondName, type JoinMark, type PairKey, type SlotKey } from '../line/names'
import { isKeySpan } from './key-span'
import { SPOKEN_NAMES, spokenLine, type SpokenLine } from './spoken'

export const PIVOTS_SCHEMA = 'spw.pivots/1' as const

/** The twelve act marks, in the order a host's turns fall back to. */
export const ACT_MARKS = ['!', '^', '~', '?', '*', '=', '@', '#', '.', '&', '$', '%'] as const
const IS_MARK = new Set<string>(ACT_MARKS)
const PAIR_TURN: readonly PairKey[] = ['concept', 'scene', 'mode', 'body']

export type Side = 'left' | 'right'

export interface Fragment {
  name: string
  /** Marks written before the name, outermost first. */
  before: string[]
  /** Marks written after the name, nearest first. */
  after: string[]
  /** Walls around the name, outermost first. */
  walls: PairKey[]
  /** Marks written outside the walls that hold the name: = in =(foo), = in (foo)=. Outermost first before, nearest first after. */
  outside: { before: string[]; after: string[] }
  /** The bond sides it sits on, outermost first. */
  sides: Side[]
  /** The slot its text was read from: the word, or a pair slot holding the name. */
  slot: SlotKey
}

export interface Bond {
  mark: JoinMark
  bond: BondName
  spaced: boolean
  /** The bond sides this bond sits on, outermost first. */
  sides: Side[]
  /** Where a tight mark may belong; both are readings until the owner settles a run between two operands. */
  attaches: Array<'after_left' | 'before_right'>
}

export type PivotKind = 'side' | 'mark' | 'walls' | 'bond' | 'spacing' | 'exchange' | 'attach'

export interface PivotReadBack {
  /** The line reader reads it whole, finds the fragment or bond as the pivot wrote it, and finds every name the line held. */
  line: boolean
  /** The parser reads it with no error or warning and no more statements than the line it came from. */
  parser: boolean
  /** The spoken reader names each mark the pivot moved, as a mark or a bond, as often as before (once more for a turn). */
  spoken: boolean
}

export interface Pivot {
  kind: PivotKind
  /** The fragment it turns (its name), or null for a bond pivot. */
  fragment: string | null
  line: string
  /** What changed, as atoms a host phrases with its own names. */
  from: Record<string, unknown>
  to: Record<string, unknown>
  read: PivotReadBack
  /** 'read' when the line reader reads it back; otherwise shown without a reading. */
  status: 'read' | 'not_read'
}

export interface PivotNames {
  marks: Readonly<Record<string, string>>
  walls: Readonly<Record<PairKey, string>>
  bonds: Readonly<Record<string, string>>
  sides: Readonly<{ before: string; after: string }>
}

/** The default words: the spoken reader's marks, the line reader's slot and bond names. */
export const PIVOT_NAMES: PivotNames = Object.freeze({
  marks: SPOKEN_NAMES.marks,
  walls: Object.freeze(Object.fromEntries((Object.keys(PAIRS) as PairKey[]).map((k) => [k, SLOT_NAMES[k].reader]))) as Record<PairKey, string>,
  bonds: BONDS,
  sides: Object.freeze({ before: 'before', after: 'after' }),
})

export interface PivotOptions {
  /** The order a mark turns along: its neighbours in this order are the turns offered. Default ACT_MARKS. */
  order?: readonly string[]
  /**
   * Read a keyed line as a key, whose colon is not part of the name, and the
   * rest of the line. Off, every line's pivots stay as they are.
   */
  keys?: boolean
}

/** A word split into its marks and its name: '~*foo' is before ~ * and foo, 'foo=' is foo and after =. */
export function splitMarks(word: string): { before: string[]; name: string; after: string[] } {
  let i = 0
  while (i < word.length && IS_MARK.has(word[i]!)) i++
  let j = word.length
  while (j > i && IS_MARK.has(word[j - 1]!)) j--
  return { before: [...word.slice(0, i)], name: word.slice(i, j), after: [...word.slice(j)] }
}

const joinMarks = (before: readonly string[], name: string, after: readonly string[]) => before.join('') + name + after.join('')

/** Something a pivot can rewrite: a fragment's text in its reading, written back to the whole line. */
interface Site {
  fragment?: Fragment
  bond?: Bond
  /** The whole line with this site's text replaced. */
  write: (text: string) => string
  /** The whole line with the innermost wall around this site turned to another pair; null when it cannot turn alone. */
  rewall: ((next: PairKey) => string) | null
  /** Pairs the reading holding the innermost wall does not already hold: a turn into one of them loses nothing. */
  free: PairKey[]
  /** The whole line with the outside marks moved to the other side of the walls, or rewritten in place. */
  outsideSide?: () => string
  outsideWrite?: (marks: string) => string
  text: string
  /** For a bond: the text either side of its mark, spacing dropped. */
  parts?: [string, string]
}

const NO_OUTSIDE = (): Fragment['outside'] => ({ before: [], after: [] })
const pairKeys = (reading: SlotReading) => reading.order.filter((k): k is PairKey => k !== 'word')

/** A mark inside a multi-character annotation or particle. A turn of that one character is not offered. */
function markInParticle(text: string, index: number): boolean {
  return lex(text, { eventPolicy: 'none' }).tokens.some((token) =>
    (token.type === 'ANNOTATION' || token.type === 'PARTICLE') &&
    token.span.end.offset - token.span.start.offset > 1 &&
    index >= token.span.start.offset && index < token.span.end.offset)
}

/** Every fragment and bond of a line, each with a way to write a replacement back to the line. */
function sites(line: string, keys = false): Site[] {
  const out: Site[] = []
  type Up = (levelText: string) => string
  type Rewall = ((next: PairKey) => string) | null
  const walk = (reading: SlotReading, sides: Side[], walls: PairKey[], up: Up, rewall: Rewall, free: PairKey[]) => {
    const src = reading.source
    const c = reading.compound
    if (c) {
      const bond: Bond = { mark: c.mark, bond: c.bond, spaced: c.spaced, sides, attaches: c.spaced ? [] : ['after_left', 'before_right'] }
      const parts: [string, string] = [src.slice(c.left.start, c.at).trimEnd(), src.slice(c.at + 1, c.right.end).trimStart()]
      out.push({ bond, parts, text: src.slice(c.left.start, c.right.end), rewall, free, write: (text) => up(src.slice(0, c.left.start) + text + src.slice(c.right.end)) })
      walk(c.left, [...sides, 'left'], walls, up, rewall, free)
      walk(c.right, [...sides, 'right'], walls, up, rewall, free)
      return
    }
    const word = reading.word.text
    const keyed = keys && isKeySpan(src, reading.word.start, reading.word.end)
    const bare = keyed ? word.slice(0, -1) : word
    const split = splitMarks(bare)
    if (split.name) out.push({
      fragment: { ...split, walls, outside: NO_OUTSIDE(), sides, slot: 'word' },
      text: bare,
      rewall,
      free,
      write: (text) => up(writeLine(reading, { slots: { word: keyed ? `${text}:` : text } })),
    })
    const held = pairKeys(reading)
    const freeHere = (Object.keys(PAIRS) as PairKey[]).filter((k) => !held.includes(k))
    // A word of marks alone sits outside the walls written next to it: before the first pair after it, or after the last pair before it.
    const order = reading.order
    const w = order.indexOf('word')
    const head = !word || split.name ? undefined : (order.slice(w + 1).find((k) => k !== 'word') ?? order.slice(0, w).at(-1)) as PairKey | undefined
    for (const key of held) {
      const span = reading.slots[key]!
      const from = out.length
      if (key === 'body' && reading.parts.length > 1) {
        // A body of several parts: each part is its own reading; one part's wall cannot turn alone.
        for (const part of reading.parts) walk(part.reading, sides, [...walls, key], up, null, [])
      } else {
        const inner = readLine(span.text)
        const writeInner: Up = (text) => up(writeLine(reading, { slots: { [key]: text } }))
        const rewallInner: Rewall = (next) => up(writeLine(reading, { slots: { [key]: null, [next]: span.text } }))
        if (inner.compound || inner.word.text || Object.keys(inner.slots).length) walk(inner, sides, [...walls, key], writeInner, rewallInner, freeHere)
        else {
          const inSlot = splitMarks(span.text)
          if (inSlot.name) out.push({ fragment: { ...inSlot, walls: [...walls, key], outside: NO_OUTSIDE(), sides, slot: key }, text: span.text, rewall: rewallInner, free: freeHere, write: writeInner })
        }
      }
      if (key !== head) continue
      const claimed = out.slice(from).find((site) => site.fragment && !site.fragment.outside.before.length && !site.fragment.outside.after.length)
      if (!claimed) continue
      const ws = reading.word.start
      const we = reading.word.end
      const prefix = ws < span.start
      const turned = [...word].reverse().join('')
      claimed.fragment!.outside = prefix ? { before: [...word], after: [] } : { before: [], after: [...word] }
      claimed.outsideSide = () =>
        up(prefix ? src.slice(0, ws) + src.slice(we, span.end) + turned + src.slice(span.end) : src.slice(0, span.start) + turned + src.slice(span.start, ws) + src.slice(we))
      claimed.outsideWrite = (marks) => up(writeLine(reading, { slots: { word: marks } }))
    }
    // The value of a key is the rest of this reading, read on its own and written back after the colon.
    if (keyed && pairKeys(reading).length === 0 && reading.end === src.length && reading.word.end < reading.end) {
      const head = src.slice(0, reading.word.end)
      for (const site of sites(src.slice(reading.word.end), keys)) {
        out.push({
          ...site,
          write: (text) => up(head + site.write(text)),
          rewall: site.rewall ? (next) => up(head + site.rewall!(next)) : null,
          outsideSide: site.outsideSide ? () => up(head + site.outsideSide!()) : undefined,
          outsideWrite: site.outsideWrite ? (marks) => up(head + site.outsideWrite!(marks)) : undefined,
        })
      }
    }
  }
  const top = readLine(line)
  walk(top, [], [], (text) => text, null, [])
  return out
}

/** The fragments and bonds of a line. */
export function readFragments(line: string, keys = false): { fragments: Fragment[]; bonds: Bond[] } {
  const all = sites(line, keys)
  return { fragments: all.flatMap((s) => (s.fragment ? [s.fragment] : [])), bonds: all.flatMap((s) => (s.bond ? [s.bond] : [])) }
}

const statements = (text: string): number | null => {
  const r = parse(text)
  if (r.errors.length || r.warnings.length) return null
  const e = (r.ast as { expression?: { type?: string; expressions?: unknown[] } }).expression
  if (!e || e.type === 'Prose') return null
  return e.expressions?.length ?? 1
}

const sameMarks = (a: readonly string[], b: readonly string[]) => a.join() === b.join()
const sameFragment = (a: Fragment, b: Fragment) =>
  a.name === b.name && sameMarks(a.before, b.before) && sameMarks(a.after, b.after) && sameMarks(a.walls, b.walls) && sameMarks(a.sides, b.sides) &&
  sameMarks(a.outside.before, b.outside.before) && sameMarks(a.outside.after, b.outside.after)
const nameSet = (fragments: readonly Fragment[]) => fragments.map((f) => f.name).sort().join('\u0000')

type Read = ReturnType<typeof readFragments>
/** A mark the pivot moved: the spoken reader should say it in this role as often as before, plus gain. */
interface Moved { mark: string; role: 'mark' | 'bond'; gain: number }

function said(line: string, names: PivotNames): SpokenLine | null {
  try {
    return spokenLine(line, { names: { ...SPOKEN_NAMES, marks: names.marks, bonds: { ...SPOKEN_NAMES.bonds, ...names.bonds } } })
  } catch {
    return null
  }
}
const sayings = (line: SpokenLine | null, role: string, says: string) => (line ? line.clauses.filter((c) => c.role === role && c.says === says).length : 0)

/** The lines one nuance away from a line, for every fragment and bond, each read back three ways. */
export function pivotsOf(line: string, options: PivotOptions = {}, names: PivotNames = PIVOT_NAMES): Pivot[] {
  const order = options.order ?? ACT_MARKS
  const keys = options.keys === true
  const all = sites(line, keys)
  const names0 = nameSet(all.flatMap((s) => (s.fragment ? [s.fragment] : [])))
  const statements0 = statements(line)
  const said0 = said(line, names)
  const nameOf = (m: Moved) => (m.role === 'bond' ? names.bonds[m.mark] : names.marks[m.mark]) ?? m.mark
  const out: Pivot[] = []
  const pushLine = (kind: PivotKind, site: Site, next: string, from: Record<string, unknown>, to: Record<string, unknown>, found: (back: Read) => boolean, moved: Moved[]) => {
    if (next === line || out.some((p) => p.line === next && p.kind === kind)) return
    const back = readFragments(next, keys)
    const reading = readLine(next)
    const keyedLine = keys && isKeySpan(next, reading.word.start, reading.word.end)
    const lineOk = (keyedLine || reading.rest === '') && nameSet(back.fragments) === names0 && found(back)
    const count = statements(next)
    const saidNext = said(next, names)
    const spokenOk = !!saidNext && saidNext.unread === 0 && moved.every((m) => sayings(saidNext, m.role, nameOf(m)) >= sayings(said0, m.role, nameOf(m)) + m.gain)
    const read = { line: lineOk, parser: count !== null && (statements0 === null || count <= statements0), spoken: spokenOk }
    out.push({ kind, fragment: site.fragment?.name ?? null, line: next, from, to, read, status: read.line ? 'read' : 'not_read' })
  }
  const push = (kind: PivotKind, site: Site, text: string, from: Record<string, unknown>, to: Record<string, unknown>, found: (back: Read) => boolean, moved: Moved[]) =>
    pushLine(kind, site, site.write(text), from, to, found, moved)
  const has = (want: Fragment) => (back: Read) => back.fragments.some((f) => sameFragment(f, want))
  const turnsOf = (mark: string) => {
    const at = order.indexOf(mark)
    return at < 0 ? [] : [...new Set([order[(at + 1) % order.length]!, order[(at - 1 + order.length) % order.length]!])].filter((t) => t !== mark)
  }
  const asMarks = (marks: readonly string[], gain = 0): Moved[] => marks.map((mark) => ({ mark, role: 'mark', gain }))

  for (const site of all) {
    const f = site.fragment
    if (f) {
      // Side: the marks before a name moved after it, nearest kept nearest, or back.
      if (f.before.length && !f.after.length) {
        const after = [...f.before].reverse()
        push('side', site, joinMarks([], f.name, after), { before: f.before }, { after }, has({ ...f, before: [], after }), asMarks(after))
      } else if (f.after.length && !f.before.length) {
        const before = [...f.after].reverse()
        push('side', site, joinMarks(before, f.name, []), { after: f.after }, { before }, has({ ...f, before, after: [] }), asMarks(before))
      }
      // Mark: the nearest mark turned to its neighbours in the host's order.
      const nearestBefore = f.before.at(-1)
      const nearest = nearestBefore ?? f.after[0]
      const particleTurn = keys && nearest !== undefined && markInParticle(
        joinMarks(f.before, f.name, f.after),
        nearestBefore !== undefined ? f.before.length - 1 : f.before.length + f.name.length,
      )
      if (nearest !== undefined && !particleTurn) {
        for (const turned of turnsOf(nearest)) {
          const before = nearestBefore !== undefined ? [...f.before.slice(0, -1), turned] : f.before
          const after = nearestBefore !== undefined ? f.after : [turned, ...f.after.slice(1)]
          push('mark', site, joinMarks(before, f.name, after), { mark: nearest }, { mark: turned }, has({ ...f, before, after }), asMarks([turned], 1))
        }
      }
      // The same two pivots for marks outside the walls: =(foo) and (foo)=.
      const out_ = f.outside
      if (site.outsideSide && (out_.before.length || out_.after.length)) {
        const toAfter = out_.before.length > 0
        const moved = toAfter ? [...out_.before].reverse() : [...out_.after].reverse()
        const outside = toAfter ? { before: [], after: moved } : { before: moved, after: [] }
        pushLine('side', site, site.outsideSide(), { [toAfter ? 'before' : 'after']: toAfter ? out_.before : out_.after, around: 'walls' }, { [toAfter ? 'after' : 'before']: moved, around: 'walls' }, has({ ...f, outside }), asMarks(moved))
        const nearOut = toAfter ? out_.before.at(-1)! : out_.after[0]!
        for (const turned of turnsOf(nearOut)) {
          const marks = toAfter ? [...out_.before.slice(0, -1), turned] : [turned, ...out_.after.slice(1)]
          const outsideTurned = toAfter ? { before: marks, after: [] } : { before: [], after: marks }
          pushLine('mark', site, site.outsideWrite!(marks.join('')), { mark: nearOut, around: 'walls' }, { mark: turned, around: 'walls' }, has({ ...f, outside: outsideTurned }), asMarks([turned], 1))
        }
      }
      // Walls: the innermost wall turned to the next pair its reading does not already hold, never the enclosing wall's pair.
      const innermost = f.walls.at(-1)
      if (innermost && site.rewall) {
        const at = PAIR_TURN.indexOf(innermost)
        const next = [1, 2, 3].map((k) => PAIR_TURN[(at + k) % PAIR_TURN.length]!).find((p) => site.free.includes(p) && p !== f.walls.at(-2))
        if (next) pushLine('walls', site, site.rewall(next), { wall: innermost }, { wall: next }, has({ ...f, walls: [...f.walls.slice(0, -1), next] }), [])
      }
    }
    const b = site.bond
    if (b) {
      const [left, right] = site.parts!
      const sameBond = (want: Bond) => (back: Read) => back.bonds.some((x) => x.mark === want.mark && x.spaced === want.spaced && sameMarks(x.sides, want.sides))
      for (const mark of JOIN_MARKS) {
        if (mark === b.mark) continue
        const glue = b.spaced ? ` ${mark} ` : mark
        push('bond', site, left + glue + right, { mark: b.mark, bond: b.bond }, { mark, bond: BONDS[mark] }, sameBond({ ...b, mark, bond: BONDS[mark] }), [{ mark, role: 'bond', gain: 1 }])
      }
      push('spacing', site, left + (b.spaced ? b.mark : ` ${b.mark} `) + right, { spaced: b.spaced }, { spaced: !b.spaced }, sameBond({ ...b, spaced: !b.spaced }), [])
      push('exchange', site, right + (b.spaced ? ` ${b.mark} ` : b.mark) + left, { left, right }, { left: right, right: left }, sameBond(b), [])
      // Attach: the tight mark written onto one side, each open reading as a line.
      if (b.attaches.length) {
        const onSide = (side: Side) => all.filter((s) => s.fragment && sameMarks(s.fragment.sides.slice(0, b.sides.length + 1), [...b.sides, side]))
        const leftName = onSide('left').at(-1)?.fragment?.name
        const rightName = onSide('right')[0]?.fragment?.name
        push('attach', site, `${left}${b.mark} ${right}`, { attaches: 'tight' }, { attaches: 'after_left' },
          (back) => back.fragments.some((x) => x.name === leftName && (x.after[0] === b.mark || x.outside.after[0] === b.mark)), asMarks([b.mark]))
        push('attach', site, `${left} ${b.mark}${right}`, { attaches: 'tight' }, { attaches: 'before_right' },
          (back) => back.fragments.some((x) => x.name === rightName && (x.before.at(-1) === b.mark || x.outside.before.at(-1) === b.mark)), asMarks([b.mark]))
      }
    }
  }
  return out
}

/** How many pivots of each kind each reader reads back: the acceptance counts for postfix and for chains. */
export function pivotReadCounts(pivots: readonly Pivot[]): Record<PivotKind, { total: number; line: number; parser: number; spoken: number }> {
  const counts = {} as Record<PivotKind, { total: number; line: number; parser: number; spoken: number }>
  for (const p of pivots) {
    const c = (counts[p.kind] ??= { total: 0, line: 0, parser: 0, spoken: 0 })
    c.total++
    if (p.read.line) c.line++
    if (p.read.parser) c.parser++
    if (p.read.spoken) c.spoken++
  }
  return counts
}

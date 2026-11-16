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
 * or the two sides of a bond exchanged.
 *
 * Nothing here is a new reading of a line. Fragments come from the line reader
 * (line/read.ts) and every pivot is written by writeLine, so a host that already
 * reads lines with readLine reads these. Each pivot is read back three ways and
 * says which hold: the line reader finds the fragment where the pivot put it; the
 * parser reads it with no error, no warning and no more statements than the line
 * it came from; the spoken reader names each of its marks. A pivot the line reader
 * does not read back is marked not read, and a host shows it without a reading.
 *
 * Two marks are never read as one: a run before a name is its marks in turn. A
 * bond written tight between two expressions (=foo@(<bar>)) touches both; whether
 * its mark belongs after the left or before the right is open (act-chains.spw), so
 * a bond lists both attachments as readings and decides neither.
 *
 * Words come from a replaceable table (PIVOT_NAMES), seeded from the spoken
 * reader's mark names and the line reader's slot and bond names; a host passes
 * its own, and its own order of marks for turns (a ring, a progression).
 *
 * Experimental (spw.pivots/1).
 */

import { parse } from '../parser'
import { readLine, writeLine, type SlotReading } from '../line'
import { BONDS, JOIN_MARKS, PAIRS, SLOT_NAMES, type BondName, type JoinMark, type PairKey, type SlotKey } from '../line/names'
import { SPOKEN_NAMES, spokenLine } from './spoken'

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

export type PivotKind = 'side' | 'mark' | 'walls' | 'bond' | 'spacing' | 'exchange'

export interface PivotReadBack {
  /** The line reader finds the fragment or bond as the pivot wrote it. */
  line: boolean
  /** The parser reads it with no error or warning and no more statements than the line it came from. */
  parser: boolean
  /** The spoken reader names every mark the pivot moved or turned. */
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
  /** The whole line with the innermost wall around this site turned to another pair; null at the top. */
  rewall: ((next: PairKey) => string) | null
  text: string
  /** For a bond: the text either side of its mark, spacing dropped. */
  parts?: [string, string]
}

/** Every fragment and bond of a line, each with a way to write a replacement back to the line. */
function sites(line: string): Site[] {
  const out: Site[] = []
  type Up = (levelText: string) => string
  type Rewall = ((next: PairKey) => string) | null
  const walk = (reading: SlotReading, sides: Side[], walls: PairKey[], up: Up, rewall: Rewall) => {
    const src = reading.source
    const c = reading.compound
    if (c) {
      const bond: Bond = { mark: c.mark, bond: c.bond, spaced: c.spaced, sides, attaches: c.spaced ? [] : ['after_left', 'before_right'] }
      const parts: [string, string] = [src.slice(c.left.start, c.at).trimEnd(), src.slice(c.at + 1, c.right.end).trimStart()]
      out.push({ bond, parts, text: src.slice(c.left.start, c.right.end), rewall, write: (text) => up(src.slice(0, c.left.start) + text + src.slice(c.right.end)) })
      walk(c.left, [...sides, 'left'], walls, up, rewall)
      walk(c.right, [...sides, 'right'], walls, up, rewall)
      return
    }
    if (reading.word.text) {
      const split = splitMarks(reading.word.text)
      if (split.name) out.push({ fragment: { ...split, walls, sides, slot: 'word' }, text: reading.word.text, rewall, write: (text) => up(writeLine(reading, { slots: { word: text } })) })
    }
    for (const key of Object.keys(reading.slots) as PairKey[]) {
      const span = reading.slots[key]!
      const inner = readLine(span.text)
      const writeInner: Up = (text) => up(writeLine(reading, { slots: { [key]: text } }))
      const rewallInner: Rewall = (next) => up(writeLine(reading, { slots: { [key]: null, [next]: span.text } }))
      if (inner.compound || inner.word.text || Object.keys(inner.slots).length) {
        walk(inner, sides, [...walls, key], writeInner, rewallInner)
        continue
      }
      const split = splitMarks(span.text)
      if (split.name) out.push({ fragment: { ...split, walls: [...walls, key], sides, slot: key }, text: span.text, rewall: rewallInner, write: writeInner })
    }
  }
  walk(readLine(line), [], [], (text) => text, null)
  return out
}

/** The fragments and bonds of a line. */
export function readFragments(line: string): { fragments: Fragment[]; bonds: Bond[] } {
  const all = sites(line)
  return { fragments: all.flatMap((s) => (s.fragment ? [s.fragment] : [])), bonds: all.flatMap((s) => (s.bond ? [s.bond] : [])) }
}

const statements = (text: string): number | null => {
  const r = parse(text)
  if (r.errors.length || r.warnings.length) return null
  const e = (r.ast as { expression?: { type?: string; expressions?: unknown[] } }).expression
  if (!e || e.type === 'Prose') return null
  return e.expressions?.length ?? 1
}

const sameFragment = (a: Fragment, b: Fragment) =>
  a.name === b.name && a.before.join() === b.before.join() && a.after.join() === b.after.join() && a.walls.join() === b.walls.join() && a.sides.join() === b.sides.join()

function readBack(original: string, line: string, want: { fragment?: Fragment; bond?: Bond }, moved: readonly string[], names: PivotNames): PivotReadBack {
  const back = readFragments(line)
  const lineOk = readLine(line).rest === '' && (want.fragment
    ? back.fragments.some((f) => sameFragment(f, want.fragment!))
    : back.bonds.some((b) => b.mark === want.bond!.mark && b.spaced === want.bond!.spaced && b.sides.join() === want.bond!.sides.join()))
  const before = statements(original)
  const after = statements(line)
  let spokenOk = false
  try {
    const said = spokenLine(line)
    spokenOk = said.unread === 0 && moved.every((m) => said.text.includes(names.marks[m] ?? m))
  } catch {
    spokenOk = false
  }
  return { line: lineOk, parser: after !== null && (before === null || after <= before), spoken: spokenOk }
}

/** The lines one nuance away from a line, for every fragment and bond, each read back three ways. */
export function pivotsOf(line: string, options: PivotOptions = {}, names: PivotNames = PIVOT_NAMES): Pivot[] {
  const order = options.order ?? ACT_MARKS
  const out: Pivot[] = []
  const pushLine = (kind: PivotKind, site: Site, next: string, from: Record<string, unknown>, to: Record<string, unknown>, want: { fragment?: Fragment; bond?: Bond }, moved: string[]) => {
    if (next === line || out.some((p) => p.line === next && p.kind === kind)) return
    const read = readBack(line, next, want, moved, names)
    out.push({ kind, fragment: site.fragment?.name ?? null, line: next, from, to, read, status: read.line ? 'read' : 'not_read' })
  }
  const push = (kind: PivotKind, site: Site, text: string, from: Record<string, unknown>, to: Record<string, unknown>, want: { fragment?: Fragment; bond?: Bond }, moved: string[]) =>
    pushLine(kind, site, site.write(text), from, to, want, moved)
  for (const site of sites(line)) {
    const f = site.fragment
    if (f) {
      // Side: the marks before a name moved after it, nearest kept nearest, or back.
      if (f.before.length && !f.after.length) {
        const after = [...f.before].reverse()
        push('side', site, joinMarks([], f.name, after), { before: f.before }, { after }, { fragment: { ...f, before: [], after } }, after)
      } else if (f.after.length && !f.before.length) {
        const before = [...f.after].reverse()
        push('side', site, joinMarks(before, f.name, []), { after: f.after }, { before }, { fragment: { ...f, before, after: [] } }, before)
      }
      // Mark: the nearest mark turned to its neighbours in the host's order.
      const nearestBefore = f.before.at(-1)
      const nearest = nearestBefore ?? f.after[0]
      if (nearest !== undefined) {
        const at = order.indexOf(nearest)
        const turns = at < 0 ? [] : [order[(at + 1) % order.length]!, order[(at - 1 + order.length) % order.length]!]
        for (const turned of new Set(turns)) {
          if (turned === nearest) continue
          const before = nearestBefore !== undefined ? [...f.before.slice(0, -1), turned] : f.before
          const after = nearestBefore !== undefined ? f.after : [turned, ...f.after.slice(1)]
          push('mark', site, joinMarks(before, f.name, after), { mark: nearest }, { mark: turned }, { fragment: { ...f, before, after } }, [turned])
        }
      }
      // Walls: the innermost wall turned to the next pair.
      const innermost = f.walls.at(-1)
      if (innermost && site.rewall) {
        // Skip the enclosing wall's own pair: ((bar)) would double it, and (( is a fused n-range open today.
        let next = PAIR_TURN[(PAIR_TURN.indexOf(innermost) + 1) % PAIR_TURN.length]!
        if (next === f.walls.at(-2)) next = PAIR_TURN[(PAIR_TURN.indexOf(next) + 1) % PAIR_TURN.length]!
        const rewalled = site.rewall(next)
        pushLine('walls', site, rewalled, { wall: innermost }, { wall: next }, { fragment: { ...f, walls: [...f.walls.slice(0, -1), next] } }, [])
      }
    }
    const b = site.bond
    if (b) {
      const [left, right] = site.parts!
      for (const mark of JOIN_MARKS) {
        if (mark === b.mark) continue
        const glue = b.spaced ? ` ${mark} ` : mark
        push('bond', site, left + glue + right, { mark: b.mark, bond: b.bond }, { mark, bond: BONDS[mark] }, { bond: { ...b, mark, bond: BONDS[mark] } }, [mark])
      }
      push('spacing', site, left + (b.spaced ? b.mark : ` ${b.mark} `) + right, { spaced: b.spaced }, { spaced: !b.spaced }, { bond: { ...b, spaced: !b.spaced } }, [])
      push('exchange', site, right + (b.spaced ? ` ${b.mark} ` : b.mark) + left, { left, right }, { left: right, right: left }, { bond: b }, [])
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

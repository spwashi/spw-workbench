/**
 * Shape match — find every place a corpus writes a form, given by example.
 *
 * The example is Spw with holes. A lone _ stands for any one subtree, and ...
 * stands for any number of further siblings (zero included), so
 *
 *   ~garden[_]{_, ...}
 *
 * finds every ~garden operation with one mode item and a body whose first part
 * is anything. An example of several lines (or several forms set side by side)
 * matches a run of neighbours in a body or a file:
 *
 *   ~#asked: _
 *   ~#readings: _
 *
 * The example is read inside a body, so it parses the way the same text does
 * inside a card; at the top of a file the parser lifts some marks out of the
 * line they are written on, and an example read there would not match itself
 * written one level down. Everything else in the example must be written the same way:
 * the same node kinds, the same glyphs (operators, separators), the same words.
 * Each match gives the span it covers and, at each hole, the text that filled
 * it: the paradigm of the slot (as findRhymes gives the fillers of a rhyme's
 * holes, the other way round: rhymes finds templates, this finds instances of
 * one the writer names). A filler is the written text with the space around it
 * trimmed.
 *
 * The match runs on parse columns, not on the tree. Rows are in preorder and a
 * subtree is the contiguous range [i, i + size[i]), so a hole skips a whole
 * candidate subtree in one step and a child is found by c += size[c]. The
 * candidates are the rows whose kind, glyph and word equal the example root's,
 * found by one scan of three typed columns; a file whose columns come from a
 * cache is matched without being parsed.
 *
 * Experimental (spw.shape-match/1). What a hole may stand for (a word only, a
 * whole expression, a run of siblings) is the reading tested here, not a
 * decision.
 */

import { parseColumns, type ParseColumns } from './parse-columns'

export const SHAPE_MATCH_SCHEMA = 'spw.shape-match/1' as const

type HoleKind = 'one' | 'rest'

export interface ShapePattern {
  schema: typeof SHAPE_MATCH_SCHEMA
  source: string
  tree: ParseColumns
  /** The rows the example is made of, in order: one for a single form, several for a run of neighbours. */
  items: number[]
  /** The single form's row, below the wrappers a body puts around it; -1 for a run. */
  root: number
  /** Rows that are holes, in preorder, with what each stands for. */
  holes: Array<{ row: number; kind: HoleKind }>
}

export interface ShapeMatch {
  /** The row the match is rooted at in the matched tree. */
  row: number
  start: number
  end: number
  /** The text that filled each hole, in the example's order; a rest hole that took nothing is ''. */
  fillers: string[]
}

export interface ShapeSurface {
  uri: string
  text: string
  /** Columns already built for the text (from a cache); built here when absent. */
  tree?: ParseColumns | null
}

export interface ShapeHit extends ShapeMatch {
  uri: string
  /** One-based line and column of the match's start. */
  line: number
  column: number
  /** The matched text, cut to its first line. */
  head: string
}

const WRAPPERS = new Set(['Seed', 'Sequence', 'Expression'])

function children(tree: ParseColumns, row: number): number[] {
  const out: number[] = []
  const end = row + tree.size[row]!
  for (let c = row + 1; c < end; c += tree.size[c]!) out.push(c)
  return out
}

const kindOf = (tree: ParseColumns, row: number): string => tree.kinds[tree.kind[row]!] ?? ''

/** Wrappers that hold one thing and add nothing a hole should have to match: an expression of one term, a frame's parameter. */
const HOLDERS = new Set(['Expression', 'Parameter'])

/**
 * Whether a row of the example is a hole, and of which kind. A holder whose one
 * descendant chain ends in a hole is that hole: the parser wraps _ in an
 * expression where a written value sits bare in its parameter.
 */
function holeAt(tree: ParseColumns, row: number): HoleKind | null {
  let at = row
  while (HOLDERS.has(kindOf(tree, at)) && tree.size[at]! > 1 && tree.size[at + 1] === tree.size[at]! - 1) at += 1
  const kind = kindOf(tree, at)
  if (tree.size[at] !== 1) return null
  if (kind === 'Wildcard') return 'one'
  if (kind === 'Spread') return 'rest'
  return null
}

export type ShapePatternProblem = 'unparsed' | 'empty' | 'only_a_hole' | 'rest_not_last'

/** Read an example. Returns the pattern, or why it cannot be one. */
export function compileShape(example: string): ShapePattern | { problem: ShapePatternProblem } {
  const wrapped = `{\n${example}\n}`
  const tree = parseColumns(wrapped)
  if (!tree || !tree.receipt.success) return { problem: 'unparsed' }
  const body = Array.from({ length: tree.nodes }, (_, i) => i).find((i) => kindOf(tree, i) === 'Body')
  if (body === undefined) return { problem: 'unparsed' }
  const inner = children(tree, body)
  if (!inner.length) return { problem: 'empty' }
  let items = inner.length === 1 && kindOf(tree, inner[0]!) === 'Sequence' ? children(tree, inner[0]!) : inner
  if (!items.length) return { problem: 'empty' }
  let root = -1
  if (items.length === 1) {
    root = items[0]!
    while (!holeAt(tree, root) && WRAPPERS.has(kindOf(tree, root)) && children(tree, root).length === 1) root = children(tree, root)[0]!
    if (holeAt(tree, root)) return { problem: 'only_a_hole' }
    items = [root]
  } else if (items.every((row) => holeAt(tree, row))) {
    return { problem: 'only_a_hole' }
  }
  const holes: ShapePattern['holes'] = []
  const walk = (row: number): string | null => {
    const hole = holeAt(tree, row)
    if (hole) {
      holes.push({ row, kind: hole })
      return null
    }
    const kids = children(tree, row)
    for (let i = 0; i < kids.length; i++) {
      if (holeAt(tree, kids[i]!) === 'rest' && i !== kids.length - 1) return 'rest_not_last'
      const problem = walk(kids[i]!)
      if (problem) return problem
    }
    return null
  }
  for (let i = 0; i < items.length; i++) {
    if (holeAt(tree, items[i]!) === 'rest' && i !== items.length - 1) return { problem: 'rest_not_last' }
    const problem = walk(items[i]!)
    if (problem) return { problem: problem as ShapePatternProblem }
  }
  return { schema: SHAPE_MATCH_SCHEMA, source: wrapped, tree, items, root, holes }
}

export function isShapePattern(value: ShapePattern | { problem: ShapePatternProblem }): value is ShapePattern {
  return 'tree' in value
}

/** A _ standing alone inside a word (lens(_), not kept_place) is a hole in the word. */
const WORD_HOLE = /(^|[^A-Za-z0-9_])_(?=[^A-Za-z0-9_]|$)/

/** For a word with holes in it, a regular expression that captures what fills each; null for a plain word. */
export function wordHolePattern(word: string): RegExp | null {
  if (!WORD_HOLE.test(word)) return null
  let out = ''
  let at = 0
  const re = new RegExp(WORD_HOLE.source, 'g')
  for (const m of word.matchAll(re)) {
    const hole = m.index! + m[1]!.length
    out += word.slice(at, hole).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([\\s\\S]*?)'
    at = hole + 1
  }
  out += word.slice(at).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${out}$`)
}

function matcher(pattern: ShapePattern, tree: ParseColumns, text: string, fillers: string[]) {
  const p = pattern.tree
  const wordOf = (cols: ParseColumns, source: string, row: number): string => source.slice(cols.wordStart[row]!, cols.wordEnd[row]!)
  const holed = new Map<number, RegExp | null>()
  const wordHoles = (row: number): RegExp | null => {
    if (!holed.has(row)) holed.set(row, p.word[row] ? wordHolePattern(wordOf(p, pattern.source, row)) : null)
    return holed.get(row)!
  }
  const same = (pr: number, tr: number): boolean => {
    if (p.kind[pr] !== tree.kind[tr]) return false
    const holes = wordHoles(pr)
    if (holes) {
      const m = wordOf(tree, text, tr).match(holes)
      if (!m) return false
      fillers.push(...m.slice(1))
    } else if (p.word[pr] !== tree.word[tr]) return false
    const pg = p.glyphs[p.glyph[pr]!] ?? ''
    const tg = tree.glyphs[tree.glyph[tr]!] ?? ''
    if (pg === tg) return true
    // A sequence's glyph spells the separator between each pair of items. When the example ends in ...,
    // the separators it writes are compared where the text has items for them to separate: {_, ...} asks
    // for a comma after the first part when there is a second, and matches a body of one part.
    const kids = children(p, pr)
    if (!kids.length || holeAt(p, kids[kids.length - 1]!) !== 'rest') return false
    const written = pg ? pg.split(' ') : []
    const there = tg ? tg.split(' ') : []
    const asked = written.slice(0, Math.min(written.length, there.length))
    return asked.every((sep, i) => there[i] === sep)
  }

  const match = (pr: number, tr: number): boolean => {
    const hole = holeAt(p, pr)
    if (hole === 'one') {
      fillers.push(text.slice(tree.start[tr]!, tree.end[tr]!).trim())
      return true
    }
    if (!same(pr, tr)) return false
    return lockstep(children(p, pr), children(tree, tr))
  }

  const lockstep = (pk: number[], tk: number[]): boolean => {
    for (let i = 0; i < pk.length; i++) {
      if (holeAt(p, pk[i]!) === 'rest') {
        fillers.push(i < tk.length ? text.slice(tree.start[tk[i]!]!, tree.end[tk[tk.length - 1]!]!).trim() : '')
        return true
      }
      if (i >= tk.length || !match(pk[i]!, tk[i]!)) return false
    }
    return pk.length === tk.length
  }

  /** Match the example's items against siblings[from…]; returns how many siblings were taken, or -1. */
  const run = (siblings: number[], from: number): number => {
    const items = pattern.items
    for (let i = 0; i < items.length; i++) {
      if (holeAt(p, items[i]!) === 'rest') {
        const rest = siblings.slice(from + i)
        fillers.push(rest.length ? text.slice(tree.start[rest[0]!]!, tree.end[rest[rest.length - 1]!]!).trim() : '')
        return siblings.length - from
      }
      if (from + i >= siblings.length || !match(items[i]!, siblings[from + i]!)) return -1
    }
    return items.length
  }
  return { match, run }
}

/** Match a single-form example at one row of a tree. Returns the match, or null. */
export function matchShapeAt(pattern: ShapePattern, tree: ParseColumns, text: string, row: number): ShapeMatch | null {
  if (pattern.root < 0) return null
  const fillers: string[] = []
  if (!matcher(pattern, tree, text, fillers).match(pattern.root, row)) return null
  return { row, start: tree.start[row]!, end: tree.end[row]!, fillers }
}

/** Every match of the example in one tree, in source order. With outermost (the default), a match inside another is left out. */
export function matchShape(pattern: ShapePattern, tree: ParseColumns, text: string, options: { outermost?: boolean } = {}): ShapeMatch[] {
  const outermost = options.outermost ?? true
  if (pattern.root < 0) return matchRuns(pattern, tree, text, outermost)
  const p = pattern.tree
  const kind = p.kind[pattern.root]!
  const glyph = p.glyphs[p.glyph[pattern.root]!]
  const word = p.word[pattern.root]!
  const rootHoled = word !== 0 && wordHolePattern(pattern.source.slice(p.wordStart[pattern.root]!, p.wordEnd[pattern.root]!)) !== null
  const out: ShapeMatch[] = []
  for (let row = 0; row < tree.nodes; row++) {
    if (tree.kind[row] !== kind || (!rootHoled && tree.word[row] !== word) || tree.glyphs[tree.glyph[row]!] !== glyph) continue
    const hit = matchShapeAt(pattern, tree, text, row)
    if (!hit) continue
    out.push(hit)
    if (outermost) row += tree.size[row]! - 1
  }
  return out
}

/** A run of neighbours: try the items at every child position of every sequence or body. */
function matchRuns(pattern: ShapePattern, tree: ParseColumns, text: string, outermost: boolean): ShapeMatch[] {
  const out: ShapeMatch[] = []
  let skipUntil = -1
  for (let row = 0; row < tree.nodes; row++) {
    if (row < skipUntil) continue
    const kind = kindOf(tree, row)
    if (kind !== 'Sequence' && kind !== 'Body' && kind !== 'Seed') continue
    const siblings = children(tree, row)
    for (let i = 0; i < siblings.length; i++) {
      const fillers: string[] = []
      const taken = matcher(pattern, tree, text, fillers).run(siblings, i)
      if (taken <= 0) continue
      const first = siblings[i]!
      const last = siblings[i + taken - 1]!
      out.push({ row: first, start: tree.start[first]!, end: tree.end[last]!, fillers })
      if (outermost) skipUntil = Math.max(skipUntil, last + tree.size[last]!)
      i += taken - 1
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

/** Every match of the example across surfaces, with where each starts. */
export function findShape(pattern: ShapePattern, surfaces: ShapeSurface[], options: { outermost?: boolean; limit?: number } = {}): ShapeHit[] {
  const limit = options.limit ?? Infinity
  const hits: ShapeHit[] = []
  for (const surface of surfaces) {
    const tree = surface.tree ?? parseColumns(surface.text)
    if (!tree) continue
    let lineStarts: number[] | null = null
    for (const m of matchShape(pattern, tree, surface.text, options)) {
      if (!lineStarts) {
        lineStarts = [0]
        for (let i = 0; i < surface.text.length; i++) if (surface.text[i] === '\n') lineStarts.push(i + 1)
      }
      let lo = 0
      let hi = lineStarts.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (lineStarts[mid]! <= m.start) lo = mid
        else hi = mid - 1
      }
      const text = surface.text.slice(m.start, m.end)
      hits.push({ ...m, uri: surface.uri, line: lo + 1, column: m.start - lineStarts[lo]! + 1, head: text.split('\n')[0]! })
      if (hits.length >= limit) return hits
    }
  }
  return hits
}

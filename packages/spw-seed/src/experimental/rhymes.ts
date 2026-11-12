/**
 * Rhymes and refrains — the shapes a corpus writes more than once.
 *
 * Two subtrees rhyme when they are alike in shape (kinds and glyphs, words
 * out: likeness.ts) and not in content; they are a refrain when they are alike
 * in content too. A rhyme implies
 * a template: the first instance with every word that varies across instances
 * written as _ and its comments left out, and at each hole the words the
 * corpus filled it with. Only the largest repeat is reported: a repeat inside
 * a reported instance is the same repeat again.
 *
 * Hashes nominate and equality decides: rows grouped by their 32-bit shape are
 * compared column by column before they count as one shape, so a collision
 * never merges two shapes; a hole is a row whose word column differs.
 *
 * @see packages/spw-seed/src/experimental/likeness.ts — the shape and content rungs
 * @see packages/spw-seed/src/experimental/parse-columns.ts
 */

import { lex } from '../lexer/lex'
import { likeness } from './likeness'
import type { ParseColumns } from './parse-columns'

export interface RhymeSurface {
  file: string
  source: string
  columns: ParseColumns
}

export interface RhymeInstance {
  file: string
  row: number
  /** 1-based line of the instance's first character. */
  line: number
  start: number
  end: number
}

export interface RhymeHole {
  /** Row offset inside the shape (0 is its head). */
  offset: number
  kind: string
  /** Distinct words written at this hole, first seen first, up to the fillers limit. */
  fillers: string[]
  distinct: number
}

export interface Rhyme {
  kind: 'rhyme' | 'refrain'
  shape: string
  head: string
  /** Nodes in the shape. */
  nodes: number
  instances: RhymeInstance[]
  files: number
  /** The first instance as written, with each hole as _. */
  template: string
  holes: RhymeHole[]
}

export interface RhymeOptions {
  /** Smallest shape counted, in nodes (default 6). */
  minRows?: number
  /** Fillers kept per hole (default 4). */
  fillers?: number
  /** Keep only shapes that open with an operation writing this sigil (? for wonders). */
  sigil?: string
}

interface Entry {
  surface: number
  row: number
}

function sameShape(a: RhymeSurface, ar: number, b: RhymeSurface, br: number): boolean {
  const size = a.columns.size[ar]!
  if (size !== b.columns.size[br]) return false
  for (let k = 0; k < size; k++) {
    const i = ar + k
    const j = br + k
    if (a.columns.kind[i] !== b.columns.kind[j]) return false
    if (a.columns.size[i] !== b.columns.size[j]) return false
    if (a.columns.glyphs[a.columns.glyph[i]!] !== b.columns.glyphs[b.columns.glyph[j]!]) return false
  }
  return true
}

function wordText(surface: RhymeSurface, row: number): string {
  return surface.source.slice(surface.columns.wordStart[row]!, surface.columns.wordEnd[row]!)
}

function lineOf(source: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset; i++) if (source.charCodeAt(i) === 10) line++
  return line
}

/** Rows that write nothing around the one row they hold. */
const PASS_THROUGH = new Set(['Seed', 'Sequence', 'Expression'])

/**
 * The sigil of the operation a shape is: the head itself, or reached through
 * pass-through rows with one child each, so a block that merely begins with a
 * wonder, or brackets one, is not a wonder. On a single-child chain each row
 * holds all the rest.
 */
function openingSigil(surface: RhymeSurface, row: number): string | null {
  const tree = surface.columns
  for (let k = row; k < row + tree.size[row]! && tree.size[k] === tree.size[row]! - (k - row); k++) {
    const kind = tree.kinds[tree.kind[k]!]!
    if (kind === 'Operation') return tree.glyphs[tree.glyph[k]!]!.replace(/ post$/, '')
    if (!PASS_THROUGH.has(kind)) return null
  }
  return null
}

/** Exact shape classes among rows that share a shape hash and a size. */
function classesOf(surfaces: RhymeSurface[], minRows: number): Entry[][] {
  const byHash = new Map<string, Entry[]>()
  surfaces.forEach((surface, s) => {
    const tree = surface.columns
    const shape = likeness(tree, 'shape')
    for (let row = 0; row < tree.nodes; row++) {
      if (tree.size[row]! < minRows) continue
      const key = `${shape[row]}:${tree.size[row]}`
      const list = byHash.get(key)
      if (list) list.push({ surface: s, row })
      else byHash.set(key, [{ surface: s, row }])
    }
  })
  const classes: Entry[][] = []
  for (const entries of byHash.values()) {
    if (entries.length < 2) continue
    const local: Entry[][] = []
    for (const entry of entries) {
      const home = local.find(c => sameShape(surfaces[c[0]!.surface]!, c[0]!.row, surfaces[entry.surface]!, entry.row))
      if (home) home.push(entry)
      else local.push([entry])
    }
    for (const c of local) if (c.length >= 2) classes.push(c)
  }
  return classes
}

/**
 * A hole is a row whose word differs across instances, read from the word
 * column (the words content hashes), so a refrain is exactly a shape whose
 * instances share a content. Fillers are the written text at each word span.
 */
function holesOf(surfaces: RhymeSurface[], entries: Entry[], fillers: number): RhymeHole[] {
  const first = surfaces[entries[0]!.surface]!
  const size = first.columns.size[entries[0]!.row]!
  const holes: RhymeHole[] = []
  for (let k = 0; k < size; k++) {
    const words = entries.map(e => surfaces[e.surface]!.columns.word[e.row + k]!)
    if (words.every(w => w === words[0])) continue
    const texts = new Map<number, string>()
    entries.forEach((e, i) => {
      if (!texts.has(words[i]!)) texts.set(words[i]!, wordText(surfaces[e.surface]!, e.row + k))
    })
    holes.push({
      offset: k,
      kind: first.columns.kinds[first.columns.kind[entries[0]!.row + k]!]!,
      fillers: [...texts.values()].slice(0, fillers),
      distinct: texts.size,
    })
  }
  return holes
}

interface Cut {
  from: number
  to: number
  text: string
}

/**
 * Comments are not rows, so instances of one shape can differ in them; a
 * template drops them rather than show one instance's comments as shared. A
 * comment alone on its line takes the line with it.
 */
function commentCuts(source: string, start: number, end: number): Cut[] {
  let tokens: readonly { type: string; span: { start: { offset: number }; end: { offset: number } } }[]
  try {
    tokens = lex(source.slice(start, end), { eventPolicy: 'none' }).tokens
  } catch {
    return []
  }
  const cuts: Cut[] = []
  for (const token of tokens) {
    if (token.type !== 'COMMENT') continue
    let from = start + token.span.start.offset
    let to = start + token.span.end.offset
    const lineStart = source.lastIndexOf('\n', from - 1) + 1
    const lineEnd = source.indexOf('\n', to)
    if (lineStart >= start && !source.slice(lineStart, from).trim() && lineEnd >= 0 && lineEnd < end && !source.slice(to, lineEnd).trim()) {
      from = lineStart
      to = lineEnd + 1
    } else {
      while (from > start && (source[from - 1] === ' ' || source[from - 1] === '\t')) from--
    }
    cuts.push({ from, to, text: '' })
  }
  return cuts
}

function templateOf(surface: RhymeSurface, row: number, holes: RhymeHole[]): string {
  const { columns: tree, source } = surface
  const start = tree.start[row]!
  const end = tree.end[row]!
  const cuts: Cut[] = commentCuts(source, start, end)
  for (const hole of holes) {
    const from = tree.wordStart[row + hole.offset]!
    const to = tree.wordEnd[row + hole.offset]!
    if (to > from) cuts.push({ from, to, text: '_' })
  }
  let text = source.slice(start, end)
  let floor = Infinity
  for (const cut of cuts.sort((a, b) => (b.from - a.from) || (b.to - a.to))) {
    if (cut.to > floor) continue
    text = `${text.slice(0, cut.from - start)}${cut.text}${text.slice(cut.to - start)}`
    floor = cut.from
  }
  // An expression's span runs through the line break that ends it.
  return text.replace(/\s+$/, '')
}

/** The largest repeated shapes across surfaces, heaviest (nodes × instances) first. */
export function findRhymes(surfaces: RhymeSurface[], options: RhymeOptions = {}): Rhyme[] {
  const minRows = Math.max(2, options.minRows ?? 6)
  const fillers = Math.max(1, options.fillers ?? 4)
  const covered = surfaces.map(s => new Uint8Array(s.columns.nodes))
  // Filter before covering, so a wonder inside a larger repeat is still heard.
  const classes = classesOf(surfaces, minRows)
    .filter(c => options.sigil === undefined || openingSigil(surfaces[c[0]!.surface]!, c[0]!.row) === options.sigil)
    .sort((a, b) => {
      const sa = surfaces[a[0]!.surface]!.columns.size[a[0]!.row]!
      const sb = surfaces[b[0]!.surface]!.columns.size[b[0]!.row]!
      return (sb - sa) || (b.length - a.length)
    })

  const rhymes: Rhyme[] = []
  for (const entries of classes) {
    const open = entries.filter(e => !covered[e.surface]![e.row])
    if (open.length < 2) continue
    const head = surfaces[open[0]!.surface]!
    const size = head.columns.size[open[0]!.row]!
    for (const e of open) covered[e.surface]!.fill(1, e.row, e.row + size)

    const holes = holesOf(surfaces, open, fillers)
    rhymes.push({
      kind: holes.length ? 'rhyme' : 'refrain',
      shape: (likeness(head.columns, 'shape')[open[0]!.row]! >>> 0).toString(16).padStart(8, '0'),
      head: head.columns.kinds[head.columns.kind[open[0]!.row]!]!,
      nodes: size,
      instances: open.map(e => {
        const surface = surfaces[e.surface]!
        const start = surface.columns.start[e.row]!
        return { file: surface.file, row: e.row, line: lineOf(surface.source, start), start, end: surface.columns.end[e.row]! }
      }),
      files: new Set(open.map(e => surfaces[e.surface]!.file)).size,
      template: templateOf(head, open[0]!.row, holes),
      holes,
    })
  }
  return rhymes.sort((a, b) => (b.nodes * b.instances.length) - (a.nodes * a.instances.length))
}

/**
 * Line readings — what the parser makes of each line, kept as a fingerprint
 * a later parser build can be checked against.
 *
 * A grammar change can change how existing lines read without raising an
 * error. A snapshot of every line's reading, taken before the change and
 * checked after it, lists the lines whose reading moved, whether the change
 * was a fix or a regression (reading-drift plan).
 *
 * A node's reading is local: what it is (its kind and the structure it writes,
 * such as an operator's sigil or a particle's aim), the words it names, what
 * it sits in (its parent's kind, structure and words) and what it follows (the
 * sibling before it). A line's reading is the readings of the nodes that start
 * on it, in order. Keeping it local means a change deep in a body is reported
 * on the line where it happened, not on every line that encloses it; a node
 * that moves to another parent changes its own line, and the line of the node
 * that followed it.
 *
 * What separates a frame's items or a sequence's steps is left out: the tree
 * records it, but it changes how a line is spelled, not what its items are or
 * how they nest. Positions are left out too, so reindenting a line keeps its
 * reading; comments are not nodes. The text hash beside the readings says
 * whether two snapshots read the same text: if the text changed, the lines are
 * not compared, since a difference would mix the edit with the grammar.
 *
 * Built on the parse columns in experimental/, so the gate rests on that
 * layout until the columns leave experimental.
 */

import { textHash } from '../../canonical/content-hash'
import { parseColumns, type ParseColumns } from './parse-columns'

export const READINGS_SCHEMA = 'spw.readings/1' as const

/** Kinds whose glyph is only the separators between their items, so it carries no reading. */
const SPELLING_ONLY = new Set(['Frame', 'Sequence'])

export interface SurfaceReadings {
  /** SHA-256 of the whole text (16 hex), so a check can tell an edit from drift. */
  text: string
  complete: boolean
  proseFallback: boolean
  /** One-based line → the reading of the nodes that start on it (8 hex); lines where nothing starts are absent. */
  lines: Record<string, string>
}

export interface ReadingsSnapshot {
  schema: typeof READINGS_SCHEMA
  /** What took it: a parser build, a commit, a release name. Free text, never a path. */
  parser?: string
  /** Surface key (a path relative to the corpus) → its readings. */
  surfaces: Record<string, SurfaceReadings>
}

export type DriftStatus = 'same' | 'drift' | 'text_changed' | 'new' | 'gone'

export interface SurfaceDrift {
  file: string
  status: DriftStatus
  /** Lines whose reading changed, appeared or went (drift only). */
  lines: number[]
}

function lineStarts(source: string): number[] {
  const starts = [0]
  for (let i = 0; i < source.length; i++) if (source.charCodeAt(i) === 10) starts.push(i + 1)
  return starts
}

function lineOf(starts: number[], offset: number): number {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid]! <= offset) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

/** What a row is, apart from where it stands: kind, the structure it writes (not its separators), and its word. */
function identity(tree: ParseColumns, row: number): string {
  if (row < 0) return '-'
  const kind = tree.kinds[tree.kind[row]!] ?? '?'
  const glyph = SPELLING_ONLY.has(kind) ? '' : tree.glyphs[tree.glyph[row]!] ?? ''
  return `${kind}:${glyph}:${tree.word[row]!.toString(16)}`
}

/** One row's local reading: what it is, what it sits in, and what it follows. */
export function nodeReading(tree: ParseColumns, row: number): string {
  const parent = tree.parent[row]!
  let before = -1
  if (parent >= 0) {
    for (let c = parent + 1; c < row; c += tree.size[c]!) before = c
  }
  return `${identity(tree, row)}<${identity(tree, parent)}|${identity(tree, before)}`
}

/** Every line's reading, from columns any parser build laid out, and the text they came from. */
export function readingsOfColumns(tree: ParseColumns, source: string): SurfaceReadings {
  const starts = lineStarts(source)
  const byLine = new Map<number, string[]>()
  for (let row = 0; row < tree.nodes; row++) {
    const line = lineOf(starts, tree.start[row]!)
    const list = byLine.get(line)
    if (list) list.push(nodeReading(tree, row))
    else byLine.set(line, [nodeReading(tree, row)])
  }
  const lines: Record<string, string> = {}
  for (const [line, readings] of [...byLine].sort((a, b) => a[0] - b[0])) {
    lines[String(line)] = textHash(readings.join('\n'), 8)
  }
  return {
    text: textHash(source, 16),
    complete: tree.receipt.complete,
    proseFallback: tree.receipt.proseFallback,
    lines,
  }
}

/** Every line's reading under this build's parser, or null when it returns no tree; a path picks the surface's profile. */
export function readingsOf(source: string, options: { path?: string } = {}): SurfaceReadings | null {
  const tree = parseColumns(source, options)
  return tree ? readingsOfColumns(tree, source) : null
}

/** The lines whose reading differs between two readings of the same text. */
export function driftedLines(before: SurfaceReadings, after: SurfaceReadings): number[] {
  const lines = new Set([...Object.keys(before.lines), ...Object.keys(after.lines)])
  return [...lines]
    .filter(line => before.lines[line] !== after.lines[line])
    .map(Number)
    .sort((a, b) => a - b)
}

/** Each surface in either snapshot, said as same, drift (with its lines), text changed, new or gone. */
export function compareReadings(
  before: Record<string, SurfaceReadings>,
  after: Record<string, SurfaceReadings>,
): SurfaceDrift[] {
  const files = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  return files.map((file): SurfaceDrift => {
    const was = before[file]
    const now = after[file]
    if (!was) return { file, status: 'new', lines: [] }
    if (!now) return { file, status: 'gone', lines: [] }
    if (was.text !== now.text) return { file, status: 'text_changed', lines: [] }
    const lines = driftedLines(was, now)
    return { file, status: lines.length ? 'drift' : 'same', lines }
  })
}

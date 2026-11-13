/**
 * Structural editing: what an editor needs to move by the tree and keep a
 * labeled pair whole while a person types.
 *
 * selectionSpans gives, for a caret, the spans an "expand selection" walks
 * through: the word the caret is in, then each node that holds it, outward, each
 * one strictly larger than the last, with the space at a span's ends trimmed so
 * a selection never starts or ends on a gap. It reads parse columns, where the
 * nodes holding a row are its parent chain.
 *
 * pairLabelEdits gives, for a caret on or inside a labeled pair, the two places
 * its label is written when they must change together (an open and a repeated
 * close), and the edits that switch a close between its repeated and mirrored
 * spellings or give a labeled open's bare close its label. It reads the
 * pair-label scan, so it never changes how the parser reads the text.
 *
 * Experimental (spw.structural-edit/1).
 */

import { parseColumns, type ParseColumns } from './parse-columns'
import { mirrorPairLabel, scanPairLabels, type BracePair, type PairLabelScan } from './pair-labels'

export const STRUCTURAL_EDIT_SCHEMA = 'spw.structural-edit/1' as const

export interface EditSpan {
  start: number
  end: number
}

export interface TextEdit extends EditSpan {
  newText: string
}

export interface PairLabelAction {
  title: string
  edits: TextEdit[]
}

export interface PairLabelEdits {
  /** The pair the caret is on or in, innermost labeled one first. */
  pair: BracePair | null
  /** The label as written on the open and on a repeated close; empty when the two are not written alike. */
  linked: EditSpan[]
  actions: PairLabelAction[]
}

const SPACE = /\s/

function trimmed(text: string, start: number, end: number): EditSpan {
  while (start < end && SPACE.test(text[start]!)) start++
  while (end > start && SPACE.test(text[end - 1]!)) end--
  return { start, end }
}

/** The spans an expand-selection walks through for a caret, innermost first. */
export function selectionSpans(text: string, offset: number, tree: ParseColumns | null = parseColumns(text)): EditSpan[] {
  if (!tree || tree.nodes === 0) return text.length ? [{ start: 0, end: text.length }] : []
  // The deepest row holding the caret: rows are in preorder, so the last row that holds it is the deepest.
  let row = -1
  for (let r = 0; r < tree.nodes; r++) {
    if (tree.start[r]! <= offset && offset <= tree.end[r]! && tree.end[r]! > tree.start[r]!) row = r
    else if (tree.start[r]! > offset) break
  }
  const spans: EditSpan[] = []
  const push = (span: EditSpan): void => {
    const last = spans[spans.length - 1]
    if (span.end <= span.start || span.start > offset || span.end < offset) return
    if (last && (span.start > last.start || span.end < last.end)) return
    if (last && span.start === last.start && span.end === last.end) return
    spans.push(span)
  }
  if (row >= 0 && tree.wordEnd[row]! > tree.wordStart[row]! && tree.wordStart[row]! <= offset && offset <= tree.wordEnd[row]!) {
    push({ start: tree.wordStart[row]!, end: tree.wordEnd[row]! })
  }
  for (let r = row; r >= 0; r = tree.parent[r]!) push(trimmed(text, tree.start[r]!, tree.end[r]!))
  push({ start: 0, end: text.length })
  return spans
}

/** Where a pair's label is written: on its open, and on its close (repeated after the brace, or mirrored before it). */
function labelSpans(pair: BracePair): { open: EditSpan; close: EditSpan | null } | null {
  const label = pair.label ?? pair.open.label
  if (!label) return null
  const open = { start: pair.open.at + 2, end: pair.open.at + 2 + label.length }
  if (!pair.close.label) return { open, close: null }
  const close =
    pair.close.spelling === 'mirrored'
      ? { start: pair.close.at - label.length - 1, end: pair.close.at - 1 }
      : { start: pair.close.at + 2, end: pair.close.at + 2 + label.length }
  return { open, close }
}

const CLOSE: Record<string, string> = { '{': '}', '[': ']', '(': ')' }

/** For a caret on or inside a labeled pair: what must change together, and the edits that reshape its close. */
export function pairLabelEdits(text: string, offset: number, scan: PairLabelScan = scanPairLabels(text)): PairLabelEdits {
  const holds = (p: BracePair) => p.open.at <= offset && offset <= p.close.at + 1 + (p.close.label?.length ?? 0) + 1
  const labeled = [...scan.pairs, ...scan.loose].filter((p) => (p.label ?? p.open.label) && holds(p))
  // Innermost first: the pair that opens last.
  labeled.sort((a, b) => b.open.at - a.open.at)
  const pair = labeled[0] ?? null
  if (!pair) return { pair: null, linked: [], actions: [] }
  const label = (pair.label ?? pair.open.label)!
  const spans = labelSpans(pair)!
  const actions: PairLabelAction[] = []
  const closeBrace = CLOSE[pair.kind]!
  const mirror = mirrorPairLabel(label)

  if (!pair.close.label) {
    actions.push({ title: `Close with its label: ${closeBrace}_${label}`, edits: [{ start: pair.close.at + 1, end: pair.close.at + 1, newText: `_${label}` }] })
    if (mirror) actions.push({ title: `Close with its label mirrored: ${mirror}${closeBrace}`, edits: [{ start: pair.close.at, end: pair.close.at, newText: mirror }] })
  } else if (pair.close.spelling === 'repeated' && mirror) {
    actions.push({
      title: `Mirror the close: ${mirror}${closeBrace}`,
      edits: [
        { start: pair.close.at, end: pair.close.at, newText: mirror },
        { start: pair.close.at + 1, end: pair.close.at + 2 + label.length, newText: '' },
      ],
    })
  } else if (pair.close.spelling === 'mirrored') {
    actions.push({
      title: `Repeat the close: ${closeBrace}_${label}`,
      edits: [
        { start: pair.close.at - label.length - 1, end: pair.close.at, newText: '' },
        { start: pair.close.at + 1, end: pair.close.at + 1, newText: `_${label}` },
      ],
    })
  }
  const linked = spans.close && pair.close.spelling === 'repeated' ? [spans.open, spans.close] : []
  return { pair, linked, actions }
}

/** Apply edits to text, latest first, so earlier offsets stay true. Edits must not overlap. */
export function applyTextEdits(text: string, edits: TextEdit[]): string {
  let out = text
  for (const edit of [...edits].sort((a, b) => b.start - a.start || b.end - a.end)) out = out.slice(0, edit.start) + edit.newText + out.slice(edit.end)
  return out
}

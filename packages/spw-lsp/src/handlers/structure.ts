/**
 * Moving and editing by structure: expand and shrink a selection by the parse
 * tree, edit a pair label on its open and its repeated close at once, and the
 * code actions that reshape a labeled pair's close. Each answers from seed's
 * experimental structural-edit readers, so the editor, the CLI and a page that
 * imports the workbench bundle move by the same tree.
 */

import { offsetToPosition, pairLabelEdits, positionToOffset, selectionSpans, type TextEdit } from '@spwashi/spw-seed'
import type { HandlerDeps, LspCodeAction, LspPosition, LspRange } from '../types'

export interface LspSelectionRange {
  range: LspRange
  parent?: LspSelectionRange
}

const rangeOf = (text: string, start: number, end: number): LspRange => ({ start: offsetToPosition(text, start), end: offsetToPosition(text, end) })

/** textDocument/selectionRange: one chain per position, innermost first, each parent holding its child. */
export function selectionRanges(
  params: { textDocument?: { uri?: string }; positions?: LspPosition[] },
  deps: HandlerDeps,
): LspSelectionRange[] {
  const uri = params?.textDocument?.uri
  const doc = uri ? deps.serverIndex.getDocument(uri) : null
  if (!doc || !params.positions) return []
  return params.positions.map((position) => {
    const spans = selectionSpans(doc.text, positionToOffset(doc.text, position))
    let chain: LspSelectionRange | undefined
    for (let i = spans.length - 1; i >= 0; i--) chain = { range: rangeOf(doc.text, spans[i]!.start, spans[i]!.end), ...(chain ? { parent: chain } : {}) }
    return chain ?? { range: { start: position, end: position } }
  })
}

/** textDocument/linkedEditingRange: a pair label written on its open and repeated on its close changes as one. */
export function linkedEditingRanges(
  params: { textDocument?: { uri?: string }; position?: LspPosition },
  deps: HandlerDeps,
): { ranges: LspRange[]; wordPattern: string } | null {
  const uri = params?.textDocument?.uri
  const doc = uri ? deps.serverIndex.getDocument(uri) : null
  if (!doc || !params.position) return null
  const offset = positionToOffset(doc.text, params.position)
  const { linked } = pairLabelEdits(doc.text, offset)
  // Only when the caret is on one of the two labels: elsewhere in the pair, typing is ordinary typing.
  if (linked.length !== 2 || !linked.some((s) => s.start <= offset && offset <= s.end)) return null
  return { ranges: linked.map((s) => rangeOf(doc.text, s.start, s.end)), wordPattern: '[A-Za-z][A-Za-z0-9_]*' }
}

/** Code actions for the labeled pair at a range's start: switch its close's spelling, or give a bare close its label. */
export function pairLabelCodeActions(uri: string, text: string, range: LspRange): LspCodeAction[] {
  const { actions } = pairLabelEdits(text, positionToOffset(text, range.start))
  return actions.map((action) => ({
    title: action.title,
    kind: 'refactor.rewrite',
    edit: { changes: { [uri]: action.edits.map((e: TextEdit) => ({ range: rangeOf(text, e.start, e.end), newText: e.newText })) } },
  }))
}

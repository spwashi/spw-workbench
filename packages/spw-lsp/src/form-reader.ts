/**
 * Caret form context for a page: what the editor's form hover reads at a
 * position (the node, its label, its coupling, the mobility rewrites that
 * apply), from text alone.
 *
 * The workbench release build ships it. The reader build leaves it out: form
 * geometry would take that bundle from 85 KB to 133 KB, and a page that only
 * highlights should not pay for it.
 *
 * @see ./handlers/form-context.ts — the same assembly the language server hovers with
 */

import { parse } from '@spwashi/spw-seed'
import { assembleFormContext, formatFormContextHover, type FormContextAtPosition } from './handlers/form-context'

export type { FormContextAtPosition }

/** A 0-based caret, as the reader's roles and anchors count. */
export interface Caret {
  line: number
  character: number
}

/** The form context at a caret, or null when nothing there has a form to read. */
export function formAt(text: string, caret: Caret, options: { uri?: string } = {}): FormContextAtPosition | null {
  return assembleFormContext({ uri: options.uri ?? 'inline:spw', text, version: 0, parseResult: parse(text) }, caret)
}

/** The editor's form hover at a caret, as Markdown, or null when it would show nothing. */
export function formHover(text: string, caret: Caret, options: { uri?: string } = {}): string | null {
  const ctx = formAt(text, caret, options)
  return ctx ? formatFormContextHover(ctx) : null
}

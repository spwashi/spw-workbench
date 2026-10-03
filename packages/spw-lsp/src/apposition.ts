/**
 * Apposition — reading a `~#name(reading)` token, and labelling index entries.
 *
 * Every LSP reader of an apposition goes through `readAppositionToken`, so the
 * index and the hovers cannot disagree about what a reading says. The label
 * table sits here too: an apposition is the one kind whose label is more than
 * a sigil and a name.
 */

import { appositionParts, type Token } from '@spwashi/spw-seed'
import type { AnnotationEntry, AnnotationKind } from './server-index'

/** Annotation kind → the sigil a braid string carries. */
export const BRAID_PREFIX: Record<AnnotationKind, string> = {
  topic: '#',
  lens: '#:',
  intent: '#!',
  anchor: '#>',
  prompt_root: '##>',
  apposition: '~#',
}

/**
 * The comparison key for an apposition reading: case, `_` versus space, and
 * runs of whitespace don't make two readings different.
 */
export function normalizeReading(body: string): string {
  return body.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * An APPOSITION token read through the seed's `appositionParts`, body trimmed;
 * null when unterminated — the lexer ran it to the newline, so its body is a
 * parse error rather than the author's reading.
 */
export function readAppositionToken(tok: Token): { name: string | null; body: string } | null {
  if (tok.type !== 'APPOSITION' || !isClosedApposition(tok.value)) return null
  const parts = appositionParts(tok.value)
  return { name: parts.name, body: parts.body.trim() }
}

/**
 * Read an APPOSITION token as an index entry. Only a named, closed, non-empty
 * apposition earns one: an anonymous `~#(…)` has no key to recur under, and an
 * empty `~#lens()` states no reading to find or count.
 */
export function annotationFromApposition(tok: Token): { name: string; body: string } | null {
  const parts = readAppositionToken(tok)
  return parts?.name && parts.body ? { name: parts.name, body: parts.body } : null
}

/** The lexer stops an apposition at the paren that balances its opener, or at the newline when none does. */
function isClosedApposition(value: string): boolean {
  let depth = 0
  for (let i = value.indexOf('('); i >= 0 && i < value.length; i++) {
    if (value[i] === '(') depth++
    else if (value[i] === ')' && --depth === 0) return true
  }
  return false
}

/** An index entry as it reads in source: `#:depth`, `##>root`, `~#lens(living system)`. */
export function annotationLabel(entry: Pick<AnnotationEntry, 'kind' | 'name' | 'body'>): string {
  if (entry.kind === 'apposition') return `~#${entry.name}(${entry.body ?? ''})`
  return `${BRAID_PREFIX[entry.kind] ?? '#'}${entry.name}`
}

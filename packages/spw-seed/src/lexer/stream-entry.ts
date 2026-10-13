import type { Token } from '../types'
import { advance, getPosition, type LexerState } from './state'

/**
 * Stream entries: a line-start `>>[stamp] type — text`, read the same in every
 * dialect (docs/theory/spw/line-items.spw).
 *
 * An entry owns the rest of its physical line, including punctuation, quotes,
 * comment-like text, and incomplete timestamp headers. Its body is prose-first:
 * prose is the ground, and a figure — an expression a sigil begins — is lexed
 * as ordinary tokens inside it. An open << stream always takes precedence:
 * there the >> is its closer.
 */

/** The `>>` that opens an entry, or null when the line holds something else. */
export function readEntryMarker(state: LexerState, streamDepth: number): Token<'STREAM_CLOSE'> | null {
  if (streamDepth > 0 || !state.input.startsWith('>>[', state.offset)) return null
  const lineStart = state.input.lastIndexOf('\n', state.offset - 1) + 1
  if (!/^[\t ]*$/.test(state.input.slice(lineStart, state.offset))) return null

  const start = getPosition(state)
  advance(state, 2)
  return { type: 'STREAM_CLOSE', kind: '>>', value: '>>', span: { start, end: getPosition(state) } }
}

/** Offset of the end of the line that holds `offset`, before any `\r` or `\n`. */
export function entryLineEnd(input: string, offset: number): number {
  let end = offset
  while (end < input.length && input[end] !== '\n' && input[end] !== '\r') end++
  return end
}

/** Sigils that may begin a figure. `@` stays prose: in prose an @ name is as often an npm scope as a root. */
const FIGURE_SIGILS = '~?.%=&!#*^$'
/** What may stand before a figure: the figure must begin a word. */
const WORD_BREAK = /[\s(\[{"'`,;]/
const NAME_START = /[A-Za-z_]/
const NAME_BODY = /[A-Za-z0-9_-]/
/** Characters a bracket group inside prose may hold: no quotes, slashes or prose punctuation. */
const GROUP_SAFE = /[A-Za-z0-9_\-.:,=~#!?$%&*^ ]/
const CLOSERS: Record<string, string> = { '[': ']', '(': ')', '{': '}' }

/**
 * Where the figure that begins at `i` ends, or null when `i` begins prose.
 *
 * Prefix binds, postfix does not: a sigil begins a figure only at the start of
 * a word and only when a name, bracket, brace or quote follows at once. So
 * `~"path"`, `~[name]`, `.[name](hash)`, `#>anchor`, `$slot` and `=exp[id: x]`
 * are figures, while `exist?`, `door~`, `e.g.`, `~/air` and `^9.3` stay prose.
 */
export function figureEnd(input: string, i: number, bodyStart: number, lineEnd: number): number | null {
  const sigil = input[i]!
  if (!FIGURE_SIGILS.includes(sigil)) return null
  if (i > bodyStart && !WORD_BREAK.test(input[i - 1]!)) return null

  let j = i + 1
  if (sigil === '~' && input[j] === '"') return closingQuote(input, j, lineEnd)
  if (sigil === '#' && (input[j] === '>' || input[j] === ':' || input[j] === '!')) {
    return NAME_START.test(input[j + 1] ?? '') ? nameEnd(input, j + 1, lineEnd) : null
  }
  if (sigil === '~' && input[j] === '#') j++
  if (sigil === '$' && input[j] === '{') return groupEnd(input, j, lineEnd)

  // `.` takes only a bracket: `.agents/plans` and `.spw` are paths in prose.
  const named = sigil !== '.' && NAME_START.test(input[j] ?? '')
  if (named) j = nameEnd(input, j, lineEnd)
  let k = j
  while (k < lineEnd && CLOSERS[input[k]!]) {
    const close = groupEnd(input, k, lineEnd)
    // A bracket that does not close cleanly leaves the figure half-formed; it stays prose.
    if (close === null) return null
    k = close
  }
  return named || k > j ? k : null
}

/** A name, with dots only between name characters: a sentence's final period stays prose. */
function nameEnd(input: string, j: number, lineEnd: number): number {
  while (j < lineEnd) {
    if (NAME_BODY.test(input[j]!)) j++
    else if (input[j] === '.' && NAME_BODY.test(input[j + 1] ?? '')) j++
    else break
  }
  return j
}

/** The end of a bracket group closed on the line and holding only safe characters. */
function groupEnd(input: string, k: number, lineEnd: number): number | null {
  const open = input[k]!
  const close = CLOSERS[open]!
  let depth = 0
  for (let j = k; j < lineEnd; j++) {
    const ch = input[j]!
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return j + 1
    } else if (!GROUP_SAFE.test(ch)) return null
  }
  return null
}

/** The end of a double-quoted string closed on the line. */
function closingQuote(input: string, j: number, lineEnd: number): number | null {
  for (let k = j + 1; k < lineEnd; k++) {
    if (input[k] === '\\') k++
    else if (input[k] === '"') return k + 1
  }
  return null
}

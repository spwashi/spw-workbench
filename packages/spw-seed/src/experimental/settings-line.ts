/**
 * A settings line: a head and a body of marked terms, read against a table of
 * the words a host knows.
 *
 *   ^board{ =cues[shaped] =wap[pillow] %width[0.3] @hold[upright] }
 *   ?find[haggle]{ @carrier[genie] &verb[donut] %count[3] ~within[3] }
 *   ^ear{ %body[392] =rough[off] }
 *
 * Hosts write these lines to keep a choice in a link, a find in a book, a sound
 * in an ear line, and each had its own reader: patterns over the text, or a walk
 * of the parser's tree that has to know where the parser hangs a frame after an
 * @ word. This reads every one the same way, through the slot reader (line kit),
 * and checks each term against the host's own vocabulary:
 *
 *   number  a value held to a range: out of range is clamped and reported; written
 *           with a sign, an exponent, as a ratio (4/3) or a percent (50%), or in a
 *           unit the word lists (number-form.ts reads it)
 *   choice  one of a list of words
 *   text    any value, kept as written
 *
 * Every term the line writes comes back with its mark, word, value and span,
 * known or not, so nothing a host did not ask about is dropped in silence; the
 * problems say which words were unknown, which values could not be used, which
 * were clamped or repeated, and which were written with a mark the vocabulary
 * does not give them (read anyway, and said). writeSettingsLine writes values
 * back as a line that reads to the same values.
 *
 * Experimental (spw.settings-line/1). Which mark a setting is written with is
 * the host's: the default writes a number with % and anything else with =.
 */

import { readRange, type SlotReading } from '../line/read'
import { isNumberForm, readNumberForm } from './number-form'

export const SETTINGS_LINE_SCHEMA = 'spw.settings-line/1' as const

export type SettingWord =
  | {
      kind: 'number'
      range: readonly [number, number]
      says?: string
      marks?: readonly string[]
      integer?: boolean
      /** Units a value may be written in, each with what one of it is in the word's own unit: { ms: 1, s: 1000 }. */
      units?: Readonly<Record<string, number>>
    }
  | { kind: 'choice'; choices: readonly string[]; says?: string; marks?: readonly string[] }
  | { kind: 'text'; says?: string; marks?: readonly string[] }

export type SettingsVocabulary = Readonly<Record<string, SettingWord>>

export interface SettingsTerm {
  /** The mark the term leads with ('=', '%', '@', '.', …), or '' for a binding (word: value). */
  mark: string
  word: string
  /** The value as written: inside the term's brackets, or after a binding's colon; '' when none. */
  value: string
  start: number
  end: number
}

export type SettingsProblemKind = 'no_line' | 'unread' | 'unknown_word' | 'not_a_number' | 'not_a_unit' | 'not_a_choice' | 'clamped' | 'repeated' | 'other_mark'

/**
 * A number written in a value, read by readNumberForm (number-form.ts): a sign, an exponent, a ratio
 * (4/3), a percent (50%), and a unit the word's table converts. A range is not one number.
 */
export function settingNumber(written: string, units: Readonly<Record<string, number>> = {}): { value: number } | { problem: 'not_a_number' | 'not_a_unit' } {
  const form = readNumberForm(written)
  if (!isNumberForm(form) || form.kind === 'range') return { problem: 'not_a_number' }
  if (!form.unit || form.unit === '%') return { value: form.value }
  const scale = units[form.unit]
  return scale === undefined ? { problem: 'not_a_unit' } : { value: form.value * scale }
}

export interface SettingsProblem {
  problem: SettingsProblemKind
  word: string
  at: number
  written?: string
  used?: number | string
}

export interface SettingsLine {
  schema: typeof SETTINGS_LINE_SCHEMA
  /** The head: its mark, its word, and what its own brackets hold (?find[haggle] has the mode haggle). */
  head: { mark: string; word: string; mode: string } | null
  /** Every term written, in order, known or not. */
  terms: SettingsTerm[]
  /** The values of the known words, typed by the vocabulary. */
  values: Record<string, number | string>
  problems: SettingsProblem[]
}

const MARKS = /^(<>|[.=%@&~^#$*!?])/

function splitWord(written: string): { mark: string; word: string } {
  const m = written.match(MARKS)
  const mark = m ? m[1]! : ''
  return { mark, word: written.slice(mark.length).replace(/:$/, '') }
}

/** The terms of a body, read one reading after another; a binding's value is the run after its colon. */
export function readSettingsTerms(source: string, start: number, end: number): { terms: SettingsTerm[]; unread: Array<{ text: string; at: number }> } {
  const terms: SettingsTerm[] = []
  const unread: Array<{ text: string; at: number }> = []
  let at = start
  for (let guard = 0; guard < 4096; guard++) {
    while (at < end && /[\s,;]/.test(source[at]!)) at++
    if (at >= end) break
    const part: SlotReading = readRange(source, at, end)
    const written = part.word.text
    const next = Math.max(part.restStart, part.word.end, at + 1)
    if (!written || !/[A-Za-z]/.test(written)) {
      let stop = at
      while (stop < end && !/\s/.test(source[stop]!)) stop++
      unread.push({ text: source.slice(at, stop), at })
      at = Math.max(stop, at + 1)
      continue
    }
    const { mark, word } = splitWord(written)
    const mode = part.slots.mode
    if (mode) {
      terms.push({ mark, word, value: source.slice(mode.innerStart, mode.innerEnd).trim(), start: part.word.start, end: mode.end })
      at = next
      continue
    }
    if (written.endsWith(':')) {
      const rest = source.slice(next, end).match(/^\s*("[^"]*"|[^\s,;]+)/)
      const value = rest ? rest[1]!.replace(/^"|"$/g, '') : ''
      const after = rest ? next + rest[0].length : next
      terms.push({ mark: '', word, value, start: part.word.start, end: after })
      at = after
      continue
    }
    terms.push({ mark, word, value: '', start: part.word.start, end: part.word.end })
    at = next
  }
  return { terms, unread }
}

/** Read a settings line against a vocabulary. Line breaks read as spaces, so a line may be laid over several. */
export function readSettingsLine(text: string, vocabulary: SettingsVocabulary): SettingsLine {
  const source = text.replace(/\r?\n/g, ' ')
  const line = readRange(source, 0, source.length)
  const problems: SettingsProblem[] = []
  const values: Record<string, number | string> = {}
  const body = line.slots.body
  if (!body) {
    problems.push({ problem: 'no_line', word: source.trim(), at: 0 })
    return { schema: SETTINGS_LINE_SCHEMA, head: null, terms: [], values, problems }
  }
  const { mark, word } = splitWord(line.word.text)
  const mode = line.slots.mode
  const head = { mark, word, mode: mode ? source.slice(mode.innerStart, mode.innerEnd).trim() : '' }
  if (line.rest.trim()) problems.push({ problem: 'unread', word: line.rest.trim(), at: line.restStart })

  const { terms, unread } = readSettingsTerms(source, body.innerStart, body.innerEnd)
  for (const u of unread) problems.push({ problem: 'unread', word: u.text, at: u.at })
  const seen = new Set<string>()
  for (const term of terms) {
    const spec = vocabulary[term.word]
    if (!spec) {
      problems.push({ problem: 'unknown_word', word: term.word, at: term.start, written: `${term.mark}${term.word}` })
      continue
    }
    if (seen.has(term.word)) problems.push({ problem: 'repeated', word: term.word, at: term.start })
    seen.add(term.word)
    if (spec.marks && term.mark && !spec.marks.includes(term.mark)) {
      problems.push({ problem: 'other_mark', word: term.word, at: term.start, written: term.mark, used: spec.marks[0] })
    }
    if (spec.kind === 'number') {
      const read = settingNumber(term.value, spec.units)
      if ('problem' in read) {
        problems.push({ problem: read.problem, word: term.word, at: term.start, written: term.value })
        continue
      }
      const n = read.value
      const [low, high] = spec.range
      let used = Math.min(high, Math.max(low, n))
      if (spec.integer) used = Math.round(used)
      if (used !== n) problems.push({ problem: 'clamped', word: term.word, at: term.start, written: term.value, used })
      values[term.word] = used
    } else if (spec.kind === 'choice') {
      if (!spec.choices.includes(term.value)) {
        problems.push({ problem: 'not_a_choice', word: term.word, at: term.start, written: term.value })
        continue
      }
      values[term.word] = term.value
    } else {
      values[term.word] = term.value
    }
  }
  return { schema: SETTINGS_LINE_SCHEMA, head, terms, values, problems }
}

/** Write values as a settings line, in the vocabulary's order. A number is led by %, anything else by =, unless the word names its marks. */
export function writeSettingsLine(head: string, values: Readonly<Record<string, number | string>>, vocabulary: SettingsVocabulary): string {
  const terms: string[] = []
  for (const [word, spec] of Object.entries(vocabulary)) {
    if (!(word in values)) continue
    const mark = spec.marks?.[0] ?? (spec.kind === 'number' ? '%' : '=')
    terms.push(`${mark}${word}[${String(values[word])}]`)
  }
  return terms.length ? `${head}{ ${terms.join(' ')} }` : `${head}{}`
}

/**
 * Earcons: the brace sound tuned in one line of Spw, and the pairs a caret
 * leaves and enters when it moves.
 *
 * A story consumer asked for a schema that lets a blind programmer retune
 * bracket open, body aura and exit cues in under three lines of Spw. This is
 * that line:
 *
 *   ^ear{ %body[392] %frame[523] %scene[659] %step[2] %ms[45] =rough[off] }
 *
 * The marks are a story consumer's: its game's board line writes a chosen
 * texture with = and a number with % (^board{ =cues[shaped] %width[0.3] }), and
 * its proposed ear line uses the same head, so one ^ear line can hold its
 * textures and these brace settings together. A word this reader does not know,
 * such as =wap, is reported and left for the host. A term may also be led by a
 * dot, and a binding reads the same: ^ear{ body: 392, frame: 523 }.
 *
 * Each word names one setting of pairSound (pair-sound.ts). A word left out
 * keeps its default, so ^ear{} is PAIR_SOUND itself. Every number is held
 * to a range: a value outside it is clamped and reported, a value that is not
 * a number is reported and ignored, and a word this reader does not know is
 * reported and never dropped in silence. writeEarcons writes settings back as
 * the line, and reading the line again gives the same settings.
 *
 * pairMoves answers what an editor or a spell's focus handler needs when a
 * caret moves: the pairs it left, innermost first, each with the click of its
 * close; the pairs it entered, outermost first, each with the click of its
 * open; and the innermost pair it now sits in, where a host may hold a body
 * aura. How any of it sounds is the host's.
 *
 * Experimental (spw.earcons/1). The words are a first guess, and nothing here
 * has been heard.
 */

import { readRange } from '../line/read'
import { readSettingsTerms, settingNumber } from './settings-line'
import type { BracePair, PairLabelScan } from './pair-labels'
import { PAIR_SOUND, pairSound, type PairClick, type PairSoundSettings } from './pair-sound'

export const EARCONS_SCHEMA = 'spw.earcons/1' as const

type Range = readonly [number, number]
const HERTZ: Readonly<Record<string, number>> = Object.freeze({ hz: 1, Hz: 1, khz: 1000, kHz: 1000 })

/** Each word, the setting it tunes, and the range its value is held to. */
export const EARCON_WORDS = Object.freeze({
  body: { range: [40, 4000] as Range, says: 'pitch of { } at depth zero, in hertz', units: HERTZ },
  frame: { range: [40, 4000] as Range, says: 'pitch of [ ] at depth zero, in hertz', units: HERTZ },
  scene: { range: [40, 4000] as Range, says: 'pitch of ( ) at depth zero, in hertz', units: HERTZ },
  step: { range: [0, 12] as Range, says: 'semitones one depth lowers a pitch', units: { st: 1 } },
  deepest: { range: [0, 16] as Range, says: 'the deepest depth that still lowers it' },
  ms: { range: [5, 500] as Range, says: 'how long a click lasts, in milliseconds', units: { ms: 1, s: 1000 } },
  decay: { range: [0.5, 20] as Range, says: 'how fast a click dies away; larger is shorter' },
  gain: { range: [0, 1] as Range, says: 'the loudest a click may be' },
  rough: { range: [1.01, 4] as Range, says: 'the rough tone of an edge with no partner, as a ratio of its pitch; off for none' },
  phrase: { range: [40, 4000] as Range, says: 'the start phrase, up to six notes in hertz; the stop phrase is the same notes backward', units: HERTZ },
  voice: { range: [0, 0] as Range, says: 'which voice renders a click: click (the first) or modal (kind as a texture, a label as a phrase, a struck close, one level)' },
  level: { range: [-40, -6] as Range, says: 'the modal voice\'s level, RMS in dB of full scale' },
})

export type EarconWord = keyof typeof EARCON_WORDS

export interface EarconProblem {
  word: string
  /** Where the word is written in the text. */
  at: number
  problem: 'unknown_word' | 'not_a_number' | 'not_a_unit' | 'not_a_choice' | 'clamped' | 'too_many_notes' | 'repeated' | 'unread'
  /** For clamped: what was written and what is used. */
  written?: string
  used?: number
}

export interface EarconReading {
  schema: typeof EARCONS_SCHEMA
  settings: PairSoundSettings
  /** The words the line set, in written order. */
  set: EarconWord[]
  problems: EarconProblem[]
}

const PHRASE_MOST = 6

const clamp = (value: number, [low, high]: Range): number => Math.min(high, Math.max(low, value))

/**
 * Read the earcon settings a line of Spw writes. Line breaks are read as spaces,
 * so the line may be laid over two or three lines. The word before the body is
 * not checked: ^ear, ^earcons and ear read alike.
 */
export function readEarcons(text: string, base: PairSoundSettings = PAIR_SOUND): EarconReading {
  const source = text.replace(/\r?\n/g, ' ')
  const line = readRange(source, 0, source.length)
  const problems: EarconProblem[] = []
  const set: EarconWord[] = []
  const pitch = { ...base.pitch }
  const settings: { -readonly [K in keyof PairSoundSettings]: PairSoundSettings[K] } = { ...base, pitch, phrase: [...base.phrase] }

  const body = line.slots.body
  if (!body) {
    if (source.trim()) problems.push({ word: source.trim(), at: 0, problem: 'unread' })
    return { schema: EARCONS_SCHEMA, settings: freeze(settings), set, problems }
  }
  if (line.rest.trim()) problems.push({ word: line.rest.trim(), at: line.restStart, problem: 'unread' })

  // Terms are read as every settings line is (settings-line.ts): a mark, a word, a value in brackets or after a colon.
  const { terms, unread } = readSettingsTerms(source, body.innerStart, body.innerEnd)
  for (const u of unread) problems.push({ word: u.text, at: u.at, problem: 'unread' })
  for (const term of terms) {
    if (!(term.word in EARCON_WORDS)) {
      problems.push({ word: term.word, at: term.start, problem: 'unknown_word' })
      continue
    }
    const word = term.word as EarconWord
    if (set.includes(word)) problems.push({ word, at: term.start, problem: 'repeated' })
    else set.push(word)
    tune(settings, pitch, word, term.value, term.start, problems)
  }
  return { schema: EARCONS_SCHEMA, settings: freeze(settings), set, problems }
}

function tune(
  settings: { -readonly [K in keyof PairSoundSettings]: PairSoundSettings[K] },
  pitch: Record<'{' | '[' | '(', number>,
  word: EarconWord,
  value: string,
  at: number,
  problems: EarconProblem[],
): void {
  const range = EARCON_WORDS[word].range
  const units = (EARCON_WORDS[word] as { units?: Readonly<Record<string, number>> }).units
  if (word === 'rough' && value === 'off') {
    settings.rough = 0
    return
  }
  if (word === 'voice') {
    if (value === 'click' || value === 'modal') settings.voice = value
    else problems.push({ word, at, problem: 'not_a_choice', written: value })
    return
  }
  if (word === 'phrase') {
    const notes = value.split(/[\s,]+/).filter(Boolean)
    const read: number[] = []
    for (const note of notes) {
      const n = settingNumber(note, units)
      if ('problem' in n) problems.push({ word, at, problem: n.problem, written: note })
      else read.push(held(word, n.value, note, range, at, problems))
    }
    if (read.length > PHRASE_MOST) problems.push({ word, at, problem: 'too_many_notes', written: String(read.length), used: PHRASE_MOST })
    settings.phrase = read.slice(0, PHRASE_MOST)
    return
  }
  // One reader says what a written number is (number-form.ts): 1e3, a ratio, a percent, a unit the word lists.
  const read = settingNumber(value, units)
  if ('problem' in read) {
    problems.push({ word, at, problem: read.problem, written: value })
    return
  }
  const used = held(word, read.value, value, range, at, problems)
  switch (word) {
    case 'body': pitch['{'] = used; break
    case 'frame': pitch['['] = used; break
    case 'scene': pitch['('] = used; break
    case 'step': settings.stepPerDepth = used; break
    case 'deepest': settings.deepest = Math.round(used); break
    case 'ms': settings.seconds = used / 1000; break
    case 'decay': settings.decay = used; break
    case 'gain': settings.gain = used; break
    case 'rough': settings.rough = used; break
    case 'level': settings.level = used; break
  }
}

function held(word: string, n: number, written: string, range: Range, at: number, problems: EarconProblem[]): number {
  const used = clamp(n, range)
  if (used !== n) problems.push({ word, at, problem: 'clamped', written, used })
  return used
}

function freeze(settings: PairSoundSettings): PairSoundSettings {
  return Object.freeze({ ...settings, pitch: Object.freeze({ ...settings.pitch }), phrase: Object.freeze([...settings.phrase]) })
}

/** Seconds as milliseconds, with the float noise of the product taken out. */
const msOf = (seconds: number): number => Number((seconds * 1000).toPrecision(12))

/** Numbers are written exactly, so a line written and read again gives the same settings. */
const num = (n: number): string => String(n)

/**
 * Write settings as one line of Spw: a number led by %, a choice (rough off) by =.
 * Only what differs from `base` is written unless `all` is set, so the defaults
 * write as ^ear{}.
 */
export function writeEarcons(settings: PairSoundSettings, options: { base?: PairSoundSettings; all?: boolean; word?: string } = {}): string {
  const base = options.base ?? PAIR_SOUND
  const all = options.all ?? false
  const out: string[] = []
  const put = (word: EarconWord, value: string, baseValue: string): void => {
    if (all || value !== baseValue) out.push(`${/^[\d.\-, ]+$/.test(value) ? '%' : '='}${word}[${value}]`)
  }
  put('body', num(settings.pitch['{']), num(base.pitch['{']))
  put('frame', num(settings.pitch['[']), num(base.pitch['[']))
  put('scene', num(settings.pitch['(']), num(base.pitch['(']))
  put('step', num(settings.stepPerDepth), num(base.stepPerDepth))
  put('deepest', num(settings.deepest), num(base.deepest))
  put('ms', num(msOf(settings.seconds)), num(msOf(base.seconds)))
  put('decay', num(settings.decay), num(base.decay))
  put('gain', num(settings.gain), num(base.gain))
  put('rough', settings.rough ? num(settings.rough) : 'off', base.rough ? num(base.rough) : 'off')
  put('phrase', settings.phrase.map(num).join(', '), base.phrase.map(num).join(', '))
  // The voice and its level are written only when set, so a line from before they existed reads back the same.
  if (settings.voice !== undefined && (all || settings.voice !== base.voice)) out.push(`=voice[${settings.voice}]`)
  if (settings.level !== undefined && (all || settings.level !== base.level)) out.push(`%level[${num(settings.level)}]`)
  const word = options.word ?? '^ear'
  return out.length ? `${word}{ ${out.join(' ')} }` : `${word}{}`
}

export interface PairMove {
  /** Pairs the caret left, innermost first, with the click of each close. */
  left: Array<{ pair: BracePair; click: PairClick }>
  /** Pairs the caret entered, outermost first, with the click of each open. */
  entered: Array<{ pair: BracePair; click: PairClick }>
  /** The innermost pair the caret now sits in, where a host may hold an aura; null at the top. */
  within: BracePair | null
}

/** Whether a caret at `offset` sits inside a pair: after its open, up to and at its close. */
const holds = (pair: BracePair, offset: number): boolean => pair.open.at < offset && offset <= pair.close.at

/**
 * The pairs a caret leaves and enters moving from one offset to another. A move
 * inside one pair is silent; a move back reverses both lists. Pairs that cross
 * are each listed once, ordered by where they open.
 */
export function pairMoves(scan: PairLabelScan, from: number, to: number, settings: PairSoundSettings = PAIR_SOUND): PairMove {
  const clicks = new Map<number, PairClick>()
  for (const click of pairSound(scan, settings).clicks) clicks.set(click.at, click)
  const left = scan.pairs
    .filter((pair) => holds(pair, from) && !holds(pair, to))
    .sort((a, b) => b.open.at - a.open.at)
    .map((pair) => ({ pair, click: clicks.get(pair.close.at)! }))
  const entered = scan.pairs
    .filter((pair) => holds(pair, to) && !holds(pair, from))
    .sort((a, b) => a.open.at - b.open.at)
    .map((pair) => ({ pair, click: clicks.get(pair.open.at)! }))
  let within: BracePair | null = null
  for (const pair of scan.pairs) if (holds(pair, to) && (!within || pair.open.at > within.open.at)) within = pair
  return { left, entered, within }
}

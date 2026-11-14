/**
 * A second voice for the brace sound, modelled on struck objects. A host picks
 * it in the ear line with =voice[modal]; without that word every click renders
 * the samples it rendered before.
 *
 * Measured on the first voice's samples (spoken-form, 2026-11-13): a frame at
 * depth d and a scene at depth d + 2 were the same click, because kind and depth
 * shared one dial; a labeled click sat up to 7.8 dB below a bare one; a close,
 * being its open backward, held none of its energy in its first 10 ms; and a
 * low bare click, a pure sine, held almost none of its energy where a small
 * speaker plays. This voice answers each by construction:
 *
 *   kind     a texture: the ratios at which a struck object of that shape rings.
 *            { } rings as a free bar (a wood block), [ ] as a plucked string
 *            (whole-number ratios), ( ) as a round drum skin. Kinds differ in the
 *            shape of their spectrum, so depth can keep the pitch dial alone.
 *   depth    the pitch, lowered by step as before.
 *   label    a phrase of up to three short notes from its letters, on a
 *            pentatonic ladder above the click's pitch. An open plays the phrase
 *            and then its strike; a close plays its strike and then the phrase
 *            backward, so a close is its open's events in reverse order, and a
 *            mirrored close label is heard as the retrograde it is written as.
 *   close    struck too, and damped harder, as a hand stopping what rang.
 *   level    every click is scaled to one RMS, written in dB in the ear line.
 *
 * The ratios are textbook idealisations (a free-free bar's first modes, the
 * zeros of Bessel functions for a membrane, the harmonic series for a string),
 * kept to their first few modes. The strengths are not: they say where the
 * object is struck or plucked, and were chosen so the first mode is weaker than
 * the second, as a hard mallet near a bar's end or a pluck near a string's end
 * makes it. That moves a low click's energy up to where a small speaker plays:
 * measured, every bare click at depths 0 to 6 holds at least 0.85 of its energy
 * between 300 and 3,000 Hz, where the first voice's lowest held 0.027. They are a
 * model, not a recording, and nothing here has been heard.
 *
 * Every function is arithmetic on numbers; no audio interface is touched.
 */

import type { BraceKind } from '../pair-labels'
import type { PairClick, PairSoundSettings } from './pair-sound'
import { rms } from './measure'

export { rms } from './measure'

/** One texture: mode ratios to the pitch, each mode's strength, and how much faster each higher mode dies. */
export interface Texture {
  name: string
  ratios: readonly number[]
  strengths: readonly number[]
  /** A mode at ratio r dies r ** damping times faster than the first. */
  damping: number
}

export const TEXTURES: Readonly<Record<BraceKind, Texture>> = Object.freeze({
  // Free-free bar, first four modes: 1, 2.756, 5.404, 8.933.
  '{': Object.freeze({ name: 'bar', ratios: Object.freeze([1, 2.756, 5.404, 8.933]), strengths: Object.freeze([0.35, 1, 0.8, 0.4]), damping: 0.25 }),
  // Ideal plucked string: the harmonic series, strengths falling as 1 / n.
  '[': Object.freeze({ name: 'string', ratios: Object.freeze([1, 2, 3, 4, 5, 6]), strengths: Object.freeze([0.4, 0.9, 0.9, 0.7, 0.55, 0.4]), damping: 0.4 }),
  // Circular membrane, modes (0,1) (1,1) (2,1) (0,2) (3,1) (1,2): 1, 1.594, 2.136, 2.296, 2.653, 2.918.
  '(': Object.freeze({ name: 'membrane', ratios: Object.freeze([1, 1.594, 2.136, 2.296, 2.653, 2.918]), strengths: Object.freeze([1, 0.8, 0.65, 0.5, 0.45, 0.35]), damping: 1.4 }),
})

/** Semitones above the click's pitch that a label's letters choose from: two octaves of a pentatonic scale. */
export const PHRASE_LADDER = Object.freeze([0, 2, 4, 7, 9, 12, 14, 16, 19, 21])

/** How long one note of a label's phrase lasts, and how loud it is beside the strike. */
const NOTE_SECONDS = 0.03
const NOTE_WEIGHT = 0.55
/** How much harder a close is damped than an open. */
const CLOSE_DAMPING = 2.5
/**
 * The level a click is scaled to when the ear line names none, in dB of full scale (RMS). A struck, damped close
 * puts its energy into a few milliseconds, so its peak sits up to 23.6 dB above its RMS (measured over the three
 * kinds, depths 0 to 6, labeled and bare, paired and not); -24 leaves every click its headroom.
 */
export const MODAL_LEVEL_DB = -24

/** The rungs of the ladder a label's letters choose: up to three, from its first, middle and last letters. */
export function labelPhrase(label: string): number[] {
  const letters = label.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!letters) return []
  const picks = letters.length <= 3 ? [...letters] : [letters[0], letters[Math.floor(letters.length / 2)], letters[letters.length - 1]]
  return picks.map((ch) => {
    const code = ch.charCodeAt(0)
    const index = code >= 97 ? code - 97 : code - 48 + 26
    return PHRASE_LADDER[index % PHRASE_LADDER.length]
  })
}

/** One sounding event inside a click: a texture struck at a pitch, at a time. */
export interface ModalEvent {
  role: 'strike' | 'note'
  /** Seconds from the start of the click. */
  at: number
  seconds: number
  hertz: number
  /** Relative loudness before the click is levelled. */
  weight: number
  /** Multiplies how fast every mode dies. */
  damping: number
  /** A second, inharmonic partial for an edge with no partner, as a ratio of the pitch; 0 for none. */
  rough: number
}

/** The events of one click, in the order they sound. A close's events are its open's in reverse order. */
export function modalEvents(click: PairClick, settings: PairSoundSettings): ModalEvent[] {
  const rough = click.paired ? 0 : settings.rough
  const strike = (at: number): ModalEvent => ({
    role: 'strike',
    at,
    seconds: click.seconds,
    hertz: click.pitch,
    weight: 1,
    damping: click.edge === 'close' ? CLOSE_DAMPING : 1,
    rough,
  })
  const notes = labelPhrase(click.label ?? '').map((semitones) => click.pitch * 2 ** (semitones / 12))
  if (click.edge === 'open') {
    const events: ModalEvent[] = notes.map((hertz, i) => ({ role: 'note', at: i * NOTE_SECONDS, seconds: NOTE_SECONDS, hertz, weight: NOTE_WEIGHT, damping: 1, rough: 0 }))
    events.push(strike(notes.length * NOTE_SECONDS))
    return events
  }
  const events: ModalEvent[] = [strike(0)]
  ;[...notes].reverse().forEach((hertz, i) => {
    events.push({ role: 'note', at: click.seconds + i * NOTE_SECONDS, seconds: NOTE_SECONDS, hertz, weight: NOTE_WEIGHT, damping: CLOSE_DAMPING, rough: 0 })
  })
  return events
}

/** The samples of one event: each mode of the texture, struck and dying away at its own rate. */
function sound(event: ModalEvent, texture: Texture, decay: number, sampleRate: number): Float32Array {
  const length = Math.max(1, Math.round(event.seconds * sampleRate))
  const out = new Float32Array(length)
  const nyquist = sampleRate / 2
  const rise = Math.max(1, Math.round(0.001 * sampleRate))
  const tail = Math.min(length, Math.round(0.004 * sampleRate))
  for (let k = 0; k < texture.ratios.length; k++) {
    const hertz = event.hertz * texture.ratios[k]
    if (hertz >= nyquist) continue
    const rate = (decay * event.damping * texture.ratios[k] ** texture.damping) / length
    const strength = texture.strengths[k]
    const w = (2 * Math.PI * hertz) / sampleRate
    for (let i = 0; i < length; i++) out[i] += strength * Math.exp(-rate * i) * Math.sin(w * i)
  }
  if (event.rough && event.hertz * event.rough < nyquist) {
    const w = (2 * Math.PI * event.hertz * event.rough) / sampleRate
    const rate = (decay * event.damping) / length
    for (let i = 0; i < length; i++) out[i] += 0.8 * Math.exp(-rate * i) * Math.sin(w * i)
  }
  for (let i = 0; i < rise; i++) out[i] *= i / rise
  for (let i = 0; i < tail; i++) out[length - 1 - i] *= i / tail
  for (let i = 0; i < length; i++) out[i] *= event.weight
  return out
}

/** The samples of one click in the modal voice, scaled to the ear line's level. */
export function renderModalClick(click: PairClick, sampleRate: number, settings: PairSoundSettings): Float32Array {
  const events = modalEvents(click, settings)
  const texture = TEXTURES[click.kind]
  const end = Math.max(...events.map((e) => e.at + e.seconds))
  const out = new Float32Array(Math.max(1, Math.round(end * sampleRate)))
  for (const event of events) {
    const samples = sound(event, texture, settings.decay, sampleRate)
    const at = Math.round(event.at * sampleRate)
    for (let i = 0; i < samples.length && at + i < out.length; i++) out[at + i] += samples[i]
  }
  const target = 10 ** ((settings.level ?? MODAL_LEVEL_DB) / 20)
  const now = rms(out)
  if (now > 0) {
    let scale = target / now
    // Never past full scale: a click that would clip is levelled to its peak instead, and is the quieter for it.
    let peak = 0
    for (const x of out) peak = Math.max(peak, Math.abs(x))
    if (peak * scale > 0.99) scale = 0.99 / peak
    for (let i = 0; i < out.length; i++) out[i] *= scale
  }
  return out
}

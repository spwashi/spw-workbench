/**
 * A click for every brace, with a timbre that follows the pair's label.
 *
 * A sighted reader matches a close to its open by indentation. A listener has
 * nothing but order, so a close has to sound like the open it answers. This
 * turns a pair-label scan into a list of clicks, each a small set of numbers a
 * host can hand to an oscillator or render to samples here:
 *
 *   kind    the pitch: { } [ ] and ( ) sit on three notes of one chord
 *   depth   a pair inside another sounds a step lower, to a floor
 *   label   the timbre: which overtones sound, and how strongly, from the
 *           label's letters; a bare pair is one pure tone
 *   edge    an open is struck and dies away; a close is the same sound
 *           backward, swelling to its stop
 *   paired  an edge with no partner carries a rough second tone
 *
 * So an open and its close hold the same overtones in the same strengths, two
 * labels differ in timbre, and a missing partner can be heard. A surface, or
 * any stretch a host wants bounded, starts with a short rising phrase and
 * stops with the same phrase backward.
 *
 * Everything is arithmetic on numbers: no audio interface is touched, so the
 * same plan runs in a browser, a worker or a test. renderClick and
 * renderPairSound return samples between -1 and 1, and wavBytes wraps samples
 * as a file a host may save or play.
 *
 * Experimental: whether a sound on a brace is a reading of it or a decoration
 * is a trial (wonder_trial_modality), and spw.pair-sound/1 may change. The
 * numbers are a first guess. Nothing here was heard by anyone.
 */

import type { BraceEdge, BraceKind, PairLabelScan } from './pair-labels'
import { renderModalClick } from './modal-sound'

export const PAIR_SOUND_SCHEMA = 'spw.pair-sound/1' as const

/** How many overtones a label may colour, above the pure tone every click has. */
export const OVERTONES = 5

export interface PairSoundSettings {
  /** The pitch of each kind at depth zero, in hertz: three notes of one chord. */
  pitch: Readonly<Record<BraceKind, number>>
  /** How far one depth lowers the pitch, in semitones, and the deepest depth that still lowers it. */
  stepPerDepth: number
  deepest: number
  /** How long a click lasts, in seconds, and how fast it dies away (larger is shorter). */
  seconds: number
  decay: number
  /** The loudest a click may be, of 1. */
  gain: number
  /** The rough tone an unpaired edge carries, as a ratio of its pitch. */
  rough: number
  /** The start phrase, in hertz, each note one click long; the stop phrase is the same notes backward. */
  phrase: readonly number[]
  /**
   * Which voice renders a click: the first voice (a tone and overtones, a close its open backward), or the
   * modal voice (modal-sound.ts: kind as a texture, a label as a phrase, a struck close, one level). Absent is the first.
   */
  voice?: 'click' | 'modal'
  /** The modal voice's level, RMS in dB of full scale. Absent is MODAL_LEVEL_DB. */
  level?: number
}

export const PAIR_SOUND: PairSoundSettings = Object.freeze({
  pitch: Object.freeze({ '{': 392, '[': 523.25, '(': 659.25 }),
  stepPerDepth: 2,
  deepest: 6,
  seconds: 0.045,
  decay: 5,
  gain: 0.6,
  rough: Math.SQRT2,
  phrase: Object.freeze([523.25, 659.25, 783.99]),
})

export interface PairClick {
  /** Offset and one-based line of the brace. */
  at: number
  line: number
  kind: BraceKind
  edge: 'open' | 'close'
  label?: string
  /** Whether the edge found its partner. */
  paired: boolean
  depth: number
  /** Lines from the pair's open to its close; 0 on one line and on an edge with no partner. */
  span: number
  /** The pure tone, in hertz. */
  pitch: number
  /** Strength of each overtone above the pure tone, 0 to 1: the label's timbre. All zero on a bare pair. */
  timbre: number[]
  seconds: number
  gain: number
}

export interface PairSound {
  schema: typeof PAIR_SOUND_SCHEMA
  /** One click per brace, in source order. */
  clicks: PairClick[]
  /** The phrase a host plays before the first click, and after the last. */
  start: number[]
  stop: number[]
}

/** FNV-1a over the label's code points, stepped once per overtone. */
function hash(text: string, salt: number): number {
  let h = 0x811c9dc5 ^ salt
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  return h >>> 0
}

/**
 * A label's timbre: the strength of each overtone, in quarters. A bare pair has
 * none. Every label sounds at least one overtone, so no label is taken for a
 * bare pair, and the same letters always give the same timbre.
 */
export function labelTimbre(label?: string): number[] {
  const timbre: number[] = new Array<number>(OVERTONES).fill(0)
  if (!label) return timbre
  for (let i = 0; i < OVERTONES; i++) timbre[i] = (hash(label, i + 1) % 5) / 4
  if (!timbre.some((strength) => strength > 0)) timbre[hash(label, 0) % OVERTONES] = 1
  return timbre
}

/** The clicks of a scan, in source order, with the phrases that bound them. */
export function pairSound(scan: PairLabelScan, settings: PairSoundSettings = PAIR_SOUND): PairSound {
  const depthAt = new Map<number, number>()
  const spanAt = new Map<number, number>()
  const paired = new Set<number>()
  for (const pair of scan.pairs) {
    depthAt.set(pair.open.at, pair.depth)
    depthAt.set(pair.close.at, pair.depth)
    spanAt.set(pair.open.at, pair.close.line - pair.open.line)
    spanAt.set(pair.close.at, pair.close.line - pair.open.line)
    paired.add(pair.open.at)
    paired.add(pair.close.at)
  }
  const edges: BraceEdge[] = scan.events.map((event) => event.edge).sort((a, b) => a.at - b.at)
  const clicks = edges.map((edge): PairClick => {
    const depth = depthAt.get(edge.at) ?? 0
    const steps = Math.min(depth, settings.deepest) * settings.stepPerDepth
    return {
      at: edge.at,
      line: edge.line,
      kind: edge.kind,
      edge: edge.edge,
      ...(edge.label ? { label: edge.label } : {}),
      paired: paired.has(edge.at),
      depth,
      span: spanAt.get(edge.at) ?? 0,
      pitch: settings.pitch[edge.kind] * 2 ** (-steps / 12),
      timbre: labelTimbre(edge.label),
      seconds: settings.seconds,
      gain: settings.gain,
    }
  })
  return { schema: PAIR_SOUND_SCHEMA, clicks, start: [...settings.phrase], stop: [...settings.phrase].reverse() }
}

/** One struck tone: a pure tone and its overtones under an envelope that dies away. */
function strike(pitch: number, timbre: readonly number[], rough: number, seconds: number, gain: number, decay: number, sampleRate: number): Float32Array {
  const length = Math.max(1, Math.round(seconds * sampleRate))
  const out = new Float32Array(length)
  let total = 1
  for (const strength of timbre) total += strength
  if (rough) total += 0.8
  const nyquist = sampleRate / 2
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    let sample = Math.sin(2 * Math.PI * pitch * t)
    for (let k = 0; k < timbre.length; k++) {
      const overtone = pitch * (k + 2)
      if (timbre[k] && overtone < nyquist) sample += timbre[k] * Math.sin(2 * Math.PI * overtone * t)
    }
    if (rough) sample += 0.8 * Math.sin(2 * Math.PI * pitch * rough * t)
    // A short rise so the first sample is silent, then the fall.
    const rise = Math.min(1, i / (0.002 * sampleRate))
    out[i] = (gain * rise * Math.exp((-decay * i) / length) * sample) / total
  }
  // Close on silence, so a click set against another leaves no step between them.
  const tail = Math.min(length, Math.round(0.004 * sampleRate))
  for (let i = 0; i < tail; i++) out[length - 1 - i] *= i / tail
  return out
}

/** The samples of one click. In the first voice a close is its open's samples backward; =voice[modal] renders it as modal-sound.ts says. */
export function renderClick(click: PairClick, sampleRate = 44100, settings: PairSoundSettings = PAIR_SOUND): Float32Array {
  if (settings.voice === 'modal') return renderModalClick(click, sampleRate, settings)
  const out = strike(click.pitch, click.timbre, click.paired ? 0 : settings.rough, click.seconds, click.gain, settings.decay, sampleRate)
  return click.edge === 'close' ? out.reverse() : out
}

/** The samples of a phrase: its notes struck one after another. */
export function renderPhrase(notes: readonly number[], sampleRate = 44100, settings: PairSoundSettings = PAIR_SOUND): Float32Array {
  const each = notes.map((note) => strike(note, [], 0, settings.seconds, settings.gain, settings.decay, sampleRate))
  const out = new Float32Array(each.reduce((sum, samples) => sum + samples.length, 0))
  let at = 0
  for (const samples of each) {
    out.set(samples, at)
    at += samples.length
  }
  return out
}

export interface RenderOptions {
  sampleRate?: number
  /** Silence between two clicks, in seconds. Default 0.09. */
  gap?: number
  /** Whether the start and stop phrases are played. Default true. */
  phrases?: boolean
  settings?: PairSoundSettings
}

/** A whole plan as samples: the start phrase, every click in order with a gap between, the stop phrase. */
export function renderPairSound(sound: PairSound, options: RenderOptions = {}): Float32Array {
  const sampleRate = options.sampleRate ?? 44100
  const settings = options.settings ?? PAIR_SOUND
  const gap = new Float32Array(Math.round((options.gap ?? 0.09) * sampleRate))
  const pieces: Float32Array[] = []
  if (options.phrases ?? true) pieces.push(renderPhrase(sound.start, sampleRate, settings), gap, gap)
  sound.clicks.forEach((click, i) => {
    if (i) pieces.push(gap)
    pieces.push(renderClick(click, sampleRate, settings))
  })
  if (options.phrases ?? true) pieces.push(gap, gap, renderPhrase(sound.stop, sampleRate, settings))
  const out = new Float32Array(pieces.reduce((sum, piece) => sum + piece.length, 0))
  let at = 0
  for (const piece of pieces) {
    out.set(piece, at)
    at += piece.length
  }
  return out
}

/** Samples as a 16-bit mono WAV file. */
export function wavBytes(samples: Float32Array, sampleRate = 44100): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const ascii = (at: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const clipped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, Math.round(clipped * 32767), true)
  }
  return bytes
}

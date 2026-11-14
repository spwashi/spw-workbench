/**
 * A click for every brace. The laws are measured on the rendered samples: an
 * open and its close hold the same overtones, a close is its open backward,
 * a label's overtones come out at the strengths its timbre asks for, a bare
 * pair is one tone, and an edge with no partner carries a tone no paired edge
 * has. Nothing here was heard: these tests say what the samples hold, not how
 * they sound.
 */
import { describe, expect, it } from 'vitest'
import { seededRandom } from '../seeded-random'
import { scanPairLabels } from '../pair-labels'
import { amplitude } from './measure'
import { OVERTONES, PAIR_SOUND, PAIR_SOUND_SCHEMA, labelTimbre, pairSound, renderClick, renderPairSound, renderPhrase, wavBytes, type PairClick } from './pair-sound'

const RATE = 44100
const KEPT = '^kept[thursday]{_thursday .day["2026-11-27"] *kept_place{ ~warm[4] } yadsruht_}'

const strength = (samples: Float32Array, hertz: number): number => amplitude(samples, hertz, RATE)

const overtones = (click: PairClick, samples = renderClick(click, RATE)): number[] => {
  const pure = strength(samples, click.pitch)
  return click.timbre.map((_, k) => strength(samples, click.pitch * (k + 2)) / pure)
}

const clicksOf = (source: string): PairClick[] => pairSound(scanPairLabels(source)).clicks

const seeded = seededRandom

describe('pairSound', () => {
  it('gives every brace a click, in source order, bounded by a phrase and the same phrase backward', () => {
    const sound = pairSound(scanPairLabels(KEPT))
    expect(sound.schema).toBe(PAIR_SOUND_SCHEMA)
    expect(sound.clicks.map((c) => `${c.edge} ${c.kind}${c.label ? ` ${c.label}` : ''}`)).toEqual([
      'open [',
      'close [',
      'open { thursday',
      'open [',
      'close [',
      'open {',
      'open [',
      'close [',
      'close {',
      'close { thursday',
    ])
    expect(sound.clicks.map((c) => c.at)).toEqual([...sound.clicks.map((c) => c.at)].sort((a, b) => a - b))
    expect(sound.stop).toEqual([...sound.start].reverse())
    expect(sound.clicks.every((c) => c.paired)).toBe(true)
  })

  it('gives a label the same timbre on its open and its close, and a bare pair none', () => {
    const [open, close] = clicksOf(KEPT).filter((c) => c.label === 'thursday')
    expect(open.timbre).toEqual(close.timbre)
    expect(open.timbre.some((s) => s > 0)).toBe(true)
    expect(open.pitch).toBe(close.pitch)
    for (const bare of clicksOf(KEPT).filter((c) => !c.label)) expect(bare.timbre).toEqual(new Array(OVERTONES).fill(0))
  })

  it('gives a repeated close and a mirrored close the same click', () => {
    const mirrored = clicksOf('{_axes b sexa_}').filter((c) => c.edge === 'close' && c.label)
    const repeated = clicksOf('{_axes b }_axes').filter((c) => c.edge === 'close' && c.label)
    expect(mirrored).toHaveLength(1)
    expect(repeated).toHaveLength(1)
    expect(mirrored[0].timbre).toEqual(repeated[0].timbre)
  })

  it('sets the three kinds on three pitches and lowers a pair inside another, to a floor', () => {
    const [body, frame, scope] = ['{}', '[]', '()'].map((pair) => clicksOf(pair)[0].pitch)
    expect(new Set([body, frame, scope]).size).toBe(3)
    const nested = clicksOf('{{{{{{{{{}}}}}}}}}').filter((c) => c.edge === 'open')
    expect(nested[1].pitch).toBeLessThan(nested[0].pitch)
    expect(nested[1].pitch / nested[0].pitch).toBeCloseTo(2 ** (-PAIR_SOUND.stepPerDepth / 12), 9)
    expect(nested[8].pitch).toBe(nested[PAIR_SOUND.deepest].pitch)
  })

  it('tells labels apart: the same letters always the same timbre, and most labels a timbre of their own', () => {
    const named = ['topography', 'thursday', 'ringtide', 'axes', 'A', 'B', 'kept', 'board']
    const timbres = named.map((label) => labelTimbre(label).join())
    expect(new Set(timbres).size).toBe(named.length)
    expect(labelTimbre('thursday')).toEqual(labelTimbre('thursday'))
    const rand = seeded(20261113)
    const made = new Set<string>()
    const heard = new Set<string>()
    while (made.size < 400) {
      const label = Array.from({ length: 1 + Math.floor(rand() * 9) }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(rand() * 26)]).join('')
      if (made.has(label)) continue
      made.add(label)
      const timbre = labelTimbre(label)
      expect(timbre.some((s) => s > 0), label).toBe(true)
      heard.add(timbre.join())
    }
    // 3,124 timbres are possible, so 400 labels cannot all differ; a surface holds a handful.
    expect(heard.size).toBeGreaterThan(340)
  })
})

describe('renderClick', () => {
  it('renders a close as its open backward, sample for sample', () => {
    const [open, close] = clicksOf(KEPT).filter((c) => c.label === 'thursday')
    const forward = renderClick(open, RATE)
    const backward = renderClick(close, RATE)
    expect(backward.length).toBe(forward.length)
    for (let i = 0; i < forward.length; i++) expect(backward[i]).toBe(forward[forward.length - 1 - i])
  })

  it('holds the same overtones in an open and its close, at the strengths the label asks for', () => {
    const [open, close] = clicksOf(KEPT).filter((c) => c.label === 'thursday')
    const inOpen = overtones(open)
    const inClose = overtones(close)
    for (let k = 0; k < OVERTONES; k++) {
      expect(inClose[k]).toBeCloseTo(inOpen[k], 6)
      expect(Math.abs(inOpen[k] - open.timbre[k]), `overtone ${k + 2}`).toBeLessThan(0.08)
    }
  })

  it('renders a bare pair as one tone, and two labels as two timbres', () => {
    const bare = clicksOf('{ a }')[0]
    for (const heard of overtones(bare)) expect(heard).toBeLessThan(0.05)
    const [a, b] = ['thursday', 'topography'].map((label) => overtones(clicksOf(`{_${label} a }_${label}`)[0]))
    const apart = Math.max(...a.map((heard, k) => Math.abs(heard - b[k])))
    expect(apart).toBeGreaterThan(0.2)
  })

  it('lets a missing partner be heard: a tone no paired edge carries', () => {
    const [paired] = clicksOf('{ a }')
    const [stray] = clicksOf('{ a')
    expect(paired.paired).toBe(true)
    expect(stray.paired).toBe(false)
    const rough = paired.pitch * PAIR_SOUND.rough
    const inPaired = strength(renderClick(paired, RATE), rough) / strength(renderClick(paired, RATE), paired.pitch)
    const inStray = strength(renderClick(stray, RATE), rough) / strength(renderClick(stray, RATE), stray.pitch)
    // A click this short spreads its one tone a little, so a paired edge is not silent there: the rough tone is several times that.
    expect(inPaired).toBeLessThan(0.15)
    expect(inStray).toBeGreaterThan(0.5)
    expect(inStray).toBeGreaterThan(inPaired * 4)
  })

  it('stays inside its gain, begins and ends on silence, and is short', () => {
    for (const click of clicksOf(`${KEPT} ) ]`)) {
      const samples = renderClick(click, RATE)
      expect(samples.length / RATE).toBeLessThanOrEqual(0.05)
      expect(Math.abs(samples[0])).toBeLessThan(1e-6)
      expect(Math.abs(samples[samples.length - 1])).toBeLessThan(1e-6)
      let peak = 0
      for (const x of samples) peak = Math.max(peak, Math.abs(x))
      expect(peak).toBeLessThanOrEqual(PAIR_SOUND.gain)
      expect(peak).toBeGreaterThan(0.05)
    }
  })

  it('renders the same plan to the same samples, and a whole plan with its phrases', () => {
    const sound = pairSound(scanPairLabels(KEPT))
    const once = renderPairSound(sound, { sampleRate: RATE })
    const twice = renderPairSound(pairSound(scanPairLabels(KEPT)), { sampleRate: RATE })
    expect(once.length).toBe(twice.length)
    expect(once.every((x, i) => x === twice[i])).toBe(true)
    const bare = renderPairSound(sound, { sampleRate: RATE, phrases: false })
    const phrase = renderPhrase(sound.start, RATE)
    expect(once.length).toBeGreaterThan(bare.length + phrase.length * 2 - 1)
    // The start phrase rises and the stop phrase falls: the first note of one is the last of the other.
    const note = Math.round(PAIR_SOUND.seconds * RATE)
    expect(strength(once.subarray(0, note), sound.start[0])).toBeGreaterThan(strength(once.subarray(0, note), sound.start[2]) * 3)
    expect(strength(once.subarray(once.length - note), sound.start[0])).toBeGreaterThan(strength(once.subarray(once.length - note), sound.start[2]) * 3)
  })

  it('wraps samples as a 16-bit mono WAV file', () => {
    const samples = renderClick(clicksOf('{ a }')[0], RATE)
    const bytes = wavBytes(samples, RATE)
    const view = new DataView(bytes.buffer)
    const tag = (at: number): string => String.fromCharCode(...bytes.subarray(at, at + 4))
    expect([tag(0), tag(8), tag(12), tag(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data'])
    expect(bytes.length).toBe(44 + samples.length * 2)
    expect(view.getUint32(24, true)).toBe(RATE)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(samples.length * 2)
  })
})

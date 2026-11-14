/**
 * The modal voice, held to the laws the spoken-form plan wrote for the brace
 * sound, measured on rendered samples. Each law states the first voice's number
 * beside it, so the change is visible. Nothing here was heard: these tests say
 * what samples hold, not how they sound.
 */
import { describe, expect, it } from 'vitest'
import { BRACE_CLOSE, scanPairLabels, type BraceKind } from '../pair-labels'
import { bandShare, halfEnergyAt, onsetShare, power as measurePower, spectralDistance, spectrum as measureSpectrum } from './measure'
import { PAIR_SOUND, pairSound, renderClick, type PairClick, type PairSoundSettings } from './pair-sound'
import { readEarcons } from './earcons'
import { MODAL_LEVEL_DB, PHRASE_LADDER, TEXTURES, labelPhrase, modalEvents, renderModalClick, rms } from './modal-sound'

const RATE = 44100
const MODAL: PairSoundSettings = { ...PAIR_SOUND, voice: 'modal' }
const CLOSE = BRACE_CLOSE
const KINDS: BraceKind[] = ['{', '[', '(']

const power = (samples: Float32Array, hertz: number): number => measurePower(samples, hertz, RATE)
const spectrum = (samples: Float32Array): number[] => measureSpectrum(samples, RATE)
const distance = spectralDistance
const inBand = (samples: Float32Array, low = 300, high = 3000): number => bandShare(samples, low, high, RATE)

/** The open (or close) click of the pair at a depth, written inside depth bare pairs of the same kind. */
function clickAt(kind: BraceKind, depth: number, edge: 'open' | 'close', label = '', settings = MODAL): PairClick {
  const inner = label ? `${kind}_${label} x ${CLOSE[kind]}_${label}` : `${kind} x ${CLOSE[kind]}`
  const text = `${`${kind} `.repeat(depth)}${inner}${` ${CLOSE[kind]}`.repeat(depth)}`
  return pairSound(scanPairLabels(text), settings).clicks.find((c) => c.depth === depth && c.edge === edge && (c.label ?? '') === label)!
}

const firstShare = (s: Float32Array, seconds: number): number => onsetShare(s, seconds, RATE)
const halfAt = halfEnergyAt

describe('the modal voice', () => {
  it('is chosen only by =voice[modal]: without it every click renders the samples it rendered before', () => {
    for (const kind of KINDS) {
      for (const edge of ['open', 'close'] as const) {
        const click = clickAt(kind, 2, edge, 'thursday', PAIR_SOUND)
        const before = renderClick(click, RATE, PAIR_SOUND)
        expect(renderClick(click, RATE, { ...PAIR_SOUND, voice: 'click' })).toEqual(before)
        expect(renderClick(click, RATE, readEarcons('^ear{}').settings)).toEqual(before)
        expect(renderClick(click, RATE, readEarcons('^ear{ =voice[modal] }').settings)).not.toEqual(before)
      }
    }
  })

  it('keeps every kind apart from every other at every depth (first voice: two pairings identical)', () => {
    const measure = (settings: PairSoundSettings) => {
      const spectra = KINDS.flatMap((kind) => Array.from({ length: 7 }, (_, depth) => ({ kind, spectrum: spectrum(renderClick(clickAt(kind, depth, 'open', '', settings), RATE, settings)) })))
      let nearest = Infinity
      for (let i = 0; i < spectra.length; i++) for (let j = i + 1; j < spectra.length; j++) {
        if (spectra[i].kind !== spectra[j].kind) nearest = Math.min(nearest, distance(spectra[i].spectrum, spectra[j].spectrum))
      }
      return nearest
    }
    // 0.229 is the distance between the two nearest labels this repo writes, in the first voice.
    expect(measure(MODAL)).toBeGreaterThan(0.229)
    expect(measure(PAIR_SOUND)).toBeLessThan(0.01)
  })

  it('holds every bare click mostly inside 300 to 3,000 Hz, where a small speaker plays (first voice: lowest 0.027)', () => {
    for (const kind of KINDS) for (let depth = 0; depth <= 6; depth++) {
      expect(inBand(renderClick(clickAt(kind, depth, 'open'), RATE, MODAL)), `${kind} at depth ${depth}`).toBeGreaterThan(0.5)
    }
    expect(inBand(renderClick(clickAt('{', 6, 'open', '', PAIR_SOUND), RATE, PAIR_SOUND))).toBeLessThan(0.05)
  })

  it('sets every click to one level, labeled or bare, open or close (first voice: 7 dB apart)', () => {
    const levels: number[] = []
    for (const kind of KINDS) for (const depth of [0, 3, 6]) for (const label of ['', 'thursday', 'topography', 'a']) for (const edge of ['open', 'close'] as const) {
      const samples = renderClick(clickAt(kind, depth, edge, label), RATE, MODAL)
      levels.push(20 * Math.log10(rms(samples)))
      expect(Math.max(...samples.map(Math.abs))).toBeLessThan(0.99)
    }
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThan(1)
    expect(Math.abs(levels[0] - MODAL_LEVEL_DB)).toBeLessThan(1)
    const quieter = renderClick(clickAt('{', 0, 'open'), RATE, readEarcons('^ear{ =voice[modal] %level[-30] }').settings)
    expect(20 * Math.log10(rms(quieter))).toBeCloseTo(-30, 1)
    // A level a click cannot reach without clipping is not reached: the click stops at its peak, and is quieter than asked.
    const capped = renderClick(clickAt('{', 0, 'close'), RATE, readEarcons('^ear{ =voice[modal] %level[-6] }').settings)
    expect(Math.max(...capped.map(Math.abs))).toBeCloseTo(0.99, 5)
    expect(20 * Math.log10(rms(capped))).toBeLessThan(-6)
  })

  it('strikes a close and damps it: its energy comes at once and is gone sooner than its open\'s (first voice: none in 10 ms)', () => {
    for (const kind of KINDS) {
      const open = renderClick(clickAt(kind, 1, 'open'), RATE, MODAL)
      const close = renderClick(clickAt(kind, 1, 'close'), RATE, MODAL)
      expect(firstShare(close, 0.01), kind).toBeGreaterThan(0.5)
      expect(firstShare(open, 0.01), kind).toBeGreaterThan(0.25)
      expect(halfAt(close), kind).toBeLessThan(halfAt(open))
    }
    expect(firstShare(renderClick(clickAt('{', 1, 'close', '', PAIR_SOUND), RATE, PAIR_SOUND), 0.01)).toBeLessThan(0.01)
  })

  it('plays a label as a phrase, and a close plays its open\'s events in reverse order, for a repeated and a mirrored close', () => {
    for (const text of ['{_thursday x }_thursday', '{_thursday x yadsruht_}']) {
      const [open, close] = pairSound(scanPairLabels(text), MODAL).clicks
      const forward = modalEvents(open, MODAL).map((e) => [e.role, e.hertz])
      const backward = modalEvents(close, MODAL).map((e) => [e.role, e.hertz])
      expect(forward.map((e) => e[0])).toEqual(['note', 'note', 'note', 'strike'])
      expect(backward).toEqual([...forward].reverse())
    }
    expect(modalEvents(clickAt('{', 0, 'open'), MODAL).map((e) => e.role)).toEqual(['strike'])
  })

  it('takes a label\'s phrase from its letters: the same letters the same notes, on the ladder, at most three', () => {
    expect(labelPhrase('thursday')).toEqual(labelPhrase('THURSDAY'))
    expect(labelPhrase('a')).toHaveLength(1)
    expect(labelPhrase('')).toEqual([])
    const labels = ['thursday', 'topography', 'geom', 'axes', 'edge', 'kept', 'board', 'ringtide', 'A', 'B']
    for (const label of labels) {
      const phrase = labelPhrase(label)
      expect(phrase.length).toBeLessThanOrEqual(3)
      expect(phrase.every((step) => PHRASE_LADDER.includes(step))).toBe(true)
    }
    expect(new Set(labels.map((l) => labelPhrase(l).join())).size).toBeGreaterThanOrEqual(labels.length - 1)
  })

  it('rings each kind at the ratios of its texture', () => {
    for (const kind of KINDS) {
      const click = clickAt(kind, 0, 'open')
      const samples = renderModalClick({ ...click, seconds: 0.2 }, RATE, MODAL)
      const at = (hertz: number) => power(samples, hertz)
      const texture = TEXTURES[kind]
      // The second mode sounds, and a frequency halfway between the first two modes is far weaker than either.
      const first = at(click.pitch)
      const second = at(click.pitch * texture.ratios[1])
      const between = at(click.pitch * (texture.ratios[0] + texture.ratios[1]) / 2)
      expect(between, kind).toBeLessThan(Math.min(first, second) / 10)
    }
  })

  it('says how many lines a pair spans on both of its clicks', () => {
    const sound = pairSound(scanPairLabels('{\n a\n [ b ]\n}'))
    const [open, inner, innerClose, close] = sound.clicks
    expect([open.span, close.span, inner.span, innerClose.span]).toEqual([3, 3, 0, 0])
    expect(pairSound(scanPairLabels('{ a')).clicks[0].span).toBe(0)
  })
})

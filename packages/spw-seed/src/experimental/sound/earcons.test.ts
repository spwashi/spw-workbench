/**
 * Earcons in one line of Spw, and the pairs a caret leaves and enters. Nothing
 * here was heard: these tests hold the settings a line gives and the order a
 * move lists its pairs in.
 */
import { describe, expect, it } from 'vitest'
import { seededRandom } from '../seeded-random'
import { scanPairLabels } from '../pair-labels'
import { PAIR_SOUND, pairSound, type PairSoundSettings } from './pair-sound'
import { EARCON_WORDS, EARCONS_SCHEMA, pairMoves, readEarcons, writeEarcons } from './earcons'

const seeded = seededRandom

describe('readEarcons', () => {
  it('reads an empty line as the default sound', () => {
    const reading = readEarcons('^ear{}')
    expect(reading.schema).toBe(EARCONS_SCHEMA)
    expect(reading.settings).toEqual(PAIR_SOUND)
    expect(reading.problems).toEqual([])
    expect(writeEarcons(PAIR_SOUND)).toBe('^ear{}')
    // Written whole, the default line names every word, so a listener sees what can be tuned.
    const whole = writeEarcons(PAIR_SOUND, { all: true })
    // The voice and its level are written only when set, so a line from before them reads the same.
    expect(readEarcons(whole).set).toEqual(Object.keys(EARCON_WORDS).filter((w) => w !== 'voice' && w !== 'level'))
    expect(readEarcons(whole).settings).toEqual(PAIR_SOUND)
  })

  it('tunes every setting from one line', () => {
    const reading = readEarcons('^ear{ %body[300] %frame[400] %scene[500] %step[3] %deepest[4] %ms[60] %decay[7] %gain[0.4] =rough[off] %phrase[440, 550] =voice[modal] %level[-18] }')
    expect(reading.problems).toEqual([])
    expect(reading.set).toEqual(Object.keys(EARCON_WORDS))
    expect(reading.settings).toEqual({
      pitch: { '{': 300, '[': 400, '(': 500 },
      stepPerDepth: 3,
      deepest: 4,
      seconds: 0.06,
      decay: 7,
      gain: 0.4,
      rough: 0,
      phrase: [440, 550],
      voice: 'modal',
      level: -18,
    })
    expect(readEarcons('^ear{ =voice[organ] }').problems.map((p) => p.problem)).toEqual(['not_a_choice'])
  })

  it('reads a term led by %, = or a dot, a binding, and a line laid over three lines alike', () => {
    const measured = readEarcons('^ear{ %body[300] %gain[0.3] }').settings
    expect(readEarcons('^ear{ =body[300] =gain[0.3] }').settings).toEqual(measured)
    expect(readEarcons('^ear{ .body[300] .gain[0.3] }').settings).toEqual(measured)
    expect(readEarcons('^ear{ body: 300, gain: 0.3 }').settings).toEqual(measured)
    expect(readEarcons('^ear{\n %body[300]\n %gain[0.3] }').settings).toEqual(measured)
  })

  it('shares one ear line with a host\'s own textures, reporting theirs and keeping its own', () => {
    const reading = readEarcons('^ear{ =wap[pillow] =steps[tiptoe] %width[0.3] %body[330] =rough[off] }')
    expect(reading.set).toEqual(['body', 'rough'])
    expect(reading.settings.pitch['{']).toBe(330)
    expect(reading.problems.map((p) => [p.word, p.problem])).toEqual([['wap', 'unknown_word'], ['steps', 'unknown_word'], ['width', 'unknown_word']])
    expect(writeEarcons(reading.settings)).toBe('^ear{ %body[330] =rough[off] }')
  })

  it('holds every number to its range, and says so', () => {
    const reading = readEarcons('^ear{ %body[9000] %gain[2] %step[-1] }')
    expect(reading.settings.pitch['{']).toBe(4000)
    expect(reading.settings.gain).toBe(1)
    expect(reading.settings.stepPerDepth).toBe(0)
    expect(reading.problems.map((p) => [p.word, p.problem, p.used])).toEqual([
      ['body', 'clamped', 4000],
      ['gain', 'clamped', 1],
      ['step', 'clamped', 0],
    ])
  })

  it('reports what it cannot use and never drops a word in silence', () => {
    const reading = readEarcons('^ear{ %tempo[3] %ms[x] %body[300] %body[310] } trailing')
    expect(reading.settings.seconds).toBe(PAIR_SOUND.seconds)
    expect(reading.settings.pitch['{']).toBe(310)
    expect(reading.problems.map((p) => [p.word, p.problem])).toEqual([
      ['trailing', 'unread'],
      ['tempo', 'unknown_word'],
      ['ms', 'not_a_number'],
      ['body', 'repeated'],
    ])
    expect(readEarcons('no body here').problems.map((p) => p.problem)).toEqual(['unread'])
    const notes = readEarcons('^ear{ %phrase[1, 2, 3, 4, 5, 6, 7] }')
    expect(notes.settings.phrase).toHaveLength(6)
    expect(notes.problems.some((p) => p.problem === 'too_many_notes')).toBe(true)
  })

  it('writes settings back as a line that reads to the same settings, for any settings in range', () => {
    const rand = seeded(20261113)
    const pick = (low: number, high: number): number => Math.round((low + rand() * (high - low)) * 1000) / 1000
    for (let i = 0; i < 300; i++) {
      const settings: PairSoundSettings = {
        pitch: { '{': pick(40, 4000), '[': pick(40, 4000), '(': pick(40, 4000) },
        stepPerDepth: pick(0, 12),
        deepest: Math.round(pick(0, 16)),
        seconds: pick(5, 500) / 1000,
        decay: pick(0.5, 20),
        gain: pick(0, 1),
        rough: rand() < 0.2 ? 0 : pick(1.01, 4),
        phrase: Array.from({ length: Math.floor(rand() * 7) }, () => pick(40, 4000)),
        ...(rand() < 0.5 ? { voice: rand() < 0.5 ? ('click' as const) : ('modal' as const), level: pick(-40, -6) } : {}),
      }
      for (const all of [false, true]) {
        const line = writeEarcons(settings, { all })
        const reading = readEarcons(line)
        expect(reading.problems, line).toEqual([])
        expect(reading.settings, line).toEqual(settings)
      }
    }
  })

  it('reads the line a host would offer in under three lines of Spw', () => {
    const line = '^ear{ %body[392] %frame[523] %scene[659] %step[2] %ms[45] =rough[off] }'
    expect(line.split('\n')).toHaveLength(1)
    const reading = readEarcons(line)
    expect(reading.problems).toEqual([])
    // The sound it tunes is the sound pairSound makes.
    const clicks = pairSound(scanPairLabels('{ [ ( ) ] } {'), reading.settings).clicks
    expect(clicks.map((c) => Math.round(c.pitch))).toEqual([392, 466, 523, 523, 466, 392, 392])
    expect(clicks.every((c) => c.seconds === 0.045)).toBe(true)
  })
})

describe('pairMoves', () => {
  const text = '{_A x {_B y }_A z }_B w'
  const scan = scanPairLabels(text)
  const at = (needle: string): number => text.indexOf(needle)

  it('lists the pairs a caret enters, outermost first, with the click of each open', () => {
    const move = pairMoves(scan, 0, at('y'))
    expect(move.left).toEqual([])
    expect(move.entered.map((e) => e.pair.label)).toEqual(['A', 'B'])
    expect(move.entered.map((e) => e.click.edge)).toEqual(['open', 'open'])
    expect(move.entered.map((e) => e.click.at)).toEqual(move.entered.map((e) => e.pair.open.at))
    expect(move.within?.label).toBe('B')
  })

  it('lists crossed pairs once each as it leaves them, and the move back reverses both lists', () => {
    const out = pairMoves(scan, at('y'), at('w'))
    expect(out.left.map((e) => e.pair.label)).toEqual(['B', 'A'])
    expect(out.left.map((e) => e.click.edge)).toEqual(['close', 'close'])
    expect(out.entered).toEqual([])
    expect(out.within).toBeNull()
    const back = pairMoves(scan, at('w'), at('y'))
    expect(back.entered.map((e) => e.pair.label)).toEqual([...out.left.map((e) => e.pair.label)].reverse())
    expect(back.left).toEqual([])
  })

  it('is silent for a move inside one pair, and when the caret does not move', () => {
    const inner = scanPairLabels('home{ seed water }')
    expect(pairMoves(inner, 7, 13).left).toEqual([])
    expect(pairMoves(inner, 7, 13).entered).toEqual([])
    expect(pairMoves(scan, at('z'), at('z'))).toEqual({ left: [], entered: [], within: pairMoves(scan, 0, at('z')).within })
  })

  it('counts a caret on a close as inside, and one past it as outside', () => {
    const inner = scanPairLabels('a{b}c')
    expect(pairMoves(inner, 0, 3).entered).toHaveLength(1)
    expect(pairMoves(inner, 0, 4).entered).toHaveLength(0)
    expect(pairMoves(inner, 3, 4).left).toHaveLength(1)
  })

  it('agrees with a brute-force count on generated text: every pair listed is one the move crosses', () => {
    const rand = seeded(7)
    const pieces = ['{', '}', '[', ']', '(', ')', '{_a ', ' }_a', '{_b ', ' b_}', 'x', ' ']
    for (let i = 0; i < 300; i++) {
      const source = Array.from({ length: 4 + Math.floor(rand() * 16) }, () => pieces[Math.floor(rand() * pieces.length)]).join('')
      const s = scanPairLabels(source)
      const from = Math.floor(rand() * (source.length + 1))
      const to = Math.floor(rand() * (source.length + 1))
      const move = pairMoves(s, from, to)
      const inside = (p: (typeof s.pairs)[number], o: number) => p.open.at < o && o <= p.close.at
      expect(move.left.length + move.entered.length, source).toBe(s.pairs.filter((p) => inside(p, from) !== inside(p, to)).length)
      expect(move.left.every((e) => inside(e.pair, from) && !inside(e.pair, to)), source).toBe(true)
      expect(move.entered.every((e) => inside(e.pair, to) && !inside(e.pair, from)), source).toBe(true)
      expect(move.left.every((e) => e.click && e.click.at === e.pair.close.at), source).toBe(true)
    }
  })
})

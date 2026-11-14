import { describe, expect, it } from 'vitest'
import { seededRandom } from './seeded-random'
import { readSettingsLine, writeSettingsLine, type SettingsVocabulary } from './settings-line'

// A board in the shape a story consumer's game writes, with words of each kind.
const BOARD: SettingsVocabulary = {
  cues: { kind: 'choice', choices: ['shaped', 'one', 'off'], marks: ['='] },
  wap: { kind: 'choice', choices: ['splat', 'pillow', 'cream', 'bell'], marks: ['='] },
  width: { kind: 'number', range: [0, 1] },
  lanes: { kind: 'number', range: [1, 5], integer: true },
  hold: { kind: 'choice', choices: ['upright', 'side'], marks: ['@'] },
  note: { kind: 'text' },
}

const seeded = seededRandom

describe('readSettingsLine', () => {
  it('reads a head, every term, and the values the vocabulary knows, typed', () => {
    const line = readSettingsLine('^board{ =cues[shaped] =wap[pillow] %width[0.3] @hold[upright] %lanes[3] }', BOARD)
    expect(line.head).toEqual({ mark: '^', word: 'board', mode: '' })
    expect(line.values).toEqual({ cues: 'shaped', wap: 'pillow', width: 0.3, hold: 'upright', lanes: 3 })
    expect(line.problems).toEqual([])
    expect(line.terms.map((t) => `${t.mark}${t.word}`)).toEqual(['=cues', '=wap', '%width', '@hold', '%lanes'])
  })

  it('reads an @ term with its frame, where a walk of the parser\'s tree finds the frame on the expression', () => {
    expect(readSettingsLine('^board{ @hold[side] }', BOARD).values).toEqual({ hold: 'side' })
  })

  it('reads a head with brackets of its own and every mark a find line writes', () => {
    const line = readSettingsLine('?find[haggle]{ @carrier[genie] &verb[donut] %count[3] ~within[3] ^moment[haggle] #crosses[exactly_one] }', {})
    expect(line.head).toEqual({ mark: '?', word: 'find', mode: 'haggle' })
    expect(line.terms.map((t) => [t.mark, t.word, t.value])).toEqual([
      ['@', 'carrier', 'genie'], ['&', 'verb', 'donut'], ['%', 'count', '3'], ['~', 'within', '3'], ['^', 'moment', 'haggle'], ['#', 'crosses', 'exactly_one'],
    ])
    expect(line.problems.every((p) => p.problem === 'unknown_word')).toBe(true)
  })

  it('says what it could not use and drops nothing in silence', () => {
    const line = readSettingsLine('^board{ =cues[loud] %wap[cream] %width[3] %lanes[x] =zoom[2] =cues[off] } trailing', BOARD)
    expect(line.values).toEqual({ wap: 'cream', width: 1, cues: 'off' })
    expect(line.problems.map((p) => [p.problem, p.word])).toEqual([
      ['unread', 'trailing'], ['not_a_choice', 'cues'], ['other_mark', 'wap'], ['clamped', 'width'], ['not_a_number', 'lanes'], ['unknown_word', 'zoom'], ['repeated', 'cues'],
    ])
    expect(line.terms).toHaveLength(6)
    expect(readSettingsLine('no line here', BOARD).problems.map((p) => p.problem)).toEqual(['no_line'])
  })

  it('rounds a whole-number setting and says it did', () => {
    const line = readSettingsLine('^board{ %lanes[2.6] }', BOARD)
    expect(line.values).toEqual({ lanes: 3 })
    expect(line.problems).toMatchObject([{ problem: 'clamped', word: 'lanes', written: '2.6', used: 3 }])
  })

  it('reads a binding as it reads a bracket, over several lines', () => {
    expect(readSettingsLine('^board{\n cues: one\n width: 0.5\n note: "kept for later" }', BOARD).values).toEqual({ cues: 'one', width: 0.5, note: 'kept for later' })
  })

  it('writes values back as a line that reads to the same values, for any values in the vocabulary', () => {
    const rand = seeded(5)
    for (let i = 0; i < 300; i++) {
      const values: Record<string, number | string> = {}
      if (rand() < 0.7) values.cues = ['shaped', 'one', 'off'][Math.floor(rand() * 3)]!
      if (rand() < 0.7) values.width = Math.round(rand() * 1000) / 1000
      if (rand() < 0.7) values.lanes = 1 + Math.floor(rand() * 5)
      if (rand() < 0.7) values.hold = rand() < 0.5 ? 'upright' : 'side'
      const line = writeSettingsLine('^board', values, BOARD)
      const read = readSettingsLine(line, BOARD)
      expect(read.problems, line).toEqual([])
      expect(read.values, line).toEqual(values)
    }
    expect(writeSettingsLine('^board', {}, BOARD)).toBe('^board{}')
  })
})

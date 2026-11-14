import { describe, expect, it } from 'vitest'
import { seededRandom } from './seeded-random'
import { readSettingsLine, writeSettingsLine, type SettingsVocabulary } from './settings-line'
import { writeCssProperties } from './css-properties'
import { cssNumber, readDerivation, readQuantity } from './quantity'

const TYPE: SettingsVocabulary = {
  body: { kind: 'quantity', dimension: 'length' },
  scale: { kind: 'number', range: [1, 3] },
  h1: { kind: 'quantity', dimension: 'length' },
  h2: { kind: 'quantity', dimension: 'length' },
  beat: { kind: 'quantity', dimension: 'time', range: [50, 2000] },
  measure: { kind: 'quantity', dimension: 'length' },
  lean: { kind: 'quantity', dimension: 'angle' },
  theme: { kind: 'choice', choices: ['paper', 'ink'] },
}

describe('readQuantity', () => {
  it('reads a unit of the word\'s dimension, converting an absolute one to the base', () => {
    expect(readQuantity('0.5s', 'time')).toMatchObject({ value: 0.5, unit: 's', base: 500 })
    expect(readQuantity('1in', 'length')).toMatchObject({ value: 1, unit: 'in', base: 96 })
    expect(readQuantity('0.25turn', 'angle')).toMatchObject({ base: 90 })
    expect(readQuantity('1.5rem', 'length')).toEqual({ value: 1.5, unit: 'rem', text: '1.5rem' })
    expect(readQuantity('33.3%', 'length')).toMatchObject({ value: 33.3, unit: '%' })
    expect(readQuantity('45..75ch', 'length')).toMatchObject({ value: 45, high: 75, unit: 'ch' })
  })

  it('refuses a unit of another dimension, a unit it does not know, and words', () => {
    expect(readQuantity('1rem', 'time')).toEqual({ problem: 'wrong_dimension' })
    expect(readQuantity('3furlongs', 'length')).toEqual({ problem: 'not_a_unit' })
    expect(readQuantity('wide', 'length')).toEqual({ problem: 'not_a_number' })
  })
})

describe('readDerivation', () => {
  it('reads a word, a word scaled by a number or a ratio, and a word scaled by another to a power', () => {
    expect(readDerivation('@body')).toMatchObject({ from: 'body', factor: { by: 'number', value: 1 } })
    expect(readDerivation('@body*1.5')).toMatchObject({ factor: { by: 'number', value: 1.5 }, divide: false })
    expect(readDerivation('@body/4/3')).toMatchObject({ factor: { by: 'number', value: 4 / 3 }, divide: true })
    expect(readDerivation('@body*@scale^3')).toMatchObject({ factor: { by: 'word', word: 'scale', power: 3 } })
    expect(readDerivation('body*2')).toBeNull()
    expect(readDerivation('@body*2px')).toBeNull()
  })
})

describe('quantities on a settings line', () => {
  const LINE = '^type{ %body[1rem] %scale[5/4] %h1[@body*@scale^3] %h2[@body*@scale^2] %beat[0.5s] %measure[45..75ch] %lean[-2deg] =theme[ink] }'

  it('resolves derivations, keeps units, and writes CSS with derivations as calc over the named property', () => {
    const line = readSettingsLine(LINE, TYPE)
    expect(line.problems).toEqual([])
    expect(line.quantities.h1).toMatchObject({ value: 1.953125, unit: 'rem' })
    expect(line.values.beat).toBe(500)
    expect(writeCssProperties(line, TYPE)).toBe(
      [
        '--spw-body: 1rem;',
        '--spw-scale: 1.25;',
        '--spw-h1: calc(var(--spw-body) * 1.953125);',
        '--spw-h2: calc(var(--spw-body) * 1.5625);',
        '--spw-beat: 0.5s;',
        '--spw-measure: clamp(45ch, 60ch, 75ch);',
        '--spw-lean: -2deg;',
        '--spw-theme: ink;',
      ].join('\n'),
    )
    expect(writeCssProperties(line, TYPE, { selector: ':root', prefix: '--t-' }).split('\n')[0]).toBe(':root {')
  })

  it('writes the line back as written, derivations included', () => {
    const line = readSettingsLine(LINE, TYPE)
    expect(writeSettingsLine('^type', line.written, TYPE)).toBe(LINE)
  })

  it('refuses a value in the wrong dimension, by unit or by derivation, and holds an absolute value to its range', () => {
    const V: SettingsVocabulary = { ...TYPE, gap: { kind: 'quantity', dimension: 'length' } }
    const line = readSettingsLine('^type{ %beat[1rem] %body[3turn] %gap[@beat*2] }', V)
    expect(line.problems.map((p) => [p.problem, p.word])).toEqual([['wrong_dimension', 'beat'], ['wrong_dimension', 'body'], ['wrong_dimension', 'gap']])
    const held = readSettingsLine('^type{ %beat[10s] }', TYPE)
    expect(held.quantities.beat).toMatchObject({ value: 2, unit: 's', base: 2000 })
    expect(held.problems).toMatchObject([{ problem: 'clamped', used: '2s' }])
  })

  it('reports a cycle once per word, and resolves a chain written backwards', () => {
    const V: SettingsVocabulary = { a: { kind: 'quantity', dimension: 'length' }, b: { kind: 'quantity', dimension: 'length' }, c: { kind: 'quantity', dimension: 'length' } }
    expect(readSettingsLine('^x{ %a[@b] %b[@a] %c[@a*2] }', V).problems.map((p) => [p.problem, p.word])).toEqual([['cycle', 'a'], ['cycle', 'b'], ['cycle', 'c']])
    expect(readSettingsLine('^x{ %c[@b*3] %b[@a] %a[2px] }', V).values).toEqual({ a: 2, b: 2, c: 6 })
    expect(readSettingsLine('^x{ %a[@nowhere] }', V).problems.map((p) => p.problem)).toEqual(['unknown_reference'])
  })

  it('gives every derived size the factor of its step, over generated scales', () => {
    const rand = seededRandom(13)
    for (let i = 0; i < 200; i++) {
      const top = 1 + Math.floor(rand() * 12)
      const bottom = 1 + Math.floor(rand() * 12)
      const step = Math.floor(rand() * 6)
      const ratio = top / bottom
      if (ratio < 1 || ratio > 3) continue
      const line = readSettingsLine(`^type{ %body[16px] %scale[${top}/${bottom}] %h1[@body*@scale^${step}] }`, TYPE)
      expect(line.problems, `${top}/${bottom}^${step}`).toEqual([])
      expect(line.values.h1).toBeCloseTo(16 * ratio ** step, 6)
      const factor = ratio ** step
      expect(writeCssProperties(line, TYPE)).toContain(`--spw-h1: ${factor === 1 ? 'var(--spw-body)' : `calc(var(--spw-body) * ${cssNumber(factor)})`};`)
    }
  })
})

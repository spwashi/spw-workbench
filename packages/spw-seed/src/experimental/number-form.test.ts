import { describe, expect, it } from 'vitest'
import { seededRandom } from './seeded-random'
import { isNumberForm, readNumberForm } from './number-form'
import { settingNumber } from './settings-line'

const seeded = seededRandom

describe('readNumberForm', () => {
  it.each([
    ['12', 'number', 12, ''],
    ['.5', 'number', 0.5, ''],
    ['+80', 'number', 80, ''],
    ['1e3', 'number', 1000, ''],
    ['2.5e-4', 'number', 0.00025, ''],
    ['50%', 'number', 0.5, '%'],
    ['45ms', 'number', 45, 'ms'],
    ['2em', 'number', 2, 'em'],
    ['4/3', 'ratio', 4 / 3, ''],
    ['1..5', 'range', 1, ''],
    ['20..80ms', 'range', 20, 'ms'],
  ])('reads %s', (text, kind, value, unit) => {
    const form = readNumberForm(text)
    expect(isNumberForm(form) && [form.kind, form.value, form.unit]).toEqual([kind, value, unit])
  })

  it('keeps a sign where the text has one, on a number, a ratio, a unit and a range', () => {
    const minus = (t: string) => readNumberForm(`-${t}`)
    expect(minus('0.5')).toMatchObject({ value: -0.5 })
    expect(minus('1/12')).toMatchObject({ kind: 'ratio', ratio: [-1, 12] })
    expect(minus('6dB')).toMatchObject({ value: -6, unit: 'dB' })
    expect(readNumberForm('-1..1')).toMatchObject({ kind: 'range', value: -1, high: 1 })
  })

  it.each([
    ['0x1f', 'hex'],
    ['1_000', 'joined_digits'],
    ['1/0', 'zero_denominator'],
    ['3:4', 'not_a_number'],
    ['e3', 'not_a_number'],
    ['--1', 'not_a_number'],
    ['1.2.3', 'not_a_number'],
    ['', 'empty'],
  ])('refuses %s as %s', (text, problem) => {
    expect(readNumberForm(text)).toEqual({ problem, text })
  })

  it.each([
    ['9.810(20)', 9.81, 0.02, ''],
    ['6.67430(15)e-11', 6.6743e-11, 1.5e-15, ''],
    ['9.81 ± 0.02', 9.81, 0.02, ''],
    ['9.81+-0.02', 9.81, 0.02, ''],
    ['-6(1)dB', -6, 1, 'dB'],
    ['50(2)%', 0.5, 0.02, '%'],
    ['1.000(1)m', 1, 0.001, 'm'],
  ])('reads %s as a measured number', (text, value, uncertainty, unit) => {
    const form = readNumberForm(text)
    expect(isNumberForm(form) && form.kind).toBe('number')
    if (!isNumberForm(form)) return
    expect(form.value).toBeCloseTo(value, 15)
    expect(form.uncertainty! / uncertainty).toBeCloseTo(1, 12)
    expect(form.unit).toBe(unit)
  })

  it('reads a percent as its number divided by 100, to the last bit', () => {
    for (let i = 0; i <= 1000; i++) {
      const written = String(i / 10)
      const form = readNumberForm(`${written}%`)
      expect(isNumberForm(form) && form.value, `${written}%`).toBe(Number(written) / 100)
    }
  })

  it('reads an uncertainty only where it is written whole', () => {
    expect(readNumberForm('9.81 ±')).toEqual({ problem: 'not_a_number', text: '9.81 ±' })
    expect(readNumberForm('9.81 ± 0.02 ms')).toEqual({ problem: 'not_a_number', text: '9.81 ± 0.02 ms' })
    expect(readNumberForm('9.81()')).toEqual({ problem: 'not_a_number', text: '9.81()' })
    expect(readNumberForm('12')).not.toHaveProperty('uncertainty')
  })

  it('reads back every finite number JavaScript writes, and every ratio of two decimals', () => {
    const rand = seeded(3)
    for (let i = 0; i < 2000; i++) {
      const n = (rand() - 0.5) * 10 ** Math.floor(rand() * 40 - 20)
      const form = readNumberForm(String(n))
      expect(isNumberForm(form) && form.value, String(n)).toBe(n)
      const top = Math.round(rand() * 1000)
      const bottom = 1 + Math.round(rand() * 1000)
      const ratio = readNumberForm(`${top}/${bottom}`)
      expect(isNumberForm(ratio) && ratio.value).toBe(top / bottom)
    }
  })
})

describe('settingNumber', () => {
  it('converts a unit the word lists, and refuses one it does not', () => {
    expect(settingNumber('0.045s', { ms: 1, s: 1000 })).toEqual({ value: 45 })
    expect(settingNumber('45ms', { ms: 1, s: 1000 })).toEqual({ value: 45 })
    expect(settingNumber('45px', { ms: 1 })).toEqual({ problem: 'not_a_unit' })
    expect(settingNumber('1..2')).toEqual({ problem: 'not_a_number' })
    expect(settingNumber('1/4')).toEqual({ value: 0.25 })
  })
})

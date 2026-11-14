/**
 * Quantities: a number with a dimension, and a value derived from other words.
 *
 * A number read whole (number-form.ts) knows its unit as letters. A quantity
 * knows what the unit measures, so a word can say what it holds and a value in
 * the wrong dimension is refused rather than passed on: a beat is a time, so
 * %beat[1rem] is a length where a time belongs, which CSS would accept in
 * silence and a reader of the page would never see.
 *
 *   length     px, cm, mm, in, pt, pc (absolute); rem, em, ch, ex, lh, vw, vh,
 *              vmin, vmax, % (relative: kept as written, never converted)
 *   time       ms, s
 *   angle      deg, rad, grad, turn
 *   frequency  hz, khz
 *   interval   st (semitones), cents
 *   ratio      a bare number or a ratio, 4/3
 *
 * A value may be derived from other words, so a page keeps named derivations
 * instead of magic numbers:
 *
 *   @body                 the value of body
 *   @body*1.5  @body/2    scaled by a number or a ratio
 *   @body*@scale^3        scaled by another word raised to a whole power
 *
 * The derivation is kept, not only its result: written as CSS it stays a calc()
 * over the custom property it names, so changing body moves everything derived
 * from it, and its factor is worked out once (a ratio raised to a power is a
 * number). A ratio scale in this form is a modular type scale, and a type scale
 * is named after musical intervals: a major third is 5/4, a perfect fourth 4/3,
 * the same ratios a pitch is tuned by.
 *
 * Experimental (spw.quantity/1).
 */

import { isNumberForm, readNumberForm } from './number-form'

export const QUANTITY_SCHEMA = 'spw.quantity/1' as const

export type Dimension = 'length' | 'time' | 'angle' | 'frequency' | 'interval' | 'ratio'

/** Each unit's dimension, and for an absolute unit its size in the dimension's base (px, ms, deg, hz, st). */
export const UNITS: Readonly<Record<string, { dimension: Dimension; base?: number }>> = Object.freeze({
  px: { dimension: 'length', base: 1 },
  cm: { dimension: 'length', base: 96 / 2.54 },
  mm: { dimension: 'length', base: 96 / 25.4 },
  in: { dimension: 'length', base: 96 },
  pt: { dimension: 'length', base: 96 / 72 },
  pc: { dimension: 'length', base: 16 },
  rem: { dimension: 'length' },
  em: { dimension: 'length' },
  ch: { dimension: 'length' },
  ex: { dimension: 'length' },
  lh: { dimension: 'length' },
  vw: { dimension: 'length' },
  vh: { dimension: 'length' },
  vmin: { dimension: 'length' },
  vmax: { dimension: 'length' },
  '%': { dimension: 'length' },
  ms: { dimension: 'time', base: 1 },
  s: { dimension: 'time', base: 1000 },
  deg: { dimension: 'angle', base: 1 },
  rad: { dimension: 'angle', base: 180 / Math.PI },
  grad: { dimension: 'angle', base: 0.9 },
  turn: { dimension: 'angle', base: 360 },
  hz: { dimension: 'frequency', base: 1 },
  khz: { dimension: 'frequency', base: 1000 },
  st: { dimension: 'interval', base: 1 },
  cents: { dimension: 'interval', base: 0.01 },
})

const unitOf = (unit: string) => UNITS[unit] ?? UNITS[unit.toLowerCase()]

/** A quantity as written: its number, its unit ('' for a bare number) and the text. */
export interface Quantity {
  value: number
  unit: string
  /** The number in the dimension's base unit, when the unit is absolute or there is none. */
  base?: number
  /** For a range (45..75ch), its high end, in the same unit; base likewise. */
  high?: number
  highBase?: number
  text: string
}

/** A value derived from another word: @word, scaled by a factor that is a number, a ratio, or a word to a whole power. */
export interface Derivation {
  from: string
  /** The written factor: a number, or another word and its power. */
  factor: { by: 'number'; value: number; text: string } | { by: 'word'; word: string; power: number }
  /** Whether the factor divides. */
  divide: boolean
  text: string
}

export type QuantityProblem = 'not_a_number' | 'not_a_unit' | 'wrong_dimension' | 'not_a_derivation'

/** Read a quantity of a dimension. A bare number is accepted everywhere: a ratio, or a value in the dimension's base. */
export function readQuantity(written: string, dimension: Dimension): Quantity | { problem: QuantityProblem } {
  const form = readNumberForm(written)
  if (!isNumberForm(form)) return { problem: 'not_a_number' }
  const range = form.kind === 'range'
  // A percent is a hundredth as a bare number and a share of a length in CSS: keep the number as written for a length.
  const asWritten = (n: number) => (form.unit === '%' ? n * 100 : n)
  if (!form.unit || (form.unit === '%' && dimension !== 'length')) {
    return { value: form.value, unit: '', base: form.value, ...(range ? { high: form.high!, highBase: form.high! } : {}), text: form.text }
  }
  const unit = unitOf(form.unit)
  if (!unit) return { problem: 'not_a_unit' }
  if (unit.dimension !== dimension) return { problem: 'wrong_dimension' }
  const value = Number(asWritten(form.value).toPrecision(12))
  const high = range ? Number(asWritten(form.high!).toPrecision(12)) : undefined
  return {
    value,
    unit: form.unit,
    ...(unit.base !== undefined ? { base: value * unit.base } : {}),
    ...(high !== undefined ? { high, ...(unit.base !== undefined ? { highBase: high * unit.base } : {}) } : {}),
    text: form.text,
  }
}

const DERIVATION = /^@([A-Za-z_][\w-]*)(?:\s*([*/])\s*(?:@([A-Za-z_][\w-]*)(?:\^(\d+))?|([^@\s]+)))?$/

/** Read a derivation: @word, @word*2, @word/3, @word*4/3, @word*@scale^3. */
export function readDerivation(written: string): Derivation | null {
  const m = written.trim().match(DERIVATION)
  if (!m) return null
  const [, from, op, word, power, number] = m
  if (!op) return { from: from!, factor: { by: 'number', value: 1, text: '1' }, divide: false, text: written.trim() }
  if (word) return { from: from!, factor: { by: 'word', word, power: power ? Number(power) : 1 }, divide: op === '/', text: written.trim() }
  const form = readNumberForm(number!)
  if (!isNumberForm(form) || form.kind === 'range' || form.unit) return null
  return { from: from!, factor: { by: 'number', value: form.value, text: number! }, divide: op === '/', text: written.trim() }
}

/** The factor a derivation multiplies by, given the values of the words it names; null when one is missing. */
export function derivationFactor(derivation: Derivation, numberOf: (word: string) => number | undefined): number | null {
  let factor: number
  if (derivation.factor.by === 'number') factor = derivation.factor.value
  else {
    const value = numberOf(derivation.factor.word)
    if (value === undefined) return null
    factor = value ** derivation.factor.power
  }
  return derivation.divide ? 1 / factor : factor
}

/** A number written for CSS: no exponent, no float noise. */
export function cssNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(Number(n.toPrecision(10)))
}

/**
 * A written number, read beside the parser: one place that says what a number
 * written in Spw text is, for every reader that takes a value from the text of a
 * term rather than from the lexer's tokens (settings lines, the ear line, a
 * declared measure).
 *
 * The lexer reads digits with a decimal part and splits the rest without a word:
 * 45ms is a number and a name, 1e3 is 1 and e3, a minus before a number is an
 * error and is lost. Changing that changes how lines read (the open questions in
 * syntax-hardware-alignment: minus_sign, unit_place, ratio_spelling), so the
 * lexer is left alone here. This reader takes the written run whole:
 *
 *   sign      +2, with a minus too (where a reader has the text, the sign is kept)
 *   decimal   12, 0.5, .5
 *   exponent  1e3, 6.02e23, 2.5e-4
 *   ratio     4/3, 1/12: two unsigned decimals, the second not zero
 *   percent   50%: a hundredth
 *   unit      45ms, 392hz, 2st: letters after the number, kept as written and
 *             never converted here; a reader that knows the unit converts it
 *   range     1..5, 0.2..0.8: two numbers, each read as above
 *   measured  9.810(20), 6.67430(15)e-11, 9.81 ± 0.02, 9.81+-0.02: a number with
 *             its standard uncertainty, in parentheses in the last digits as
 *             physics writes it, or after ± (or +-); a unit after it covers both
 *
 * It refuses, with a reason, what it cannot read whole: 0x1f (hex), 1_000 (a
 * joiner in digits), 1/0, 3:4, a word, two signs. Every form keeps the text it
 * was read from, so a reader can write a value back as it was written.
 *
 * scanNumber reads the unsigned core (decimal, uncertainty, exponent, ±) at a
 * place in longer text; readNumberForm and the quantity sheet's expressions both
 * read numbers through it, so a number reads the same in either.
 *
 * Experimental (spw.number-form/1).
 */

export const NUMBER_FORM_SCHEMA = 'spw.number-form/1' as const

export interface NumberForm {
  kind: 'number' | 'ratio' | 'range'
  /** The value: the number, the ratio's quotient, or for a range its low end. */
  value: number
  /** For a range, its high end. */
  high?: number
  /** Letters written after the number (ms, hz, st), or '%' for a percent; '' for none. */
  unit: string
  /** For a ratio, its two terms. */
  ratio?: [number, number]
  /** For a measured number, its standard uncertainty, in the value's units (a percent's is a hundredth too). */
  uncertainty?: number
  text: string
}

export type NumberProblem = 'empty' | 'hex' | 'joined_digits' | 'zero_denominator' | 'not_a_number'

const DECIMAL = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`
const SIGNED = String.raw`[+\-]?${DECIMAL}(?:[eE][+\-]?\d+)?`
const RATIO = new RegExp(String.raw`^([+\-]?)(${DECIMAL})/(${DECIMAL})([A-Za-z]+)?$`)
const RANGE = new RegExp(String.raw`^(${SIGNED})\.\.(${SIGNED})(%|[A-Za-z]+)?$`)

// The unsigned core: digits, a decimal part, an uncertainty in its last digits, an exponent.
const CORE = /^(\d*)(?:\.(\d+))?(?:\((\d+)\))?([eE][+-]?\d+)?/
// An uncertainty after the number: ± 0.02, +- 0.02.
const PLUS_MINUS = /^\s*(?:±|\+-)\s*(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/

export interface ScannedNumber {
  /** Where the number ends in the text scanned. */
  end: number
  value: number
  /** The standard uncertainty, when one is written. */
  uncertainty?: number
}

/**
 * The unsigned number that starts at `at`, or null: 12, .5, 6.02e23, 6.67430(15)e-11 (the uncertainty is 15 in the
 * last written digits, 0.00015e-11), and 9.81 ± 0.02 or 9.81 +- 0.02. A sign is the caller's: an expression reads
 * it as an operator, a written value as part of the value.
 */
export function scanNumber(text: string, at = 0): ScannedNumber | null {
  const rest = text.slice(at)
  const core = rest.match(CORE)
  if (!core || !core[0] || !/\d/.test(core[1]! + (core[2] ?? ''))) return null
  const exponent = core[4] ? Number(core[4].slice(1)) : 0
  const scanned: ScannedNumber = { end: at + core[0].length, value: Number(`${core[1] || '0'}.${core[2] ?? '0'}e${exponent}`) }
  if (core[3]) scanned.uncertainty = Number(core[3]) * 10 ** (exponent - (core[2]?.length ?? 0))
  const pm = text.slice(scanned.end).match(PLUS_MINUS)
  if (pm) {
    scanned.uncertainty = Number(pm[1])
    scanned.end += pm[0].length
  }
  return scanned
}

/** A signed single number with its unit, read through scanNumber: the whole text or nothing. */
function readSingle(text: string): NumberForm | null {
  const sign = text[0] === '-' ? -1 : text[0] === '+' ? 1 : 0
  const scanned = scanNumber(text, sign ? 1 : 0)
  if (!scanned) return null
  const unit = text.slice(scanned.end)
  // A unit is letters or a percent, written against the number.
  if (unit && !/^(?:%|[A-Za-z]+)$/.test(unit)) return null
  // A percent divides by 100, as written: 57% is 57 / 100, which is 0.57; times 1/100 would be one bit above it.
  const percent = (n: number) => (unit === '%' ? n / 100 : n)
  const form: NumberForm = { kind: 'number', value: percent((sign || 1) * scanned.value), unit, text }
  if (scanned.uncertainty !== undefined) form.uncertainty = percent(scanned.uncertainty)
  return form
}

/** Read one written value; a form, or why it is not one. */
export function readNumberForm(written: string): NumberForm | { problem: NumberProblem; text: string } {
  const text = written.trim()
  if (!text) return { problem: 'empty', text }
  if (/^[+\-]?0[xX][0-9a-fA-F]+$/.test(text)) return { problem: 'hex', text }
  if (/\d_\d/.test(text)) return { problem: 'joined_digits', text }

  // The exponent is read before a unit, so 1e3 is a number and 5em is 5 with the unit em.
  const single = readSingle(text)
  if (single) return single
  const ratio = text.match(RATIO)
  if (ratio) {
    const top = Number(ratio[2])
    const bottom = Number(ratio[3])
    if (bottom === 0) return { problem: 'zero_denominator', text }
    const sign = ratio[1] === '-' ? -1 : 1
    return { kind: 'ratio', value: (sign * top) / bottom, unit: ratio[4] ?? '', ratio: [sign * top, bottom], text }
  }
  const range = text.match(RANGE)
  if (range) {
    const unit = range[3] ?? ''
    const scale = unit === '%' ? 1 / 100 : 1
    return { kind: 'range', value: Number(range[1]) * scale, high: Number(range[2]) * scale, unit, text }
  }
  return { problem: 'not_a_number', text }
}

export function isNumberForm(value: NumberForm | { problem: NumberProblem; text: string }): value is NumberForm {
  return 'kind' in value
}

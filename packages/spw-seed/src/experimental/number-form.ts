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
 *
 * It refuses, with a reason, what it cannot read whole: 0x1f (hex), 1_000 (a
 * joiner in digits), 1/0, 3:4, a word, two signs. Every form keeps the text it
 * was read from, so a reader can write a value back as it was written.
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
  text: string
}

export type NumberProblem = 'empty' | 'hex' | 'joined_digits' | 'zero_denominator' | 'not_a_number'

const DECIMAL = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`
const SIGNED = String.raw`[+\-]?${DECIMAL}(?:[eE][+\-]?\d+)?`
const SINGLE = new RegExp(String.raw`^(${SIGNED})(%|[A-Za-z]+)?$`)
const RATIO = new RegExp(String.raw`^([+\-]?)(${DECIMAL})/(${DECIMAL})([A-Za-z]+)?$`)
const RANGE = new RegExp(String.raw`^(${SIGNED})\.\.(${SIGNED})(%|[A-Za-z]+)?$`)

/** Read one written value; a form, or why it is not one. */
export function readNumberForm(written: string): NumberForm | { problem: NumberProblem; text: string } {
  const text = written.trim()
  if (!text) return { problem: 'empty', text }
  if (/^[+\-]?0[xX][0-9a-fA-F]+$/.test(text)) return { problem: 'hex', text }
  if (/\d_\d/.test(text)) return { problem: 'joined_digits', text }

  const single = text.match(SINGLE)
  // A unit made only of e and digits would be an exponent; SIGNED takes the exponent first, so 1e3 is a number.
  if (single) {
    const unit = single[2] ?? ''
    const n = Number(single[1])
    return { kind: 'number', value: unit === '%' ? n / 100 : n, unit, text }
  }
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

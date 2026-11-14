/**
 * A sheet: a Spw line whose terms define named quantities, each written as an
 * expression over units, numbers and other terms.
 *
 *   ^constants{
 *    %c[299792458 m/s]
 *    %h[6.62607015e-34 J*s]
 *    %hbar[@h/(2*pi)]
 *    %G[6.67430e-11 m^3/(kg*s^2)]
 *    %l_P[(@hbar*@G/@c^3)^(1/2)]
 *   }
 *
 * The definitions are data, read like any settings line (settings-line.ts reads
 * the terms), and a sheet may extend another, so a set of constants is written
 * once and a theory composes on it. An expression is products, quotients, sums
 * and differences of atoms: a number, a unit (with SI prefixes), @name for
 * another term, pi, and parentheses; a space between two atoms multiplies, so
 * 6.674e-11 m^3 is a number times a unit; ^ raises to a rational power, written
 * 3, -2, or (1/2). A sum of different dimensions is refused, a term may refer to
 * a term written after it, and a cycle is reported once per term.
 *
 * Experimental (spw.quantity-sheet/1).
 */

import { scanNumber } from '../number-form'
import { readSettingsTerms } from '../settings-line'
import { ONE, parseRational, rational } from './rational'
import { formatDimension, measured, over, plus, pure, raise, sameDimension, times, unit, type Quantity } from './dimension'

export const QUANTITY_SHEET_SCHEMA = 'spw.quantity-sheet/1' as const

export type SheetProblemKind = 'syntax' | 'unknown_unit' | 'unknown_reference' | 'cycle' | 'mixed_dimensions' | 'not_a_number'

export interface SheetProblem {
  problem: SheetProblemKind
  term: string
  detail: string
}

export interface QuantitySheet {
  schema: typeof QUANTITY_SHEET_SCHEMA
  /** The head's word: ^constants{ … } is the sheet constants. */
  name: string
  quantities: Record<string, Quantity>
  /** Each term's expression as written. */
  written: Record<string, string>
  /** The standard uncertainty of each measured input, by id (term.k for the k-th measured number in a term). */
  inputs: Record<string, number>
  problems: SheetProblem[]
}

/**
 * The standard uncertainty of a quantity, to first order: the square root of the sum over inputs of
 * (derivative × the input's uncertainty)². Inputs are taken as independent of each other; a quantity that
 * uses one input twice is correlated with itself through the derivative, which is exact.
 */
export function uncertainty(quantity: Quantity, inputs: Readonly<Record<string, number>>): number {
  let sum = 0
  for (const [id, d] of Object.entries(quantity.grad ?? {})) {
    const sigma = inputs[id] ?? 0
    sum += (d * sigma) ** 2
  }
  return Math.sqrt(sum)
}

/** value(uncertainty) in the concise form, the uncertainty to two digits: 6.67430(15)e-11. */
export function formatUncertain(value: number, sigma: number): string {
  if (!sigma || !Number.isFinite(sigma)) return String(Number(value.toPrecision(7)))
  const exponent = Math.floor(Math.log10(Math.abs(value) || sigma))
  const sigmaExponent = Math.floor(Math.log10(sigma)) - 1
  const digits = Math.round(sigma / 10 ** sigmaExponent)
  // A number of ordinary size is written plainly, 137.035999084(20); a large or small one with an exponent.
  if (exponent >= -3 && exponent <= 5) return `${value.toFixed(Math.max(0, -sigmaExponent))}(${digits})`
  const mantissa = value / 10 ** exponent
  return `${mantissa.toFixed(Math.max(0, exponent - sigmaExponent))}(${digits})e${exponent}`
}

type Token = { kind: 'number'; value: number; sigma?: number } | { kind: 'name'; value: string } | { kind: 'ref'; value: string } | { kind: 'op'; value: string }

function tokenize(text: string): Token[] | string {
  const out: Token[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]!
    if (/\s/.test(ch)) {
      i++
      continue
    }
    // A number, read as every written value is (number-form.ts), with its uncertainty: 6.67430(15)e-11, 9.81 ± 0.02.
    const scanned = scanNumber(text, i)
    if (scanned) {
      const token: Token = { kind: 'number', value: scanned.value }
      if (scanned.uncertainty !== undefined) token.sigma = scanned.uncertainty
      i = scanned.end
      out.push(token)
      continue
    }
    if (ch === '@') {
      const name = text.slice(i + 1).match(/^[A-Za-z_][\w]*/)
      if (!name) return `@ at ${i} names nothing`
      out.push({ kind: 'ref', value: name[0] })
      i += 1 + name[0].length
      continue
    }
    const name = text.slice(i).match(/^[A-Za-zµΩ][A-Za-zµΩ_]*/)
    if (name) {
      out.push({ kind: 'name', value: name[0] })
      i += name[0].length
      continue
    }
    if ('*/^()+-·'.includes(ch)) {
      out.push({ kind: 'op', value: ch === '·' ? '*' : ch })
      i++
      continue
    }
    return `unexpected ${JSON.stringify(ch)} at ${i}`
  }
  return out
}

class Failure extends Error {
  constructor(readonly kind: SheetProblemKind, message: string) {
    super(message)
  }
}

/**
 * Evaluate an expression; `lookup` gives another term's quantity, and `input` names a measured number
 * (one written with an uncertainty) and is told its uncertainty, returning the id its derivative is kept by.
 */
export function evaluate(text: string, lookup: (name: string) => Quantity, input?: (sigma: number) => string): Quantity {
  const tokens = tokenize(text)
  if (typeof tokens === 'string') throw new Failure('syntax', tokens)
  let at = 0
  const peek = () => tokens[at]
  const isOp = (v: string) => peek()?.kind === 'op' && peek()!.value === v
  const startsAtom = () => {
    const t = peek()
    return !!t && (t.kind !== 'op' || t.value === '(')
  }

  const exponent = () => {
    // 3, -2, (1/2), (-3/4)
    let text = ''
    if (isOp('(')) {
      let depth = 0
      do {
        const t = tokens[at++]
        if (!t) throw new Failure('syntax', 'unclosed exponent')
        if (t.kind === 'op' && t.value === '(') depth++
        if (t.kind === 'op' && t.value === ')') depth--
        text += t.kind === 'number' ? String(t.value) : t.value
      } while (depth > 0)
    } else {
      if (isOp('-')) {
        text += '-'
        at++
      }
      const t = tokens[at++]
      if (t?.kind !== 'number') throw new Failure('syntax', 'an exponent must be a whole number or (p/q)')
      text += String(t.value)
    }
    const r = parseRational(text)
    if (!r) throw new Failure('syntax', `${text} is not a rational exponent`)
    return r
  }

  const atom = (): Quantity => {
    const t = tokens[at++]
    if (!t) throw new Failure('syntax', 'expression ends too soon')
    if (t.kind === 'number') return t.sigma !== undefined && input ? measured(t.value, input(t.sigma)) : pure(t.value)
    if (t.kind === 'ref') return lookup(t.value)
    if (t.kind === 'name') {
      if (t.value === 'pi') return pure(Math.PI)
      const u = unit(t.value)
      if (!u) throw new Failure('unknown_unit', `${t.value} is not a unit`)
      return u
    }
    if (t.value === '(') {
      const inner = sum()
      if (!isOp(')')) throw new Failure('syntax', 'a ( is not closed')
      at++
      return inner
    }
    if (t.value === '-') return times(pure(-1), factor())
    throw new Failure('syntax', `unexpected ${t.value}`)
  }

  const factor = (): Quantity => {
    let base = atom()
    if (isOp('^')) {
      at++
      base = raise(base, exponent())
    }
    return base
  }

  const product = (): Quantity => {
    let value = factor()
    for (;;) {
      if (isOp('*')) {
        at++
        value = times(value, factor())
      } else if (isOp('/')) {
        at++
        value = over(value, factor())
      } else if (startsAtom()) value = times(value, factor())
      else return value
    }
  }

  const sum = (): Quantity => {
    let value = product()
    while (isOp('+') || isOp('-')) {
      const op = tokens[at++]!.value
      const right = product()
      if (!sameDimension(value.dim, right.dim)) {
        throw new Failure('mixed_dimensions', `${formatDimension(value.dim)} ${op} ${formatDimension(right.dim)}`)
      }
      value = plus(value, right, op === '+' ? 1 : -1)
    }
    return value
  }

  const result = sum()
  if (at < tokens.length) throw new Failure('syntax', `unread after ${at} tokens`)
  if (!Number.isFinite(result.scale)) throw new Failure('not_a_number', 'the value is not finite')
  return result
}

/** Read a sheet, optionally on top of another (its terms are in scope, and a term here may replace one there). */
export function readQuantitySheet(text: string, base: QuantitySheet | null = null): QuantitySheet {
  const source = text.replace(/\r?\n/g, ' ')
  const open = source.indexOf('{')
  const close = source.lastIndexOf('}')
  const problems: SheetProblem[] = []
  const head = open > 0 ? source.slice(0, open).trim().replace(/^[\^~%#@.]/, '') : ''
  if (open < 0 || close < open) {
    return { schema: QUANTITY_SHEET_SCHEMA, name: head, quantities: {}, written: {}, inputs: {}, problems: [{ problem: 'syntax', term: '', detail: 'no { … } body' }] }
  }
  const { terms } = readSettingsTerms(source, open + 1, close)
  const written: Record<string, string> = {}
  for (const term of terms) written[term.word] = term.value
  const quantities: Record<string, Quantity> = {}
  const failed = new Map<string, SheetProblemKind>()
  const resolving = new Set<string>()
  const inputs: Record<string, number> = {}

  const resolve = (name: string): Quantity => {
    if (quantities[name]) return quantities[name]!
    if (!(name in written)) {
      if (base?.quantities[name]) return base.quantities[name]!
      throw new Failure('unknown_reference', `@${name} is not defined`)
    }
    // A term that depends on one that failed fails the same way: a cycle stays a cycle downstream.
    if (failed.has(name)) throw new Failure(failed.get(name) === 'cycle' ? 'cycle' : 'unknown_reference', `@${name} could not be read`)
    if (resolving.has(name)) throw new Failure('cycle', `@${name} refers back to itself`)
    resolving.add(name)
    try {
      let k = 0
      const value = evaluate(written[name]!, resolve, (sigma) => {
        const id = `${name}.${k++}`
        inputs[id] = sigma
        return id
      })
      quantities[name] = value
      return value
    } finally {
      resolving.delete(name)
    }
  }

  for (const name of Object.keys(written)) {
    try {
      resolve(name)
    } catch (error) {
      if (!(error instanceof Failure)) throw error
      failed.set(name, error.kind)
      problems.push({ problem: error.kind, term: name, detail: error.message })
    }
  }
  return {
    schema: QUANTITY_SHEET_SCHEMA,
    name: head,
    quantities: { ...(base?.quantities ?? {}), ...quantities },
    written: { ...(base?.written ?? {}), ...written },
    inputs: { ...(base?.inputs ?? {}), ...inputs },
    problems,
  }
}

/** One quantity expressed in a unit: the number, or null when the dimensions differ. */
export function inUnit(quantity: Quantity, unitText: string): number | null {
  const u = evaluate(unitText, () => {
    throw new Failure('unknown_reference', 'a unit names no term')
  })
  if (!sameDimension(quantity.dim, u.dim)) return null
  return quantity.scale / u.scale
}

export { ONE, rational }

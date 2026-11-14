/**
 * Dimensions and units. A dimension is a vector of rational exponents over the
 * seven SI base quantities; a quantity is a scale in SI base units with a
 * dimension. Multiplying quantities adds their dimensions, a power scales them,
 * and two quantities can be added only when their dimensions are equal: the
 * group of dimensions is what dimensional analysis computes in.
 *
 * Units are named as SI writes them (m, kg, s, A, K, mol, cd, and N, J, W, Pa,
 * Hz, C, V, eV, and a few more), with SI prefixes (km, ns, µm or um, GeV). A name
 * that is a unit as written wins over a prefix reading of it: m is a metre, min
 * a minute, cd a candela.
 */

import { ONE, ZERO, add, equals, format, mul, rational, type Rational } from './rational'

export const BASE = ['length', 'mass', 'time', 'current', 'temperature', 'amount', 'luminosity'] as const
export type BaseQuantity = (typeof BASE)[number]
const SYMBOL: Record<BaseQuantity, string> = { length: 'L', mass: 'M', time: 'T', current: 'I', temperature: 'Θ', amount: 'N', luminosity: 'J' }

/** Exponents over BASE, in order. */
export type Dimension = readonly Rational[]

export const DIMENSIONLESS: Dimension = Object.freeze(BASE.map(() => ZERO))

export function dimension(exponents: Partial<Record<BaseQuantity, number | Rational>>): Dimension {
  return BASE.map((b) => {
    const e = exponents[b]
    return e === undefined ? ZERO : typeof e === 'number' ? rational(e) : e
  })
}

export const multiply = (a: Dimension, b: Dimension): Dimension => a.map((x, i) => add(x, b[i]!))
export const power = (a: Dimension, p: Rational): Dimension => a.map((x) => mul(x, p))
export const inverse = (a: Dimension): Dimension => power(a, rational(-1))
export const sameDimension = (a: Dimension, b: Dimension): boolean => a.every((x, i) => equals(x, b[i]!))
export const isDimensionless = (a: Dimension): boolean => sameDimension(a, DIMENSIONLESS)

/** L^2·M·T^-2, or 1 for a pure number. */
export function formatDimension(a: Dimension): string {
  const parts = BASE.map((b, i) => [SYMBOL[b], a[i]!] as const)
    .filter(([, e]) => e.n !== 0)
    .map(([s, e]) => (equals(e, ONE) ? s : `${s}^${e.d === 1 ? format(e) : `(${format(e)})`}`))
  return parts.length ? parts.join('·') : '1'
}

export interface Quantity {
  /** The value in SI base units (m, kg, s, A, K, mol, cd). */
  scale: number
  dim: Dimension
  /**
   * The derivative of scale with respect to each measured input, by the input's id (forward-mode
   * differentiation). Absent for an exact quantity. Carried through every operation, so an input used
   * twice is counted once with its sign: @x/@x has none, @x*@x twice the relative uncertainty of x.
   */
  grad?: Readonly<Record<string, number>>
}

type Grad = Readonly<Record<string, number>> | undefined

/** a·ga + b·gb, over the inputs either names. */
function combine(ga: Grad, a: number, gb: Grad, b: number): Grad {
  if (!ga && !gb) return undefined
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(ga ?? {})) out[k] = (out[k] ?? 0) + v * a
  for (const [k, v] of Object.entries(gb ?? {})) out[k] = (out[k] ?? 0) + v * b
  return out
}

const withGrad = (q: { scale: number; dim: Dimension }, grad: Grad): Quantity => (grad ? { ...q, grad } : q)

const q = (scale: number, exponents: Partial<Record<BaseQuantity, number>>): Quantity => ({ scale, dim: dimension(exponents) })

const JOULE = q(1, { mass: 1, length: 2, time: -2 })
const COULOMB = q(1, { current: 1, time: 1 })

/** Units as written, to their quantity. */
export const UNITS: Readonly<Record<string, Quantity>> = Object.freeze({
  m: q(1, { length: 1 }),
  g: q(1e-3, { mass: 1 }),
  s: q(1, { time: 1 }),
  A: q(1, { current: 1 }),
  K: q(1, { temperature: 1 }),
  mol: q(1, { amount: 1 }),
  cd: q(1, { luminosity: 1 }),
  Hz: q(1, { time: -1 }),
  N: q(1, { mass: 1, length: 1, time: -2 }),
  Pa: q(1, { mass: 1, length: -1, time: -2 }),
  J: JOULE,
  W: q(1, { mass: 1, length: 2, time: -3 }),
  C: COULOMB,
  V: q(1, { mass: 1, length: 2, time: -3, current: -1 }),
  Ω: q(1, { mass: 1, length: 2, time: -3, current: -2 }),
  ohm: q(1, { mass: 1, length: 2, time: -3, current: -2 }),
  F: q(1, { mass: -1, length: -2, time: 4, current: 2 }),
  T: q(1, { mass: 1, time: -2, current: -1 }),
  eV: { scale: 1.602176634e-19, dim: JOULE.dim },
  min: q(60, { time: 1 }),
  h: q(3600, { time: 1 }),
  day: q(86400, { time: 1 }),
  yr: q(365.25 * 86400, { time: 1 }),
  au: q(149597870700, { length: 1 }),
  ly: q(9.4607304725808e15, { length: 1 }),
  pc: q(3.0856775814913673e16, { length: 1 }),
  L: q(1e-3, { length: 3 }),
})

const PREFIXES: Readonly<Record<string, number>> = Object.freeze({
  Y: 1e24, Z: 1e21, E: 1e18, P: 1e15, T: 1e12, G: 1e9, M: 1e6, k: 1e3, h: 1e2, da: 1e1,
  d: 1e-1, c: 1e-2, m: 1e-3, µ: 1e-6, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15, a: 1e-18, z: 1e-21, y: 1e-24,
})

/** A unit by name, prefixes included; the name as written wins over a prefix reading. */
export function unit(name: string): Quantity | null {
  if (UNITS[name]) return UNITS[name]!
  for (const [prefix, factor] of Object.entries(PREFIXES).sort((a, b) => b[0].length - a[0].length)) {
    if (!name.startsWith(prefix) || name.length === prefix.length) continue
    const base = UNITS[name.slice(prefix.length)]
    if (base) return { scale: base.scale * factor, dim: base.dim }
  }
  return null
}

export const times = (a: Quantity, b: Quantity): Quantity =>
  withGrad({ scale: a.scale * b.scale, dim: multiply(a.dim, b.dim) }, combine(a.grad, b.scale, b.grad, a.scale))
export const over = (a: Quantity, b: Quantity): Quantity =>
  withGrad({ scale: a.scale / b.scale, dim: multiply(a.dim, inverse(b.dim)) }, combine(a.grad, 1 / b.scale, b.grad, -a.scale / (b.scale * b.scale)))
export const raise = (a: Quantity, p: Rational): Quantity => {
  const e = p.n / p.d
  return withGrad({ scale: a.scale ** e, dim: power(a.dim, p) }, combine(a.grad, e * a.scale ** (e - 1), undefined, 0))
}
/** a + b, or a − b with sign −1; the caller has checked the dimensions agree. */
export const plus = (a: Quantity, b: Quantity, sign: 1 | -1 = 1): Quantity =>
  withGrad({ scale: a.scale + sign * b.scale, dim: a.dim }, combine(a.grad, 1, b.grad, sign))
export const pure = (n: number): Quantity => ({ scale: n, dim: DIMENSIONLESS })
/** A measured number: its value, and a derivative of one with respect to its own input id. */
export const measured = (n: number, id: string): Quantity => ({ scale: n, dim: DIMENSIONLESS, grad: { [id]: 1 } })
export const ONE_UNIT: Quantity = pure(1)
export { ONE }

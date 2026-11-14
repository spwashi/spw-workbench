/**
 * Two analyses that follow from dimensions alone.
 *
 * Dimensionless groups (Buckingham π). For quantities q1 … qn, every product
 * q1^a1 · … · qn^an without a dimension is a vector a in the null space of the
 * matrix whose columns are the quantities' dimensions; a basis of that space,
 * in whole numbers, is a complete set of π groups. A pendulum's period, length,
 * mass and gravity give one: T² g / L, and the mass is in none, so the period
 * cannot depend on it. Every law among the quantities is a law among the groups.
 *
 * Natural units. Setting constants to 1 (c = ħ = 1, or c = ħ = G = 1) declares
 * their dimensions equivalent to nothing, so a quantity is measured as a number
 * times powers of the constants and of one chosen unit. Solving its dimension as
 * p·dim(unit) + Σ aᵢ·dim(constantᵢ) over the rationals gives the powers, and the
 * number is what is left of its scale. With c = ħ = 1 and the GeV as the unit, a
 * Planck mass is about 1.22 × 10¹⁹; with c = ħ = G = 1 and no unit, everything
 * is a pure number in Planck units.
 *
 * Both are linear algebra over the rationals (rational.ts), exact in the
 * exponents and floating only in the scales.
 */

import { format, rational, solve, nullSpace, ZERO, type Rational } from './rational'
import { BASE, DIMENSIONLESS, isDimensionless, type Quantity } from './dimension'

export interface PiGroup {
  /** Each named quantity's whole-number exponent in the group; zero exponents left out. */
  exponents: Record<string, number>
  /** The group written as a product: T^2 · g · L^-1. */
  text: string
  /** The group's value with the quantities' scales. */
  value: number
}

/** A complete set of dimensionless groups for named quantities. */
export function piGroups(quantities: Record<string, Quantity>): PiGroup[] {
  const names = Object.keys(quantities)
  if (!names.length) return []
  const matrix: Rational[][] = BASE.map((_, row) => names.map((name) => quantities[name]!.dim[row]!))
  return nullSpace(matrix).map((vector) => {
    const exponents: Record<string, number> = {}
    vector.forEach((e, i) => {
      if (e !== 0) exponents[names[i]!] = e
    })
    const text = Object.entries(exponents)
      .map(([name, e]) => (e === 1 ? name : `${name}^${e}`))
      .join(' · ')
    const value = Object.entries(exponents).reduce((v, [name, e]) => v * quantities[name]!.scale ** e, 1)
    return { exponents, text, value }
  })
}

export interface NaturalReading {
  /** The number left once the powers are divided out. */
  value: number
  /** The power of the chosen unit. */
  unitPower: string
  /** Each constant's power, by name. */
  constantPowers: Record<string, string>
}

/**
 * A quantity measured in natural units: constants set to 1, and an optional unit
 * every remaining dimension is measured in. Null when the quantity's dimension is
 * not reachable from them (a temperature, with only c and ħ set to 1).
 */
export function inNaturalUnits(quantity: Quantity, constants: Record<string, Quantity>, unit: Quantity | null = null): NaturalReading | null {
  const names = Object.keys(constants)
  const columns = [...(unit ? [unit.dim] : []), ...names.map((n) => constants[n]!.dim)]
  if (!columns.length) return isDimensionless(quantity.dim) ? { value: quantity.scale, unitPower: '0', constantPowers: {} } : null
  const A: Rational[][] = BASE.map((_, row) => columns.map((dim) => dim[row]!))
  const x = solve(A, [...quantity.dim])
  if (!x) return null
  const p = unit ? x[0]! : ZERO
  const powers = unit ? x.slice(1) : x
  let divisor = unit ? unit.scale ** (p.n / p.d) : 1
  powers.forEach((a, i) => {
    divisor *= constants[names[i]!]!.scale ** (a.n / a.d)
  })
  return {
    value: quantity.scale / divisor,
    unitPower: format(p),
    constantPowers: Object.fromEntries(names.map((n, i) => [n, format(powers[i]!)])),
  }
}

export { DIMENSIONLESS, rational }

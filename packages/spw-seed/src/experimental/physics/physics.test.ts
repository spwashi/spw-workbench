/**
 * Dimensional analysis held to known physics: the Planck units and the
 * fine-structure constant from the SI constants sheet, π groups that are the
 * textbook ones, natural-unit readings, and the algebra's own laws.
 */
import { describe, expect, it } from 'vitest'
import { seededRandom } from '../seeded-random'
import { SI_CONSTANTS } from './constants'
import { BASE, dimension, formatDimension, isDimensionless, sameDimension, unit } from './dimension'
import { inNaturalUnits, piGroups } from './analysis'
import { evaluate, inUnit, readQuantitySheet } from './sheet'
import { add, format, mul, nullSpace, rational, solve, toNumber } from './rational'

const C = readQuantitySheet(SI_CONSTANTS)
const q = (name: string) => C.quantities[name]!
const GeV = readQuantitySheet('^u{ %GeV[1 GeV] }').quantities.GeV!

describe('rationals', () => {
  it('keeps lowest terms and a positive denominator, and solves and finds null spaces exactly', () => {
    expect(rational(2, -4)).toEqual({ n: -1, d: 2 })
    expect(format(add(rational(1, 3), rational(1, 6)))).toBe('1/2')
    const x = solve([[rational(2), rational(1)], [rational(1), rational(3)]], [rational(3), rational(5)])!
    expect(x.map(format)).toEqual(['4/5', '7/5'])
    expect(solve([[rational(1), rational(1)], [rational(1), rational(1)]], [rational(1), rational(2)])).toBeNull()
    expect(nullSpace([[rational(1), rational(2), rational(3)]])).toEqual([[2, -1, 0], [3, 0, -1]])
  })

  it('holds A·v = 0 for every null-space vector of generated integer matrices', () => {
    const rand = seededRandom(17)
    for (let k = 0; k < 200; k++) {
      const rows = 1 + Math.floor(rand() * 4)
      const cols = 1 + Math.floor(rand() * 6)
      const A = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rational(Math.floor(rand() * 7) - 3)))
      for (const v of nullSpace(A)) {
        for (const row of A) expect(toNumber(row.reduce((acc, a, i) => add(acc, mul(a, rational(v[i]!))), rational(0)))).toBe(0)
      }
    }
  })
})

describe('units and dimensions', () => {
  it('reads SI units with prefixes, a unit as written winning over a prefix reading', () => {
    expect(unit('kg')).toMatchObject({ scale: 1 })
    expect(unit('km')!.scale).toBe(1000)
    expect(unit('GeV')!.scale).toBeCloseTo(1.602176634e-10, 20)
    expect(unit('min')!.scale).toBe(60)
    expect(unit('m')!.scale).toBe(1)
    expect(unit('furlong')).toBeNull()
    expect(formatDimension(unit('N')!.dim)).toBe('L·M·T^-2')
  })

  it('refuses a sum of different dimensions, and reads a space between atoms as a product', () => {
    expect(() => evaluate('1 m + 2 s', () => { throw new Error() })).toThrow('L + T')
    expect(evaluate('6.674e-11 m^3/(kg*s^2)', () => { throw new Error() }).scale).toBe(6.674e-11)
    expect(formatDimension(evaluate('(m^2)^(1/2)', () => { throw new Error() }).dim)).toBe('L')
  })
})

describe('the SI constants sheet', () => {
  it('reads whole and derives the Planck units and the fine-structure constant', () => {
    expect(C.problems).toEqual([])
    expect(q('l_P').scale).toBeCloseTo(1.616255e-35, 40)
    expect(q('m_P').scale).toBeCloseTo(2.176434e-8, 13)
    expect(q('t_P').scale).toBeCloseTo(5.391246e-44, 49)
    expect(q('T_P').scale / 1.416784e32).toBeCloseTo(1, 6)
    expect(1 / q('alpha').scale).toBeCloseTo(137.035999084, 6)
    expect(isDimensionless(q('alpha').dim)).toBe(true)
    expect(sameDimension(q('l_P').dim, dimension({ length: 1 }))).toBe(true)
  })

  it('lets a theory extend it, a term there in scope here', () => {
    const theory = readQuantitySheet('^theory{ %r_s[2*@G*@M/@c^2] %M[1.98847e30 kg] }', C)
    expect(theory.problems).toEqual([])
    expect(theory.quantities.r_s!.scale / 2953.25).toBeCloseTo(1, 3)
    expect(theory.quantities.c).toBe(q('c'))
  })

  it('reports each broken term once, with a cycle carried to what depends on it', () => {
    const bad = readQuantitySheet('^bad{ %a[1 m + 2 s] %b[@c] %c[@b] %d[@b*2] %e[3 furlong] %f[@nope] }')
    expect(bad.problems.map((p) => [p.problem, p.term])).toEqual([
      ['mixed_dimensions', 'a'], ['cycle', 'b'], ['cycle', 'c'], ['cycle', 'd'], ['unknown_unit', 'e'], ['unknown_reference', 'f'],
    ])
  })
})

describe('dimensionless groups', () => {
  it('finds the pendulum\'s one group, with the mass in none', () => {
    const groups = piGroups(readQuantitySheet('^pendulum{ %T[2 s] %L[1 m] %m[1 kg] %g[9.81 m/s^2] }').quantities)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.exponents).toEqual({ T: 2, L: -1, g: 1 })
    expect(groups[0]!.value).toBeCloseTo(39.24, 6)
  })

  it('finds the Reynolds number for flow in a pipe, and every group it finds is dimensionless', () => {
    const sheet = readQuantitySheet('^pipe{ %rho[1000 kg/m^3] %v[2 m/s] %D[0.05 m] %mu[1e-3 Pa*s] }')
    const groups = piGroups(sheet.quantities)
    expect(groups.map((g) => g.exponents)).toEqual([{ rho: 1, v: 1, D: 1, mu: -1 }])
    expect(groups[0]!.value).toBeCloseTo(1e5, 3)
    const all = piGroups({ c: q('c'), hbar: q('hbar'), G: q('G'), k_B: q('k_B'), m_e: q('m_e'), e: q('e'), epsilon_0: q('epsilon_0') })
    expect(all.length).toBe(7 - 5)
    for (const g of all) {
      const dim = Object.entries(g.exponents).reduce((d, [name, e]) => d.map((x, i) => add(x, mul(q(name).dim[i]!, rational(e)))), BASE.map(() => rational(0)))
      expect(dim.every((x) => x.n === 0)).toBe(true)
    }
  })
})

describe('natural units', () => {
  it('reads the Planck mass as about 1.22e19 GeV with c = ħ = 1, and a metre as about 5.07e15 per GeV', () => {
    const m = inNaturalUnits(q('m_P'), { c: q('c'), hbar: q('hbar') }, GeV)!
    expect(m.value / 1.220890e19).toBeCloseTo(1, 5)
    expect(m.unitPower).toBe('1')
    const metre = inNaturalUnits(unit('m')!, { c: q('c'), hbar: q('hbar') }, GeV)!
    expect(metre.unitPower).toBe('-1')
    expect(metre.value / 5.0677307e15).toBeCloseTo(1, 6)
  })

  it('makes everything a pure number in Planck units, and the Planck length exactly one', () => {
    const planck = { c: q('c'), hbar: q('hbar'), G: q('G') }
    expect(inNaturalUnits(q('l_P'), planck)!.value).toBeCloseTo(1, 12)
    expect(inNaturalUnits(q('m_e'), planck)!.value / 4.18546e-23).toBeCloseTo(1, 4)
    expect(inNaturalUnits(q('k_B'), planck)).toBeNull()
  })

  it('agrees with inUnit where both apply', () => {
    expect(inUnit(q('E_P'), 'GeV')! / 1.220890e19).toBeCloseTo(1, 5)
    expect(inUnit(q('E_P'), 'm')).toBeNull()
  })
})

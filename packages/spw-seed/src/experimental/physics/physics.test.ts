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
import { evaluate, formatUncertain, inUnit, readQuantitySheet, uncertainty } from './sheet'
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

describe('uncertainty', () => {
  const read = (body: string) => readQuantitySheet(`^m{ ${body} }`)
  const sigmaOf = (sheet: ReturnType<typeof read>, name: string) => uncertainty(sheet.quantities[name]!, sheet.inputs)

  it('reads a measured number in the concise form and with ±, and an exact one as exact', () => {
    const s = read('%G[6.67430(15)e-11 m^3/(kg*s^2)] %g[9.81 ± 0.02 m/s^2] %h[9.81 +- 0.02 m/s^2] %c[299792458 m/s]')
    expect(sigmaOf(s, 'G')).toBeCloseTo(1.5e-15, 25)
    expect(sigmaOf(s, 'g')).toBeCloseTo(0.02, 12)
    expect(sigmaOf(s, 'h')).toBeCloseTo(0.02, 12)
    expect(sigmaOf(s, 'c')).toBe(0)
  })

  it('counts an input used twice once, with its sign: x/x is exact, x*x doubles the relative uncertainty, x+x keeps it', () => {
    const s = read('%x[2.0 ± 0.1 m] %ratio[@x/@x] %area[@x*@x] %twice[@x+@x] %y[3.0 ± 0.4 m] %both[@x+@y]')
    expect(sigmaOf(s, 'ratio')).toBe(0)
    expect(sigmaOf(s, 'area') / s.quantities.area!.scale).toBeCloseTo(0.1, 12)
    expect(sigmaOf(s, 'twice')).toBeCloseTo(0.2, 12)
    expect(sigmaOf(s, 'both')).toBeCloseTo(Math.hypot(0.1, 0.4), 12)
  })

  it('propagates the CODATA uncertainties of the constants sheet into the Planck units and alpha', () => {
    expect(formatUncertain(q('l_P').scale, uncertainty(q('l_P'), C.inputs))).toBe('1.616255(18)e-35')
    expect(formatUncertain(q('m_P').scale, uncertainty(q('m_P'), C.inputs))).toBe('2.176434(24)e-8')
    const inverse = readQuantitySheet('^i{ %inv[1/@alpha] }', C)
    expect(uncertainty(inverse.quantities.inv!, inverse.inputs) / 2.1e-8).toBeCloseTo(1, 0)
  })

  it('agrees with a finite difference on generated expressions', () => {
    const rand = seededRandom(23)
    for (let k = 0; k < 100; k++) {
      const a = 1 + rand() * 5
      const b = 1 + rand() * 5
      const p = 1 + Math.floor(rand() * 3)
      const sheet = read(`%a[${a} ± 0.001 m] %b[${b} ± 0.002 m] %f[(@a*@b + @a^2)^(1/2) / @b^${p}]`)
      const f = (x: number, y: number) => Math.sqrt(x * y + x * x) / y ** p
      const h = 1e-6
      const da = (f(a + h, b) - f(a - h, b)) / (2 * h)
      const db = (f(a, b + h) - f(a, b - h)) / (2 * h)
      expect(sigmaOf(sheet, 'f') / Math.hypot(da * 0.001, db * 0.002)).toBeCloseTo(1, 5)
    }
  })

  it('writes value(uncertainty) to two digits of the uncertainty', () => {
    expect(formatUncertain(6.6743e-11, 1.5e-15)).toBe('6.67430(15)e-11')
    expect(formatUncertain(9.81, 0.02)).toBe('9.810(20)')
    expect(formatUncertain(4, 0)).toBe('4')
    expect(formatUncertain(137.035999084, 2.06e-8)).toBe('137.035999084(21)')
  })
})

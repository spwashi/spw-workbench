/**
 * Rationals, exact: the exponents of a dimension (a square root is a power of
 * one half) and the entries of the linear systems dimensional analysis solves.
 * Numerator and denominator are safe integers kept in lowest terms with a
 * positive denominator; an operation that would leave the safe range throws
 * rather than round, since a rounded exponent is a wrong dimension.
 */

export interface Rational {
  readonly n: number
  readonly d: number
}

const gcd = (a: number, b: number): number => {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a || 1
}

export function rational(n: number, d = 1): Rational {
  if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error(`rational: ${n}/${d} is not a ratio of integers`)
  if (d === 0) throw new Error('rational: zero denominator')
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) throw new Error(`rational: ${n}/${d} leaves the safe integers`)
  const g = gcd(n, d)
  const sign = d < 0 ? -1 : 1
  return { n: (sign * n) / g || 0, d: (sign * d) / g }
}

export const ZERO = rational(0)
export const ONE = rational(1)

export const add = (a: Rational, b: Rational): Rational => rational(a.n * b.d + b.n * a.d, a.d * b.d)
export const sub = (a: Rational, b: Rational): Rational => rational(a.n * b.d - b.n * a.d, a.d * b.d)
export const mul = (a: Rational, b: Rational): Rational => rational(a.n * b.n, a.d * b.d)
export const div = (a: Rational, b: Rational): Rational => {
  if (b.n === 0) throw new Error('rational: division by zero')
  return rational(a.n * b.d, a.d * b.n)
}
export const neg = (a: Rational): Rational => rational(-a.n, a.d)
export const isZero = (a: Rational): boolean => a.n === 0
export const equals = (a: Rational, b: Rational): boolean => a.n === b.n && a.d === b.d
export const toNumber = (a: Rational): number => a.n / a.d
export const format = (a: Rational): string => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`)

/** Read 3, -2, 1/2, -3/4, or (1/2). */
export function parseRational(text: string): Rational | null {
  const m = text.trim().replace(/^\((.*)\)$/, '$1').match(/^([+-]?\d+)(?:\/(\d+))?$/)
  return m ? rational(Number(m[1]), m[2] ? Number(m[2]) : 1) : null
}

/**
 * Solve A x = b over the rationals by Gaussian elimination. Returns one solution
 * (free variables set to zero), or null when the system has none. A is rows by
 * columns.
 */
export function solve(A: Rational[][], b: Rational[]): Rational[] | null {
  const rows = A.length
  const cols = A[0]?.length ?? 0
  const m = A.map((row, i) => [...row, b[i]!])
  const pivots: number[] = []
  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    const p = m.findIndex((row, i) => i >= r && !isZero(row[c]!))
    if (p < 0) continue
    ;[m[r], m[p]] = [m[p]!, m[r]!]
    const pivot = m[r]![c]!
    m[r] = m[r]!.map((x) => div(x, pivot))
    for (let i = 0; i < rows; i++) {
      if (i === r || isZero(m[i]![c]!)) continue
      const f = m[i]![c]!
      m[i] = m[i]!.map((x, j) => sub(x, mul(f, m[r]![j]!)))
    }
    pivots.push(c)
    r++
  }
  for (let i = r; i < rows; i++) if (!isZero(m[i]![cols]!)) return null
  const x = Array.from({ length: cols }, () => ZERO)
  pivots.forEach((c, i) => {
    x[c] = m[i]![cols]!
  })
  return x
}

/** A basis of the null space of A (rows by columns), each vector scaled to integers with no common factor. */
export function nullSpace(A: Rational[][]): number[][] {
  const rows = A.length
  const cols = A[0]?.length ?? 0
  const m = A.map((row) => [...row])
  const pivotOf: number[] = []
  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    const p = m.findIndex((row, i) => i >= r && !isZero(row[c]!))
    if (p < 0) continue
    ;[m[r], m[p]] = [m[p]!, m[r]!]
    const pivot = m[r]![c]!
    m[r] = m[r]!.map((x) => div(x, pivot))
    for (let i = 0; i < rows; i++) {
      if (i === r || isZero(m[i]![c]!)) continue
      const f = m[i]![c]!
      m[i] = m[i]!.map((x, j) => sub(x, mul(f, m[r]![j]!)))
    }
    pivotOf[c] = r
    r++
  }
  const basis: number[][] = []
  for (let free = 0; free < cols; free++) {
    if (pivotOf[free] !== undefined) continue
    const v = Array.from({ length: cols }, () => ZERO)
    v[free] = ONE
    for (let c = 0; c < cols; c++) if (pivotOf[c] !== undefined) v[c] = neg(m[pivotOf[c]!]![free]!)
    const lcm = v.reduce((l, x) => (l * x.d) / gcd(l, x.d), 1)
    const ints = v.map((x) => (x.n * lcm) / x.d)
    const g = ints.reduce((acc, x) => gcd(acc, x), 0) || 1
    const first = ints.find((x) => x !== 0) ?? 1
    basis.push(ints.map((x) => (x / g) * Math.sign(first) || 0))
  }
  return basis
}

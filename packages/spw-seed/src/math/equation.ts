/**
 * Equation / residual probes — small closed systems for modeling tests.
 *
 * Spw mapping:
 *   %measure ≈ residual or normalized error
 *   Hold product ≈ multiplicative constraint satisfaction
 *   = bias ≈ assignment / configuration
 *
 * @see docs/theory/spw/math-modeling.spw
 * @see packages/spw-cli/src/emit/axes.ts (holdProduct)
 */

/** Evaluate polynomial Σ c[i] x^i (low degree first). */
export function evalPolynomial(coeffs: number[], x: number): number {
  let y = 0
  let p = 1
  for (const c of coeffs) {
    y += c * p
    p *= x
  }
  return y
}

/** Residual of f(x)=0. */
export function residual(f: (x: number) => number, x: number): number {
  return f(x)
}

/**
 * Bisection root finder on [lo, hi] assuming sign change.
 */
export function bisectionRoot(
  f: (x: number) => number,
  lo: number,
  hi: number,
  opts: { tol?: number; maxIter?: number } = {},
): { root: number; iterations: number; converged: boolean; fRoot: number } {
  const tol = opts.tol ?? 1e-10
  const maxIter = opts.maxIter ?? 80
  let a = lo
  let b = hi
  let fa = f(a)
  let fb = f(b)
  if (fa === 0) return { root: a, iterations: 0, converged: true, fRoot: 0 }
  if (fb === 0) return { root: b, iterations: 0, converged: true, fRoot: 0 }
  if (fa * fb > 0) {
    throw new Error('bisectionRoot: f(lo) and f(hi) must have opposite signs')
  }
  let mid = a
  for (let i = 1; i <= maxIter; i++) {
    mid = 0.5 * (a + b)
    const fm = f(mid)
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) {
      return { root: mid, iterations: i, converged: true, fRoot: fm }
    }
    if (fa * fm <= 0) {
      b = mid
      fb = fm
    } else {
      a = mid
      fa = fm
    }
  }
  return { root: mid, iterations: maxIter, converged: false, fRoot: f(mid) }
}

/**
 * Solve A x = b for small dense systems (Gaussian elimination with partial pivot).
 * A is row-major n×n.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length
  if (A.length !== n) throw new Error('solveLinearSystem: shape mismatch')
  const M = A.map((row, i) => {
    if (row.length !== n) throw new Error('solveLinearSystem: non-square row')
    return [...row, b[i]!]
  })

  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r
    }
    if (Math.abs(M[pivot]![col]!) < 1e-14) {
      throw new Error('solveLinearSystem: singular or ill-conditioned matrix')
    }
    if (pivot !== col) {
      const tmp = M[col]!
      M[col] = M[pivot]!
      M[pivot] = tmp
    }
    const div = M[col]![col]!
    for (let c = col; c <= n; c++) M[col]![c]! /= div
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = M[r]![col]!
      for (let c = col; c <= n; c++) M[r]![c]! -= factor * M[col]![c]!
    }
  }
  return M.map(row => row[n]!)
}

/** Multiplicative hold / constraint product (same spirit as emit F2). */
export function productConstraint(
  factors: number[],
  exponents?: number[],
): number {
  let p = 1
  for (let i = 0; i < factors.length; i++) {
    const h = clamp01(factors[i]!)
    const a = exponents?.[i] ?? 1
    if (a === 0) continue
    p *= Math.pow(h, a)
  }
  return clamp01(p)
}

/** L2 residual ||Ax - b||. */
export function linearResidual(A: number[][], x: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < A.length; i++) {
    let row = 0
    for (let j = 0; j < x.length; j++) row += (A[i]![j] ?? 0) * x[j]!
    const d = row - (b[i] ?? 0)
    s += d * d
  }
  return Math.sqrt(s)
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

/**
 * Dot product / cosine similarity for small embedding comparisons (salience, valence).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

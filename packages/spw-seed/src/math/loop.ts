/**
 * Loop / iteration probes — fixed points, bounded while, discrete dynamics.
 *
 * Spw mapping:
 *   saga observe→mutate→measure→decide ≈ fixed-point search under budget
 *   effect.l0–l2 ceilings ≈ maxIter / effect ceiling
 *   !bonk multi-axis ≈ escape hatch when one-coordinate loop fails
 *
 * @see docs/theory/spw/math-modeling.spw
 * @see prompts/sagas/schema.spw
 */

export interface FixedPointResult<T> {
  value: T
  iterations: number
  converged: boolean
  history: T[]
}

/**
 * Iterate x ← f(x) until |Δ| < eps (number) or equals (via eq) or maxIter.
 */
export function fixedPoint<T>(
  f: (x: T) => T,
  x0: T,
  opts: {
    maxIter?: number
    eps?: number
    eq?: (a: T, b: T) => boolean
    /** Keep history of iterates (capped) */
    record?: boolean
  } = {},
): FixedPointResult<T> {
  const maxIter = opts.maxIter ?? 64
  const eps = opts.eps ?? 1e-9
  const eq =
    opts.eq ??
    ((a: T, b: T) => {
      if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < eps
      return Object.is(a, b)
    })
  const history: T[] = opts.record ? [x0] : []
  let x = x0
  for (let i = 1; i <= maxIter; i++) {
    const y = f(x)
    if (opts.record) history.push(y)
    if (eq(x, y)) {
      return { value: y, iterations: i, converged: true, history }
    }
    x = y
  }
  return { value: x, iterations: maxIter, converged: false, history }
}

/**
 * Bounded while: run body while pred, maxSteps hard stop.
 */
export function boundedWhile(
  pred: () => boolean,
  body: () => void,
  maxSteps = 10_000,
): { steps: number; exhausted: boolean } {
  let steps = 0
  while (pred() && steps < maxSteps) {
    body()
    steps++
  }
  return { steps, exhausted: pred() && steps >= maxSteps }
}

/**
 * Discrete range fold: reduce over [start, end) with step.
 */
export function rangeFold<T>(
  start: number,
  end: number,
  step: number,
  init: T,
  f: (acc: T, i: number) => T,
): T {
  if (step === 0) throw new Error('rangeFold: step must be non-zero')
  let acc = init
  if (step > 0) {
    for (let i = start; i < end; i += step) acc = f(acc, i)
  } else {
    for (let i = start; i > end; i += step) acc = f(acc, i)
  }
  return acc
}

/**
 * Map-scan dynamics: x_{t+1} = f(x_t, t), length n+1 including x0.
 */
export function orbit<T>(f: (x: T, t: number) => T, x0: T, steps: number): T[] {
  const out: T[] = [x0]
  let x = x0
  for (let t = 0; t < steps; t++) {
    x = f(x, t)
    out.push(x)
  }
  return out
}

/**
 * Check whether a discrete orbit entered a cycle of period p within window.
 */
export function detectPeriod(
  seq: number[],
  period: number,
  tol = 1e-9,
): boolean {
  if (period <= 0 || seq.length < period * 2) return false
  const a = seq.slice(-period)
  const b = seq.slice(-2 * period, -period)
  return a.every((v, i) => Math.abs(v - (b[i] ?? 0)) <= tol)
}

/**
 * Logistic map sample (chaos / discrete dynamics exhibit).
 * x ← r x (1-x)
 */
export function logisticOrbit(r: number, x0: number, steps: number): number[] {
  return orbit(x => r * x * (1 - x), x0, steps)
}

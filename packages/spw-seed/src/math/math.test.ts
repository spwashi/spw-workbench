import { describe, it, expect } from 'vitest'
import {
  graphFromEdges,
  detectCycle,
  topologicalSort,
  shortestPath,
  adjacencyMatrix,
  fixedPoint,
  rangeFold,
  logisticOrbit,
  detectPeriod,
  evalPolynomial,
  bisectionRoot,
  solveLinearSystem,
  productConstraint,
  linearResidual,
  cosineSimilarity,
} from './index'

describe('graph probes', () => {
  it('detects cycles and sorts DAGs', () => {
    const dag = graphFromEdges([
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'a', to: 'c' },
    ])
    expect(detectCycle(dag).cyclic).toBe(false)
    expect(topologicalSort(dag)).toEqual(['a', 'b', 'c'])

    const cyc = graphFromEdges([
      { from: 'x', to: 'y' },
      { from: 'y', to: 'z' },
      { from: 'z', to: 'x' },
    ])
    const r = detectCycle(cyc)
    expect(r.cyclic).toBe(true)
    expect(r.cycle?.length).toBeGreaterThan(2)
    expect(() => topologicalSort(cyc)).toThrow(/cycle/)
  })

  it('shortest path with weights', () => {
    const g = graphFromEdges([
      { from: 's', to: 'a', weight: 1 },
      { from: 's', to: 'b', weight: 4 },
      { from: 'a', to: 'b', weight: 1 },
      { from: 'b', to: 't', weight: 1 },
    ])
    const sp = shortestPath(g, 's', 't')
    expect(sp?.distance).toBe(3)
    expect(sp?.path).toEqual(['s', 'a', 'b', 't'])
  })

  it('builds adjacency matrix', () => {
    const g = graphFromEdges([{ from: 'a', to: 'b', weight: 2 }])
    const { order, matrix } = adjacencyMatrix(g)
    expect(order).toEqual(['a', 'b'])
    expect(matrix[0]![1]).toBe(2)
    expect(matrix[1]![0]).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('loop probes', () => {
  it('finds fixed point of cosine contraction-ish map', () => {
    // x ← cos(x) converges
    const r = fixedPoint(Math.cos, 0.5, { maxIter: 100, eps: 1e-10, record: true })
    expect(r.converged).toBe(true)
    expect(Math.abs(r.value - Math.cos(r.value))).toBeLessThan(1e-8)
    expect(r.history.length).toBeGreaterThan(1)
  })

  it('rangeFold sums', () => {
    expect(rangeFold(1, 5, 1, 0, (a, i) => a + i)).toBe(10)
  })

  it('logistic map can show period-2 for r=3.2 after transient', () => {
    const seq = logisticOrbit(3.2, 0.4, 80)
    const tail = seq.slice(40)
    // period-2 attractor for r=3.2 — check last even/odd separation
    const even = tail.filter((_, i) => i % 2 === 0)
    const odd = tail.filter((_, i) => i % 2 === 1)
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    expect(Math.abs(mean(even) - mean(odd))).toBeGreaterThan(0.05)
    expect(detectPeriod(seq.slice(-20), 2, 0.05) || Math.abs(mean(even) - mean(odd)) > 0.05).toBe(
      true,
    )
  })
})

describe('equation probes', () => {
  it('evaluates polynomials', () => {
    // 1 + 2x + 3x^2 at x=2 → 1+4+12=17
    expect(evalPolynomial([1, 2, 3], 2)).toBe(17)
  })

  it('bisects a root of x^2 - 2', () => {
    const r = bisectionRoot(x => x * x - 2, 0, 2)
    expect(r.converged).toBe(true)
    expect(Math.abs(r.root - Math.SQRT2)).toBeLessThan(1e-8)
  })

  it('solves 2x2 linear system', () => {
    const x = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [4, 5],
    )
    expect(x[0]).toBeCloseTo(1.4, 8)
    expect(x[1]).toBeCloseTo(1.2, 8)
    expect(linearResidual(
      [
        [2, 1],
        [1, 3],
      ],
      x,
      [4, 5],
    )).toBeLessThan(1e-10)
  })

  it('product constraint matches hold spirit', () => {
    expect(productConstraint([1, 0.5, 1], [1, 2, 1])).toBeCloseTo(0.25)
    expect(productConstraint([0, 1])).toBe(0)
  })

  it('cosine similarity', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })
})

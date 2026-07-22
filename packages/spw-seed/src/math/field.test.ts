import { describe, it, expect } from 'vitest'
import { graphFromEdges } from './graph'
import {
  decayField,
  halfLifeToRate,
  diffuseField,
  transfer,
  cascadeChain,
  capacityStep,
  affinityAllocate,
  mixFields,
  fieldBeat,
  fieldSum,
  massConserved,
  zeros,
} from './field'

describe('field decay & half-life', () => {
  it('decays exponentially', () => {
    const s = decayField({ a: 1 }, Math.LN2, 1)
    expect(s.a).toBeCloseTo(0.5, 10)
  })

  it('halfLifeToRate matches LN2/T', () => {
    expect(halfLifeToRate(2)).toBeCloseTo(Math.LN2 / 2)
  })
})

describe('field transfer & diffusion', () => {
  it('conserves mass on transfer', () => {
    const s0 = { a: 10, b: 0 }
    const s1 = transfer(s0, 'a', 'b', 4)
    expect(s1.a).toBe(6)
    expect(s1.b).toBe(4)
    expect(massConserved(s0, s1)).toBe(true)
  })

  it('diffusion moves amplitude toward neighbors', () => {
    const g = graphFromEdges([
      { from: 'a', to: 'b', weight: 1 },
      { from: 'b', to: 'a', weight: 1 },
    ])
    const s0 = { a: 1, b: 0 }
    const s1 = diffuseField(g, s0, 0.25, 1, { symmetric: true })
    expect(s1.a!).toBeLessThan(1)
    expect(s1.b!).toBeGreaterThan(0)
    expect(fieldSum(s1)).toBeCloseTo(1, 8)
  })
})

describe('cascade, capacity, affinity', () => {
  it('cascade amplifies through stages', () => {
    const amps = cascadeChain(1, [{ gain: 2 }, { gain: 3, decay: 0 }])
    expect(amps[0]).toBe(2)
    expect(amps[1]).toBe(6)
  })

  it('capacity step approaches K', () => {
    let x = 1
    for (let i = 0; i < 40; i++) x = capacityStep(x, 10, 0.5, 1)
    expect(x).toBeGreaterThan(8)
    expect(x).toBeLessThanOrEqual(10)
  })

  it('affinity allocates under capacity', () => {
    const r = affinityAllocate(
      [
        { id: 'c1', free: 5, affinity: { s1: 2, s2: 0.1 } },
        { id: 'c2', free: 5, affinity: { s1: 0.1, s2: 2 } },
      ],
      [
        { id: 's1', capacity: 3 },
        { id: 's2', capacity: 3 },
      ],
    )
    expect(r.occupancy.s1).toBeLessThanOrEqual(3)
    expect(r.occupancy.s2).toBeLessThanOrEqual(3)
    expect((r.bound.c1?.s1 ?? 0) + (r.bound.c1?.s2 ?? 0) + r.free.c1!).toBeCloseTo(5)
  })
})

describe('mix and beat', () => {
  it('mixes fields with normalized weights', () => {
    const m = mixFields(
      [
        { weight: 1, state: { a: 1 } },
        { weight: 1, state: { a: 3 } },
      ],
      { normalize: true },
    )
    expect(m.a).toBeCloseTo(2)
  })

  it('fieldBeat injects after decay', () => {
    const g = graphFromEdges([{ from: 'a', to: 'b', weight: 1 }])
    const s = fieldBeat(g, { a: 2, b: 0 }, { decayRate: 0, kappa: 0, inject: { a: 1 } })
    expect(s.a).toBe(3)
  })

  it('zeros helper', () => {
    expect(zeros(['x', 'y'])).toEqual({ x: 0, y: 0 })
  })
})

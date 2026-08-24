import { describe, expect, it } from 'vitest'
import { ProbeCache } from './probe-cache'

describe('VS Code probe cache receipts', () => {
  it('distinguishes miss, hit, expiry, and clear without hiding lifetime counters', () => {
    let now = 1_000
    const cache = new ProbeCache(100, () => now)

    expect(cache.read('form')).toEqual({ state: 'miss' })
    cache.set('form', { depth: 2 })
    now += 40
    expect(cache.read('form')).toEqual({ state: 'hit', value: { depth: 2 }, ageMs: 40 })
    now += 61
    expect(cache.read('form')).toEqual({ state: 'expired', ageMs: 101 })
    cache.clear()

    expect(cache.snapshot()).toEqual({
      entries: 0,
      ttlMs: 100,
      hits: 1,
      misses: 1,
      expired: 1,
      disabled: 0,
      writes: 1,
      clears: 1,
    })
  })

  it('records disabled reads without retaining values', () => {
    const cache = new ProbeCache(0)
    cache.set('form', 1)

    expect(cache.read('form')).toEqual({ state: 'disabled' })
    expect(cache.snapshot()).toMatchObject({ entries: 0, disabled: 1, writes: 0 })
  })
})

import { describe, expect, it } from 'vitest'
import { BeatCache, cacheKey } from '../../../packages/spw-runtime/src/state/memory-cache'
import {
  estimateCellCost,
  isProtectedKey,
  planEviction,
  reportMemoryPressure,
} from '../../../packages/spw-runtime/src/state/memory-policy'
import type { RegisterEntry } from '../../../packages/spw-runtime/src/state/types'
import { $register } from '../../seed/types'

describe('BeatCache', () => {
  it('hits, misses, and promotes on repeated access', () => {
    const cache = new BeatCache<string>({ defaultTier: 'warm' })
    cache.set('k', 'v')
    expect(cache.get('k')).toBe('v')
    expect(cache.get('missing')).toBeUndefined()
    cache.get('k')
    cache.get('k')
    const stats = cache.stats()
    expect(stats.hits).toBeGreaterThanOrEqual(3)
    expect(stats.misses).toBe(1)
    // After 3 hits, promote warm → hot
    expect(cache.stats().byTier.hot).toBeGreaterThanOrEqual(1)
  })

  it('expires cold entries after ttl beats without access', () => {
    const cache = new BeatCache<number>({ ttl: { cold: 2, warm: 10, hot: 10 } })
    cache.set('x', 1, 'cold')
    cache.tick(1)
    expect(cache.get('x')).toBe(1)
    // lastAccess refreshed; tick past cold ttl without access
    cache.tick(3)
    expect(cache.get('x')).toBeUndefined()
    expect(cache.stats().expired).toBeGreaterThan(0)
  })

  it('invalidates by file hash prefix', () => {
    const cache = new BeatCache()
    const k1 = cacheKey({ fileHash: 'abc', selectorId: 'pathRefs' })
    const k2 = cacheKey({ fileHash: 'abc', selectorId: 'refs' })
    const k3 = cacheKey({ fileHash: 'zzz', selectorId: 'pathRefs' })
    cache.set(k1, 1)
    cache.set(k2, 2)
    cache.set(k3, 3)
    expect(cache.invalidateFileHash('abc')).toBe(2)
    expect(cache.get(k3)).toBe(3)
    expect(cache.get(k1)).toBeUndefined()
  })

  it('evicts overflow preferring cold entries', () => {
    const cache = new BeatCache<number>({ maxEntries: 3 })
    cache.set('a', 1, 'hot')
    cache.set('b', 2, 'warm')
    cache.set('c', 3, 'cold')
    cache.set('d', 4, 'cold')
    expect(cache.size()).toBe(3)
    expect(cache.stats().evicted).toBeGreaterThan(0)
  })
})

describe('memory-policy', () => {
  function entry(partial: Partial<RegisterEntry['meta']> & { value?: RegisterEntry['value'] }): RegisterEntry {
    return {
      key: $register`x`,
      value: partial.value ?? 'v',
      meta: {
        key: $register`x`,
        descriptor: { name: 'x', accessMode: 'resolved', containerAffinity: 'value' },
        writes: 1,
        lastUsedAt: new Date(0).toISOString(),
        immutable: false,
        provenance: ['t'],
        lenses: [],
        valence: [],
        liminality: 'local',
        frequency: 0,
        coupling: 0,
        measureDepth: 0,
        ...partial,
      },
    }
  }

  it('protects default and history keys', () => {
    expect(isProtectedKey($register`"`, $register`a`)).toBe(true)
    expect(isProtectedKey($register`0`, $register`a`)).toBe(true)
    expect(isProtectedKey($register`scratch`, $register`a`)).toBe(false)
  })

  it('plans facet eviction before cell drop', () => {
    const map = new Map<string, RegisterEntry>()
    const key = $register`phased`
    map.set(
      key,
      entry({
        key,
        phases: {
          current: 'semantic',
          evictable: true,
          facets: [
            { phase: 'lex', enrichedAt: 't', memoryWeight: 0.2 },
            { phase: 'parse', enrichedAt: 't', memoryWeight: 0.4 },
            { phase: 'semantic', enrichedAt: 't', memoryWeight: 0.6 },
          ],
        },
      }),
    )
    map.set($register`dropme`, entry({ key: $register`dropme`, value: 'x'.repeat(20) }))

    const plan = planEviction(map as never, { maxCost: 1, preferFacetEviction: true }, $register`"`)
    expect(plan.facetEvictions.some(f => f.key === key)).toBe(true)
  })

  it('reports pressure ratio', () => {
    const map = new Map<string, RegisterEntry>()
    map.set($register`a`, entry({ key: $register`a` }))
    const report = reportMemoryPressure(map as never, { maxCost: 1000 }, $register`"`)
    expect(report.cells).toBe(1)
    expect(report.estimatedCost).toBeGreaterThan(0)
    expect(report.overBudget).toBe(false)
    expect(estimateCellCost(map.get($register`a`)!)).toBeGreaterThan(0)
  })
})

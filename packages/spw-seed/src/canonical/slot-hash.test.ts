import { describe, expect, it } from 'vitest'
import { sha256Hex } from './content-hash'
import { slotHash } from './slot-hash'

describe('slotHash', () => {
  it('is the same for the same line and seed', () => {
    expect(slotHash('home[hook]{a.b}', { seed: 's' })).toEqual(slotHash('home[hook]{a.b}', { seed: 's' }))
  })

  it('moves only the component of the slot that changed', () => {
    const a = slotHash('home[hook]{a.b}(atlas)', { seed: 's' })
    const b = slotHash('home[pull]{a.b}(atlas)', { seed: 's' })
    expect(b.components.word).toBe(a.components.word)
    expect(b.components.body).toBe(a.components.body)
    expect(b.components.scene).toBe(a.components.scene)
    expect(b.components.mode).not.toBe(a.components.mode)
  })

  it('moves every written component under a new seed', () => {
    const a = slotHash('home[hook]{a}', { seed: 'a' })
    const b = slotHash('home[hook]{a}', { seed: 'b' })
    for (const key of ['word', 'mode', 'body'] as const) expect(b.components[key]).not.toBe(a.components[key])
  })

  it('keys each component by its slot, so one text in two slots hashes apart', () => {
    const hash = slotHash('a[a]')
    expect(hash.components.word).not.toBe(hash.components.mode)
  })

  it('leaves absent slots null and centers them in the vector', () => {
    const hash = slotHash('home')
    expect(hash.components.body).toBeNull()
    expect(hash.vector).toHaveLength(5)
    expect(hash.vector.slice(1)).toEqual([0.5, 0.5, 0.5, 0.5])
    expect(hash.vector[0]).toBeGreaterThanOrEqual(0)
    expect(hash.vector[0]).toBeLessThan(1)
  })

  it('is a prefix of the one SHA-256, over seed, key and text', () => {
    const hash = slotHash('home', { seed: 'seed', length: 12 })
    expect(hash.components.word).toBe(sha256Hex('seed\0word\0home').slice(0, 12))
    expect(hash.unit.word).toBe(parseInt(sha256Hex('seed\0word\0home').slice(0, 8), 16) / 2 ** 32)
  })

  it('keeps the order the line was written in', () => {
    expect(slotHash('<person>home[hook]').order).toEqual(['concept', 'word', 'mode'])
  })
})

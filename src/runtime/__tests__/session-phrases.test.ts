import { describe, expect, it } from 'vitest'
import {
  scanBracePhrases,
  phraseOptKey,
  countPhrasesById,
  planLinearCrawl,
  resolveChannelPolicy,
  channelAllowsDialect,
  makeValueCharge,
  isLeakyPortable,
  REGIONAL_OCEAN_DIALECT,
} from '../../../packages/spw-runtime/src/session'

describe('brace phrases + fixity helpers', () => {
  it('scans core phrase silhouettes', () => {
    const src = `
@self: ~"mod.spw"
![]
*{ x }
^["n"]{}
data~
<>["a","b"]
~#goal: "teach"
`
    const hits = scanBracePhrases(src)
    const counts = countPhrasesById(hits)
    expect(counts['phrase.path_potential']).toBeGreaterThanOrEqual(1)
    expect(counts['phrase.select_empty']).toBe(1)
    expect(counts['phrase.collapse_body']).toBe(1)
    expect(counts['phrase.postfix_defer']).toBe(1)
    expect(counts['phrase.couple']).toBe(1)
    expect(counts['phrase.apposition']).toBe(1)
  })

  it('builds opt keys that include fixity and channel', () => {
    const key = phraseOptKey({
      phraseId: 'phrase.select_empty',
      fixity: 'prefix',
      dialect: 'Spw.b',
      channel: 'trial',
      scheme: 'thrift',
    })
    expect(key).toContain('ph:phrase.select_empty')
    expect(key).toContain('fx:prefix')
    expect(key).toContain('ch:trial')
  })
})

describe('channels + crawl', () => {
  it('forbids regional Spw.o on stable channel', () => {
    const policy = resolveChannelPolicy('stable')
    expect(channelAllowsDialect(policy, 'Spw.b')).toBe(true)
    expect(channelAllowsDialect(policy, REGIONAL_OCEAN_DIALECT)).toBe(false)
    expect(channelAllowsDialect(resolveChannelPolicy('ocean'), REGIONAL_OCEAN_DIALECT)).toBe(true)
  })

  it('plans linear crawl with mutating lens keys', () => {
    const plan = planLinearCrawl({
      verb: 'collate',
      channel: 'experimental',
      seeds: ['a.spw', 'b.spw'],
      dialect: 'Spw.b',
    })
    expect('error' in plan).toBe(false)
    if ('error' in plan) return
    expect(plan.steps).toHaveLength(2)
    expect(plan.steps[0]!.lens.level).toBe('file')
    expect(plan.steps[1]!.lens.level).toBe('frame')
    expect(plan.steps[0]!.localIdCacheKey).not.toBe(plan.steps[1]!.localIdCacheKey)
  })

  it('flags leaky value charge without provenance', () => {
    expect(isLeakyPortable(makeValueCharge('x'))).toBe(true)
    expect(
      isLeakyPortable(makeValueCharge('x', { subject: '~"a.spw"', contentHash: 'h' })),
    ).toBe(false)
  })
})

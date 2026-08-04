import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runSenseCycle } from '../../../packages/spw-runtime/src/session'

const FIX = resolve(process.cwd(), 'src/runtime/__tests__/fixtures/sense-cycle')

describe('runSenseCycle', () => {
  it('diffs before/after fixtures with interconnect and cache probe', () => {
    const before = readFileSync(resolve(FIX, 'before/mod.spw'), 'utf8')
    const after = readFileSync(resolve(FIX, 'after/mod.spw'), 'utf8')
    const result = runSenseCycle({
      before: { path: 'fixtures/before/mod.spw', text: before },
      after: { path: 'fixtures/after/mod.spw', text: after },
      channel: 'experimental',
      beatsBetween: 1,
      steps: ['prepare', 'parse', 'inspect', 'evaluate', 'interconnect'],
      probeCache: true,
    })

    expect(result.schema).toBe('spw.sense.cycle/1')
    expect(result.delta.contentChanged).toBe(true)
    expect(result.before.parseOk).toBe(true)
    expect(result.after.parseOk).toBe(true)
    expect(result.delta.dialectChanged).toBe(true)
    expect(result.before.dialect).toBe('Spw.b')
    expect(result.after.dialect).toBe('Spw.f')
    expect(result.steps.some(s => s.step === 'beat')).toBe(true)
    expect(result.interconnect?.before.nodeCount).toBeGreaterThan(0)
    expect(result.interconnect?.after.nodeCount).toBeGreaterThan(0)
    // second evaluate should hit cache for after surface
    expect(result.delta.cache.secondAfterHit).toBe(true)
    expect(result.after.flowRoles?.flow ?? 0).toBeGreaterThan(0)
  })

  it('same surface twice: content unchanged, cache warm', () => {
    const text = readFileSync(resolve(FIX, 'before/mod.spw'), 'utf8')
    const result = runSenseCycle({
      before: { path: 'same.spw', text },
      after: { path: 'same.spw', text },
      channel: 'trial',
      probeCache: true,
    })
    expect(result.delta.contentChanged).toBe(false)
    expect(result.delta.cache.secondAfterHit).toBe(true)
  })
})

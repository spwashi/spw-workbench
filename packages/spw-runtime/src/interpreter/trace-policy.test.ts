import { describe, expect, it } from 'vitest'
import { parse } from '@spwashi/spw-seed'
import { interpretSeed } from './interpreter'
import { createHotSession } from '../session/hot-session'

function stableSnapshot(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (key, item) =>
    key === 'lastUsedAt' || key === 'enrichedAt' ? undefined : item,
  ))
}

describe('runtime trace policy', () => {
  it('changes disclosure without changing evaluation or register state', () => {
    const parsed = parse('a', { eventPolicy: 'none' })
    expect(parsed.success).toBe(true)
    expect(parsed.ast).toBeDefined()

    const none = interpretSeed(parsed.ast!, { tracePolicy: 'none' })
    const stages = interpretSeed(parsed.ast!, { tracePolicy: 'stages' })
    const evaluation = interpretSeed(parsed.ast!, { tracePolicy: 'evaluation' })

    expect(none.value).toEqual(evaluation.value)
    expect(stableSnapshot(none.registers)).toEqual(stableSnapshot(evaluation.registers))
    expect(none.traceCounts.generated).toBe(evaluation.traceCounts.generated)
    expect(stages.traceCounts.generated).toBe(evaluation.traceCounts.generated)
    expect(none.traceCounts.retained).toBe(0)
    expect(stages.traces.every(trace => trace.detail === 'stage')).toBe(true)
    expect(stages.traceCounts.retained).toBeGreaterThan(0)
    expect(evaluation.traceCounts.retained).toBeGreaterThan(stages.traceCounts.retained)
  })

  it('keeps captureTrace as a compatibility alias', () => {
    const parsed = parse('a', { eventPolicy: 'none' })
    const hidden = interpretSeed(parsed.ast!, { captureTrace: false })
    const full = interpretSeed(parsed.ast!, { captureTrace: true })
    expect(hidden.tracePolicy).toBe('none')
    expect(full.tracePolicy).toBe('evaluation')
  })

  it('keeps disclosure profiles distinct in hot-session caches', () => {
    const session = createHotSession({ id: 'trace-policy-cache' })
    const hidden = session.evaluate('a', {
      parseEventPolicy: 'none',
      runtimeTracePolicy: 'none',
    })
    const traced = session.evaluate('a', {
      parseEventPolicy: 'trace',
      runtimeTracePolicy: 'evaluation',
    })
    const tracedAgain = session.evaluate('a', {
      parseEventPolicy: 'trace',
      runtimeTracePolicy: 'evaluation',
    })

    expect(hidden.cacheHit).toBe(false)
    expect(traced.cacheHit).toBe(false)
    expect(tracedAgain.cacheHit).toBe(true)
  })
})

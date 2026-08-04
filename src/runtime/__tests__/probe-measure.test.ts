import { describe, expect, it } from 'vitest'
import { measureProbes, measureSubstrate, measureProbesAndSubstrate } from '../../../packages/spw-runtime/src/session'
import { Substrate } from '../../../packages/spw-runtime/src/pipeline/substrate'

describe('probe measure', () => {
  it('counts wonder, probe, and metrics', () => {
    const src = `
?["q"]{ !probe{ =id[p] } $%[a, b] }
%[pair]
`
    const hits = measureProbes(src)
    expect(hits.some(h => h.kind === 'wonder')).toBe(true)
    expect(hits.some(h => h.kind === 'probe')).toBe(true)
    expect(hits.some(h => h.kind === 'metric')).toBe(true)
    const report = measureProbesAndSubstrate(src)
    expect(report.wonderCount).toBe(1)
    expect(report.probeCount).toBe(1)
    expect(report.metricCount).toBeGreaterThanOrEqual(1)
  })

  it('measures substrate vibration', () => {
    const s = new Substrate('t')
    const at = new Date().toISOString()
    s.emit({ kind: 'write', key: 'a', value: 1, at })
    s.emit({ kind: 'write', key: 'a', value: 2, at })
    s.emit({ kind: 'write', key: 'b', value: 1, at })
    const m = measureSubstrate(s)
    expect(m.writeCount).toBe(3)
    expect(m.uniqueKeys).toBe(2)
    expect(m.frequencyByKey.a).toBe(2)
  })
})

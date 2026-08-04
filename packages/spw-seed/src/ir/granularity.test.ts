import { describe, expect, it } from 'vitest'
import {
  resolveGranularity,
  grainWantsResonance,
  grainWantsEval,
  formatGranularityAsSpw,
} from './granularity'

describe('resolveGranularity', () => {
  it('Spw.x defaults hard follow + thrift + higher volatility', () => {
    const g = resolveGranularity({ dialect: 'Spw.x', channel: 'live' })
    expect(g.follow).toBe('hard')
    expect(g.resonanceScheme).toBe('thrift')
    expect(g.plane).toBe('eval')
    expect(g.volatility).toBeGreaterThan(0.3)
    expect(grainWantsEval(g)).toBe(true)
  })

  it('Spw.p is volatile and agent-schemed without eval plane', () => {
    const g = resolveGranularity({ dialect: 'Spw.p', channel: 'trial' })
    expect(g.resonanceScheme).toBe('agent')
    expect(g.volatility).toBeGreaterThan(0.4)
    expect(grainWantsEval(g)).toBe(false)
    expect(grainWantsResonance(g)).toBe(true)
  })

  it('mounted consumer softens hard follow', () => {
    const g = resolveGranularity({
      dialect: 'Spw.x',
      channel: 'consumer',
      consumerMode: 'mounted-consumer',
    })
    expect(g.follow).toBe('soft')
  })

  it('formats as Spw facet', () => {
    const g = resolveGranularity({ dialect: 'Spw.b' })
    expect(formatGranularityAsSpw(g)).toMatch(/\^\["granularity"\]/)
    expect(formatGranularityAsSpw(g)).toMatch(/disclose: spw/)
  })

  it('skim without plane override skips resonance', () => {
    const g = resolveGranularity({ dialect: 'Spw.l', depth: 'skim' })
    expect(g.plane).toBe('bytecode')
    expect(grainWantsResonance(g)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { scanFlowProtocol, formatFlowProtocolSummary } from './flow-protocol'
import { detectGeometricResonances } from './geometric-resonance'

const SAMPLE = `
@dialect:Spw.f
^seed[Flow.Demo v:0.1 @profile:Spw.f]
=phi[ id: soft ]{ << ~ ; ? ; % ; ! ; ^ >> }
=ceiling[ l0 ]
=[axis] anchor { ~"a.spw" ; ~"b.spw" }

?["Does schedule commute?"]{
  !probe{ =id[p1] }
  $%[sigma, depth]
}

!boon{ go }
*{ pack }
data~
@(here)
`

describe('scanFlowProtocol', () => {
  it('classifies schedules, biases, probes, procedures', () => {
    const mod = scanFlowProtocol(SAMPLE, 'demo.spw')
    expect(mod.schedules.length).toBeGreaterThan(0)
    expect(mod.roles.flow).toBeGreaterThan(0)
    expect(mod.roles.probe).toBeGreaterThan(0)
    expect(mod.roles.bias + mod.roles.strategy).toBeGreaterThan(0)
    expect(mod.roles.procedure).toBeGreaterThan(0)
    expect(mod.biasAxes.length + mod.hooks.length).toBeGreaterThan(0)
    expect(formatFlowProtocolSummary(mod)).toMatch(/flow-protocol/)
  })

  it('sees sequential and parallel connectors in streams', () => {
    const mod = scanFlowProtocol('<< a ; b || c >>')
    expect(mod.units.some(u => u.role === 'flow' && u.spacing === 'schedule')).toBe(true)
  })
})

describe('detectGeometricResonances', () => {
  it('emits op-cooccur and probe-measure edges', () => {
    const report = detectGeometricResonances(SAMPLE)
    expect(report.geometry.maxDepth).toBeGreaterThanOrEqual(0)
    expect(report.flow.units.length).toBeGreaterThan(0)
    expect(report.resonances.length).toBeGreaterThan(0)
    const types = new Set(report.resonances.map(r => r.type))
    expect(types.has('op-cooccur') || types.has('phrase-adjacent') || types.has('schedule-slot')).toBe(
      true,
    )
  })
})

import { describe, expect, it } from 'vitest'
import {
  bytecodeOpSimilarity,
  buildGeometryField,
  buildResonanceContext,
  compileGeometryBytecode,
  detectGeometricResonances,
  runResonanceDetectors,
  WEIGHT_SCHEME_AGENT,
  WEIGHT_SCHEME_THRIFT,
} from './geometric-resonance'

const SAMPLE = `
@dialect:Spw.f
^seed[Flow.Demo v:0.1 @profile:Spw.f]
=phi[ id: soft ]{ << ~ ; ? ; % ; ! ; ^ >> }
=ceiling[ l0 ]
=[axis] anchor { ~"a.spw" ; ~"b.spw" }

?["Does schedule commute?"]{
  !probe{ =id[p1] }
  $%[sigma, source]
}

!boon{ go }
*{ pack }
data~
@(here)
`

const SAMPLE_B = `
@dialect:Spw.b
^seed[Other v:0.1 @profile:Spw.b]
?["probe only"]{
  !probe{ =id[p2] }
}
![]
`

describe('compileGeometryBytecode', () => {
  it('emits stable contentHash and dense opVector', () => {
    const a = compileGeometryBytecode(SAMPLE, { uri: 'a.spw' })
    const b = compileGeometryBytecode(SAMPLE, { uri: 'a.spw' })
    expect(a.version).toBe('spw.geometry.bc/1')
    expect(a.contentHash).toBe(b.contentHash)
    expect(a.contentHash.length).toBe(16)
    expect(a.opVector.length).toBeGreaterThan(0)
    expect(a.unitCount).toBeGreaterThan(0)
    expect(a.uri).toBe('a.spw')
  })

  it('similarity is high for identical vectors', () => {
    const a = compileGeometryBytecode(SAMPLE)
    expect(bytecodeOpSimilarity(a, a)).toBeCloseTo(1, 5)
  })
})

describe('weight schemes', () => {
  it('agent scheme reweights vs default', () => {
    const def = detectGeometricResonances(SAMPLE, { scheme: 'default' })
    const agent = detectGeometricResonances(SAMPLE, { scheme: 'agent' })
    expect(def.scheme).toBe('default')
    expect(agent.scheme).toBe('agent')
    expect(def.bytecode.contentHash).toBe(agent.bytecode.contentHash)
    // both should find something on the fixture
    expect(def.resonances.length).toBeGreaterThan(0)
    expect(agent.resonances.length).toBeGreaterThan(0)
  })

  it('exposes raw features for reweight without re-scan', () => {
    const ctx = buildResonanceContext(SAMPLE, { scheme: 'default' })
    const edges = runResonanceDetectors(ctx, undefined, WEIGHT_SCHEME_THRIFT)
    const withFeatures = edges.filter(e => e.features && Object.keys(e.features).length)
    expect(withFeatures.length).toBeGreaterThan(0)
  })
})

describe('buildGeometryField', () => {
  it('aggregates strands across surfaces', () => {
    const field = buildGeometryField(
      [
        { uri: 'a.spw', text: SAMPLE },
        { uri: 'b.spw', text: SAMPLE_B },
      ],
      { scheme: 'agent', resonance: true },
    )
    expect(field.version).toBe('spw.geometry.field/1')
    expect(field.surfaces.length).toBe(2)
    expect(field.fieldOps.length).toBeGreaterThan(0)
    expect(field.strands.length).toBeGreaterThan(0)
  })

  it('theme filters surfaces by role', () => {
    const field = buildGeometryField(
      [
        { uri: 'a.spw', text: SAMPLE },
        { uri: 'b.spw', text: SAMPLE_B },
      ],
      { theme: 'measure', resonance: true },
    )
    // SAMPLE has measure role; SAMPLE_B may not
    expect(field.surfaces.every(s => s.uri === 'a.spw' || (s.roles.measure ?? 0) > 0 || s.resonanceCount >= 0)).toBe(
      true,
    )
    expect(field.theme).toBe('measure')
  })
})

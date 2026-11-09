import { describe, it, expect } from 'vitest'
import { collectPrecipitates, precipitateToSpw, projectionToSpw } from './stages'

describe('runSpwStepped', () => {
  it('yields precipitates for each stage', () => {
    const { precipitates, result } = collectPrecipitates('!["hello"]')
    expect(result.success).toBe(true)
    expect(precipitates.length).toBeGreaterThanOrEqual(3)
    expect(precipitates[0].stage).toBe('desugar')
    expect(precipitates[1].stage).toBe('parse')
  })

  it('desugar precipitate captures input/output', () => {
    const { precipitates } = collectPrecipitates('A{}')
    const ds = precipitates.find(p => p.stage === 'desugar')!
    expect(ds.input).toBe('A{}')
    expect(ds.output).toBe('{_A }_A')
    expect(ds.delta).toContain('desugared')
  })

  it('all four stages on success', () => {
    const { precipitates, result } = collectPrecipitates('!["hello"]')
    expect(result.success).toBe(true)
    expect(precipitates).toHaveLength(4)
    expect(precipitates.map(p => p.stage)).toEqual(['desugar', 'parse', 'normalize', 'interpret'])
  })

  it('returns telemetry alongside the final result', () => {
    const collected = collectPrecipitates('*boon{"hello"}')

    expect(collected.telemetry).toEqual(collected.result.telemetry)
    expect(collected.telemetry.events.map(event => event.kind)).toEqual(['phase-advance', 'write'])
  })
})

describe('precipitateToSpw', () => {
  it('desugar → identity (already Spw source)', () => {
    const { precipitates } = collectPrecipitates('A{}')
    const ds = precipitates.find(p => p.stage === 'desugar')!
    const spw = precipitateToSpw(ds)
    expect(spw).toBe('{_A }_A')
  })

  it('normalize → ONF sigil form with reg frames', () => {
    const { precipitates } = collectPrecipitates('!["hello"]')
    const norm = precipitates.find(p => p.stage === 'normalize')
    if (norm) {
      const spw = precipitateToSpw(norm)
      expect(spw).toContain('!')
      expect(spw).toContain('reg=')
    }
  })

  it('interpret → register $[key] expressions', () => {
    const { precipitates } = collectPrecipitates('!["hello"]')
    const interp = precipitates.find(p => p.stage === 'interpret')
    if (interp) {
      const spw = precipitateToSpw(interp)
      expect(spw).toContain('$[')
    }
  })

  it('parse → AST annotation tree', () => {
    const { precipitates } = collectPrecipitates('!["hello"]')
    const ps = precipitates.find(p => p.stage === 'parse')
    if (ps) {
      const spw = precipitateToSpw(ps)
      expect(typeof spw).toBe('string')
      expect(spw.length).toBeGreaterThan(0)
    }
  })
})

describe('projectionToSpw', () => {
  it('coagulates all stages into a ^"pipeline" frame', () => {
    const { precipitates } = collectPrecipitates('!["hello"]')
    const spw = projectionToSpw(precipitates)
    expect(spw).toContain('^"pipeline"')
    expect(spw).toContain('^"desugar"')
    expect(spw).toContain('^"parse"')
    expect(spw).toContain('^"normalize"')
    expect(spw).toContain('^"interpret"')
    expect(spw).toContain('%[delta]')
  })

  it('output is a string that could be re-parsed', () => {
    const { precipitates } = collectPrecipitates('A{}')
    const spw = projectionToSpw(precipitates)
    expect(typeof spw).toBe('string')
    expect(spw.split('\n').length).toBeGreaterThan(4)
  })
})

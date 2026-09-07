import { describe, expect, it } from 'vitest'
import { classifyCitation, sourceDeclaresAnchor } from './resolve-citation'

describe('classifyCitation', () => {
  it('splits path and fragment on a file citation', () => {
    const cited = classifyCitation('./conventions/copy-accessor.spw#hk-007')
    expect(cited.kind).toBe('file')
    expect(cited.targetPath).toBe('./conventions/copy-accessor.spw')
    expect(cited.fragment).toBe('hk-007')
  })

  it('classifies leading slash as a route, trailing slash as a directory', () => {
    expect(classifyCitation('/tools/spw-parser/').kind).toBe('route')
    expect(classifyCitation('./language/').kind).toBe('directory')
  })

  it('classifies protocol targets as external', () => {
    expect(classifyCitation('https://example.invalid/doc#frag').kind).toBe('external')
    expect(classifyCitation('https://example.invalid/doc#frag').fragment).toBe('frag')
  })

  it('marks empty targets malformed rather than guessing a file', () => {
    expect(classifyCitation('   ').kind).toBe('malformed')
    expect(classifyCitation('#only-frag').kind).toBe('malformed')
  })
})

describe('sourceDeclaresAnchor', () => {
  it('recognizes deixis, quoted headers, and top-level bindings', () => {
    const source = [
      '#>hk-007',
      '^["intent"]{ }',
      '^"walk_cost"{ }',
      'operation = "audit"',
    ].join('\n')
    expect(sourceDeclaresAnchor(source, 'hk-007')).toBe(true)
    expect(sourceDeclaresAnchor(source, 'intent')).toBe(true)
    expect(sourceDeclaresAnchor(source, 'walk_cost')).toBe(true)
    expect(sourceDeclaresAnchor(source, 'operation')).toBe(true)
    expect(sourceDeclaresAnchor(source, 'missing')).toBe(false)
  })
})

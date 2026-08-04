import { describe, it, expect } from 'vitest'
import {
  applyMassCorrections,
  measureMass,
  readMassDeclarations,
  reconcileMass,
} from './self-mass'

const SURFACE = [
  '^["module"]{',
  ' @self: ~"../js/kernel.js"',
  ' %mass{ lines: 100, bytes: 200, eager: #yes }',
  '}',
  '',
].join('\n')

describe('readMassDeclarations', () => {
  it('reads the subject path and its numeric measures', () => {
    const [decl] = readMassDeclarations(SURFACE)
    expect(decl!.self).toBe('../js/kernel.js')
    expect(decl!.measures.lines!.value).toBe(100)
    expect(decl!.measures.bytes!.value).toBe(200)
  })

  it('keeps non-numeric entries out of measures but does not drop them', () => {
    const [decl] = readMassDeclarations(SURFACE)
    expect(decl!.measures.eager).toBeUndefined()
    expect(decl!.otherKeys).toContain('eager')
  })

  it('spans only the digits, so a rewrite cannot disturb the surface', () => {
    const [decl] = readMassDeclarations(SURFACE)
    const span = decl!.measures.lines!.span
    expect(SURFACE.slice(span.start.offset, span.end.offset)).toBe('100')
  })

  it('pairs each %mass with the @self it follows', () => {
    const two = [
      '^["a"]{ @self: ~"a.js" %mass{ lines: 1 } }',
      '^["b"]{ @self: ~"b.js" %mass{ lines: 2 } }',
    ].join('\n')
    const decls = readMassDeclarations(two)
    expect(decls.map(d => [d.self, d.measures.lines?.value])).toEqual([
      ['a.js', 1],
      ['b.js', 2],
    ])
  })

  it('returns a declaration with no measures when %mass is absent', () => {
    const [decl] = readMassDeclarations('^["m"]{ @self: ~"x.js" }')
    expect(decl!.self).toBe('x.js')
    expect(decl!.measures).toEqual({})
  })

  it('finds nothing in a surface that declares neither', () => {
    expect(readMassDeclarations('^["m"]{ a: 1 }')).toEqual([])
  })
})

describe('measureMass', () => {
  it('counts newline-terminated lines the way wc -l does', () => {
    expect(measureMass('a\nb\nc\n').lines).toBe(3)
    expect(measureMass('a\nb\nc').lines).toBe(2)
    expect(measureMass('').lines).toBe(0)
  })

  it('counts bytes, not code points', () => {
    expect(measureMass('é').bytes).toBe(2)
    expect(measureMass('abc').bytes).toBe(3)
  })
})

describe('reconcileMass', () => {
  const decl = () => readMassDeclarations(SURFACE)[0]!

  it('agrees when the numbers match', () => {
    const entries = reconcileMass(decl(), { lines: 100, bytes: 200 })
    expect(entries.filter(e => e.verdict === 'match').map(e => e.key)).toEqual(['lines', 'bytes'])
  })

  it('reports drift with both numbers', () => {
    const entries = reconcileMass(decl(), { lines: 111, bytes: 200 })
    const lines = entries.find(e => e.key === 'lines')!
    expect(lines.verdict).toBe('drift')
    expect(lines.declared).toBe(100)
    expect(lines.measured).toBe(111)
  })

  it('reports a measurable key the facet omits', () => {
    const [d] = readMassDeclarations('^["m"]{ @self: ~"x.js" %mass{ lines: 5 } }')
    const entries = reconcileMass(d!, { lines: 5, bytes: 9 })
    expect(entries.find(e => e.key === 'bytes')!.verdict).toBe('undeclared')
  })

  it('surfaces claims it cannot check rather than passing them silently', () => {
    const entries = reconcileMass(decl(), { lines: 100, bytes: 200 })
    expect(entries.find(e => e.key === 'eager')!.verdict).toBe('unmeasurable')
  })
})

describe('applyMassCorrections', () => {
  it('rewrites only the drifted digits', () => {
    const entries = reconcileMass(readMassDeclarations(SURFACE)[0]!, { lines: 3, bytes: 40 })
    const { source, applied } = applyMassCorrections(SURFACE, entries)
    expect(applied).toBe(2)
    expect(source).toBe(SURFACE.replace('lines: 100', 'lines: 3').replace('bytes: 200', 'bytes: 40'))
    expect(source).toContain('eager: #yes')
  })

  it('leaves a matching surface byte-identical', () => {
    const entries = reconcileMass(readMassDeclarations(SURFACE)[0]!, { lines: 100, bytes: 200 })
    expect(applyMassCorrections(SURFACE, entries).source).toBe(SURFACE)
  })

  it('is a fixpoint — correcting twice changes nothing further', () => {
    const measured = { lines: 3, bytes: 40 }
    const once = applyMassCorrections(
      SURFACE,
      reconcileMass(readMassDeclarations(SURFACE)[0]!, measured),
    ).source
    const twice = applyMassCorrections(
      once,
      reconcileMass(readMassDeclarations(once)[0]!, measured),
    )
    expect(twice.source).toBe(once)
    expect(twice.applied).toBe(0)
  })

  it('keeps later spans valid when several numbers drift', () => {
    // Edits apply back to front; a forward application would shift every span
    // after the first replacement of a different width.
    const wide = '^["m"]{ @self: ~"x.js" %mass{ lines: 1, bytes: 2 } }'
    const entries = reconcileMass(readMassDeclarations(wide)[0]!, {
      lines: 100000,
      bytes: 999999,
    })
    const { source } = applyMassCorrections(wide, entries)
    expect(source).toContain('lines: 100000')
    expect(source).toContain('bytes: 999999')
  })
})

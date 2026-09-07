import { describe, expect, it } from 'vitest'
import { lex } from '../lexer'
import { appositionParts } from '../lexer/matchers/apposition'
import {
  appositionSpectrum,
  diffAppositionLattices,
  scanAppositions,
} from './apposition-scan'

describe('scanAppositions', () => {
  it('extracts named and anonymous unit cells', () => {
    const src = [
      '~#goal(ship the lattice)',
      '~#taste(one noun per clock)',
      '~#(anonymous reading)',
      'not an apposition ~#label: value',
    ].join('\n')

    const lattice = scanAppositions(src)
    expect(lattice.cells).toHaveLength(4)
    expect(lattice.namedCount).toBe(3)
    expect(lattice.anonymousCount).toBe(1)
    expect(lattice.parenCount).toBe(3)
    expect(lattice.colonCount).toBe(1)
    expect(lattice.cells[0]!.name).toBe('goal')
    expect(lattice.cells[0]!.body).toBe('ship the lattice')
    expect(lattice.cells[0]!.form).toBe('paren')
    expect(lattice.cells[2]!.anonymous).toBe(true)
    expect(lattice.cells[3]!.form).toBe('colon')
    expect(lattice.cells[3]!.name).toBe('label')
    expect(lattice.cells[3]!.body).toBe('value')
    expect(lattice.cells[0]!.mask).toHaveLength(8)
  })

  it('reports ~#name: annotations as a distinct colon species', () => {
    const lattice = scanAppositions('~#goal: ship\n~#lens(real cell)\n')
    expect(lattice.cells).toHaveLength(2)
    expect(lattice.parenCount).toBe(1)
    expect(lattice.colonCount).toBe(1)
    expect(lattice.cells.find(c => c.form === 'paren')?.name).toBe('lens')
    expect(lattice.cells.find(c => c.form === 'colon')?.name).toBe('goal')
    expect(lattice.cells.find(c => c.form === 'colon')?.body).toBe('ship')
  })

  it('handles nested parens in the body', () => {
    const lattice = scanAppositions('~#note(see f(x) and g(y))\n')
    expect(lattice.cells).toHaveLength(1)
    expect(lattice.cells[0]!.body).toBe('see f(x) and g(y)')
  })

  it('matches full lexer APPOSITION tokens on simple surfaces', () => {
    const src = '^["x"]{ ~#goal(one) ~#taste(two) }\n'
    const lattice = scanAppositions(src)
    const parenCells = lattice.cells.filter(c => c.form === 'paren')
    const tokens = lex(src).tokens.filter(t => t.type === 'APPOSITION')
    expect(tokens.length).toBe(parenCells.length)
    for (let i = 0; i < tokens.length; i++) {
      const parts = appositionParts(tokens[i]!.value)
      expect(parenCells[i]!.name).toBe(parts.name)
      expect(parenCells[i]!.body).toBe(parts.body)
      expect(parenCells[i]!.raw).toBe(tokens[i]!.value)
    }
  })

  it('spectrum reports doping by name', () => {
    const lattice = scanAppositions('~#goal(a)\n~#goal(b)\n~#taste(c)\n')
    const spectrum = appositionSpectrum(lattice)
    expect(spectrum.total).toBe(3)
    expect(spectrum.byName.goal).toBe(2)
    expect(spectrum.byName.taste).toBe(1)
    expect(spectrum.distinctNames).toBe(2)
  })

  it('diff detects remask of a named site', () => {
    const before = scanAppositions('~#goal(old)\n')
    const after = scanAppositions('~#goal(new)\n')
    const d = diffAppositionLattices(before, after)
    expect(d.remasked).toHaveLength(1)
    expect(d.remasked[0]!.name).toBe('goal')
    expect(d.stableMasks).toBe(0)
  })

  it('diff reports stable masks when envelope unchanged', () => {
    const src = '~#goal(same)\n'
    const d = diffAppositionLattices(scanAppositions(src), scanAppositions(src))
    expect(d.stableMasks).toBe(1)
    expect(d.added).toHaveLength(0)
    expect(d.removed).toHaveLength(0)
  })
})

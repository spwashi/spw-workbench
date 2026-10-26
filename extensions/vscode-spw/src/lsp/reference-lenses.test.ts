import { describe, expect, it } from 'vitest'
import {
  isNavigableReferenceLens,
  locationLensArguments,
  referenceCountFromTitle,
  referenceLookupCharacters,
} from './reference-lenses'

describe('reference lenses', () => {
  it('reads the reference count a lens title claims', () => {
    expect(referenceCountFromTitle('↗ 3 file ref(s) · 2 docs')).toBe(3)
    expect(referenceCountFromTitle('↗ 12 refs')).toBe(12)
    expect(referenceCountFromTitle('↗ 1 reference')).toBe(1)
    expect(referenceCountFromTitle('◇ anchor — no cross-file refs')).toBe(0)
    expect(referenceCountFromTitle('◆ 3 reg · phase:parse')).toBe(0)
    expect(referenceCountFromTitle('3 refactors')).toBe(0)
  })

  it('navigates only display-only lenses that count at least one reference', () => {
    expect(isNavigableReferenceLens({ title: '↗ 2 file ref(s)', command: '' })).toBe(true)
    expect(isNavigableReferenceLens({ title: '↗ 0 file ref(s)', command: '' })).toBe(false)
    expect(isNavigableReferenceLens({ title: '◈ docs · 3^ · 4# · d2', command: '' })).toBe(false)
    expect(isNavigableReferenceLens({ title: '↗ 2 file ref(s)', command: 'server.command' })).toBe(false)
    expect(isNavigableReferenceLens(undefined)).toBe(false)
  })

  it('asks on the anchor name first, then at the lens start', () => {
    expect(referenceLookupCharacters('  #>docs', 0)).toEqual([4, 0])
    expect(referenceLookupCharacters('##>root', 0)).toEqual([3, 0])
    expect(referenceLookupCharacters('#:layer #!pragmatics', 0)).toEqual([2, 0])
    expect(referenceLookupCharacters('plain text', 0)).toEqual([0])
    expect(referenceLookupCharacters('#>here', 2)).toEqual([2])
  })

  it('leaves a citation lens to its own command: its title counts citations, not refs', () => {
    expect(isNavigableReferenceLens({ title: '↙ cited by 8 files · 16 citations', command: 'spw.showLocations' })).toBe(false)
    expect(referenceCountFromTitle('↙ cited by 8 files · 16 citations')).toBe(0)
  })

  it('reads the sites a citation lens carries, and refuses any other shape', () => {
    const range = { start: { line: 1, character: 2 }, end: { line: 1, character: 9 } }
    expect(locationLensArguments('file:///f.spw', { line: 0, character: 0 }, [{ uri: 'file:///a.spw', range }]))
      .toEqual({ uri: 'file:///f.spw', at: { line: 0, character: 0 }, locations: [{ uri: 'file:///a.spw', range }] })
    expect(locationLensArguments('file:///f.spw', { line: 0 }, [])).toBeNull()
    expect(locationLensArguments('file:///f.spw', { line: 0, character: 0 }, [{ uri: 'file:///a.spw' }])).toBeNull()
    expect(locationLensArguments(undefined, { line: 0, character: 0 }, [])).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  isNavigableReferenceLens,
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
})

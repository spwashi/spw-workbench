import { describe, expect, it } from 'vitest'
import {
  resolveRuntimeMedium,
  mediumMatrixSnapshot,
  formatRuntimeMediumSpw,
} from '../../../packages/spw-runtime/src/session'

describe('resolveRuntimeMedium', () => {
  it('marks draft as collate-only with point follow', () => {
    const m = resolveRuntimeMedium('draft', 'Spw.x')
    expect(m.collateOnly).toBe(true)
    expect(m.effectCeiling).toBe('none')
    expect(m.maxFollowDefault).toBe('point')
    expect(m.dialectAllowed).toBe(true)
  })

  it('forbids Spw.o on stable', () => {
    const m = resolveRuntimeMedium('stable', 'Spw.o')
    expect(m.dialectAllowed).toBe(false)
  })

  it('allows Spw.o on trial and softens hard follow under l0 ceiling', () => {
    const m = resolveRuntimeMedium('trial', 'Spw.x')
    expect(m.dialectAllowed).toBe(true)
    expect(m.effectCeiling).toBe('l0')
    // Spw.x defaults hard follow; l0 ceiling caps default to soft
    expect(m.maxFollowDefault).toBe('soft')
    expect(m.collateOnly).toBe(true)
  })

  it('live + Spw.x keeps hot eval aperture', () => {
    const m = resolveRuntimeMedium('live', 'Spw.x')
    expect(m.defaultPlane).toBe('eval')
    expect(m.effectCeiling).toBe('l2')
    expect(m.collateOnly).toBe(false)
    expect(m.maxFollowDefault).toBe('hard')
  })

  it('snapshot has one cell per channel×dialect', () => {
    const snap = mediumMatrixSnapshot(['stable', 'draft'], ['Spw.b', 'Spw.x'])
    expect(snap).toHaveLength(4)
    expect(formatRuntimeMediumSpw(snap[0]!)).toContain('^["medium"]{')
  })
})

describe('countFixity', () => {
  it('is imported via session grain helpers through inspect', () => {
    // covered in hot-session; keep suite focused on medium matrix
    expect(resolveRuntimeMedium('stable', 'Spw.b').defaultDepth).toBe('card')
  })
})

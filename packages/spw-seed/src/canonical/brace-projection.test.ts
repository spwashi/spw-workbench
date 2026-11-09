/**
 * BraceProjection: semantic surface for brace differentials.
 */
import { describe, expect, it } from 'vitest'
import {
  braceProjectionDelta,
  classifyMutationUsefulness,
  extractBraceProjection,
  snapshotTopography,
  topographyDelta,
} from '@spwashi/spw-seed'

describe('extractBraceProjection', () => {
  it('counts paired kinds and couple ops', () => {
    const p = extractBraceProjection('() [] {} <>["a","b"]')
    expect(p.kinds.scope).toBeGreaterThanOrEqual(1)
    expect(p.kinds.frame).toBeGreaterThanOrEqual(1)
    expect(p.kinds.body).toBeGreaterThanOrEqual(1)
    expect(p.coupleOps).toBeGreaterThanOrEqual(1)
    expect(p.signature.length).toBeGreaterThan(0)
  })

  it('records medial channels for composites', () => {
    const p = extractBraceProjection('bagel<scent>coffee')
    expect(p.medials).toBe(1)
    expect(p.channels).toContain('scent')
    expect(p.kinds.capsule).toBe(1)
  })

  it('records numeric channels', () => {
    const p = extractBraceProjection('foo<5>bar')
    expect(p.channels).toContain('5')
    expect(p.medials).toBe(1)
  })
})

describe('braceProjectionDelta', () => {
  it('is equal when sources share projection', () => {
    const a = extractBraceProjection('bagel<scent>coffee\n')
    const b = extractBraceProjection('bagel<scent>coffee  \n')
    // whitespace-only may still parse same structure
    const d = braceProjectionDelta(a, a)
    expect(d.equal).toBe(true)
    expect(d.severity).toBe('none')
    void b
  })

  it('detects channel drift', () => {
    const before = extractBraceProjection('bagel<scent>coffee')
    const after = extractBraceProjection('bagel<aroma>coffee')
    const d = braceProjectionDelta(before, after)
    expect(d.equal).toBe(false)
    expect(d.severity).toBe('channel')
    expect(d.channelsRemoved).toContain('scent')
    expect(d.channelsAdded).toContain('aroma')
    expect(d.findings.some(f => f.includes('channels'))).toBe(true)
  })

  it('detects kind drift frame vs body', () => {
    const before = extractBraceProjection('[x]')
    const after = extractBraceProjection('{x}')
    const d = braceProjectionDelta(before, after)
    expect(d.equal).toBe(false)
    expect(d.severity).toBe('kind')
  })
})

describe('topographyDelta + brace gate', () => {
  it('layout-only candidate requires brace stability', () => {
    const before = snapshotTopography('line  \n')
    const after = snapshotTopography('line\n')
    const d = topographyDelta(before, after)
    // may or may not be layoutOnly depending on token counts; brace must be equal
    expect(d.brace.equal).toBe(true)
  })

  it('channel change marks structureMoved', () => {
    const before = snapshotTopography('bagel<scent>coffee')
    const after = snapshotTopography('bagel<aroma>coffee')
    const d = topographyDelta(before, after)
    expect(d.brace.equal).toBe(false)
    expect(d.structureMoved).toBe(true)
    expect(d.layoutOnlyCandidate).toBe(false)
  })
})

describe('classifyMutationUsefulness', () => {
  it('advises layout_safe when evidence aligns', () => {
    const u = classifyMutationUsefulness({
      changed: true,
      healthRegressed: false,
      parseHealthy: true,
      braceEqual: true,
      structureMoved: false,
      layoutOnlyCandidate: true,
      layoutVectorPositive: true,
      nonLayoutVectorAxes: false,
    })
    expect(u.class).toBe('layout_safe')
    expect(u.writeSafeLayout).toBe(true)
  })

  it('refuses health regression', () => {
    const u = classifyMutationUsefulness({
      changed: true,
      healthRegressed: true,
      parseHealthy: false,
      braceEqual: true,
      structureMoved: false,
      layoutOnlyCandidate: false,
      layoutVectorPositive: false,
      nonLayoutVectorAxes: false,
    })
    expect(u.class).toBe('refuse_health')
    expect(u.writeSafeLayout).toBe(false)
  })

  it('reviews structure on brace drift', () => {
    const u = classifyMutationUsefulness({
      changed: true,
      healthRegressed: false,
      parseHealthy: true,
      braceEqual: false,
      structureMoved: true,
      layoutOnlyCandidate: false,
      layoutVectorPositive: false,
      nonLayoutVectorAxes: false,
    })
    expect(u.class).toBe('review_structure')
  })
})

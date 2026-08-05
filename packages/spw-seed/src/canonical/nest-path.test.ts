import { describe, expect, it } from 'vitest'
import { nestPathDelta, scanNestPaths } from './nest-path'
import { buildChangeReport } from './change-report'

describe('scanNestPaths', () => {
  it('distinguishes {[]} from []{} by skeleton', () => {
    const nested = scanNestPaths('{[]}')
    const juxta = scanNestPaths('[]{}')
    expect(nested.skeleton).not.toBe(juxta.skeleton)
    expect(nested.clusterKey).not.toBe(juxta.clusterKey)
    // nested: body contains frame → {[]}
    expect(nested.skeleton).toContain('{')
    expect(nested.skeleton).toContain('[')
  })

  it('attaches seed frame param as container label', () => {
    const lat = scanNestPaths('^seed[Demo]{ x }')
    expect(lat.labels).toContain('Demo')
    expect(lat.labeledSkeleton).toMatch(/Demo/)
  })

  it('attaches capsule channel label', () => {
    const lat = scanNestPaths('<tag>[x]')
    expect(lat.labels).toContain('tag')
    expect(lat.labeledSkeleton).toContain('<tag>')
  })

  it('shares <> glyph for couple without requiring capsule theology', () => {
    const lat = scanNestPaths('<>["a","b"]')
    expect(lat.skeleton.includes('<') || lat.paths.some(p => p.includes('<>'))).toBe(true)
  })
})

describe('nestPathDelta', () => {
  it('reports label rename with stable skeleton', () => {
    const a = scanNestPaths('^seed[Demo]{ x }')
    const b = scanNestPaths('^seed[Other]{ x }')
    const d = nestPathDelta(a, b)
    expect(d.skeletonEqual).toBe(true)
    expect(d.labeledEqual).toBe(false)
    expect(d.labelsEqual).toBe(false)
    expect(d.labelsRemoved).toContain('Demo')
    expect(d.labelsAdded).toContain('Other')
  })
})

describe('buildChangeReport nest paths', () => {
  it('pathMatch requires nest skeleton, not only brace counts', () => {
    // Same kinds roughly, different nest — if parse yields different skeletons
    const r = buildChangeReport('{[]}', '[]{}')
    expect(r.ast.nest.skeletonEqual).toBe(false)
    expect(r.ast.pathMatch).toBe(false)
  })

  it('label rename is not layoutOnly; discloses labels on card', () => {
    const r = buildChangeReport('^seed[Demo]{ x }', '^seed[Other]{ x }')
    expect(r.ast.nest.skeletonEqual).toBe(true)
    expect(r.ast.nest.labelsEqual).toBe(false)
    expect(r.layoutOnly).toBe(false)
    const card = r
    expect(card.ast.nest.labelsRemoved).toContain('Demo')
    expect(card.ast.nest.labelsAdded).toContain('Other')
  })

  it('whitespace-only still layoutOnly when nest+labels hold', () => {
    const before = '^["card"]{\n  ~#a: 1\n}\n'
    const after = '^["card"]{\n  ~#a: 1\n  \n}\n'
    const r = buildChangeReport(before, after)
    expect(r.layoutOnly).toBe(true)
    expect(r.ast.nest.skeletonEqual).toBe(true)
    expect(r.ast.nest.labelsEqual).toBe(true)
  })
})

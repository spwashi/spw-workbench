import { describe, expect, it } from 'vitest'
import { formatGeometryReport, inspectGeometry } from '@spwashi/spw-seed'

describe('inspectGeometry', () => {
  it('reports brace kinds and operator rhythm', () => {
    const src = `
^["frame"]{
  & merge
  ~"path.spw"
  #tag
}
`
    const r = inspectGeometry(src)
    expect(r.version).toBe('spw.geometry/1')
    expect(r.braces.kinds.body).toBeGreaterThanOrEqual(1)
    expect(r.operators.some(o => o.sigil === '&' || o.sigil === '^')).toBe(true)
    expect(r.lessons.length).toBeGreaterThan(0)
    expect(formatGeometryReport(r)).toMatch(/spw geometry/)
  })

  it('notes medial capsules', () => {
    const r = inspectGeometry('a<channel>b')
    expect(r.braces.medials).toBeGreaterThanOrEqual(1)
    expect(r.lessons.some(L => /Medial/i.test(L))).toBe(true)
  })
})

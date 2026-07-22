import { describe, it, expect } from 'vitest'
import {
  FORMULA_CATALOG,
  aggregateFormulaPatterns,
  scanFormulas,
  summarizeFormulaHits,
} from './formula-scan'

describe('formula-scan', () => {
  it('lists machine-backed catalog formulas', () => {
    expect(FORMULA_CATALOG.length).toBeGreaterThanOrEqual(8)
    expect(FORMULA_CATALOG.some(e => e.id === 'F2.hold')).toBe(true)
    expect(FORMULA_CATALOG.some(e => e.id === 'F8.literacy')).toBe(true)
  })

  it('finds hold and field patterns in sample surface', () => {
    const src = `
# Hold model
Hold = ∏ h_i^{α_i}
decayField on sites
affinityAllocate under capacity
residual r = 1 - Hold
fixedPoint until maxIter
~"other.spw"
`
    const hits = scanFormulas(src)
    const ids = new Set(hits.map(h => h.patternId))
    expect(ids.has('hold_product') || ids.has('F2')).toBe(true)
    expect(ids.has('decay') || ids.has('affinity')).toBe(true)
    expect(ids.has('residual') || ids.has('fixed_point')).toBe(true)
    const byFamily = summarizeFormulaHits(hits)
    expect((byFamily.hold ?? 0) + (byFamily.field ?? 0)).toBeGreaterThan(0)
  })

  it('aggregates patterns across files', () => {
    const a = scanFormulas('Hold = ∏ h_i\n')
    const b = scanFormulas('Hold = ∏ h_i\ndiffuseField\n')
    const agg = aggregateFormulaPatterns([
      { file: 'a.spw', hits: a },
      { file: 'b.spw', hits: b },
    ])
    expect(agg.some(p => p.files >= 1)).toBe(true)
    expect(agg[0]!.count).toBeGreaterThan(0)
  })
})

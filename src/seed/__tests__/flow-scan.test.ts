import { describe, expect, it } from 'vitest'
import { analyzeFlow } from '../../../scripts/analyzers/spw-flow-scan'

function scan(source: string) {
  return analyzeFlow('memory.spw', 'memory.spw', source)
}

describe('interpretive flow-profile scanner', () => {
  it('does not score insufficient marker evidence as perfect order', () => {
    expect(scan('~').profileOrderScore).toBeNull()
  })

  it('reports the named profile order without calling it language law', () => {
    expect(scan('~ ? ! ^').profileOrderScore).toBe(1)
    expect(scan('^ ! ? ~').profileOrderScore).toBe(0)
  })

  it('counts a nested marker inside each containing paired boundary', () => {
    const result = scan('{[!]}')
    expect(result.boundaries.body).toMatchObject({ count: 1, totalFlowInside: 1 })
    expect(result.boundaries.frame).toMatchObject({ count: 1, totalFlowInside: 1 })
  })

  it('requires matching boundary kinds before completing an observation', () => {
    const result = scan('{]')
    expect(result.boundaries.body.count).toBe(0)
    expect(result.boundaries.frame.count).toBe(0)
  })

  it('keeps the <> operator outside the paired-boundary set', () => {
    expect(scan('<>').boundaries.capsule.count).toBe(0)
    expect(scan('< >').boundaries.capsule.count).toBe(1)
  })
})

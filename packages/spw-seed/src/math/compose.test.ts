import { describe, it, expect } from 'vitest'
import {
  applyMask,
  buildComposition,
  compositionBrief,
  extractClaimsAndSlots,
} from './compose'
import type { CorpusFileSignals, CorpusLink } from './corpus'

describe('composition model', () => {
  const signals: CorpusFileSignals[] = [
    {
      file: 'a.spw',
      sigils: { '#': 3, '~': 2 },
      pathRefCount: 2,
      rootRefCount: 1,
      frameCount: 2,
      annotationHints: 1,
      lineCount: 40,
    },
    {
      file: 'b.spw',
      sigils: { '.': 1 },
      pathRefCount: 0,
      rootRefCount: 0,
      frameCount: 0,
      annotationHints: 0,
      lineCount: 10,
    },
  ]
  const links: CorpusLink[] = [
    { from: 'a.spw', to: 'b.spw', kind: 'path' },
  ]

  it('builds loci and path strands', () => {
    const model = buildComposition({
      signals,
      links,
      hubs: [{ id: 'a.spw', inDegree: 0, outDegree: 1, total: 1 }],
      orphans: ['b.spw'],
      lens: 'code',
    })
    expect(model.version).toBe('spw.compose/1')
    expect(model.loci.some(l => l.id === 'a.spw' && l.role === 'hub')).toBe(true)
    expect(model.strands.some(s => s.kind === 'path')).toBe(true)
    expect(model.summary.loci).toBeGreaterThanOrEqual(2)
  })

  it('extracts goals as claims and questions as slots', () => {
    const src = `
^["intent"]{
 ~#goal: "compose abstract tools"
 ~#taste: "legible algebra"
}
^["open"]{
 ?[scope]: "how wide is the first cut?"
}
`
    const { claims, slots } = extractClaimsAndSlots('wip.spw', src)
    expect(claims.some(c => c.pattern === 'goal')).toBe(true)
    expect(slots.some(s => s.status === 'open')).toBe(true)

    const model = buildComposition({
      signals: [
        {
          file: 'wip.spw',
          sigils: {},
          pathRefCount: 0,
          rootRefCount: 0,
          frameCount: 1,
          annotationHints: 0,
          lineCount: 12,
        },
      ],
      links: [],
      sources: { 'wip.spw': src },
      lens: 'plan',
    })
    expect(model.claims.length).toBeGreaterThan(0)
    expect(model.slots.length).toBeGreaterThan(0)
    const brief = compositionBrief(model)
    expect(brief.openSlots.length).toBeGreaterThan(0)
    expect(brief.next.length).toBeGreaterThan(0)
  })

  it('applies warm mask', () => {
    const model = buildComposition({
      signals,
      links,
      hubs: [{ id: 'a.spw', inDegree: 0, outDegree: 1, total: 1 }],
      orphans: ['b.spw'],
    })
    const warm = applyMask(model, 'warm')
    expect(warm.loci.some(l => l.id === 'a.spw')).toBe(true)
  })
})

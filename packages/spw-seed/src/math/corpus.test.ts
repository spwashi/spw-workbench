import { describe, it, expect } from 'vitest'
import {
  analyzeTopography,
  buildCorpusProduct,
  buildPopulation,
  compareFamiliarity,
  graphFromLinks,
  heuristicSigilHistogram,
  heuristicFrameCount,
  populationStats,
  type CorpusLink,
} from './corpus'
import { detectCycle } from './graph'

describe('corpus topography', () => {
  const links: CorpusLink[] = [
    { from: 'a.spw', to: 'b.spw', kind: 'path' },
    { from: 'b.spw', to: 'c.spw', kind: 'path' },
    { from: 'a.spw', to: 'lib/index.spw', kind: 'path' },
    { from: 'c.spw', to: 'shared', kind: 'root', label: '@shared' },
  ]

  it('reports DAG layers and hubs', () => {
    const r = analyzeTopography(links, {
      knownFiles: new Set(['a.spw', 'b.spw', 'c.spw', 'lib/index.spw']),
    })
    expect(r.cyclic).toBe(false)
    expect(r.layers.length).toBeGreaterThan(0)
    expect(r.hubs[0]!.total).toBeGreaterThan(0)
    expect(r.strands.some(s => s.id === 'shared_path_basenames')).toBe(true)
  })

  it('detects cycles in link graph', () => {
    const cyc: CorpusLink[] = [
      { from: 'a.spw', to: 'b.spw', kind: 'path' },
      { from: 'b.spw', to: 'a.spw', kind: 'path' },
    ]
    const r = analyzeTopography(cyc)
    expect(r.cyclic).toBe(true)
    expect(detectCycle(graphFromLinks(cyc)).cyclic).toBe(true)
  })

  it('flags broken path targets when known set provided', () => {
    const r = analyzeTopography(links, {
      knownFiles: new Set(['a.spw', 'b.spw', 'c.spw']),
    })
    expect(r.brokenTargets.some(t => t.includes('index.spw'))).toBe(true)
  })

  it('builds population product with hub/orphan roles', () => {
    const known = new Set(['a.spw', 'b.spw', 'c.spw', 'lib/index.spw', 'orphan.spw'])
    const topo = analyzeTopography(links, {
      knownFiles: known,
      signals: [
        {
          file: 'a.spw',
          sigils: { '~': 2 },
          pathRefCount: 2,
          rootRefCount: 0,
          frameCount: 1,
          annotationHints: 0,
          lineCount: 10,
        },
        {
          file: 'orphan.spw',
          sigils: {},
          pathRefCount: 0,
          rootRefCount: 0,
          frameCount: 0,
          annotationHints: 0,
          lineCount: 3,
        },
      ],
      hubTop: 4,
    })
    const pop = buildPopulation(
      [
        {
          file: 'a.spw',
          sigils: { '~': 2 },
          pathRefCount: 2,
          rootRefCount: 0,
          frameCount: 1,
          annotationHints: 0,
          lineCount: 10,
        },
        {
          file: 'orphan.spw',
          sigils: {},
          pathRefCount: 0,
          rootRefCount: 0,
          frameCount: 0,
          annotationHints: 0,
          lineCount: 3,
        },
      ],
      topo,
    )
    expect(pop.find(r => r.file === 'orphan.spw')?.role).toBe('orphan')
    const product = buildCorpusProduct({
      fingerprint: 'abc',
      roots: ['.'],
      hubTop: 4,
      resolvePaths: true,
      indexDepth: 'standard',
      links,
      signals: pop.map(r => ({
        file: r.file,
        sigils: {},
        pathRefCount: r.pathRefs,
        rootRefCount: r.rootRefs,
        frameCount: r.frames,
        annotationHints: r.annotations,
        lineCount: r.lines,
      })),
      topography: topo,
      population: pop,
    })
    expect(product.schema).toBe('spw.corpus/1')
    expect(populationStats(pop).files).toBe(2)
  })

  it('compares familiarity between corpora', () => {
    const a = analyzeTopography(links, {
      signals: [
        {
          file: 'a.spw',
          sigils: { '~': 10, '#': 5, '@': 2 },
          pathRefCount: 2,
          rootRefCount: 0,
          frameCount: 3,
          annotationHints: 1,
          lineCount: 40,
        },
      ],
    })
    const b = analyzeTopography(
      [
        { from: 'x.spw', to: 'b.spw', kind: 'path' },
        { from: 'x.spw', to: 'lib/index.spw', kind: 'path' },
      ],
      {
        signals: [
          {
            file: 'x.spw',
            sigils: { '~': 8, '#': 6, '@': 1 },
            pathRefCount: 2,
            rootRefCount: 0,
            frameCount: 2,
            annotationHints: 0,
            lineCount: 30,
          },
        ],
      },
    )
    const cmp = compareFamiliarity(a, b)
    expect(cmp.pathOverlap).toBeGreaterThan(0)
    expect(cmp.cosineSigils).toBeGreaterThan(0.5)
    expect(cmp.sharedStrands.length).toBeGreaterThan(0)
  })
})

describe('heuristics', () => {
  it('counts frames and sigils', () => {
    const src = `
# title
^"intent"{ }
^"roots"{
 @a: ~"./b.spw"
}
`
    expect(heuristicFrameCount(src)).toBe(2)
    const h = heuristicSigilHistogram(src)
    expect(h['^']).toBeGreaterThan(0)
    expect(h['~']).toBeGreaterThan(0)
  })
})

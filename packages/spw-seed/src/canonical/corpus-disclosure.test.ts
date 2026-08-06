import { describe, expect, it } from 'vitest'
import { analyzeTopography, buildPopulation, buildCorpusProduct } from '../math/corpus'
import {
  formatCorpusProductSpw,
  formatPopulationSpw,
  formatTopographySpw,
} from './corpus-disclosure'
import { parse } from '../parser'

describe('corpus disclosure (formatSpwCard)', () => {
  const links = [
    { from: 'a.spw', to: 'b.spw', kind: 'path' as const },
    { from: 'b.spw', to: 'c.spw', kind: 'path' as const },
  ]
  const topo = analyzeTopography(links, {
    knownFiles: new Set(['a.spw', 'b.spw', 'c.spw']),
    hubTop: 4,
  })
  const signals = [
    {
      file: 'a.spw',
      sigils: { '~': 1 },
      pathRefCount: 1,
      rootRefCount: 0,
      frameCount: 1,
      annotationHints: 0,
      lineCount: 10,
    },
    {
      file: 'b.spw',
      sigils: {},
      pathRefCount: 1,
      rootRefCount: 0,
      frameCount: 1,
      annotationHints: 0,
      lineCount: 8,
    },
  ]
  const pop = buildPopulation(signals, topo)

  it('emits parseable topography dual-read', () => {
    const spw = formatTopographySpw(topo, { among: ['.'], hubLimit: 4 })
    expect(spw).toContain('^["graph"]')
    expect(spw).toContain('~#files:')
    expect(parse(spw).success).toBe(true)
  })

  it('emits parseable population dual-read with path facets', () => {
    const spw = formatPopulationSpw(pop, { among: ['.'], limit: 10 })
    expect(spw).toContain('^["population"]')
    expect(spw).toContain('~#of:')
    expect(spw).toContain('~"a.spw"')
    expect(parse(spw).success).toBe(true)
  })

  it('emits corpus + population cards', () => {
    const product = buildCorpusProduct({
      fingerprint: 'spw.corpus.test.fp.01',
      roots: ['.'],
      hubTop: 4,
      resolvePaths: true,
      indexDepth: 'standard',
      links,
      signals,
      topography: topo,
      population: pop,
    })
    const spw = formatCorpusProductSpw(product, { rowLimit: 5 })
    expect(spw).toContain('^["corpus"]')
    expect(spw).toContain('^["population"]')
    expect(parse(spw).success).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { fingerprintSource } from '../../canonical/fingerprint'
import {
  childRows,
  columnsFromJson,
  columnsToJson,
  PARSE_COLUMNS_SCHEMA,
  parseColumns,
  reduceUp,
  wordUnit,
  type ParseColumns,
} from './parse-columns'
import { likeness } from './likeness'

const CAULDRON = 'cauldron[garden]{sow ~> tend ~> harvest}'

function columnsOf(source: string): ParseColumns {
  const tree = parseColumns(source)
  if (!tree) throw new Error('no tree')
  return tree
}

function rowOf(tree: ParseColumns, source: string, kind: string, word: string): number {
  for (let i = 0; i < tree.nodes; i++) {
    if (tree.kinds[tree.kind[i]!] === kind && source.slice(tree.wordStart[i]!, tree.wordEnd[i]!) === word) return i
  }
  return -1
}

describe('parse columns', () => {
  it('has one row per node the fingerprint counts, in source order', () => {
    const tree = columnsOf(CAULDRON)
    expect(tree.schema).toBe(PARSE_COLUMNS_SCHEMA)
    expect(tree.nodes).toBe(fingerprintSource(CAULDRON).total)
    const words = [...tree.word.keys()]
      .filter(i => tree.kinds[tree.kind[i]!] === 'Identifier')
      .map(i => CAULDRON.slice(tree.wordStart[i]!, tree.wordEnd[i]!))
    expect(words).toEqual(['cauldron', 'garden', 'sow', 'tend', 'harvest'])
  })

  it('keeps every subtree a contiguous range inside its parent', () => {
    const tree = columnsOf(CAULDRON)
    expect(tree.size[0]).toBe(tree.nodes)
    for (let i = 1; i < tree.nodes; i++) {
      const p = tree.parent[i]!
      expect(p).toBeLessThan(i)
      expect(tree.depth[i]).toBe(tree.depth[p]! + 1)
      expect(i + tree.size[i]!).toBeLessThanOrEqual(p + tree.size[p]!)
      expect(tree.start[i]).toBeGreaterThanOrEqual(tree.start[p]!)
      expect(tree.end[i]).toBeLessThanOrEqual(tree.end[p]!)
    }
    for (let i = 0; i < tree.nodes; i++) {
      for (const c of childRows(tree, i)) expect(tree.parent[c]).toBe(i)
    }
  })

  it('writes glyphs and words apart', () => {
    const source = '#>pipe\n^["pipe"]{ a ~> b }'
    const tree = columnsOf(source)
    const particle = rowOf(tree, source, 'Particle', 'pipe')
    expect(particle).toBeGreaterThan(-1)
    expect(tree.glyphs[tree.glyph[particle]!]).toBe('#>')
    expect(tree.word[particle]).toBe(wordUnit('pipe'))
    const operation = [...tree.kind.keys()].find(i => tree.kinds[tree.kind[i]!] === 'Operation')!
    expect(tree.glyphs[tree.glyph[operation]!]).toBe('^')
    expect(tree.glyphs).toContain('~>')

    const glossed = '?["why"]{ ~#lens(living system) ~#goal: "x" }'
    const glossFrame = columnsOf(glossed)
    const names = [...glossFrame.kind.keys()]
      .filter(i => glossFrame.kinds[glossFrame.kind[i]!] === 'Annotation')
      .map(i => glossed.slice(glossFrame.wordStart[i]!, glossFrame.wordEnd[i]!))
    expect(names).toEqual(['lens(living system)', 'goal'])
  })

  it('lists rows deepest first, one band per depth, each row once', () => {
    const tree = columnsOf(CAULDRON)
    const { order, offsets } = tree.bands
    expect(offsets.length).toBe(tree.maxDepth + 2)
    expect(new Set(order).size).toBe(tree.nodes)
    for (let k = 0; k + 1 < offsets.length; k++) {
      for (let j = offsets[k]!; j < offsets[k + 1]!; j++) expect(tree.depth[order[j]!]).toBe(tree.maxDepth - k)
    }
  })

  it('reduces the same whatever order a band runs in', () => {
    const tree = columnsOf('a[b]{c ~> d, e<f>g}\nh: [i, j]')
    const visit = (row: number, children: number[]) =>
      wordUnit(`${tree.kind[row]}:${tree.word[row]}:${children.join(',')}`)
    const forward = reduceUp(tree, visit)
    const backward = reduceUp(tree, visit, band => [...band].reverse())
    expect(Array.from(backward)).toEqual(Array.from(forward))
    const recursive = (row: number): number => visit(row, childRows(tree, row).map(recursive)) >>> 0
    expect(forward[0]).toBe(recursive(0))
  })

  it('stays the same tree a fingerprint counts, so its kinds are the census', () => {
    const tree = columnsOf(CAULDRON)
    const census: Record<string, number> = {}
    for (const code of tree.kind) census[tree.kinds[code]!] = (census[tree.kinds[code]!] ?? 0) + 1
    expect(census).toEqual(fingerprintSource(CAULDRON).byType)
  })

  it('lays the same source out in the same bytes, and survives JSON', () => {
    const a = columnsToJson(columnsOf(CAULDRON))
    const b = columnsToJson(columnsOf(CAULDRON))
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
    const back = columnsFromJson(JSON.parse(JSON.stringify(a)))
    expect(columnsToJson(back)).toEqual(a)
    expect(() => columnsFromJson({ ...a, schema: 'spw.parse-columns/0' as typeof PARSE_COLUMNS_SCHEMA })).toThrow(/unknown schema/)
  })

  it('carries the parse receipt, so a fallback cannot pass as structure', () => {
    expect(columnsOf(CAULDRON).receipt).toMatchObject({ success: true, complete: true, proseFallback: false, unknownKinds: 0 })
    const fallback = columnsOf('a { b')
    expect(fallback.receipt).toMatchObject({ complete: false, proseFallback: true })
    expect(fallback.nodes).toBe(fingerprintSource('a { b').total)
  })
})

describe('likeness', () => {
  const alike = (source: string) => {
    const tree = columnsOf(source)
    return { shape: likeness(tree, 'shape'), content: likeness(tree, 'content') }
  }

  it('keeps a shape when words change and a content when spacing does', () => {
    const one = alike('a[b]{c ~> d}')
    const renamed = alike('x[y]{z ~> w}')
    const spaced = alike('a[b]{ c  ~>  d }')
    const rejoined = alike('a[b]{c, d}')
    expect(renamed.shape[0]).toBe(one.shape[0])
    expect(renamed.content[0]).not.toBe(one.content[0])
    expect(spaced.content[0]).toBe(one.content[0])
    expect(rejoined.shape[0]).not.toBe(one.shape[0])
  })

  it('computes a rung once per tree', () => {
    const tree = columnsOf(CAULDRON)
    expect(likeness(tree, 'shape')).toBe(likeness(tree, 'shape'))
  })

  it('tells a set\'s separators apart, as the tree now keeps them', () => {
    const spellings = ['#[a ; b]', '#[a, b]', '#[a b]', '#[a, b,]']
    const shapes = spellings.map(source => alike(source).shape[0])
    expect(new Set(shapes).size).toBe(spellings.length)
    const set = columnsOf('#[a, b,]')
    const frameRow = [...set.kind.keys()].find(i => set.kinds[set.kind[i]!] === 'Frame')!
    expect(set.glyphs[set.glyph[frameRow]!]).toBe(', trailing ,')
  })

})


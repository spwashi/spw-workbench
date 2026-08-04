import { describe, it, expect } from 'vitest'
import {
  readAuthorityDeclarations,
  reconcileAuthority,
  type ObservedAuthority,
} from './authority'

const SURFACE = [
  '^["module"]{',
  ' @self: ~"../js/kernel.js"',
  ' !writes: << dataset[*] ; style[*] >>',
  ' &joins: << MutationObserver ; pointerdown >>',
  '}',
  '',
].join('\n')

describe('readAuthorityDeclarations', () => {
  it('reads the subject and every facet', () => {
    const [decl] = readAuthorityDeclarations(SURFACE)
    expect(decl!.self).toBe('../js/kernel.js')
    expect(decl!.claims.map(c => [c.kind, c.name])).toEqual([
      ['writes', 'dataset'],
      ['writes', 'style'],
      ['joins', 'MutationObserver'],
      ['joins', 'pointerdown'],
    ])
  })

  it('separates a frame qualifier from the name', () => {
    const [decl] = readAuthorityDeclarations(SURFACE)
    const dataset = decl!.claims.find(c => c.name === 'dataset')!
    expect(dataset.qualifier).toBe('*')
    expect(dataset.raw).toBe('dataset[*]')
    expect(decl!.claims.find(c => c.name === 'MutationObserver')!.qualifier).toBeUndefined()
  })

  it.each([
    ['semicolons', '!writes: << a ; b ; c >>'],
    ['commas', '!writes: << a, b, c >>'],
    ['newlines', '!writes: <<\n a\n b\n c\n>>'],
  ])('separates claims on %s', (_label, facet) => {
    const [decl] = readAuthorityDeclarations(`^["m"]{ @self: ~"x.js" ${facet} }`)
    expect(decl!.claims.map(c => c.name)).toEqual(['a', 'b', 'c'])
  })

  it('spans the claim text in the source', () => {
    const [decl] = readAuthorityDeclarations(SURFACE)
    const claim = decl!.claims.find(c => c.name === 'pointerdown')!
    expect(SURFACE.slice(claim.span.start.offset, claim.span.end.offset)).toBe('pointerdown')
  })

  it('reads !reads as its own kind', () => {
    const [decl] = readAuthorityDeclarations('^["m"]{ @self: ~"x.js" !reads: << ./shared.js >> }')
    expect(decl!.claims).toEqual([
      expect.objectContaining({ kind: 'reads', name: './shared.js' }),
    ])
  })

  it('attributes claims per subject in a multi-module surface', () => {
    // Merging these would check a.js against b.js's authority and never check
    // b.js at all — the same grouping rule the %mass reader uses.
    const two = [
      '^["a"]{ @self: ~"a.js" !writes: << dataset >> }',
      '^["b"]{ @self: ~"b.js" !writes: << style >> }',
    ].join('\n')
    expect(readAuthorityDeclarations(two).map(d => [d.self, d.claims.map(c => c.name)])).toEqual([
      ['a.js', ['dataset']],
      ['b.js', ['style']],
    ])
  })

  it('yields claims even when the surface names no subject', () => {
    const [decl] = readAuthorityDeclarations('^["m"]{ !writes: << dataset >> }')
    expect(decl!.self).toBeUndefined()
    expect(decl!.claims).toHaveLength(1)
  })

  it('finds nothing in a surface with no authority facets', () => {
    expect(readAuthorityDeclarations('^["m"]{ @self: ~"x.js" a: 1 }')).toEqual([])
  })

  it('ignores a facet whose value is not a stream', () => {
    expect(readAuthorityDeclarations('^["m"]{ !writes: "dataset" }')).toEqual([])
  })
})

describe('reconcileAuthority', () => {
  const claims = () => readAuthorityDeclarations(SURFACE)[0]!.claims
  const obs = (kind: string, name: string): ObservedAuthority => ({
    kind: kind as ObservedAuthority['kind'],
    name,
    sites: [`kernel.js:1`],
  })

  it('agrees when a claim covers what the subject does', () => {
    const findings = reconcileAuthority(claims(), [obs('writes', 'dataset')])
    expect(findings.find(f => f.name === 'dataset')!.verdict).toBe('declared')
  })

  it('reports undeclared authority as a leak, with sites', () => {
    const findings = reconcileAuthority(claims(), [obs('writes', 'innerHTML')])
    const leak = findings.find(f => f.name === 'innerHTML')!
    expect(leak.verdict).toBe('leak')
    expect(leak.sites).toEqual(['kernel.js:1'])
  })

  it('reports a claim the subject no longer exercises as stale', () => {
    const findings = reconcileAuthority(claims(), [])
    expect(findings.every(f => f.verdict === 'stale')).toBe(true)
    expect(findings).toHaveLength(4)
  })

  it('does not let a claim satisfy a different kind', () => {
    // `dataset` is declared under !writes; observing a `dataset` *join* is a leak.
    const findings = reconcileAuthority(claims(), [obs('joins', 'dataset')])
    expect(findings.find(f => f.kind === 'joins' && f.name === 'dataset')!.verdict).toBe('leak')
  })

  it('lets one claim cover several observations', () => {
    const findings = reconcileAuthority(claims(), [
      obs('writes', 'dataset'),
      obs('joins', 'pointerdown'),
    ])
    expect(findings.filter(f => f.verdict === 'declared')).toHaveLength(2)
    expect(findings.filter(f => f.verdict === 'stale').map(f => f.name)).toEqual([
      'style',
      'MutationObserver',
    ])
  })

  it('reports nothing for a surface with no claims and no observations', () => {
    expect(reconcileAuthority([], [])).toEqual([])
  })
})

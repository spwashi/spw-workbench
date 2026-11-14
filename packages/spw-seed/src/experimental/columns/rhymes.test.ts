import { describe, expect, it } from 'vitest'
import { parseColumns } from './parse-columns'
import { findRhymes, type RhymeSurface } from './rhymes'

describe('rhymes', () => {
  const surface = (file: string, source: string): RhymeSurface => ({ file, source, columns: parseColumns(source)! })

  it('finds a template where words vary and a refrain where they repeat', () => {
    const a = surface('a.spw', '^["pipe"]{ feature: "a bar" means: _ }\n^["stages"]{ feature: "a gradient" means: _ }\n')
    const b = surface('b.spw', 'keep{ sow ~> tend ~> harvest }\nkeep{ sow ~> tend ~> harvest }\n')
    const rhymes = findRhymes([a, b], { minRows: 6 })
    const rhyme = rhymes.find(r => r.kind === 'rhyme')!
    expect(rhyme.instances.map(i => [i.file, i.line])).toEqual([['a.spw', 1], ['a.spw', 2]])
    expect(rhyme.template).toBe('^[_]{ feature: _ means: _ }')
    expect(rhyme.holes.map(h => h.fillers)).toEqual([['"pipe"', '"stages"'], ['"a bar"', '"a gradient"']])
    const refrain = rhymes.find(r => r.kind === 'refrain')!
    expect(refrain.instances.map(i => i.line)).toEqual([1, 2])
    expect(refrain.template).toBe('keep{ sow ~> tend ~> harvest }')
  })

  it('reports the largest repeat, not the repeats inside it', () => {
    const s = surface('c.spw', 'x{ a ~> b ~> c ~> d }\ny{ a ~> b ~> c ~> d }\n')
    const rhymes = findRhymes([s], { minRows: 3 })
    expect(rhymes).toHaveLength(1)
    expect(rhymes[0]!.template).toBe('_{ a ~> b ~> c ~> d }')
  })

  it('keeps only wonders when asked for ?', () => {
    const s = surface('d.spw', '?[why]{ ask: "a" }\n?[how]{ ask: "b" }\n![do]{ act: "a" }\n![go]{ act: "b" }\n')
    const all = findRhymes([s], { minRows: 4 })
    const wonders = findRhymes([s], { minRows: 4, sigil: '?' })
    expect(all.length).toBeGreaterThan(wonders.length)
    expect(wonders.every(r => r.template.startsWith('?'))).toBe(true)
  })

  it('hears a wonder inside a larger repeat', () => {
    const s = surface('e.spw', '^[a]{ ?[b]{ ask: "x" } }\n^[c]{ ?[d]{ ask: "y" } }\n')
    expect(findRhymes([s], { minRows: 4 })[0]!.template).toBe('^[_]{ ?[_]{ ask: _ } }')
    const wonders = findRhymes([s], { minRows: 4, sigil: '?' })
    expect(wonders.map(r => r.template)).toEqual(['?[_]{ ask: _ }'])
  })

  it('does not take a block that merely begins with a wonder for a wonder', () => {
    const s = surface('h.spw', 'x{ ?[a]{ ask: "1" } note: "p" }\ny{ ?[b]{ ask: "2" } note: "q" }\n')
    const wonders = findRhymes([s], { minRows: 4, sigil: '?' })
    expect(wonders.map(r => r.template)).toEqual(['?[_]{ ask: _ }'])
  })

  it('leaves comments out of a template, since instances need not share them', () => {
    const s = surface('g.spw', '^["a"]{\n # only here\n x: 1 // and here\n}\n^["b"]{\n x: 2\n}\n')
    const [rhyme] = findRhymes([s], { minRows: 4 })
    expect(rhyme!.template).toBe('^[_]{\n x: _\n}')
  })

  it('opens a hole over an annotation with its apposition', () => {
    const s = surface('f.spw', '?["a"]{ ~#lens(comparison) x: 1 }\n?["a"]{ ~#lens(projection) x: 1 }\n')
    const [rhyme] = findRhymes([s], { minRows: 4 })
    expect(rhyme!.template).toBe('?["a"]{ ~#_ x: 1 }')
    expect(rhyme!.holes.map(h => h.fillers)).toEqual([['lens(comparison)', 'lens(projection)']])
  })
})

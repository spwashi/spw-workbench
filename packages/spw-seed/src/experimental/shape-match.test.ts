/**
 * Shape match: an example with holes, matched on parse columns. Laws over the
 * line fixtures: every line matches itself; a line with one part replaced by _
 * matches the line, and the hole is filled with the part that was replaced.
 */
import { describe, expect, it } from 'vitest'
import { LINE_FIXTURES } from '../line/fixtures'
import { readLine } from '../line/read'
import { parseColumns } from './parse-columns'
import { compileShape, findShape, isShapePattern, matchShape, wordHolePattern, type ShapePattern } from './shape-match'

const pattern = (example: string): ShapePattern => {
  const p = compileShape(example)
  if (!isShapePattern(p)) throw new Error(`${example}: ${p.problem}`)
  return p
}
const hits = (example: string, text: string, options = {}) => findShape(pattern(example), [{ uri: 'a.spw', text }], options)

const CARDS = `?["first"]{
 #:depth #!semantics ~#lens(comparison)
 ~#asked: "a"
 ~#judgment: _
}
?["second"]{
 #:depth #!syntax ~#lens(projection)
 ~#judgment: _
}
!["card"]{ phase: #active }
`

describe('compileShape', () => {
  it('refuses an example that is only holes, empty, unparsed, or with ... before the end', () => {
    expect(compileShape('_')).toEqual({ problem: 'only_a_hole' })
    expect(compileShape('_ ...')).toEqual({ problem: 'only_a_hole' })
    expect(compileShape('')).toEqual({ problem: 'empty' })
    expect(compileShape('{a, ..., b}')).toEqual({ problem: 'rest_not_last' })
  })

  it('finds the holes of an example, a hole wrapped by the parser counted once', () => {
    expect(pattern('~garden[_]{_, ...}').holes.map((h) => h.kind)).toEqual(['one', 'one', 'rest'])
    expect(pattern('phase: _').holes).toHaveLength(1)
  })
})

describe('findShape', () => {
  it('fills each hole with what is written there', () => {
    const found = hits('~garden[_]{_, ...}', '~garden[care]{seed, water}\n~garden[care]{seed}\n~garden[a, b]{x}\n~meadow[care]{seed, water}')
    // ... may take nothing, and then the comma written before it has nothing to separate.
    expect(found.map((h) => [h.line, h.column, h.fillers])).toEqual([
      [1, 1, ['care', 'seed', 'water']],
      [2, 1, ['care', 'seed', '']],
    ])
  })

  it('compares the separators an example writes, and only those before a trailing ...', () => {
    const text = 'x{a, b, c}\ny{a; b}\nz{a b}\nw{a}'
    expect(hits('{_, ...}', text).map((h) => h.line)).toEqual([1, 4])
    expect(hits('{_; ...}', text).map((h) => h.line)).toEqual([2, 4])
    expect(hits('{...}', text).map((h) => h.line)).toEqual([1, 2, 3, 4])
  })

  it('matches a run of neighbours given as several lines, as the same lines inside a body', () => {
    const found = hits('~#judgment: _', CARDS)
    expect(found.map((h) => [h.line, h.fillers])).toEqual([[4, ['_']], [8, ['_']]])
    expect(hits('#:depth _ ~#lens(_)', CARDS).map((h) => h.fillers)).toEqual([['#!semantics', 'comparison'], ['#!syntax', 'projection']])
  })

  it('fills a hole inside a word, and leaves an underscore joined to letters alone', () => {
    expect(hits('?[_]{ #:depth #!semantics ~#lens(_) ... }', CARDS).map((h) => h.fillers.slice(0, 2))).toEqual([['"first"', 'comparison']])
    expect(wordHolePattern('kept_place')).toBeNull()
    expect('lens(comparison)'.match(wordHolePattern('lens(_)')!)?.[1]).toBe('comparison')
    expect(hits('*kept_place{ ... }', '*kept_place{ ~warm[4] }\n*kept_spot{ ~warm[4] }').map((h) => h.line)).toEqual([1])
  })

  it('reports the outermost match by default, and every match with outermost off', () => {
    const text = 'a{ b{ c{ d } } }'
    // _ before a body stands for the word the body follows.
    expect(hits('_{ ... }', text).map((h) => h.fillers[0])).toEqual(['a'])
    expect(hits('_{ ... }', text, { outermost: false }).map((h) => h.fillers[0])).toEqual(['a', 'b', 'c'])
    expect(hits('{ ... }', text).length).toBe(1)
    expect(hits('{ ... }', text, { outermost: false }).length).toBe(3)
  })

  it('matches every line fixture to itself, with nothing to fill', () => {
    for (const { line } of LINE_FIXTURES) {
      const p = compileShape(line)
      if (!isShapePattern(p)) continue
      const tree = parseColumns(`{\n${line}\n}`)!
      const found = matchShape(p, tree, `{\n${line}\n}`)
      expect(found.length, line).toBeGreaterThan(0)
      expect(found[0]!.fillers, line).toEqual([])
    }
  })

  it('fills a hole with the part it replaced, for every fixture with a body of parts', () => {
    let tried = 0
    for (const { line } of LINE_FIXTURES) {
      const reading = readLine(line)
      const part = reading.parts[0]
      if (!part || reading.compound || reading.parts.length < 1 || line.includes('\n')) continue
      const example = `${line.slice(0, part.start)}_${line.slice(part.end)}`
      const p = compileShape(example)
      if (!isShapePattern(p)) continue
      const text = `{\n${line}\n}`
      const found = matchShape(p, parseColumns(text)!, text)
      if (!found.length) continue
      tried++
      expect(found[0]!.fillers[0], line).toBe(part.text)
    }
    expect(tried).toBeGreaterThan(5)
  })
})

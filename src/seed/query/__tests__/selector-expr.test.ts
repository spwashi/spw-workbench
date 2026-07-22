import { describe, expect, it } from 'vitest'
import { PAIRED_BOUNDARY_KINDS } from '../../index'
import { parseSelector, SelectorParseError, tryParseSelector } from '../selector-expr'
import type {
  BoundarySelector,
  SpwAnd,
  SpwDescend,
  SpwNot,
  SpwOr,
  SpwPattern,
} from '../types'
import {
  isAnd,
  isAny,
  isDescend,
  isNot,
  isOr,
  isPattern,
} from '../types'

describe('parseSelector', () => {
  describe('bare compatibility atoms', () => {
    it('parses a bare sigil', () => {
      const selector = parseSelector('^')
      expect(isPattern(selector)).toBe(true)
      expect((selector as SpwPattern).sigil).toBe('^')
    })

    it('parses attached boundary products', () => {
      expect(parseSelector('^[]')).toEqual({
        sigil: '^',
        brace: '[]',
      })
      expect(parseSelector('^[]{}')).toEqual({
        sigil: '^',
        brace: '[]',
        brace2: '{}',
      })
    })

    it('parses modifiers and literal values', () => {
      expect(parseSelector('!boon')).toEqual({ sigil: '!', modifier: 'boon' })
      expect(parseSelector('~"./path"')).toEqual({ sigil: '~', value: './path' })
      expect(parseSelector('boon')).toEqual({ modifier: 'boon' })
    })

    it('decodes escaped quoted values once', () => {
      expect(parseSelector(String.raw`~"a\"b"`)).toEqual({ sigil: '~', value: 'a"b' })
    })

    it('makes standalone boundary surfaces select boundary nodes', () => {
      expect(parseSelector('[]')).toEqual({ boundary: 'frame' })
      expect(parseSelector('{}')).toEqual({ boundary: 'body' })
      expect(parseSelector('()')).toEqual({ boundary: 'scope' })
    })

    it('keeps * and <> as literal operators', () => {
      expect(parseSelector('*')).toEqual({ sigil: '*' })
      expect(parseSelector('<>')).toEqual({ sigil: '<>' })
      expect(parseSelector('&')).toEqual({ sigil: '&' })
    })

    it('uses an explicit any selector', () => {
      expect(parseSelector('any')).toEqual({ any: true })
      expect(isAny(parseSelector('any'))).toBe(true)
    })
  })

  describe('closed Spw.q envelope', () => {
    const surfaces = {
      frame: '$[_]',
      body: '${_}',
      scope: '$(_)',
      capsule: '$<_>',
      stream: '$<<_>>',
      nrange: '$((_))',
    } satisfies Record<BoundarySelector, string>
    const boundaries = PAIRED_BOUNDARY_KINDS.map(
      (boundary) => [surfaces[boundary], boundary] as const,
    )

    it.each(boundaries)('%s selects the %s boundary kind', (source, boundary) => {
      expect(parseSelector(source)).toEqual({ boundary, placeholder: true })
    })

    it('distinguishes Capsule from the <> coupling operator', () => {
      expect(parseSelector('$<_>')).toEqual({ boundary: 'capsule', placeholder: true })
      expect(parseSelector('$<>_')).toEqual({
        sigil: '<>',
        nodeType: 'Operation',
        placeholder: true,
      })
    })

    it('distinguishes explicit ANY from the * collapse operator', () => {
      expect(parseSelector('$_')).toEqual({ any: true, placeholder: true })
      expect(parseSelector('$*_')).toEqual({
        sigil: '*',
        nodeType: 'Operation',
        placeholder: true,
      })
    })

    it('supports every operator, including $ and &', () => {
      expect(parseSelector('$$_')).toEqual({
        sigil: '$',
        nodeType: 'Operation',
        placeholder: true,
      })
      expect(parseSelector('$&_')).toEqual({
        sigil: '&',
        nodeType: 'Operation',
        placeholder: true,
      })
      expect(parseSelector('$ & _')).toEqual(parseSelector('$&_'))
    })

    it('specializes reference and path-reference envelopes', () => {
      expect(parseSelector('$@_')).toEqual({
        sigil: '@',
        nodeType: 'Reference',
        placeholder: true,
      })
      expect(parseSelector('$~"_"')).toEqual({
        sigil: '~',
        nodeType: 'PathRef',
        placeholder: true,
      })
      expect(parseSelector('$~"./path"')).toEqual({
        sigil: '~',
        nodeType: 'PathRef',
        value: './path',
      })
      expect(parseSelector('$~_')).toEqual({
        sigil: '~',
        nodeType: 'Operation',
        placeholder: true,
      })
    })

    it('parses operations carrying one or more boundaries', () => {
      expect(parseSelector('$![_]')).toEqual({
        sigil: '!',
        nodeType: 'Operation',
        withBoundaries: ['frame'],
        placeholder: true,
      })
      expect(parseSelector('$^[_]{_}')).toEqual({
        sigil: '^',
        nodeType: 'Operation',
        withBoundaries: ['frame', 'body'],
        placeholder: true,
      })
    })

    it('keeps attached @ forms as operations', () => {
      expect(parseSelector('$@[_]')).toEqual({
        sigil: '@',
        nodeType: 'Operation',
        withBoundaries: ['frame'],
        placeholder: true,
      })
      expect(parseSelector('$@boon')).toEqual({
        sigil: '@',
        nodeType: 'Operation',
        modifier: 'boon',
      })
    })

    it('uses the query envelope to disambiguate a valued Scope', () => {
      expect(parseSelector('$(x)')).toEqual({ boundary: 'scope', value: 'x' })
    })

    it('rejects boundaries that cannot attach to an operation', () => {
      for (const source of ['$!<_>', '$!(_)', '$!<<_>>', '$!((_))']) {
        expect(() => parseSelector(source)).toThrow(/not an attachable operation boundary/)
      }
    })

    it('rejects unscoped values inside attached boundaries', () => {
      expect(() => parseSelector('$![x]')).toThrow(/literal matching is unassigned/)
      expect(parseSelector('$[x]')).toEqual({ boundary: 'frame', value: 'x' })
    })
  })

  describe('combinators', () => {
    it('parses union', () => {
      const selector = parseSelector('~ | @')
      expect(isOr(selector)).toBe(true)
      const union = selector as SpwOr
      expect((union.or[0] as SpwPattern).sigil).toBe('~')
      expect((union.or[1] as SpwPattern).sigil).toBe('@')
    })

    it('parses symbolic and word conjunction while preserving bare &', () => {
      expect(isAnd(parseSelector('^[] & ^{}'))).toBe(true)
      expect(isAnd(parseSelector('^[] and ^{}'))).toBe(true)
      expect(parseSelector('&')).toEqual({ sigil: '&' })
      expect(parseSelector('( & )')).toEqual({ sigil: '&' })
      expect(isNot(parseSelector('not &'))).toBe(true)
      expect((parseSelector('^[] & ^{}') as SpwAnd).and).toHaveLength(2)
    })

    it('parses negation, descent, and grouping', () => {
      const negated = parseSelector('not ^[]') as SpwNot
      expect(isNot(negated)).toBe(true)
      expect(isPattern(negated.not)).toBe(true)

      const descended = parseSelector('^[] / ![]') as SpwDescend
      expect(isDescend(descended)).toBe(true)
      expect((descended.descend[0] as SpwPattern).sigil).toBe('^')
      expect((descended.descend[1] as SpwPattern).sigil).toBe('!')

      expect(isAnd(parseSelector('(~ | @) and ^[]'))).toBe(true)
      expect(isAnd(parseSelector('((~ | @) and ^[])'))).toBe(true)
      expect(isOr(parseSelector('((~ | @))'))).toBe(true)
    })

    it('reserves .. instead of pretending it is a sequence', () => {
      expect(() => parseSelector('![] .. ~')).toThrow(/reserved for range and slice/)
    })
  })

  describe('depth selectors', () => {
    it('parses exact and ranged depth', () => {
      expect(parseSelector('^[] @2')).toMatchObject({ depth: 2 })
      expect(parseSelector('^[] @1-3')).toMatchObject({ depthRange: [1, 3] })
      expect(() => parseSelector('^[] @3-1')).toThrow(SelectorParseError)
    })
  })

  describe('fail-closed behavior', () => {
    it('requires full token consumption', () => {
      expect(() => parseSelector('^[] ~')).toThrow(SelectorParseError)
      expect(() => parseSelector('$@_ trailing')).toThrow(SelectorParseError)
    })

    it('rejects unknown characters at their character offset', () => {
      try {
        parseSelector('^[]:')
        throw new Error('expected selector parse failure')
      } catch (error) {
        expect(error).toBeInstanceOf(SelectorParseError)
        expect((error as SelectorParseError).position).toBe(3)
      }
    })

    it('rejects unterminated literals and malformed boundary interiors', () => {
      expect(() => parseSelector('~"unfinished')).toThrow(/Unterminated quoted literal/)
      expect(() => parseSelector('$[a b]')).toThrow(/selector interior/)
    })

    it('returns null from the tolerant API for every invalid surface', () => {
      expect(tryParseSelector('')).toBeNull()
      expect(tryParseSelector('$@_ trailing')).toBeNull()
      expect(tryParseSelector('! .. ~')).toBeNull()
    })
  })
})

import { describe, expect, it } from 'vitest'
import { parseSelector, tryParseSelector, SelectorParseError } from '../selector-expr'
import type { SpwPattern, SpwAnd, SpwOr, SpwNot, SpwDescend, SpwSequence } from '../types'
import { isAnd, isOr, isNot, isDescend, isSequence, isPattern } from '../types'

describe('parseSelector', () => {
    describe('atomic patterns', () => {
        it('parses a bare sigil', () => {
            const s = parseSelector('^')
            expect(isPattern(s)).toBe(true)
            expect((s as SpwPattern).sigil).toBe('^')
        })

        it('parses sigil with primary brace', () => {
            const s = parseSelector('^[]')
            expect(isPattern(s)).toBe(true)
            const p = s as SpwPattern
            expect(p.sigil).toBe('^')
            expect(p.brace).toBe('[]')
        })

        it('parses sigil with primary and secondary braces', () => {
            const s = parseSelector('^[]{}')
            expect(isPattern(s)).toBe(true)
            const p = s as SpwPattern
            expect(p.sigil).toBe('^')
            expect(p.brace).toBe('[]')
            expect(p.brace2).toBe('{}')
        })

        it('parses sigil with modifier', () => {
            const s = parseSelector('!boon')
            expect(isPattern(s)).toBe(true)
            const p = s as SpwPattern
            expect(p.sigil).toBe('!')
            expect(p.modifier).toBe('boon')
        })

        it('parses sigil with value', () => {
            const s = parseSelector('~"./path"')
            expect(isPattern(s)).toBe(true)
            const p = s as SpwPattern
            expect(p.sigil).toBe('~')
            expect(p.value).toBe('./path')
        })

        it('parses standalone modifier', () => {
            const s = parseSelector('boon')
            expect(isPattern(s)).toBe(true)
            expect((s as SpwPattern).modifier).toBe('boon')
        })

        it('parses standalone brace', () => {
            const s = parseSelector('[]')
            expect(isPattern(s)).toBe(true)
            expect((s as SpwPattern).brace).toBe('[]')
        })

        it('parses wildcard', () => {
            const s = parseSelector('*')
            expect(isPattern(s)).toBe(true)
            expect((s as SpwPattern).sigil).toBe('*')
        })

        it('parses <> coupling sigil', () => {
            const s = parseSelector('<>')
            expect(isPattern(s)).toBe(true)
            expect((s as SpwPattern).sigil).toBe('<>')
        })
    })

    describe('combinators', () => {
        it('parses or with pipe', () => {
            const s = parseSelector('~ | @')
            expect(isOr(s)).toBe(true)
            const o = s as SpwOr
            expect((o.or[0] as SpwPattern).sigil).toBe('~')
            expect((o.or[1] as SpwPattern).sigil).toBe('@')
        })

        it('parses and with ampersand', () => {
            const s = parseSelector('^[] & ^{}')
            expect(isAnd(s)).toBe(true)
        })

        it('parses not', () => {
            const s = parseSelector('not ^[]')
            expect(isNot(s)).toBe(true)
            const n = s as SpwNot
            expect(isPattern(n.not)).toBe(true)
            expect((n.not as SpwPattern).sigil).toBe('^')
        })

        it('parses descend with slash', () => {
            const s = parseSelector('^[] / ![]')
            expect(isDescend(s)).toBe(true)
            const d = s as SpwDescend
            expect((d.descend[0] as SpwPattern).sigil).toBe('^')
            expect((d.descend[1] as SpwPattern).sigil).toBe('!')
        })

        it('parses sequence with dotdot', () => {
            const s = parseSelector('![] .. ~[]')
            expect(isSequence(s)).toBe(true)
            const sq = s as SpwSequence
            expect((sq.seq[0] as SpwPattern).sigil).toBe('!')
            expect((sq.seq[1] as SpwPattern).sigil).toBe('~')
        })

        it('parses grouped expression', () => {
            const s = parseSelector('(~ | @) & ^[]')
            expect(isAnd(s)).toBe(true)
        })
    })

    describe('depth selectors', () => {
        it('parses exact depth', () => {
            const s = parseSelector('^[] @2')
            expect(isPattern(s)).toBe(true)
            expect((s as SpwPattern).depth).toBe(2)
        })

        it('parses depth range', () => {
            const s = parseSelector('^[] @1-3')
            expect(isPattern(s)).toBe(true)
            expect((s as SpwPattern).depthRange).toEqual([1, 3])
        })
    })

    describe('preset equivalents', () => {
        it('NAVIGABLE = ~ | @', () => {
            const s = parseSelector('~ | @')
            expect(isOr(s)).toBe(true)
            const o = s as SpwOr
            expect((o.or[0] as SpwPattern).sigil).toBe('~')
            expect((o.or[1] as SpwPattern).sigil).toBe('@')
        })

        it('DOMAIN_ROOTS = ^[]', () => {
            const s = parseSelector('^[]')
            expect(isPattern(s)).toBe(true)
            const p = s as SpwPattern
            expect(p.sigil).toBe('^')
            expect(p.brace).toBe('[]')
        })

        it('BOON_OPS = !boon', () => {
            const s = parseSelector('!boon')
            expect(isPattern(s)).toBe(true)
            const p = s as SpwPattern
            expect(p.sigil).toBe('!')
            expect(p.modifier).toBe('boon')
        })
    })

    describe('error handling', () => {
        it('tryParseSelector returns null on invalid input', () => {
            expect(tryParseSelector('')).toBeNull()
        })

        it('parseSelector throws SelectorParseError on invalid input', () => {
            expect(() => parseSelector('')).toThrow(SelectorParseError)
        })
    })
})

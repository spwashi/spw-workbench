/**
 * spwq pattern matching — unit tests
 */

import { describe, it, expect } from 'vitest'
import { parse, spwq, matchAll, matchAt, or, and, not, descend } from '../../index'
import {
    PATH_REFS,
    REFERENCES,
    NAVIGABLE,
    DOMAIN_ROOTS,
    DOMAIN_ROOTS_FULL,
    HYDRATE_OPS,
    DEFER_OPS,
    OPS_WITH_FRAMES,
    OPS_WITH_BODIES,
    SCOPES,
    ANY,
} from '../presets'
import type { SpwPattern } from '../types'

function querySource(source: string, sel: any) {
    const output = parse(source)
    expect(output.ast).toBeTruthy()
    return matchAll(output.ast!, sel)
}

describe('spwq pattern matching', () => {
    describe('sigil selectors', () => {
        it('matches ! operations', () => {
            const matches = querySource('!["hello"]', HYDRATE_OPS)
            expect(matches.length).toBe(1)
        })

        it('matches ~ operations', () => {
            const matches = querySource('~["path"]', DEFER_OPS)
            expect(matches.length).toBeGreaterThanOrEqual(1)
            expect(matches.every((match) => match.node.type === 'Operation')).toBe(true)
        })

        it('matches @ references', () => {
            const matches = querySource('@src/seed', REFERENCES)
            expect(matches.length).toBe(1)
        })

        it('matches ~"..." path refs', () => {
            const matches = querySource('~"./runtime"', PATH_REFS)
            expect(matches.length).toBe(1)
        })
    })

    describe('brace selectors', () => {
        it('matches operations with frames', () => {
            const matches = querySource('!["hello"]', OPS_WITH_FRAMES)
            expect(matches.length).toBeGreaterThanOrEqual(1)
        })

        it('matches operations with bodies', () => {
            const matches = querySource('!{ @inner }', OPS_WITH_BODIES)
            expect(matches.length).toBeGreaterThanOrEqual(1)
        })

        it('matches scopes', () => {
            const matches = querySource('(a: !["x"])', SCOPES)
            expect(matches.length).toBe(1)
        })
    })

    describe('domain roots', () => {
        it('matches ^[_] patterns', () => {
            const matches = querySource('^["roots"]{ @src: ~"./src" }', DOMAIN_ROOTS)
            expect(matches.length).toBe(1)
        })

        it('matches ^[_]{_} patterns', () => {
            const matches = querySource('^["roots"]{ @src: ~"./src" }', DOMAIN_ROOTS_FULL)
            expect(matches.length).toBe(1)
        })
    })

    describe('value selectors', () => {
        it('matches path ref by exact value', () => {
            const sel: SpwPattern = { sigil: '~', value: './runtime' }
            const matches = querySource('~"./runtime"', sel)
            expect(matches.length).toBe(1)
        })

        it('does not match wrong value', () => {
            const sel: SpwPattern = { sigil: '~', value: './other' }
            const matches = querySource('~"./runtime"', sel)
            expect(matches.length).toBe(0)
        })
    })

    describe('combinators', () => {
        it('or combines selectors', () => {
            const matches = querySource('~"./path" @src/seed', NAVIGABLE)
            expect(matches.length).toBe(2)
        })

        it('and intersects selectors', () => {
            const sel = and({ sigil: '^' }, { brace: '[]' })
            const matches = querySource('^["roots"]{ @src }', sel)
            expect(matches.length).toBe(1)
        })

        it('not inverts selectors', () => {
            const sel = not({ sigil: '~' })
            const matches = querySource('~"./path"', sel)
            // Should match non-~ nodes (e.g. Seed, Expression, Literal) but not the ~ itself
            const tildeMatches = matches.filter((m) => m.node.type === 'PathRef')
            expect(tildeMatches.length).toBe(0)
        })
    })

    describe('position queries', () => {
        it('finds match at cursor position', () => {
            const source = '~"./runtime"'
            const output = parse(source)
            expect(output.ast).toBeTruthy()
            const match = matchAt(output.ast!, 0, 3, PATH_REFS)
            expect(match).not.toBeNull()
        })

        it('returns null for position outside matches', () => {
            const source = '~"./runtime"'
            const output = parse(source)
            expect(output.ast).toBeTruthy()
            const match = matchAt(output.ast!, 10, 0, PATH_REFS)
            expect(match).toBeNull()
        })
    })

    describe('spwq convenience', () => {
        it('fromSource works', () => {
            const matches = spwq.fromSource('^["files"]{ ~"./toc.spw" }', NAVIGABLE)
            expect(matches.length).toBeGreaterThanOrEqual(1)
        })

        it('returns empty for empty input', () => {
            const matches = spwq.fromSource('', NAVIGABLE)
            expect(matches.length).toBe(0)
        })
    })

    describe('wildcard', () => {
        it('ANY matches all nodes', () => {
            const matches = querySource('!["hello"]', ANY)
            expect(matches.length).toBeGreaterThan(1) // Seed, Expression, Operation, Frame, Literal, etc.
        })
    })
})

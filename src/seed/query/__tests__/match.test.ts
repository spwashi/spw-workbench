/**
 * spwq pattern matching — unit tests
 */

import { describe, it, expect } from 'vitest'
import {
    parse,
    spwq,
    matchAll,
    matchAt,
    or,
    and,
    not,
    descend,
    seq,
    capture,
    anyNode,
    parseSelector,
    PAIRED_BOUNDARY_KINDS,
} from '../../index'
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

        it('matches escaped quoted values with the selector decoder', () => {
            const pathSelector = parseSelector(String.raw`$~"a\"b"`)
            expect(querySource(String.raw`~"a\"b"`, pathSelector)).toHaveLength(1)

            const frameSelector = parseSelector(String.raw`$["a\"b"]`)
            expect(querySource(String.raw`["a\"b"]`, frameSelector)).toHaveLength(1)
        })

        it('keeps Operation values local to operator labels', () => {
            const selector = parseSelector('$!"x"')
            expect(querySource('!["x"]', selector)).toHaveLength(0)
            expect(querySource('!{ x }', selector)).toHaveLength(0)
            expect(querySource('!x["payload"]', selector)).toHaveLength(1)
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
            expect(matches.every((match) => !match.evidence.participants[0]?.placeholder)).toBe(true)
        })

        it('records placeholder provenance only for textual $_', () => {
            const matches = querySource('!["hello"]', parseSelector('$_'))
            expect(matches.length).toBeGreaterThan(1)
            expect(matches.every((match) => match.evidence.participants[0]?.placeholder)).toBe(true)
        })

        it('keeps * available as the collapse operator', () => {
            const matches = querySource('* !["hello"]', { sigil: '*', nodeType: 'Operation' })
            expect(matches).toHaveLength(1)
            expect(matches[0]?.node.type).toBe('Operation')
            expect(matches[0]?.evidence.participants[0]?.placeholder).toBe(false)
        })
    })

    describe('paired-boundary selectors', () => {
        const cases = [
            { selector: '$[_]', source: '["x"]', type: 'Frame', kind: 'frame' },
            { selector: '${_}', source: '{ x }', type: 'Body', kind: 'body' },
            { selector: '$(_)', source: '(x)', type: 'Scope', kind: 'scope' },
            { selector: '$<_>', source: '<tag>', type: 'Capsule', kind: 'capsule' },
            { selector: '$<<_>>', source: '<< x >>', type: 'Stream', kind: 'stream' },
            { selector: '$((_))', source: '((x))', type: 'NRange', kind: 'nrange' },
        ] as const

        it.each(cases)('matches $kind as a first-class boundary', ({ selector, source, type, kind }) => {
            const matches = querySource(source, parseSelector(selector))
            expect(matches).toHaveLength(1)
            expect(matches[0]?.node.type).toBe(type)
            expect(matches[0]?.evidence.participants[0]?.placeholder).toBe(true)
            expect(matches[0]?.evidence.participants[0]?.coupling).toMatchObject({
                kind,
                form: 'boundary',
            })
        })

        it('covers the canonical boundary registry without omitting Capsule', () => {
            expect(cases.map(({ kind }) => kind)).toEqual(PAIRED_BOUNDARY_KINDS)
        })

        it('does not conflate the Capsule boundary and <> operator', () => {
            expect(querySource('<>', parseSelector('$<_>'))).toHaveLength(0)
            const operator = querySource('<>', parseSelector('$<>_'))
            expect(operator).toHaveLength(1)
            expect(operator[0]?.evidence.participants[0]?.coupling).toMatchObject({
                kind: 'couple',
                form: 'operator',
            })
        })

        it('matches Capsule tags without conflating payload scalars', () => {
            expect(querySource('<tag>', parseSelector('$<tag>'))).toHaveLength(1)
            expect(querySource('<[tag]>', parseSelector('$<tag>'))).toHaveLength(0)
        })

        it('matches a valued Scope selected through the query envelope', () => {
            expect(querySource('(x)', parseSelector('$(x)'))).toHaveLength(1)
        })
    })

    describe('ordered term-slot groups', () => {
        const ordered = seq(
            capture('action', { sigil: '!', nodeType: 'Operation' }),
            capture('target', { sigil: '~', nodeType: 'PathRef' }),
        )

        it('matches adjacent terms and returns participant coordinates', () => {
            const matches = querySource('!["x"] ~"./p"', ordered)
            expect(matches).toHaveLength(1)

            const match = matches[0]!
            expect(match.node.type).toBe('Operation')
            expect(match.evidence.relation).toBe('adjacent-term-slots')
            expect(match.evidence.participants.map((participant) => participant.node.type))
                .toEqual(['Operation', 'PathRef'])
            expect(match.evidence.captures).toEqual({ action: 0, target: 1 })
            expect(match.evidence.participants[0]?.slot).toMatchObject({
                ownerKind: 'sequence',
                expressionIndex: 0,
                termIndex: 0,
                separatorBefore: null,
            })
            expect(match.evidence.participants[1]?.slot).toMatchObject({
                expressionIndex: 1,
                termIndex: 0,
                separatorBefore: { kind: 'expression' },
            })
            expect(match.evidence.envelope.startOffset).toBe(match.span.startOffset)
            expect(match.evidence.envelope.endOffset).toBeGreaterThan(match.span.endOffset)
        })

        it('requires order and adjacency', () => {
            expect(querySource('~"./p" !["x"]', ordered)).toHaveLength(0)
            expect(querySource('!["x"] @middle ~"./p"', ordered)).toHaveLength(0)
        })

        it('does not cross a nested Sequence boundary', () => {
            expect(querySource('{ !["x"] } ~"./p"', ordered)).toHaveLength(0)
        })

        it('keeps a placeholder wildcard visible as one participant', () => {
            const matches = querySource(
                '!["x"] ~"./p"',
                seq({ sigil: '!', nodeType: 'Operation' }, parseSelector('$_')),
            )
            expect(matches).toHaveLength(1)
            expect(matches[0]?.evidence.participants).toHaveLength(2)
            expect(matches[0]?.evidence.participants[1]?.placeholder).toBe(true)
        })

        it('matches every selector in a variadic adjacent group', () => {
            const matches = querySource(
                '!["x"] @middle ~"./p"',
                seq(
                    { sigil: '!', nodeType: 'Operation' },
                    ANY,
                    { sigil: '~', nodeType: 'PathRef' },
                ),
            )
            expect(matches).toHaveLength(1)
            expect(matches[0]?.evidence.participants.map(({ node }) => node.type))
                .toEqual(['Operation', 'Reference', 'PathRef'])
        })

        it('does not transfer an ancestor ANY placeholder to the child', () => {
            const matches = querySource(
                '!["x"]',
                descend(anyNode(), { nodeType: 'Literal' }),
            )
            expect(matches).toHaveLength(1)
            expect(matches[0]?.node.type).toBe('Literal')
            expect(matches[0]?.placeholder).toBe(false)
        })

        it('includes captured ancestors in the evidence envelope', () => {
            const match = querySource(
                '!["x"]',
                descend(
                    capture('operation', { sigil: '!', nodeType: 'Operation' }),
                    capture('literal', { nodeType: 'Literal' }),
                ),
            )[0]!
            expect(match.evidence.participants.map(({ node }) => node.type))
                .toEqual(['Literal', 'Operation'])
            expect(match.evidence.envelope.startOffset)
                .toBe(match.evidence.participants[1]?.span.startOffset)
            expect(match.evidence.envelope.endOffset)
                .toBe(match.evidence.participants[1]?.span.endOffset)
        })

        it('records an atomic named capture without reusing source _ semantics', () => {
            const matches = querySource('~"./p"', capture('path', PATH_REFS))
            expect(matches).toHaveLength(1)
            expect(matches[0]?.evidence.captures).toEqual({ path: 0 })
            expect(matches[0]?.evidence.participants[0]?.captureNames).toEqual(['path'])
        })

        it('retains multiple names and prototype-shaped capture names', () => {
            const aliased = querySource(
                '~"./p"',
                and(capture('path', PATH_REFS), capture('target', PATH_REFS)),
            )[0]!
            expect(aliased.evidence.participants[0]?.captureNames).toEqual(['path', 'target'])

            const prototype = querySource(
                '~"./p"',
                capture('__proto__', PATH_REFS),
            )[0]!
            expect(Object.hasOwn(prototype.evidence.captures, '__proto__')).toBe(true)
            expect(prototype.evidence.captures.__proto__).toBe(0)
        })
    })

    describe('runtime selector validation', () => {
        it('rejects empty and unknown patterns rather than matching everything', () => {
            expect(() => querySource('!["x"]', {})).toThrow(/empty patterns are not wildcards/)
            expect(() => querySource('!["x"]', { banana: 1 })).toThrow(/unknown pattern field/)
        })

        it('rejects malformed composites, duplicate captures, and nested sequences', () => {
            expect(() => querySource('!["x"]', { and: [{ sigil: '!' }] }))
                .toThrow(/exactly two selectors/)
            expect(() => querySource(
                '!["x"]',
                and(capture('same', { sigil: '!' }), capture('same', { nodeType: 'Operation' })),
            )).toThrow(/duplicate capture/)
            expect(() => querySource(
                '!["x"] ~"./p" @tail',
                seq(seq({ sigil: '!' }, { sigil: '~' }), { sigil: '@' }),
            )).toThrow(/top-level/)
        })

        it('rejects branch-dependent captures, sparse groups, and undefined fields', () => {
            expect(() => querySource(
                '~"./p"',
                or(capture('path', PATH_REFS), REFERENCES),
            )).toThrow(/not allowed beneath not\/or/)
            expect(() => querySource(
                '~"./p"',
                not(capture('path', PATH_REFS)),
            )).toThrow(/not allowed beneath not\/or/)

            const sparse = new Array(2)
            expect(() => querySource('~"./p"', { seq: sparse }))
                .toThrow(/missing selector/)
            expect(() => querySource('~"./p"', { sigil: undefined }))
                .toThrow(/unknown operator sigil/)
        })

        it('rejects impossible programmatic attached boundaries', () => {
            expect(() => querySource('<tag>', {
                nodeType: 'Capsule',
                withBoundaries: ['capsule'],
            })).toThrow(/only frame and body/)
        })
    })
})

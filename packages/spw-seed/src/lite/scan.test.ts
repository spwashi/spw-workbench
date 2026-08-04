/**
 * The lite scanner is a subset of the real lexer, and these tests are what make
 * "subset" a checked claim rather than an intention. The site previously read
 * Spw with four inline regexes; the failure mode that invites is a second
 * dialect that drifts. Every case below either pins the shared vocabulary or
 * checks agreement with the full lexer on real surfaces.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { tokenize } from '../lexer'
import { DEFAULT_OPERATOR_MAP } from '../lexer/profiles'
import { scan, scanGeometry, SPW_BOUNDS, SPW_OPERATORS } from './scan'
import type { Token } from '../types'

function lex(source: string): Token[] {
  const gen = tokenize(source)
  let step = gen.next()
  while (!step.done) step = gen.next()
  return step.value
}

const REPO_ROOT = path.resolve(__dirname, '../../../..')

function fixture(rel: string): string {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8')
}

describe('vocabulary matches the full lexer', () => {
  it('covers exactly the operator lattice', () => {
    expect([...SPW_OPERATORS].sort()).toEqual(Object.keys(DEFAULT_OPERATOR_MAP).sort())
  })

  it('orders operators longest-first so <> beats <', () => {
    expect(SPW_OPERATORS[0]).toBe('<>')
  })

  it('orders bounds longest-first so << beats < and (( beats (', () => {
    const opens = SPW_BOUNDS.map(b => b[0])
    expect(opens.indexOf('<<')).toBeLessThan(opens.indexOf('<'))
    expect(opens.indexOf('((')).toBeLessThan(opens.indexOf('('))
  })
})

describe('agrees with the full lexer on token boundaries', () => {
  const KIND_FOR: Partial<Record<string, string>> = {
    OPERATOR: 'operator',
    PARTICLE: 'particle',
    STRING: 'string',
    PHRASE: 'phrase',
    ARROW: 'arrow',
    NUMBER: 'number',
    IDENTIFIER: 'identifier',
    CONTAINER_OPEN: 'open',
    CONTAINER_CLOSE: 'close',
    STREAM_OPEN: 'open',
    STREAM_CLOSE: 'close',
    NRANGE_OPEN: 'open',
    NRANGE_CLOSE: 'close',
    CAPSULE_OPEN: 'open',
    CAPSULE_CLOSE: 'close',
  }

  const SURFACES = [
    'docs/examples/spw/form-sequence.spw',
    'docs/examples/spw/sense-loop.spw',
    'docs/examples/spw/grounded-register.spw',
    '.spw/index.spw',
  ]

  it.each(SURFACES)('spans and kinds line up on %s', rel => {
    const source = fixture(rel)
    const full = lex(source).filter(t => KIND_FOR[t.type] !== undefined)
    const lite = new Map(scan(source).map(t => [t.start, t]))

    let compared = 0
    for (const tok of full) {
      const mine = lite.get(tok.span.start.offset)
      if (!mine) continue
      // Only compare where the lite scanner claims the same token. It does not
      // model annotations or appositions, so those legitimately differ.
      if (mine.kind !== KIND_FOR[tok.type]) continue
      expect(mine.value).toBe(tok.value)
      compared++
    }

    // Guard the guard: a mapping bug that matched nothing would pass silently.
    expect(compared).toBeGreaterThan(20)
  })
})

describe('scan', () => {
  it('reads a particle as one token', () => {
    expect(scan('#>anchor').map(t => [t.kind, t.value])).toEqual([['particle', '#>anchor']])
  })

  it('leaves a bare # as an operator', () => {
    const [first] = scan('#label')
    expect(first!.kind).toBe('operator')
    expect(first!.value).toBe('#')
  })

  it('reads <> as the concept operator, not a capsule pair', () => {
    expect(scan('<>').map(t => [t.kind, t.value])).toEqual([['operator', '<>']])
  })

  it('reads << as a stream bound', () => {
    expect(scan('<<a>>').map(t => [t.kind, t.bound ?? t.value])).toEqual([
      ['open', 'stream'],
      ['identifier', 'a'],
      ['close', 'stream'],
    ])
  })

  it('reads => as an arrow', () => {
    expect(scan('a => b').filter(t => t.kind === 'arrow')).toHaveLength(1)
  })

  it('reads backtick phrases', () => {
    expect(scan('`=[depth]{ deep }`').map(t => t.kind)).toEqual(['phrase'])
  })

  it('does not let an unterminated quote swallow the surface', () => {
    const tokens = scan('a: "oops\nb: 1')
    expect(tokens.some(t => t.kind === 'identifier' && t.value === 'b')).toBe(true)
  })

  it('covers the source exactly', () => {
    const source = '^["a"]{\n  ~#n: `x` => 1\n}\n'
    const tokens = scan(source)
    expect(tokens.map(t => t.value).join('')).toBe(source)
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i]!.start).toBe(tokens[i - 1]!.end)
    }
  })

  it('never throws on partial input', () => {
    for (const bad of ['<', '{{{', '"', '`', '#', '=>', '', '§']) {
      expect(() => scan(bad)).not.toThrow()
    }
  })
})

describe('scanGeometry', () => {
  it('counts sigils and bound families', () => {
    const g = scanGeometry('^["a"]{ &b <<c>> }')
    expect(g.operators['^']).toBe(1)
    expect(g.operators['&']).toBe(1)
    expect(g.bounds.frame).toBe(1)
    expect(g.bounds.body).toBe(1)
    expect(g.bounds.stream).toBe(1)
  })

  it('reports depth and balance', () => {
    expect(scanGeometry('{[()]}').maxDepth).toBe(3)
    expect(scanGeometry('{[()]}').balance).toBe(0)
    expect(scanGeometry('{{{').balance).toBe(3)
  })

  it.each([
    ['docs/examples/spw/form-sequence.spw'],
    ['docs/examples/spw/sense-loop.spw'],
    ['.spw/index.spw'],
  ])('agrees with the full lexer on sigil counts for %s', rel => {
    const source = fixture(rel)
    const lite = scanGeometry(source)

    // The full lexer folds sigils into ANNOTATION, APPOSITION, and PARTICLE
    // tokens; a census counts them by role, so unfold those before comparing.
    const fullCounts: Record<string, number> = {}
    const bump = (sigil: string) => {
      fullCounts[sigil] = (fullCounts[sigil] ?? 0) + 1
    }
    for (const t of lex(source)) {
      if (t.type === 'OPERATOR') bump(t.value)
      else if (t.type === 'ANNOTATION' || t.type === 'PARTICLE' || t.type === 'APPOSITION') {
        // For an apposition the lite scanner reads the `~#name` head and then
        // tokenizes `(phrase)` normally, so only the head is folded here.
        const head = t.type === 'APPOSITION' ? t.value.split('(')[0]! : t.value
        for (const ch of head) {
          if ((SPW_OPERATORS as readonly string[]).includes(ch)) bump(ch)
        }
      }
    }

    expect(lite.operators).toEqual(fullCounts)
  })
})

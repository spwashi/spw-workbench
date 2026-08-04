/**
 * ASCII schedule connectors and hash-prose line comments.
 */
import { describe, expect, it } from 'vitest'
import { lex, parse } from '../index'
import type { SequenceNode, StreamNode, ExpressionNode } from '../types'

function significant(source: string) {
  const { tokens, events } = lex(source)
  const errs = events.filter(e => e.type === 'error')
  return {
    errs,
    types: tokens
      .filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF' && t.type !== 'COMMENT')
      .map(t => `${t.type}:${t.value}`),
    comments: tokens.filter(t => t.type === 'COMMENT').map(t => t.value),
  }
}

function findType(node: unknown, type: string): any | null {
  if (!node || typeof node !== 'object') return null
  const obj = node as Record<string, unknown>
  if (obj.type === type) return node
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findType(item, type)
        if (found) return found
      }
    } else if (value && typeof value === 'object') {
      const found = findType(value, type)
      if (found) return found
    }
  }
  return null
}

describe('ASCII schedule connectors', () => {
  it('lexes semicolon as sequential connector', () => {
    const { errs, types } = significant('<< a ; b ; c >>')
    expect(errs).toHaveLength(0)
    expect(types).toEqual([
      'STREAM_OPEN:<<',
      'IDENTIFIER:a',
      'CONNECTOR:;',
      'IDENTIFIER:b',
      'CONNECTOR:;',
      'IDENTIFIER:c',
      'STREAM_CLOSE:>>',
    ])
  })

  it('lexes || as a single parallel connector (not two |)', () => {
    const { errs, types } = significant('<< a || b >>')
    expect(errs).toHaveLength(0)
    expect(types).toEqual([
      'STREAM_OPEN:<<',
      'IDENTIFIER:a',
      'CONNECTOR:||',
      'IDENTIFIER:b',
      'STREAM_CLOSE:>>',
    ])
  })

  it('parses CA-style operator pipelines inside streams', () => {
    const result = parse('<< ~ ; ? ; % ; ! ; * ; ^ >>')
    expect(result.success).toBe(true)
    expect(result.errors ?? []).toHaveLength(0)
    const stream = findType(result.ast, 'Stream') as StreamNode
    expect(stream).not.toBeNull()
    const seq = stream.sequence as SequenceNode
    const expr = seq.expressions[0] as ExpressionNode
    expect(expr.terms.length).toBe(6)
    // n terms ⇒ n-1 connectors
    expect(expr.connectors.map(c => c.value)).toEqual([';', ';', ';', ';', ';'])
  })

  it('parses mixed sequential and parallel schedules', () => {
    const result = parse('<< prep ; ( a || b ) ; seal >>')
    expect(result.success).toBe(true)
    expect(result.errors ?? []).toHaveLength(0)
  })
})

describe('hash-prose line comments', () => {
  it('treats "# Title - subtitle" as a comment, not unexpected -', () => {
    const { errs, comments, types } = significant('# Brace - charge - crawl\n^["x"]{}')
    expect(errs).toHaveLength(0)
    expect(comments[0]).toMatch(/^# Brace/)
    expect(types[0]).toBe('OPERATOR:^')
  })

  it('does not swallow structural hash forms', () => {
    expect(significant('#yes').types).toEqual(['OPERATOR:#', 'IDENTIFIER:yes'])
    expect(significant('#[a]').types[0]).toBe('OPERATOR:#')
    expect(significant('#:layer').types[0]).toBe('PARTICLE:#:layer')
    expect(significant('#>id').types[0]).toMatch(/^PARTICLE/)
  })

  it('parses a theory-style header block without lex errors', () => {
    const src = `# Fixity - brace phrases

#:layer #!semantics

^seed[Demo v:0.1 @profile:Spw.b]
^["ok"]{ x: 1 }
`
    const result = parse(src)
    expect(result.success).toBe(true)
    expect(result.errors ?? []).toHaveLength(0)
  })
})

/**
 * Separators, capsule interiors, and the prose-degradation signal.
 *
 * The taught notation must be the parsed notation: docs/learn/cheat-sheet.md
 * teaches `& => {&} => {&[#label]} => {&<#tag>_label}`, so that ladder parses
 * as four sibling steps joined by `=>` rather than degrading to prose.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser'
import type { SequenceNode, CapsuleNode } from '../types'

function topSequence(source: string): SequenceNode {
  const result = parse(source)
  expect(result.success).toBe(true)
  const expr = result.ast!.expression
  expect(expr.type).toBe('Sequence')
  return expr as unknown as SequenceNode
}

function findNode(node: unknown, type: string): any | null {
  if (!node || typeof node !== 'object') return null
  const obj = node as Record<string, unknown>
  if (obj.type === type) return node
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findNode(item, type)
        if (found) return found
      }
    } else if (value && typeof value === 'object') {
      const found = findNode(value, type)
      if (found) return found
    }
  }
  return null
}

describe('sequence separators', () => {
  it('joins steps with => as siblings', () => {
    const seq = topSequence('a => b => c')
    expect(seq.expressions).toHaveLength(3)
    expect(seq.separators?.map(s => s?.value)).toEqual(['=>', '=>'])
  })

  it('treats , and => uniformly', () => {
    const comma = topSequence('a, b')
    const arrow = topSequence('a => b')
    expect(comma.expressions).toHaveLength(arrow.expressions.length)
    expect(comma.separators?.map(s => s?.value)).toEqual([','])
    expect(arrow.separators?.map(s => s?.value)).toEqual(['=>'])
  })

  it('records juxtaposition as an absent separator', () => {
    const seq = topSequence('a b')
    expect(seq.expressions).toHaveLength(2)
    expect(seq.separators).toEqual([undefined])
  })

  it('keeps connectors inside one expression, not as separators', () => {
    // `->` chains within a single Expression; only `,` and `=>` split steps.
    const seq = topSequence('a -> b')
    expect(seq.expressions).toHaveLength(1)
  })

  it('parses the taught confluence ladder as four steps', () => {
    const seq = topSequence('& => {&} => {&[#label]} => {&<#tag>_label}')
    expect(seq.expressions).toHaveLength(4)
    expect(seq.separators?.map(s => s?.value)).toEqual(['=>', '=>', '=>'])
  })

  it('carries => inside stream bounds', () => {
    const stream: any = findNode(topSequence('<<a => b>>'), 'Stream')
    expect(stream).not.toBeNull()
    expect(stream.sequence.expressions).toHaveLength(2)
    expect(stream.sequence.separators.map((s: any) => s?.value)).toEqual(['=>'])
  })
})

describe('capsule interiors', () => {
  it('keeps atom channels on tag/channel', () => {
    const capsule = findNode(topSequence('<scent>'), 'Capsule') as CapsuleNode
    expect(capsule.tag?.value).toBe('scent')
    expect(capsule.interior).toBeUndefined()
  })

  it.each([
    ['<X@1>'],
    ['<X:1>'],
    ['<scheduled Record>'],
    ['<Module|null>'],
    ['<Record?>'],
  ])('accepts a richer interior: %s', source => {
    const capsule = findNode(topSequence(source), 'Capsule') as CapsuleNode | null
    expect(capsule).not.toBeNull()
    expect(capsule!.interior?.expressions.length).toBeGreaterThan(0)
  })

  it('leaves the <> concept operator alone', () => {
    const seq = topSequence('a <> b')
    expect(findNode(seq, 'Capsule')).toBeNull()
  })
})

describe('sigil arms in frames', () => {
  it.each([['[#label]'], ['[=bias]'], ['[#label, b]']])('parses %s as a frame', source => {
    expect(findNode(topSequence(source), 'Frame')).not.toBeNull()
  })

  it('does not let an inline payload eat its enclosing bound', () => {
    // `#` takes a line payload; without a stop at `]` the frame never closed.
    const frame: any = findNode(topSequence('&[#label]'), 'Frame')
    expect(frame).not.toBeNull()
    expect(frame.content).toHaveLength(1)
  })
})

describe('prose degradation is reported', () => {
  it('warns with a position when structured parsing gives up', () => {
    const result = parse('ordinary prose line.\n& [unclosed')
    const degraded = result.warnings.filter(
      w => (w.data as { code?: string }).code === 'prose-degradation',
    )
    expect(degraded).toHaveLength(1)
    expect(degraded[0]!.position.line).toBe(2)
    expect((degraded[0]!.data as { message: string }).message).toMatch(/degraded to prose/)
  })

  it('stays silent on surfaces that parse', () => {
    const result = parse('& => {&}')
    expect(
      result.warnings.filter(w => (w.data as { code?: string }).code === 'prose-degradation'),
    ).toHaveLength(0)
  })
})

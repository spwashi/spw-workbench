import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import type { SequenceNode } from '../types'

function degradations(source: string) {
  return parse(source).warnings.filter(
    warning => (warning.data as { code?: string }).code === 'prose-degradation',
  )
}

function proseChunkTexts(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const own = record.type === 'ProseChunk' && typeof record.text === 'string'
    ? [record.text]
    : []
  return own.concat(
    Object.values(record).flatMap(child => {
      if (Array.isArray(child)) return child.flatMap(proseChunkTexts)
      return proseChunkTexts(child)
    }),
  )
}

describe('indentation-bounded block scalars', () => {
  it('keeps structured-looking content as one prose leaf', () => {
    const source = [
      '^["examples"]{',
      ' first: |',
      '  alpha',
      '  ^["shape"]{ remains: text }',
      ' second: "tail"',
      '}',
      '^["next"]{ ok: true }',
    ].join('\n')

    const result = parse(source)
    expect(result.success).toBe(true)
    expect(degradations(source)).toHaveLength(0)
    expect(proseChunkTexts(result.ast)).toContain('alpha\n^["shape"]{ remains: text }')
    expect(JSON.stringify(result.ast)).toContain('"second"')
    expect((result.ast!.expression as SequenceNode).expressions).toHaveLength(2)
  })

  it('stops at a sibling key with the same indentation', () => {
    const source = [
      'outer: .{',
      ' block: |',
      '  one',
      '',
      '  two',
      ' sibling: 2',
      '}',
      'tail: 3',
    ].join('\n')

    const result = parse(source)
    expect(degradations(source)).toHaveLength(0)
    expect(proseChunkTexts(result.ast)).toContain('one\n\ntwo')
    expect(JSON.stringify(result.ast)).toContain('"sibling"')
    expect(JSON.stringify(result.ast)).toContain('"tail"')
  })

  it('leaves an inline pipe as an expression connector', () => {
    const result = parse('a | b')
    expect(degradations('a | b')).toHaveLength(0)
    expect(proseChunkTexts(result.ast)).toHaveLength(0)
  })
})

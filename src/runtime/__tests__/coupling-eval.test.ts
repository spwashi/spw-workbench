/**
 * Runtime boundaries for the structural coupling projection.
 *
 * Seed records form/kind/occupancy without assigning physical charge or a new
 * evaluation law. Runtime uses the tag only where an existing ONF collision
 * needs disambiguation (Stream currently borrows Wonder's `?` sigil).
 */
import { describe, expect, it } from 'vitest'
import { normalizeToONF, parse } from '@spwashi/spw-seed'
import { interpretSeed } from '@spwashi/spw-runtime'

function parseSource(source: string) {
  const result = parse(source)
  expect(result.success).toBe(true)
  return result.ast as any
}

function interpretSource(source: string) {
  return interpretSeed(parseSource(source), { captureTrace: false })
}

describe('structural coupling projection', () => {
  it.each([
    ['[]', 'frame', '[]'],
    ['{}', 'body', '{}'],
    ['()', 'scope', '()'],
  ])('records empty %s as a boundary without inventing a runtime unit', (source, kind, surface) => {
    const { onf, value } = interpretSource(source)

    expect(onf.frames.coupling).toMatchObject({
      kind,
      form: 'boundary',
      occupancy: 'empty',
      payload: 'void',
      surface,
    })
    expect(onf.frames.coupling).not.toHaveProperty('charge')
    expect(value).toBeNull()
  })

  it('preserves the established value reduction for inhabited boundaries', () => {
    expect(interpretSource('{x}').value).toBe('x')
    expect(interpretSource('(x)').value).toBe('x')
  })

  it('uses the Stream boundary tag to avoid Wonder conditional evaluation', () => {
    const empty = interpretSource('<<>>')
    expect(empty.onf.frames.coupling).toMatchObject({
      kind: 'stream',
      form: 'boundary',
      occupancy: 'empty',
    })
    expect(empty.value).toEqual([])

    const inhabited = interpretSource('<<x>>')
    expect(inhabited.value).toEqual(['x'])
  })

  it('treats zero-operand <> as an operator, not an empty boundary', () => {
    const { onf, value } = interpretSource('<>')

    expect(onf.frames.reg).toBe('couple')
    expect(onf.frames.coupling).toEqual({
      kind: 'couple',
      form: 'operator',
      surface: '<>',
      arity: 0,
    })
    expect(value).toEqual([])
  })

  it('classifies an interior Act independently of boundary kind', () => {
    const actOnf = normalizeToONF(parseSource('{!}'))
    const termOnf = normalizeToONF(parseSource('{x}'))

    expect(actOnf.frames.coupling).toMatchObject({
      form: 'boundary',
      payload: 'act',
      actPlacement: 'interior',
    })
    expect(termOnf.frames.coupling).toMatchObject({
      form: 'boundary',
      payload: 'term',
    })
  })
})

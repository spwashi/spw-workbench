/**
 * Runtime boundaries for the structural coupling projection.
 *
 * Seed records form/kind/occupancy without assigning physical charge or a new
 * evaluation law. Runtime uses the tag only where an existing ONF collision
 * needs disambiguation (Stream currently borrows Wonder's `?` sigil).
 */
import { describe, expect, it } from 'vitest'
import { $register, normalizeToONF, parse } from '@spwashi/spw-seed'
import {
  couplingDescriptorForSurface,
  couplingKindForSurface,
  descriptorForKey,
  interpretSeed,
  RegisterBank,
  Substrate,
} from '@spwashi/spw-runtime'

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

  it('evaluates framed <> operands and exposes the exact relation edge', () => {
    const substrate = new Substrate('coupling-test')
    const registers = new RegisterBank({}, substrate)
    const result = interpretSeed(
      parseSource('<>["a","b"]'),
      { captureTrace: false },
      registers,
    )

    expect(result.onf.args).toHaveLength(2)
    expect(result.onf.frames.coupling).toMatchObject({
      kind: 'couple',
      form: 'operator',
      arity: 2,
    })
    expect(result.value).toEqual(['"a"', '"b"'])
    expect(result.registers.couplingEdges['"a"']).toEqual(['"b"'])
    expect(result.registers.couplingEdges['"b"']).toEqual(['"a"'])
    expect(substrate.peek()).toContainEqual(expect.objectContaining({
      kind: 'couple',
      key: '"a"',
      coupledWith: '"b"',
    }))
  })

  it('keeps relation affinity distinct from capsule boundaries', () => {
    expect(descriptorForKey('<>')).toEqual({
      name: 'Coupling',
      accessMode: 'relational',
      containerAffinity: 'relation',
    })
    expect(descriptorForKey('<').containerAffinity).toBe('capsule')
  })

  it('does not treat inherited object properties as registered surfaces', () => {
    expect(couplingKindForSurface('__proto__')).toBeUndefined()
    expect(couplingDescriptorForSurface('toString')).toBeUndefined()
    expect(descriptorForKey('toString')).toEqual({
      name: 'Register toString',
      accessMode: 'context',
      containerAffinity: 'void',
    })
  })

  it('keeps exact adjacency immutable and derived density current', () => {
    const bank = new RegisterBank()
    const a = $register`a`
    const b = $register`b`
    const c = $register`c`

    bank.couple(a, b)
    bank.couple(a, b)
    expect(bank.coupledKeys(a)).toEqual([b])
    expect(bank.coupledKeys(b)).toEqual([a])

    const beforePopulationGrowth = bank.couplingOf(a)
    bank.set(c, 3, { source: 'test' })
    expect(bank.couplingOf(a)).toBeLessThan(beforePopulationGrowth!)
    expect(bank.materialize(a)?.coupling).toBe(bank.couplingOf(a))

    const snapshot = bank.snapshot()
    snapshot.couplingEdges[a].push(c)
    expect(bank.coupledKeys(a)).toEqual([b])
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

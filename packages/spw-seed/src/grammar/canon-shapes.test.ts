/**
 * Authoring shapes the canon already uses that the grammar did not read.
 *
 * Each case here degraded a whole surface to prose before the parser learned
 * it. They are grouped by the reason the parse gave up, not by file.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser'

function degradations(source: string) {
  return parse(source).warnings.filter(
    w => (w.data as { code?: string }).code === 'prose-degradation',
  )
}

function expectStructured(source: string) {
  const result = parse(source)
  expect(result.success).toBe(true)
  expect(degradations(source)).toHaveLength(0)
  expect(result.ast!.expression.type).toBe('Sequence')
}

describe('header lines own their line', () => {
  it('keeps a parenthetical in a # header', () => {
    // `~` is not payload punctuation, so the payload used to stop mid-line and
    // leave the `)` to stall the sequence.
    expectStructured('# Phase 1 (?~): probe into superposition.\n\n^"phase"{\n token: "?~"\n}')
  })

  it('still stops an inline payload at its enclosing bound', () => {
    expectStructured('&[#label]')
    expectStructured('{ #note }')
  })

  it('does not treat a mid-expression # as a header', () => {
    expectStructured('^["x"]{\n a: 1\n}')
  })
})

describe('backtick phrases are literals', () => {
  it.each([
    ['`x`'],
    ['`={ y }`'],
    ['`=[depth]{ deep shallow }`'],
    ['reflexive: `={ ~"template.spw" }`'],
  ])('reads %s as a literal', source => {
    expectStructured(source)
  })

  it('reads a block of phrase-valued bindings', () => {
    expectStructured(
      '^"forms"{\n reflexive: `={ ~"template.spw" }`\n axial: `=[depth]{ deep shallow }`\n}',
    )
  })
})

describe('bounded path references', () => {
  it.each([
    ['~<../vibes/index.spw>'],
    ['~<./anatomy.spw>'],
    ['~<../../metaphysics/index.spw>'],
  ])('reads %s as a path ref', source => {
    expectStructured(source)
    const found = JSON.stringify(parse(source).ast)
    expect(found).toContain('"PathRef"')
  })

  it('keeps the quoted form working', () => {
    expectStructured('~"../vibes/index.spw"')
  })

  it('still rejects an unbounded bare path in low context', () => {
    // The capsule bounds are what make the unquoted form unambiguous; without
    // them the high-context requirement stands.
    expect(degradations('~../vibes/index.spw').length).toBeGreaterThan(0)
  })

  it('does not overfit bare ~<name> as PathRef (membrane potential)', () => {
    const found = JSON.stringify(parse('~<consequence>').ast)
    expect(found).not.toContain('"type":"PathRef"')
    expect(found).toContain('"type":"Operation"')
    expect(found).toContain('"type":"Capsule"')
  })
})

describe('chains stay on their line', () => {
  it('reads a trailing path separator as the end of the value', () => {
    expectStructured('^["meta"]{\n @location: docs/\n @description: "Project docs"\n}')
  })

  it('does not let one bullet reach into the next', () => {
    expectStructured('.. stage: "a named pass"\n.. precipitate: "what falls out"')
  })

  it('still chains within a line', () => {
    const seq: any = parse('a -> b -> "c"').ast!.expression
    expect(seq.expressions).toHaveLength(1)
    expect(seq.expressions[0].connectors).toHaveLength(2)
  })
})

describe('stream entries', () => {
  it('reads >> at line start as an entry marker', () => {
    expectStructured('>>[0] invent  — what surfaces exist?')
    expectStructured('^["loop"]{\n >>[0] invent\n >>[1] map\n}')
  })

  it('still closes a stream from inside one', () => {
    expectStructured('<<a b>>')
    expectStructured('<<\n a\n>>')
    expectStructured('<<a>>@sink')
  })

  it('reads a plan stream entry', () => {
    expectStructured('>>[2026-07-27 13:15] observe — plan-ecology sweep found stale paths')
  })
})

describe('frame items separate by juxtaposition', () => {
  it('reads one item per line without commas', () => {
    expectStructured('^"phrase_bank"{\n materials: [\n  "ember glow"\n  "shared table"\n ]\n}')
  })

  it('reads sigil arms', () => {
    expectStructured('never_implies: [\n #conquest_hall\n #throne_room_default\n]')
  })
})

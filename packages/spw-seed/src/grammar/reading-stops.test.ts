/**
 * A structured read should reach what a writer plainly wrote, and say exactly
 * where it stopped when it cannot. Assertions read the tree, not completeness:
 * an operator that swallows its line as prose also reports a complete parse.
 */
import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import type { OperationNode, ParseEvent, SequenceNode } from '../types'

const prose = (source: string) => parse(source, { lexProfile: 'prose' })

function firstOperation(source: string): OperationNode {
  const ast = prose(source).ast!
  const sequence = ast.expression as SequenceNode
  const first = sequence.type === 'Sequence' ? sequence.expressions[0]! : sequence
  return (first as unknown as { terms: OperationNode[] }).terms[0]!
}

const stopWarning = (source: string): ParseEvent =>
  prose(source).warnings.find(w => (w.data as { code?: string }).code === 'prose-degradation')!

describe('a name written against ? or # opens a real block', () => {
  it.each([
    ['?"probes"[\n  "a"\n  "b"\n]\n^next{ a: 1 }\n', 'frame'],
    ['#"notes"[\n  "a"\n]\n^next{ a: 1 }\n', 'frame'],
    ['?<probes>[\n  "a"\n]\n^next{ a: 1 }\n', 'frame'],
    ['?"probes"{\n  a: 1\n}\n^next{ a: 1 }\n', 'body'],
    ['#"notes"{\n  a: 1\n}\n^next{ a: 1 }\n', 'body'],
    ['#<notes>{\n  a: 1\n}\n^next{ a: 1 }\n', 'body'],
  ] as const)('%j reads across lines', (source, part) => {
    const result = prose(source)
    expect(result.completeness.proseFallback).toBe(false)
    const op = firstOperation(source)
    expect(op.type).toBe('Operation')
    expect(op.linePayload).toBeUndefined()
    expect(op.subject).toBeDefined()
    expect(op[part]).toBeDefined()
  })

  it('reads the same block on one line and across lines', () => {
    const one = firstOperation('?"probes"["a", "b"]\n')
    const many = firstOperation('?"probes"[\n  "a",\n  "b"\n]\n')
    expect(one.frame!.content).toHaveLength(2)
    expect(many.frame!.content).toHaveLength(2)
  })

  it.each([
    '?"is this the question"\n',
    '#"a heading in quotes"\n',
    '?"spaced" [a]\n',
    '?<only a capsule>\n',
  ])('leaves %j as it was', source => {
    const op = firstOperation(source)
    expect(op.frame).toBeUndefined()
    expect(op.body).toBeUndefined()
  })

  it('keeps a mid-line capsule as the medial capsule it was', () => {
    const ast = prose('k: ?<a>[x]\n').ast!
    expect(JSON.stringify(ast)).toContain('"placement":"medial"')
  })

  it('gives the name back when the block does not read', () => {
    const op = firstOperation('?"a"[ \u2014 b ]\n')
    expect(op.frame).toBeUndefined()
    expect(op.subject).toBeUndefined()
    expect(op.linePayload).toBeDefined()
  })
})

describe('prose text stands in a capsule-led block', () => {
  it.each([
    "~<r>{ the maker's hand }\n",
    '~<r>{ the maker’s hand }\n',
    '~<r>{ warm — good }\n',
    '~<r>{ warm – good }\n',
    '~<r>{ warm · good }\n',
    '~<r>{ and then… }\n',
    '~<r>{ a Poincar\u00E9 disk }\n',
    '~<r>{ Erd\u0151s\u2013R\u00E9nyi }\n',
    '~<r>{ “warm” }\n',
  ])('%j reads whole and keeps its text', source => {
    const result = prose(source)
    expect(result.completeness.proseFallback).toBe(false)
    expect(result.warnings).toHaveLength(0)
    const op = firstOperation(source)
    expect(op.body).toBeDefined()
    expect(JSON.stringify(op.body)).toContain('ProseChunk')
  })

  it('carries the word a mark is written against', () => {
    const op = firstOperation('~<r>{ rock’n’roll }\n')
    expect(JSON.stringify(op.body)).toContain('’n’roll')
  })

  it('reaches sibling blocks after the prose', () => {
    const ast = prose("~<r>{ the maker's hand }\n^next{ a: 1 }\n").ast!
    expect((ast.expression as SequenceNode).expressions).toHaveLength(2)
  })

  it.each([
    ['%x[it\'s]\n', 'a frame holds values'],
    ['^a{ %x[—] }\n', 'a frame inside a body'],
    ['^x{ a: -4 }\n', 'a dropped sign'],
    ['^a{ ^x\u{1F370}{ b: 1 } }\n', 'an emoji in a label'],
    ['^x{ a+b }\n', 'a bare plus'],
    ['^x{ a: \u20134 }\n', 'a dash where a value stands'],
    ['^x{ a: 4\u20136 }\n', 'a range written with a dash'],
    ['^x{ a: caf\u00E9 }\n', 'a value that would be cut short'],
    ["^x{ a: 'two words' }\n", 'single quotes around a value'],
    ['=tune{ =aim_step[0.13]\u2019 }\n', 'a stray mark after a rule'],
    ["~<r>{ ^x{ it's } }\n", 'a record inside a prose block'],
    ['^a{ ^caf\u00E9{ b: 1 } }\n', 'an accent in a label'],
  ])('%j still stops (%s)', source => {
    expect(prose(source).completeness.proseFallback).toBe(true)
  })

  it('leaves the default profile alone', () => {
    expect(parse('~<r>{ it’s }\n').errors.length).toBeGreaterThan(0)
  })
})

describe('a fallback says where the read stopped', () => {
  it('names the token nothing could take, not the frame it fell back from', () => {
    const warning = stopWarning('^first{ a: 1 }\n^second{\n  a: 1\n  b: -4\n}\n')
    expect(warning.position.line).toBe(4)
    const data = warning.data as { found: string; message: string; stop: { value: string; opener: { position: { line: number } } } }
    expect(data.found).toBe('TEXT')
    expect(data.stop.value).toBe('-')
    expect(data.stop.opener.position.line).toBe(2)
    expect(data.message).toContain('line 4')
  })

  it('names the bracket still owed at the end of a surface', () => {
    const source = '^kept{ a: 1 }\n^open{ a: 1\n^next{ b: 2 }\n'
    const { completeness } = prose(source)
    expect(completeness.stop!.found).toBe('EOF')
    expect(completeness.stop!.unclosed).toMatchObject({ value: '{', position: { line: 2 } })
    expect((stopWarning(source).data as { message: string }).message).toContain('still open')
  })

  it('puts the stop on the receipt, and only on a fallback', () => {
    expect(prose('%x[-4]\n').completeness.stop).toMatchObject({ found: 'TEXT', value: '-' })
    expect(prose('^x{ a: 1 }\n').completeness.stop).toBeUndefined()
  })
})

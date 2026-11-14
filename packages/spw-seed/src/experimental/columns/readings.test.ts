import { describe, expect, it } from 'vitest'
import { canonicalize } from '../../index'
import { columnsFromJson, columnsToJson, parseColumns } from './parse-columns'
import {
  compareReadings,
  driftedLines,
  readingsOf,
  readingsOfColumns,
  type SurfaceReadings,
} from './readings'

const read = (source: string): SurfaceReadings => {
  const readings = readingsOf(source)
  if (!readings) throw new Error('no tree')
  return readings
}

describe('line readings', () => {
  it('tells a word taken into a line-final capsule from the same word standing alone', () => {
    // A line-final <…> takes the next line's head: two is read into the capsule, not as its own expression.
    expect(read('one<tag>\ntwo').lines['2']).not.toBe(read('one\ntwo').lines['2'])
  })

  it('reports a node that moved to another parent on its own line', () => {
    expect(read('x {\n  two\n}').lines['2']).not.toBe(read('x\ntwo').lines['2'])
  })

  it('reports a change deep in a body on that line alone, not on the lines around it', () => {
    const before = read('a {\n  b {\n    c\n  }\n}')
    const after = read('a {\n  b {\n    d\n  }\n}')
    expect(driftedLines(before, after)).toEqual([3])
  })

  it('keeps a reading through indentation, spacing and comments', () => {
    const plain = read('a {\n  b {\n    c\n  }\n}')
    expect(driftedLines(plain, read('a {\n        b   {\n    c\n  }\n}'))).toEqual([])
    expect(driftedLines(plain, read('a {\n  b { # a note\n    c\n  }\n}'))).toEqual([])
  })

  it('reads a set the same whichever separator is written between its items', () => {
    const comma = read('#[a, b, c]').lines['1']
    expect(read('#[a ; b ; c]').lines['1']).toBe(comma)
    expect(read('#[a b c]').lines['1']).toBe(comma)
    expect(read('#[a, b, c,]').lines['1']).toBe(comma)
  })

  it('still tells an operator, a word and a container apart', () => {
    const base = read('^name{ a }').lines['1']
    expect(read('~name{ a }').lines['1']).not.toBe(base)
    expect(read('^other{ a }').lines['1']).not.toBe(base)
    expect(read('^name[ a ]').lines['1']).not.toBe(base)
  })

  it('gives the formatted text the readings of the text it came from', () => {
    // Reindented and trimmed; the formatter's blank-line collapse moves lines, so the text check catches it instead.
    const source = '^cache{\n status:"open"   \n\t\tnext: "one move"\n}\nx = #[a,b]\n'
    const formatted = canonicalize(source, { indentBraces: true }).source
    expect(formatted).not.toBe(source)
    expect(formatted.split('\n').length).toBe(source.split('\n').length)
    expect(driftedLines(read(source), read(formatted))).toEqual([])
  })

  it('reads the same from columns another host was sent', () => {
    const source = '^name{ a: #[b, c] }\n?[q]: "why"'
    const tree = parseColumns(source)!
    expect(readingsOfColumns(columnsFromJson(columnsToJson(tree)), source)).toEqual(read(source))
  })
})

describe('compareReadings', () => {
  it('says same, drift with its lines, text changed, new and gone', () => {
    const a = read('a\nb')
    const b = { ...a, lines: { ...a.lines, '2': '00000000' } }
    const edited = read('a\nc')
    const drift = compareReadings(
      { same: a, drift: a, edited: a, gone: a },
      { same: a, drift: b, edited, new: a },
    )
    expect(drift).toEqual([
      { file: 'drift', status: 'drift', lines: [2] },
      { file: 'edited', status: 'text_changed', lines: [] },
      { file: 'gone', status: 'gone', lines: [] },
      { file: 'new', status: 'new', lines: [] },
      { file: 'same', status: 'same', lines: [] },
    ])
  })
})

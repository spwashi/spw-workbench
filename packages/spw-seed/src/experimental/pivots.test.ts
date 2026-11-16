import { describe, expect, it } from 'vitest'
import { readLine } from '../line'
import { ACT_MARKS, PIVOT_NAMES, pivotReadCounts, pivotsOf, readFragments, splitMarks } from './pivots'

describe('fragments', () => {
  it('splits a word into the marks before it, its name and the marks after it, nearest after first', () => {
    expect(splitMarks('=foo')).toEqual({ before: ['='], name: 'foo', after: [] })
    expect(splitMarks('foo=')).toEqual({ before: [], name: 'foo', after: ['='] })
    expect(splitMarks('~*foo*~')).toEqual({ before: ['~', '*'], name: 'foo', after: ['*', '~'] })
  })

  it('reads each name of =foo@(<bar>) with what surrounds it, and the bond between them with both attachments open', () => {
    const read = readFragments('=foo@(<bar>)')
    expect(read.fragments).toEqual([
      { before: ['='], name: 'foo', after: [], walls: [], sides: ['left'], slot: 'word' },
      { before: [], name: 'bar', after: [], walls: ['scene', 'concept'], sides: ['right'], slot: 'word' },
    ])
    expect(read.bonds).toEqual([{ mark: '@', bond: 'perspective', spaced: false, sides: [], attaches: ['after_left', 'before_right'] }])
    // A spaced bond touches neither side, so it lists no attachment.
    expect(readFragments('=foo @ bar').bonds[0]!.attaches).toEqual([])
  })

  it('reads the rooms a story consumer writes', () => {
    expect(readFragments('=(oath_stone)@boof').fragments.map((f) => [f.name, f.walls, f.sides])).toEqual([
      ['oath_stone', ['scene'], ['left']],
      ['boof', [], ['right']],
    ])
    expect(readFragments('~<long_alley>@the_stranger').fragments.map((f) => f.name)).toEqual(['long_alley', 'the_stranger'])
  })
})

describe('pivots', () => {
  const pivots = pivotsOf('=foo@(<bar>)')
  const byKind = (kind: string) => pivots.filter((p) => p.kind === kind)

  it('offers the side, a mark turned each way, a wall, each other bond, the spacing and the exchange', () => {
    expect(byKind('side').map((p) => p.line)).toEqual(['foo=@(<bar>)'])
    expect(byKind('mark').map((p) => p.line).sort()).toEqual(['*foo@(<bar>)', '@foo@(<bar>)'])
    expect(byKind('walls').map((p) => p.line)).toEqual(['=foo@([bar])'])
    expect(byKind('bond').map((p) => p.line)).toEqual(['=foo~(<bar>)', '=foo^(<bar>)', '=foo&(<bar>)'])
    expect(byKind('spacing').map((p) => p.line)).toEqual(['=foo @ (<bar>)'])
    expect(byKind('exchange').map((p) => p.line)).toEqual(['(<bar>)@=foo'])
  })

  it('reads every pivot back three ways and marks one the line reader cannot read as not read', () => {
    for (const p of pivots) {
      expect(p.line).not.toBe('=foo@(<bar>)')
      expect(p.status).toBe(p.read.line ? 'read' : 'not_read')
      if (p.status === 'read') expect(readLine(p.line).rest).toBe('')
    }
    // Moving = after foo reads in the line reader; the parser splits it and the spoken reader does not name the mark.
    const side = byKind('side')[0]!
    expect(side.read).toEqual({ line: true, parser: false, spoken: false })
    expect(side.from).toEqual({ before: ['='] })
    expect(side.to).toEqual({ after: ['='] })
  })

  it('turns marks along the order a host supplies, and offers none for a mark outside it', () => {
    const ring = ['~', '#', '.', '?', '!', '*', '&', '@', '^']
    expect(pivotsOf('~foo', { order: ring }).filter((p) => p.kind === 'mark').map((p) => p.line).sort()).toEqual(['#foo', '^foo'])
    expect(pivotsOf('=foo', { order: ring }).filter((p) => p.kind === 'mark')).toEqual([])
    expect(pivotsOf('=foo').filter((p) => p.kind === 'mark').map((p) => p.line).sort()).toEqual(['*foo', '@foo'])
    expect(ACT_MARKS).toHaveLength(12)
  })

  it('counts each reader per kind, the acceptance counts for postfix and chains', () => {
    const counts = pivotReadCounts(pivots)
    expect(counts.side).toEqual({ total: 1, line: 1, parser: 0, spoken: 0 })
    expect(counts.bond).toEqual({ total: 3, line: 3, parser: 3, spoken: 3 })
  })

  it('names nothing in sentences: words come from a table a host replaces', () => {
    expect(PIVOT_NAMES.marks['=']).toBe('configuration')
    expect(PIVOT_NAMES.walls.concept).toBe('concept')
    expect(PIVOT_NAMES.bonds['@']).toBe('perspective')
    // A host's own word for a mark changes what the spoken read-back looks for, never the pivots offered.
    const named = pivotsOf('=foo@(<bar>)', {}, { ...PIVOT_NAMES, marks: { ...PIVOT_NAMES.marks, '~': 'deferral' } })
    expect(named.map((p) => p.line)).toEqual(pivots.map((p) => p.line))
  })

  it('never throws and never returns the line it was given, over lines of every slot and bond', () => {
    const lines = ['x', '=x', 'x=', '~x[mode]', 'x{a, b}', '(x)', '<x>', '@x', 'a@b', 'a ~ b', 'a^b&c', '=foo@(<bar>)', '!hold[x]{y}(z)<w>', '#tag', '~*x']
    for (const line of lines) {
      for (const p of pivotsOf(line)) {
        expect(p.line, line).not.toBe(line)
        expect(['read', 'not_read']).toContain(p.status)
      }
    }
  })
})

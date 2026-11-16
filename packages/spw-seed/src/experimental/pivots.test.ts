import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readLine } from '../line'
import { isKeySpan } from './key-span'
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
      { before: ['='], name: 'foo', after: [], walls: [], outside: { before: [], after: [] }, sides: ['left'], slot: 'word' },
      { before: [], name: 'bar', after: [], walls: ['scene', 'concept'], outside: { before: [], after: [] }, sides: ['right'], slot: 'word' },
    ])
    expect(read.bonds).toEqual([{ mark: '@', bond: 'perspective', spaced: false, sides: [], attaches: ['after_left', 'before_right'] }])
    // A spaced bond touches neither side, so it lists no attachment.
    expect(readFragments('=foo @ bar').bonds[0]!.attaches).toEqual([])
  })

  it('reads the rooms a story consumer writes, with a mark outside the walls kept on the name they hold', () => {
    expect(readFragments('=(oath_stone)@boof').fragments.map((f) => [f.name, f.walls, f.outside, f.sides])).toEqual([
      ['oath_stone', ['scene'], { before: ['='], after: [] }, ['left']],
      ['boof', [], { before: [], after: [] }, ['right']],
    ])
    // The line reader reads (oath_stone)= with the same word and slot; its spans tell the side.
    expect(readFragments('(oath_stone)=').fragments[0]!.outside).toEqual({ before: [], after: ['='] })
    expect(readFragments('~<long_alley>@the_stranger').fragments.map((f) => [f.name, f.outside.before])).toEqual([['long_alley', ['~']], ['the_stranger', []]])
  })

  it('reads each part of a body as its own fragment', () => {
    expect(readFragments('$runway{months, team}').fragments.map((f) => [f.name, f.walls])).toEqual([['runway', []], ['months', ['body']], ['team', ['body']]])
  })
})

describe('pivots', () => {
  const pivots = pivotsOf('=foo@(<bar>)')
  const byKind = (kind: string) => pivots.filter((p) => p.kind === kind)

  it('offers the side, a mark turned each way, a wall, each other bond, the spacing and the exchange', () => {
    expect(byKind('side').map((p) => p.line)).toEqual(['foo=@(<bar>)'])
    expect(byKind('mark').map((p) => p.line).sort()).toEqual(['*foo@(<bar>)', '@foo@(<bar>)'])
    expect(byKind('walls').map((p) => p.line)).toEqual(['=foo@([bar])'])
    expect(byKind('attach').map((p) => [p.line, p.to.attaches, p.status])).toEqual([
      ['=foo@ (<bar>)', 'after_left', 'read'],
      ['=foo @(<bar>)', 'before_right', 'not_read'],
    ])
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

  it('moves and turns a mark outside the walls, and on a story consumer\'s line the postfix form reads in all three readers', () => {
    const story = pivotsOf('=(oath_stone)@boof')
    const side = story.find((p) => p.kind === 'side')!
    expect(side.line).toBe('(oath_stone)=@boof')
    expect(side.from).toEqual({ before: ['='], around: 'walls' })
    expect(side.read).toEqual({ line: true, parser: true, spoken: true })
    expect(story.filter((p) => p.kind === 'mark').map((p) => p.line).sort()).toEqual(['*(oath_stone)@boof', '@(oath_stone)@boof'])
    // Back the other way.
    expect(pivotsOf('(oath_stone)=@boof').find((p) => p.kind === 'side')!.line).toBe('=(oath_stone)@boof')
  })

  it('loses no name: a wall never turns into a pair its reading already holds', () => {
    expect(pivotsOf('!hold[x]{y}(z)<w>').filter((p) => p.kind === 'walls')).toEqual([])
    expect(pivotsOf('kept~[pace]{quiet}').filter((p) => p.kind === 'walls').map((p) => p.line)).toEqual(['kept~{quiet}<pace>', 'kept~[pace]<quiet>'])
    const names = (line: string) => readFragments(line).fragments.map((f) => f.name).sort()
    for (const line of ['!hold[x]{y}(z)<w>', 'kept~[pace]{quiet}', '$runway{months, team}', '=(oath_stone)@boof', '=foo@(<bar>)']) {
      for (const p of pivotsOf(line).filter((q) => q.status === 'read')) expect(names(p.line), p.line).toEqual(names(line))
    }
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
    // A host's own words change nothing the readers find: the spoken reader is asked in the same words.
    const named = pivotsOf('=foo@(<bar>)', {}, { ...PIVOT_NAMES, marks: { ...PIVOT_NAMES.marks, '=': 'setting', '@': 'view' }, bonds: { ...PIVOT_NAMES.bonds, '~': 'deferral' } })
    expect(named.map((p) => [p.line, p.read])).toEqual(pivots.map((p) => [p.line, p.read]))
  })

  it('counts a turned mark in the spoken read-back as a mark, not as the bond beside it', () => {
    // @foo@(<bar>) says perspective twice, once as a mark and once as a bond; the turn is read back only when the mark is said.
    const turned = pivots.find((p) => p.line === '@foo@(<bar>)')!
    expect(turned.read.spoken).toBe(true)
    const side = byKind('side')[0]!
    expect(side.read.spoken).toBe(false)
  })

  it('reads a key without the colon when asked, and leaves the option off identical', () => {
    const line = '%root: 293.66'
    expect(pivotsOf(line)).toEqual(pivotsOf(line, { keys: false }))
    expect(pivotsOf(line).map((p) => p.line)).toEqual(['root:% 293.66', '!root: 293.66', '$root: 293.66'])
    const keyed = pivotsOf(line, { keys: true })
    expect(readFragments(line, true).fragments[0]).toMatchObject({ name: 'root', before: ['%'] })
    expect(keyed.map((p) => p.line)).toContain('root%: 293.66')
    expect(keyed.map((p) => p.line)).not.toContain('root:% 293.66')
    const turned = keyed.filter((p) => p.line === '!root: 293.66' || p.line === '$root: 293.66')
    expect(turned).toHaveLength(2)
    expect(turned.every((p) => p.read.line && p.read.parser && p.read.spoken)).toBe(true)
  })

  it('does not turn one character of a particle, or the colon into an equals', () => {
    const lines = pivotsOf('~#goal: one', { keys: true }).map((p) => p.line)
    expect(lines).not.toContain('~.goal: one')
    expect(lines).not.toContain('~@goal: one')
    expect(lines.every((item) => item.includes(':'))).toBe(true)
    expect(isKeySpan('~#goal:', 0, 7)).toBe(true)
    expect(isKeySpan(':', 0, 1)).toBe(false)
  })

  it('keeps the option off byte-identical over 500 lines of theory and canon', () => {
    const files = execFileSync('git', ['ls-files', 'docs/theory/spw', '.spw'], { encoding: 'utf8' })
      .split('\n')
      .filter((file) => file.endsWith('.spw'))
    const lines: string[] = []
    for (const file of files) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const text = line.trim()
        if (!text || text.startsWith('//')) continue
        lines.push(text)
        if (lines.length >= 500) break
      }
      if (lines.length >= 500) break
    }
    expect(lines).toHaveLength(500)
    const hash = createHash('sha256')
    let keyed = 0
    let gained = 0
    for (const line of lines) {
      const plain = pivotsOf(line)
      hash.update(JSON.stringify(plain) + '\n')
      expect(plain).toEqual(pivotsOf(line, { keys: false }))
      const word = readLine(line).word
      if (!isKeySpan(line, word.start, word.end)) continue
      keyed += 1
      const before = new Set(plain.filter((p) => p.read.line && p.read.parser && p.read.spoken).map((p) => p.line))
      for (const pivot of pivotsOf(line, { keys: true })) {
        if (pivot.read.line && pivot.read.parser && pivot.read.spoken && !before.has(pivot.line)) gained += 1
      }
    }
    expect(hash.digest('hex')).toBe('fe3b7e9f557399550048b11a245a6e1831535f59af85292e2a4826317ecc4c11')
    expect(keyed).toBe(162)
    expect(gained).toBe(108)
  }, 30_000)

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

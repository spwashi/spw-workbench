import { describe, expect, it } from 'vitest'
import { LINE_FIXTURES } from './fixtures'
import { readAt, readLine } from './read'

describe('readLine', () => {
  for (const fixture of LINE_FIXTURES) {
    it(`${JSON.stringify(fixture.line)}: ${fixture.note}`, () => {
      const reading = readLine(fixture.line)
      if (fixture.word !== undefined) expect(reading.word.text).toBe(fixture.word)
      if (fixture.order) expect(reading.order).toEqual(fixture.order)
      if (fixture.lead) expect(reading.lead).toEqual(fixture.lead)
      if (fixture.charge) expect(reading.charge).toEqual(fixture.charge)
      if (fixture.rest !== undefined) expect(reading.rest).toBe(fixture.rest)
      if (fixture.whole !== undefined) expect(reading.whole).toBe(fixture.whole)
      if (fixture.separator !== undefined) expect(reading.separator).toBe(fixture.separator)
      if (fixture.parts) expect(reading.parts.map(part => part.text)).toEqual(fixture.parts)
      for (const [key, text] of Object.entries(fixture.slots ?? {})) {
        expect(reading.slots[key as keyof typeof reading.slots]?.text).toBe(text)
      }
      if (fixture.join) {
        expect(reading.compound?.bond).toBe(fixture.join.bond)
        expect(reading.compound?.spaced).toBe(fixture.join.spaced)
        expect(reading.compound?.right.word.text).toBe(fixture.join.right)
      }
    })
  }

  it('groups joins to the left: (ecestudent@ece.120)~(?[…])', () => {
    const reading = readLine('ecestudent@ece.120~?[transistors work.how]')
    const left = reading.compound?.left
    expect(left?.compound?.bond).toBe('perspective')
    expect(left?.compound?.left.word.text).toBe('ecestudent')
    expect(left?.compound?.right.word.text).toBe('ece.120')
    expect(reading.compound?.right.slots.mode?.text).toBe('transistors work.how')
  })

  it('reads nested parts as lines of their own', () => {
    const reading = readLine('home{a{b}, c[d]}')
    expect(reading.parts[0]?.reading.slots.body?.text).toBe('b')
    expect(reading.parts[1]?.reading.slots.mode?.text).toBe('d')
  })

  it('reads at a path: a join side, then a part', () => {
    expect(readAt('a@b{x, y}', ['b', 1])?.word.text).toBe('y')
    expect(readAt('a@b', ['c' as 'a'])).toBeNull()
    expect(readAt('home{a}', [3])).toBeNull()
  })

  it('keeps offsets into the source for every slot', () => {
    const line = 'beans<food>(kitchen)[mode]{stew}'
    const reading = readLine(line)
    for (const span of Object.values(reading.slots)) {
      expect(line.slice(span!.innerStart, span!.innerEnd)).toBe(span!.text)
    }
    expect(line.slice(reading.word.start, reading.word.end)).toBe('beans')
  })
})

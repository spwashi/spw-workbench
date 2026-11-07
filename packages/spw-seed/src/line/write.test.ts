import { describe, expect, it } from 'vitest'
import { LINE_FIXTURES } from './fixtures'
import { PAIRS, type PairKey } from './names'
import { readLine } from './read'
import { joinParts, writeAt, writeLine } from './write'

describe('writeLine laws, over every fixture', () => {
  for (const { line } of LINE_FIXTURES) {
    it(`${JSON.stringify(line)} comes back byte for byte`, () => {
      expect(writeLine(readLine(line))).toBe(line)
    })

    it(`${JSON.stringify(line)}: a change to one slot touches only that slot's bytes`, () => {
      const reading = readLine(line)
      for (const [key, span] of Object.entries(reading.slots)) {
        const out = writeLine(reading, { slots: { [key]: 'Z' } })
        expect(out).toBe(line.slice(0, span!.innerStart) + 'Z' + line.slice(span!.innerEnd))
      }
      if (reading.word.text) {
        const out = writeLine(reading, { slots: { word: 'W' } })
        expect(out).toBe(line.slice(0, reading.word.start) + 'W' + line.slice(reading.word.end))
      }
    })

    it(`${JSON.stringify(line)}: rest is never dropped`, () => {
      const reading = readLine(line)
      const out = writeLine(reading, { slots: { mode: 'm', concept: null } })
      expect(out.endsWith(reading.rest)).toBe(true)
    })
  }
})

describe('writeLine changes', () => {
  it('removes a slot with its braces, and only it', () => {
    expect(writeLine(readLine('beans<food>(kitchen)[mode]{stew}'), { slots: { scene: null } })).toBe('beans<food>[mode]{stew}')
  })

  it('adds a missing slot after the last slot read, before anything unread', () => {
    expect(writeLine(readLine('home[hook]'), { slots: { concept: 'person' } })).toBe('home[hook]<person>')
    expect(writeLine(readLine('home[a][b]'), { slots: { body: 'x' } })).toBe('home[a]{x}[b]')
  })

  it('adds several missing slots in pair order', () => {
    const reading = readLine('home')
    expect(writeLine(reading, { slots: { concept: 'c', mode: 'm', body: 'b', scene: 's' } })).toBe('home[m]{b}(s)<c>')
  })

  it('writes parts back with the body’s own separator', () => {
    expect(writeLine(readLine('home{a, b}'), { parts: ['a', 'b', 'c'] })).toBe('home{a, b, c}')
    expect(writeLine(readLine('home{a.b}'), { parts: ['b', 'a'] })).toBe('home{b.a}')
    expect(writeLine(readLine('home{ a , b }'), { parts: ['x'] })).toBe('home{ x }')
  })

  it('keeps an empty slot as its braces, and null removes them', () => {
    expect(writeLine(readLine('home{a}'), { slots: { body: '' } })).toBe('home{}')
    expect(writeLine(readLine('home{a}'), { slots: { body: null } })).toBe('home')
  })

  it('writes and removes the charge', () => {
    expect(writeLine(readLine('bone.boon home[x]'), { charge: 'honk' })).toBe('honk home[x]')
    expect(writeLine(readLine('bone.boon home[x]'), { charge: null })).toBe('home[x]')
    expect(writeLine(readLine('<p>home'), { charge: 'boon' })).toBe('boon <p>home')
  })

  it('writes a lead slot where it was written', () => {
    expect(writeLine(readLine('<person>home'), { slots: { concept: 'reader' } })).toBe('<reader>home')
  })

  it('writes at a path: a join side, a nested part', () => {
    expect(writeAt('a@b{x, y}', ['b', 1], { slots: { word: 'z' } })).toBe('a@b{x, z}')
    expect(writeAt('ecestudent@ece.120~?[x]', ['a', 'b'], { slots: { word: 'ece.130' } })).toBe('ecestudent@ece.130~?[x]')
    expect(writeAt('home{a}', [5], { slots: { word: 'z' } })).toBe('home{a}')
  })

  it('joins parts as a body writes them', () => {
    expect(joinParts(['a', 'b'], '')).toBe('a.b')
    expect(joinParts(['a', 'b'], '~>')).toBe('a ~> b')
    expect(joinParts(['a', 'b'], ';')).toBe('a; b')
  })

  it('names every pair it writes', () => {
    for (const key of Object.keys(PAIRS) as PairKey[]) {
      const out = writeLine(readLine('w'), { slots: { [key]: 'v' } })
      expect(out).toBe(`w${PAIRS[key].open}v${PAIRS[key].close}`)
    }
  })
})

import { describe, expect, it } from 'vitest'
import {
  REGISTER_OF_CLOSER,
  REGISTER_STAMP_CONTRACT,
  readRegisterStamps,
  summarizeRegisterStamps,
  withoutRestatingStamps,
} from './register-stamp'
import { parse } from '../parser'

describe('register stamps', () => {
  it('reads a stamp against the bracket it closes and says when it restates the shape', () => {
    const [facet] = readRegisterStamps('.{ carried: 6 }[reg=facet]')
    const [set] = readRegisterStamps('#[a, b][reg=set]')

    expect(facet).toMatchObject({ name: 'facet', closes: '}', shape: 'facet', restates: true })
    expect(set).toMatchObject({ name: 'set', closes: ']', shape: 'set', restates: true })
  })

  it('reads a stamp that names something its bracket does not as informing', () => {
    const [measured] = readRegisterStamps('.{ carried: 6 }[reg=measured]')
    const [list] = readRegisterStamps('#[a, b][reg=list]')

    expect(measured).toMatchObject({ name: 'measured', shape: 'facet', restates: false })
    expect(list).toMatchObject({ name: 'list', shape: 'set', restates: false })
  })

  it('knows the shape of every closing bracket', () => {
    expect(readRegisterStamps('<<a, b>>[reg=stream]')[0]).toMatchObject({ closes: '>>', restates: true })
    expect(readRegisterStamps('x(a)[reg=scope]')[0]).toMatchObject({ closes: ')', restates: true })
    expect(readRegisterStamps('home<atlas>[reg=capsule]')[0]).toMatchObject({ closes: '>', restates: true })
    expect(Object.values(REGISTER_OF_CLOSER)).toEqual(['facet', 'set', 'scope', 'capsule', 'stream'])
  })

  it('keeps the other pairs a stamp carries', () => {
    const [stamp] = readRegisterStamps('.{ a: 1 }[reg=facet, tier=warm, rank=2]')

    expect(stamp?.also).toEqual({ tier: 'warm', rank: '2' })
  })

  it('reports where each stamp is, so an edit can splice it', () => {
    const source = '.{ a: 1 }[reg=facet]\n#[x][reg=list]'
    const stamps = readRegisterStamps(source)

    expect(stamps.map(stamp => stamp.line)).toEqual([1, 2])
    expect(stamps.map(stamp => source.slice(stamp.start, stamp.end))).toEqual(['[reg=facet]', '[reg=list]'])
  })

  it('reads a stamp that follows no closing bracket as detached and informing', () => {
    const [afterPhrase] = readRegisterStamps('`x`[reg=phrase]')
    const [spaced] = readRegisterStamps('.{ a: 1 } [reg=facet]')

    expect(afterPhrase).toMatchObject({ closes: null, shape: null, restates: false })
    expect(spaced).toMatchObject({ closes: null, restates: false })
  })

  it('does not read a stamp inside a string, a mode that is not a stamp, or a frame with other content', () => {
    expect(readRegisterStamps('note: "}[reg=facet]"')).toEqual([])
    expect(readRegisterStamps('home[mode]{a}')).toEqual([])
    expect(readRegisterStamps('home[reg]{a}')).toEqual([])
    expect(readRegisterStamps('home[reg=facet extra]')).toEqual([])
    expect(readRegisterStamps('home[tier=warm]')).toEqual([])
  })

  it('reads nested frames, each stamp against its own bracket', () => {
    const stamps = readRegisterStamps('^"a"{\n k: #[x, y][reg=set]\n m: .{ n: 1 }[reg=brief]\n}[reg=facet]')

    expect(stamps.map(stamp => [stamp.name, stamp.restates])).toEqual([['set', true], ['brief', false], ['facet', true]])
  })

  it('summarizes which stamps restate and which registers inform', () => {
    const summary = summarizeRegisterStamps(
      readRegisterStamps('.{ a: 1 }[reg=facet]\n#[x][reg=set]\n.{ b: 2 }[reg=measured]\n.{ c: 3 }[reg=measured]\n`p`[reg=phrase]'),
    )

    expect(summary).toMatchObject({ contract: REGISTER_STAMP_CONTRACT, total: 5, restating: 2, informing: 3, detached: 1 })
    expect(summary.names).toEqual({ facet: 1, set: 1, measured: 2, phrase: 1 })
    expect(summary.informingNames).toEqual({ measured: 2, phrase: 1 })
  })

  it('removes restating stamps and no other byte', () => {
    const source = '^"a"{\n k: #[x, y][reg=set]\n m: .{ n: 1 }[reg=brief]\n}[reg=facet]\nnote: "}[reg=facet]"\n'
    const { text, removed } = withoutRestatingStamps(source)

    expect(removed).toBe(2)
    expect(text).toBe('^"a"{\n k: #[x, y]\n m: .{ n: 1 }[reg=brief]\n}\nnote: "}[reg=facet]"\n')
    expect(withoutRestatingStamps(text)).toEqual({ text, removed: 0 })
  })

  it('leaves a surface that parsed clean parsing clean once its restating stamps are gone', () => {
    const source = '^"a"{\n k: #[x, y][reg=set]\n m: .{ n: 1 }[reg=facet]\n}[reg=facet]\n'
    const before = parse(source)
    const after = parse(withoutRestatingStamps(source).text)

    expect(before.errors).toEqual([])
    expect(after.errors).toEqual([])
    expect(after.completeness?.proseFallback ?? false).toBe(false)
  })

  it('returns no stamps for text that is not Spw, and never throws', () => {
    for (const text of ['', '}{', '[reg=', '"unclosed [reg=facet]', '((((']) {
      expect(() => readRegisterStamps(text)).not.toThrow()
    }
    expect(readRegisterStamps('')).toEqual([])
  })
})

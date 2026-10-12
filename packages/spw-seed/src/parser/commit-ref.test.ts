import { describe, expect, it } from 'vitest'
import { parse } from './parse'
import { lex } from '../lexer'

const LANDED = '.[declare_glob_matcher](551bb419): "#[cli] — declare picomatch"'
const PLAN = { path: '.agents/plans/example/wip.spw' }

describe('commit refs in plan files', () => {
  it.each([
    { hash: '551bb419' },
    { hash: 'e94b6bfb' },
    { hash: '0123456789abcdef0123456789abcdef01234567' },
  ])('keeps $hash one token where it fills a scene', ({ hash }) => {
    const source = `^["commits"]{\n ${LANDED.replace('551bb419', hash)}\n}\n`
    const result = parse(source, PLAN)
    expect(result.dialect).toBe('Spw.p')
    expect(result.errors).toEqual([])
    const ref = result.tokens.find(t => t.kind === 'commit_ref')
    expect(ref?.type).toBe('IDENTIFIER')
    expect(ref?.value).toBe(hash)
    expect(source.slice(ref!.span.start.offset, ref!.span.end.offset)).toBe(hash)
    expect(result.tokens.map(t => t.value).join('')).toBe(source)
  })

  it('leaves the same line as it was outside plan files', () => {
    const source = `${LANDED}\n`
    const base = parse(source, { dialect: 'Spw.b' })
    expect(base.tokens.some(t => t.kind === 'commit_ref')).toBe(false)
    expect(base.tokens.find(t => t.value === '551')?.type).toBe('NUMBER')
  })

  it('takes only a hex run that exactly fills the parentheses', () => {
    for (const source of [
      '(551bb41)',          // seven: a short hash
      '551bb419\n',         // no scene
      '( 551bb419 )',       // padded
      '(551bb419 x)',       // shares the scene
      '(551bb4)',           // six: too short
      '(551BB419)',         // git prints lowercase
      '(f(551bb419))',      // nested is still a scene
    ]) {
      const plan = lex(source, { planStream: true }).tokens
      const refs = plan.filter(t => t.kind === 'commit_ref').map(t => t.value)
      const expected = source === '(551bb41)' ? ['551bb41'] : source === '(f(551bb419))' ? ['551bb419'] : []
      expect(refs, source).toEqual(expected)
      if (expected.length === 0) expect(plan, source).toEqual(lex(source).tokens)
    }
  })
})

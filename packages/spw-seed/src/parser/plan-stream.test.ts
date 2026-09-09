import { describe, expect, it } from 'vitest'
import { parse } from './parse'
import { lex } from '../lexer'

const ENTRY = '>>[2026-09-08 13:08] observe — Something changed.'

describe('plan stream entries', () => {
  it.each([
    { dialect: 'Spw.p' },
    { path: '.agents/plans/example/wip.spw' },
  ])('preserves timestamp and message with %j', (options) => {
    const source = `^["stream"]{\n ${ENTRY}\n}\n`
    const result = parse(source, options)
    expect(result.dialect).toBe('Spw.p')
    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.tokens.map(t => t.value).join('')).toBe(source)
    expect(JSON.stringify(result.ast)).toContain(ENTRY.slice(2))
    for (const token of result.tokens) {
      expect(source.slice(token.span.start.offset, token.span.end.offset)).toBe(token.value)
    }
  })

  it('keeps message syntax literal and stops before the next line', () => {
    const message = '[2026-09-08 13:08] note — café 😀 // # } << >> "unfinished  '
    const source = `^["stream"]{\r\n\t>>${message}\r\n}\r\n^["next"]{}\r\n`
    const result = parse(source, { dialect: 'Spw.p' })
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.tokens.find(t => t.type === 'TEXT')?.value).toBe(message)
    expect(result.tokens.map(t => t.value).join('')).toBe(source)
    expect(JSON.stringify(result.ast)).toContain('next')
  })

  it('preserves an incomplete entry at end of file during editing', () => {
    const result = parse('>>[2026-09-', { dialect: 'Spw.p' })
    expect(result.errors).toEqual([])
    expect(result.tokens.map(t => t.value).join('')).toBe('>>[2026-09-')
  })

  it('leaves ordinary and nested stream bounds unchanged', () => {
    const source = '<< a; << b >>\n>>\n'
    const plan = parse(source, { dialect: 'Spw.p' })
    const base = parse(source, { dialect: 'Spw.b' })
    expect(plan.errors).toEqual([])
    expect(plan.warnings).toEqual([])
    expect(plan.tokens).toEqual(base.tokens)
    expect(plan.ast).toEqual(base.ast)
  })

  it('does not take a stream closer followed by a frame as an entry', () => {
    const source = '<< a\n>>[2026]'
    expect(lex(source, { planStream: true }).tokens).toEqual(lex(source).tokens)
  })

  it('does not capture inline markers, strings, comments, or other dialects', () => {
    for (const source of ['x >>[2026]', '" >>[2026] "', '// >>[2026]\n']) {
      expect(lex(source, { planStream: true }).tokens).toEqual(lex(source).tokens)
    }
    expect(parse(ENTRY, { dialect: 'Spw.b' }).errors.length).toBeGreaterThan(0)
  })
})

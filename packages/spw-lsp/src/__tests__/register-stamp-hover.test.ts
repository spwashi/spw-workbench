import { describe, expect, it } from 'vitest'
import { registerStampHover } from '../handlers/register-stamp-hover'

describe('register stamp hover', () => {
  it('says a stamp restates its bracket', () => {
    const line = ' }[reg=facet]'
    const hover = registerStampHover(line, line.indexOf('reg'))

    expect(hover?.markdown).toContain('Restates its bracket')
    expect(hover?.markdown).toContain('closes a facet')
    expect(line.slice(hover!.start, hover!.end)).toBe('[reg=facet]')
  })

  it('says what an informing stamp names that its bracket does not', () => {
    const line = '.{ carried: 6 }[reg=measured]'
    const hover = registerStampHover(line, line.indexOf('measured'))

    expect(hover?.markdown).toContain('Informs: names `measured` where `}` says facet')
    expect(hover?.markdown).toContain('No tool reads an informing register yet')
  })

  it('lists the other pairs a stamp carries', () => {
    const line = '.{ a: 1 }[reg=facet, tier=warm]'

    expect(registerStampHover(line, line.indexOf('tier'))?.markdown).toContain('`tier=warm`')
  })

  it('returns null off a stamp and inside a string', () => {
    expect(registerStampHover('.{ a: 1 }[reg=facet]', 3)).toBeNull()
    expect(registerStampHover('note: "}[reg=facet]"', 10)).toBeNull()
    expect(registerStampHover('home[mode]{a}', 6)).toBeNull()
  })
})

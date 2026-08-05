import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearLocRegistryForTests,
  defineLoc,
  isLocKey,
  resetLocForTests,
  t,
  validateRegistry,
} from './index'
import { helpLoc, normalizeHelpPage, renderHelpPage } from '../help'

describe('loc keys', () => {
  beforeEach(() => {
    clearLocRegistryForTests()
  })

  it('accepts three-part keys only', () => {
    expect(isLocKey('delta.meta.header')).toBe(true)
    expect(isLocKey('a.b')).toBe(false)
    expect(isLocKey('a.b.c.d')).toBe(false)
  })

  it('defineLoc registers module.section.key from section.key', () => {
    const m = defineLoc('probe', {
      'help.summary': 'Probe surfaces',
      'meta.header': '# probe {n}',
    })
    expect(m('help.summary')).toBe('Probe surfaces')
    expect(t('probe.meta.header', { n: 3 })).toBe('# probe 3')
    expect(validateRegistry()).toEqual([])
  })

  it('rejects bad section keys', () => {
    expect(() =>
      defineLoc('bad', {
        // @ts-expect-error intentional
        nope: 'x',
      } as Record<`${string}.${string}`, string>),
    ).toThrow(/section\.key/)
  })

  it('missing key returns key for copy-editor visibility', () => {
    expect(t('delta.nope.missing' as 'delta.nope.missing')).toBe('delta.nope.missing')
  })
})

describe('help module loc', () => {
  beforeEach(() => {
    resetLocForTests()
  })

  it('helpLoc is defined in help.ts', () => {
    expect(helpLoc('help.options')).toBe('Options')
    expect(helpLoc('error.unknown_command', { command: 'z' })).toContain('z')
  })

  it('renders command-shaped pages with title', () => {
    const d = defineLoc('delta', {
      'help.summary': 'Compare two cuts',
      'help.usage': 'spw delta a b',
      'help.opt_cache': '--cache keep in session',
      'help.ex_list': 'spw delta --list',
    })
    const text = renderHelpPage({
      name: 'delta',
      summary: d('help.summary'),
      usage: [d('help.usage')],
      groups: [{ title: helpLoc('help.options'), lines: [d('help.opt_cache')] }],
      examples: [d('help.ex_list')],
    })
    expect(text).toMatch(/^delta — Compare two cuts/)
    expect(text).toContain('Usage:')
    expect(text).toContain('--cache keep in session')
    expect(text).toContain('Examples:')
  })

  it('normalizes legacy title pages', () => {
    const page = normalizeHelpPage({
      title: 'Spw CLI',
      usage: ['spw help'],
      sections: [{ title: 'Try', lines: ['spw doctor'] }],
    })
    expect(page.title).toBe('Spw CLI')
  })
})

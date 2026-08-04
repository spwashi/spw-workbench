import { describe, expect, it } from 'vitest'
import {
  CORE_SNIPPETS,
  getSnippet,
  listSnippets,
  hydrateSnippet,
  toVscodeSnippets,
  parseBindings,
  snippetSource,
} from './snippet'

describe('snippet catalog', () => {
  it('has unique ids and prefixes per family coverage', () => {
    const ids = CORE_SNIPPETS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(listSnippets({ family: 'measure' }).length).toBeGreaterThan(0)
    expect(listSnippets({ family: 'flow' }).length).toBeGreaterThan(0)
    expect(getSnippet('measure.mass')?.prefix).toBe('mass')
  })

  it('hydrates named slots and applies defaults', () => {
    const snip = getSnippet('measure.mass')!
    const r = hydrateSnippet(snip, { subject: 'src/a.ts', lines: '10' })
    expect(r.complete).toBe(true)
    expect(r.text).toContain('~"src/a.ts"')
    expect(r.text).toContain('lines: 10')
    expect(r.text).toMatch(/bytes: 0/) // default
    expect(r.filled).toContain('subject')
    expect(r.defaultsUsed).toContain('bytes')
  })

  it('reports open slots without defaults when not applied', () => {
    const r = hydrateSnippet('hello ${name}', {}, { applyDefaults: false })
    expect(r.complete).toBe(false)
    expect(r.open).toEqual(['name'])
  })

  it('emits vscode map with prefixes', () => {
    const map = toVscodeSnippets()
    expect(Object.keys(map).length).toBe(CORE_SNIPPETS.length)
    const mass = Object.values(map).find(s => s.prefix === 'mass')
    expect(mass?.body.join('\n')).toMatch(/@self/)
  })

  it('parseBindings reads k=v', () => {
    expect(parseBindings(['a=1', 'path=./x.spw'])).toEqual({ a: '1', path: './x.spw' })
  })

  it('snippetSource joins body', () => {
    expect(snippetSource(getSnippet('flow.pipeline')!)).toContain('<<')
  })
})

import { describe, it, expect } from 'vitest'
import {
  getSyntaxCatalogEntry,
  listSyntaxCatalog,
  scanExperimentalRefs,
  formatCatalogEntryMarkdown,
  SYNTAX_CATALOG,
} from './index'

describe('SYNTAX_CATALOG', () => {
  it('has stable unique ids', () => {
    const ids = SYNTAX_CATALOG.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(10)
  })

  it('lookup and filter work', () => {
    expect(getSyntaxCatalogEntry('flow.sigma_chain')?.dialect).toBe('Spw.f')
    expect(listSyntaxCatalog({ runtimeHook: 'parse' }).length).toBeGreaterThan(0)
  })
})

describe('scanExperimentalRefs', () => {
  it('finds =exp[ id: … ] and dialect marks', () => {
    const src = `
@dialect:Spw.f
=exp[ id: flow.sigma_chain , status: proposed ]
=exp[ id: unknown.thing ]
`
    const scan = scanExperimentalRefs(src)
    expect(scan.ids).toContain('flow.sigma_chain')
    expect(scan.ids).toContain('unknown.thing')
    expect(scan.expRefs.find(r => r.id === 'flow.sigma_chain')?.entry?.status).toBe('proposed')
    expect(scan.dialectMarks.some(d => d === 'Spw.f')).toBe(true)
  })
})

describe('formatCatalogEntryMarkdown', () => {
  it('includes reference-only note for proposed', () => {
    const e = getSyntaxCatalogEntry('flow.phi')!
    const md = formatCatalogEntryMarkdown(e)
    expect(md).toContain('flow.phi')
    expect(md).toContain('Reference only')
  })
})

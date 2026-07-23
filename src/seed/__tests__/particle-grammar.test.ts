import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse, particleBindings, deixisTable } from '@spwashi/spw-seed'

const HEADER_FIXTURE = `#>spw_test
#:index #!canon

^"intent"{
 ~#goal: "g"
}

#>wonder_1
?["q"]{ x: 1 }
`

describe('particle grammar — nodes and bindings', () => {
  it('parses #> and #: as Particle terms, not prose', () => {
    const result = parse(HEADER_FIXTURE)
    expect(result.success).toBe(true)
    const json = JSON.stringify(result.ast)
    expect((json.match(/"Particle"/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('binds a header stack through mood lines to the following frame', () => {
    const bindings = particleBindings(parse(HEADER_FIXTURE).ast)
    const bySigil = (name: string) => bindings.find((b) => b.particle.name.value === name)

    const anchor = bySigil('spw_test')!
    expect(anchor.particle.aim).toBe('>')
    // flows through `#:index #!canon` to the ^"intent" frame
    expect((anchor.bound as { terms?: Array<{ operator?: { value?: string } }> }).terms?.[0]?.operator?.value).toBe('^')

    const caseMark = bySigil('index')!
    expect(caseMark.particle.aim).toBe(':')
    expect((caseMark.bound as { terms?: Array<{ operator?: { value?: string } }> }).terms?.[0]?.operator?.value).toBe('^')
  })

  it('binds a wonder anchor to its probe', () => {
    const bindings = particleBindings(parse(HEADER_FIXTURE).ast)
    const wonder = bindings.find((b) => b.particle.name.value === 'wonder_1')!
    expect((wonder.bound as { terms?: Array<{ operator?: { value?: string } }> }).terms?.[0]?.operator?.value).toBe('?')
  })

  it('finds particles inside prose-led files (comment headers)', () => {
    const src = `# A comment header\n#\n# More prose.\n\n#>anchored\n^"frame"{ x: 1 }\n`
    const table = deixisTable(parse(src).ast)
    expect([...table.keys()]).toEqual(['anchored'])
    expect(table.get('anchored')!.bound).not.toBeNull()
  })

  it('yields the anchor table of a real canon surface, all bound', () => {
    const src = readFileSync('.spw/registries/bias-product.spw', 'utf8')
    const table = deixisTable(parse(src).ast)
    expect([...table.keys()]).toEqual([
      'spw_bias_product',
      'wonder_spw_registries_biasproduct_1',
      'wonder_spw_registries_biasproduct_2',
    ])
    for (const binding of table.values()) {
      expect(binding.bound).not.toBeNull()
    }
  })
})

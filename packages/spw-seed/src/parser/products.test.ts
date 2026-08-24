import { describe, expect, it } from 'vitest'
import { parse } from './parse'
import { produceSourceProducts, SOURCE_PRODUCT_IDS } from './products'

describe('parse product disclosure', () => {
  it('changes event retention without changing the lexical or semantic product', () => {
    const source = '^seed{ a . b }'
    const none = parse(source, { eventPolicy: 'none' })
    const diagnostics = parse(source, { eventPolicy: 'diagnostics' })
    const trace = parse(source, { eventPolicy: 'trace' })

    expect(none.success).toBe(trace.success)
    expect(none.tokens).toEqual(trace.tokens)
    expect(none.gaps).toEqual(trace.gaps)
    expect(none.ast).toEqual(trace.ast)
    expect(none.eventCounts.generated).toBe(trace.eventCounts.generated)
    expect(diagnostics.eventCounts.generated).toBe(trace.eventCounts.generated)
    expect(none.eventCounts.retained).toBe(0)
    expect(diagnostics.events.every(event => event.type === 'error' || event.type === 'warning')).toBe(true)
    expect(trace.eventCounts.retained).toBeGreaterThan(diagnostics.eventCounts.retained)
  })

  it('keeps diagnostics available when the general event channel is disabled', () => {
    const result = parse('§', { eventPolicy: 'none' })
    expect(result.events).toEqual([])
    expect(result.eventCounts.retained).toBe(0)
    expect(result.eventCounts.generated).toBeGreaterThan(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('answers a token question without running the grammar stage', () => {
    const shallow = produceSourceProducts('a . b', {
      through: 'tokens',
      eventPolicy: 'none',
    })
    const structural = produceSourceProducts('a . b', {
      product: 'structure',
      eventPolicy: 'none',
    })
    const shallowTokens = shallow.products.find(
      product => product.product === SOURCE_PRODUCT_IDS.tokens,
    )!
    const structuralProduct = structural.products.find(
      product => product.product === SOURCE_PRODUCT_IDS.structure,
    )!

    expect(shallow.output).toBeUndefined()
    expect(shallow.through).toBe('tokens')
    expect(shallow.request).toBe('tokens')
    expect(shallow.products.map(product => product.product)).toEqual([
      SOURCE_PRODUCT_IDS.tokens,
    ])
    expect(shallowTokens.data.events.generated).toBeLessThan(
      structuralProduct.data.events.generated,
    )
  })

  it('publishes each requested depth when it becomes available', () => {
    const published: string[] = []
    const result = produceSourceProducts('^seed{ a . b }', {
      through: 'trace',
      eventPolicy: 'none',
      uri: 'examples/progressive.spw',
    }, product => {
      published.push(product.product)
    })

    expect(published).toEqual([
      SOURCE_PRODUCT_IDS.tokens,
      SOURCE_PRODUCT_IDS.structure,
      SOURCE_PRODUCT_IDS.trace,
    ])
    expect(result.products.map(product => product.sequence.index)).toEqual([1, 2, 3])
    expect(result.products.every(product => product.sequence.total === 3)).toBe(true)
    expect(result.output?.eventPolicy).toBe('trace')
    const tokens = result.products.find(product => product.product === SOURCE_PRODUCT_IDS.tokens)!
    const trace = result.products.find(product => product.product === SOURCE_PRODUCT_IDS.trace)!
    expect(trace.data.events.length).toBeGreaterThan(0)
    expect(tokens.deferred).toContain('ast')
    expect(trace.deferred).toContain('semantic')
  })

  it('keeps product as a compatibility alias while through wins explicitly', () => {
    const compatibility = produceSourceProducts('a . b', { product: 'tokens' })
    const explicit = produceSourceProducts('a . b', {
      through: 'structure',
      product: 'tokens',
    })

    expect(compatibility.through).toBe('tokens')
    expect(explicit.through).toBe('structure')
    expect(explicit.products).toHaveLength(2)
  })

  it('keeps the structural product aligned with the parser API', () => {
    const source = '{ a ; b ; c }'
    const parsed = parse(source, { eventPolicy: 'diagnostics' })
    const progressive = produceSourceProducts(source, {
      product: 'structure',
      eventPolicy: 'diagnostics',
    })
    const structure = progressive.products.find(
      product => product.product === SOURCE_PRODUCT_IDS.structure,
    )!

    expect(progressive.output?.success).toBe(parsed.success)
    expect(progressive.output?.tokens).toEqual(parsed.tokens)
    expect(progressive.output?.gaps).toEqual(parsed.gaps)
    expect(progressive.output?.ast).toEqual(parsed.ast)
    expect(structure.data.ast).toEqual(parsed.ast)
    expect(structure.completeness.value).toBe(1)
    expect(structure.completeness.complete).toBe(parsed.completeness.complete)
    expect(structure.completeness.consumed).toEqual(parsed.completeness.consumed)
    expect(structure.completeness.remaining).toEqual(parsed.completeness.remaining)
  })
})

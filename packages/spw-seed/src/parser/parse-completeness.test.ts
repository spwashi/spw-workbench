import { describe, expect, it } from 'vitest'
import { parse } from './parse'
import { parseExpression } from './parse-expression'
import { produceSourceProducts, SOURCE_PRODUCT_IDS } from './products'

describe('parse completeness receipts', () => {
  it('consumes a complete structured noun through the seed expression grammar', () => {
    const source = 'surfaces[route]{path.role.archetype}<publish>'
    const result = parseExpression(source)

    expect(result.success).toBe(true)
    expect(result.ast?.type).toBe('Expression')
    expect(result.ast?.span.end.offset).toBe(source.length)
    expect(result.completeness).toMatchObject({
      complete: true,
      expectedRootKind: 'Expression',
      actualRootKind: 'Expression',
      proseFallback: false,
      remaining: { text: '' },
    })
    expect(result.completeness.consumed.end.offset).toBe(source.length)
  })

  it('keeps malformed sigil-led match arms rejected and discloses degradation', () => {
    const source = '?match[42]{ => "x" }'
    const result = parseExpression(source)

    expect(result.success).toBe(false)
    expect(result.ast?.type).toBe('Prose')
    expect(result.completeness).toMatchObject({
      complete: false,
      expectedRootKind: 'Expression',
      actualRootKind: 'Prose',
      proseFallback: true,
    })
  })

  it('returns the structured prefix and exact non-trivia remainder as incomplete', () => {
    const result = parseExpression('alpha }')

    expect(result.success).toBe(false)
    expect(result.ast?.type).toBe('Expression')
    expect(result.completeness).toMatchObject({
      complete: false,
      consumed: { end: { offset: 6 } },
      remaining: {
        span: { start: { offset: 6 }, end: { offset: 7 } },
        text: '}',
      },
      proseFallback: false,
    })
  })

  it('keeps a successful prose fallback incomplete on parse and structure products', () => {
    const source = '{{'
    const parsed = parse(source)
    const progressive = produceSourceProducts(source, { through: 'structure' })
    const structure = progressive.products.find(
      product => product.product === SOURCE_PRODUCT_IDS.structure,
    )!

    expect(parsed.success).toBe(true)
    expect(parsed.completeness).toMatchObject({
      complete: false,
      expectedRootKind: 'Seed',
      actualRootKind: 'Seed',
      proseFallback: true,
    })
    expect(structure.completeness).toMatchObject({
      basis: 'requested-fields',
      value: 1,
      complete: false,
      expectedRootKind: 'Seed',
      proseFallback: true,
    })
  })
})

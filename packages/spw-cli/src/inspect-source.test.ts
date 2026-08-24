import { describe, expect, it } from 'vitest'
import {
  buildSourceInspection,
  formatSourceInspectionSpw,
  SOURCE_INSPECTION_SURFACE,
} from './inspect-source'

describe('source intermediate inspection', () => {
  it('projects the requested product depth without inventing deeper stages', () => {
    const inspection = buildSourceInspection('a.b.c\n{ a . b }', {
      file: 'examples/source-products.spw',
      product: 'tokens',
      eventPolicy: 'none',
    })

    expect(inspection.surface).toBe(SOURCE_INSPECTION_SURFACE)
    expect(inspection.request).toBe('tokens')
    expect(inspection.products).toHaveLength(1)
    expect(inspection.products[0]!.product).toBe('source.tokens/1')
    expect(inspection.products[0]!.deferred).toContain('ast')
  })

  it('renders stage receipts and bounded samples as a Spw card', () => {
    const inspection = buildSourceInspection('^seed{ a . b }', {
      file: 'examples/source-products.spw',
      product: 'trace',
    })
    const card = formatSourceInspectionSpw(inspection, { limit: 2 })

    expect(card).toContain('^["source"]')
    expect(card).toContain('~#surface: inspect.source/1')
    expect(card).toContain('~#product: source.tokens/1')
    expect(card).toContain('~#product: source.structure/1')
    expect(card).toContain('~#product: source.trace/1')
    expect(card).toContain('omitted_tokens')
    expect(card).toContain('omitted_events')
  })
})

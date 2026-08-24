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
    expect(inspection.controls).toEqual({ through: 'tokens', events: 'none' })
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
    expect(card).toContain('~#through: trace')
    expect(card).toContain('~#events: trace')
    expect(card).toContain('~#sample: 2')
    expect(card).toContain('~#value_visible:')
    expect(card).toContain('omitted_tokens')
    expect(card).toContain('omitted_events')
  })

  it('promotes trace requests to trace event retention', () => {
    const inspection = buildSourceInspection('a . b', {
      through: 'trace',
      events: 'none',
    })

    expect(inspection.controls.events).toBe('trace')
    expect(inspection.products.at(-1)?.product).toBe('source.trace/1')
  })
})

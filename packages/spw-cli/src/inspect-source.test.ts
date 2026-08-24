import { parse, SOURCE_PRODUCT_IDS } from '@spwashi/spw-seed'
import { describe, expect, it, vi } from 'vitest'
import {
  buildSourceInspection,
  formatSourceInspectionSamples,
  formatSourceInspectionSpw,
  runSourceInspection,
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
    expect(card).toContain('~#plane: source')
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

  it('round-trips one Spw card with its plane, file, and through bindings intact', () => {
    const file = 'examples/roundtrip.spw'
    const card = formatSourceInspectionSpw(buildSourceInspection('a . b', {
      file,
      through: 'structure',
      events: 'none',
    }), { limit: 2 })
    const parsed = parse(card, { eventPolicy: 'none' })
    const reinspection = buildSourceInspection(card, {
      file: '<stdin>',
      through: 'structure',
      events: 'none',
    })
    const structure = reinspection.products.find(
      product => product.product === SOURCE_PRODUCT_IDS.structure,
    )!
    const values = parsed.tokens.map(token => token.value)

    expect(parsed.success).toBe(true)
    expect(parsed.completeness.complete).toBe(true)
    expect(parsed.completeness.remaining.text).toBe('')
    expect(parsed.completeness.proseFallback).toBe(false)
    expect(values).toEqual(expect.arrayContaining([
      '~#plane', 'source', '~#file', `"${file}"`, '~#through', 'structure',
    ]))
    expect(structure.data.success).toBe(true)
    expect(structure.completeness.complete).toBe(true)
    expect(structure.completeness.remaining.text).toBe('')
    expect(structure.completeness.proseFallback).toBe(false)
  })

  it('inspects in-memory source without resolving a filesystem path', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await runSourceInspection({
      file: '<text>',
      source: 'a . b',
      through: 'structure',
      events: 'none',
      json: true,
    })

    const envelope = JSON.parse(log.mock.calls.map(call => String(call[0])).join('\n'))
    expect(envelope.data.file).toBe('<text>')
    expect(envelope.data.products).toHaveLength(2)
  })

  it('promotes trace requests to trace event retention', () => {
    const inspection = buildSourceInspection('a . b', {
      through: 'trace',
      events: 'none',
    })

    expect(inspection.controls.events).toBe('trace')
    expect(inspection.products.at(-1)?.product).toBe('source.trace/1')
  })

  it('makes the human sample bound visible without losing exact product data', () => {
    const inspection = buildSourceInspection('a . b\n', {
      through: 'trace',
      events: 'trace',
    })
    const sample = formatSourceInspectionSamples(inspection, { limit: 1 })

    expect(sample).toContain('token sample')
    expect(sample).toContain('event sample')
    expect(sample).toContain('value_visible')
    expect(sample).toContain('more tokens (raise --sample)')
    expect(sample).toContain('more events (raise --sample)')
    expect(inspection.products[0]?.data).toHaveProperty('tokens')
  })
})

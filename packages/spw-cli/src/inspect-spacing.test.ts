import { describe, expect, it, vi } from 'vitest'
import {
  buildSpacingInspection,
  formatSpacingInspectionSpw,
  runSpacingInspection,
  SPACING_INSPECTION_SURFACE,
} from './inspect-spacing'

describe('spacing inspection product', () => {
  it('keeps exact gaps beside a compact human/machine summary', () => {
    const inspection = buildSpacingInspection('a.b.c\n\n{ a . b }', {
      file: 'examples/affinity.spw',
      eventPolicy: 'none',
    })

    expect(inspection.surface).toBe(SPACING_INSPECTION_SURFACE)
    expect(inspection.status).toBe('observational')
    expect(inspection.events.policy).toBe('none')
    expect(inspection.events.retained).toBe(0)
    expect(inspection.events.generated).toBeGreaterThan(0)
    expect(inspection.gapCounts.episode).toBe(1)
    expect(inspection.tightIdentifiers.find(identifier => identifier.value === 'a.b.c')?.segments).toEqual([
      'a', 'b', 'c',
    ])
    expect(inspection.gaps.some(gap => gap.raw === '\n\n')).toBe(true)
  })

  it('renders the same product as a source-shaped Spw card', () => {
    const inspection = buildSpacingInspection('a . b', { file: 'a.spw' })
    const card = formatSpacingInspectionSpw(inspection)
    expect(card).toContain('^["spacing"]')
    expect(card).toContain('~#surface: inspect.spacing/1')
    expect(card).toContain('~#events: diagnostics')
    expect(card).toContain('~#sample: 24')
    expect(card).toContain('^["gap-0"]')
    expect(card).toContain('~#class: open')
    expect(card).toContain('raw_visible')
  })

  it('accepts the canonical events handle', () => {
    const inspection = buildSpacingInspection('a . b', { events: 'none' })

    expect(inspection.events.policy).toBe('none')
    expect(inspection.events.retained).toBe(0)
  })

  it('inspects in-memory spacing input without resolving a filesystem path', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await runSpacingInspection({
      file: '<stdin>',
      source: 'a . b',
      events: 'none',
      json: true,
    })

    const envelope = JSON.parse(log.mock.calls.map(call => String(call[0])).join('\n'))
    expect(envelope.data.file).toBe('<stdin>')
    expect(envelope.data.gapCounts.open).toBeGreaterThan(0)
  })
})

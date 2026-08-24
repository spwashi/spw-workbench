import { describe, expect, it } from 'vitest'
import { parse } from './parse'

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
})

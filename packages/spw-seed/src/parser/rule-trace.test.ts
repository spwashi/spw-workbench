import { describe, expect, it } from 'vitest'
import { parse } from './parse'

const withoutStamp = (events: Array<{ timestamp: number }>) =>
  events.map(({ timestamp: _timestamp, ...event }) => event)

describe('rule trace is built only when the parse keeps it', () => {
  it('keeps warnings when no rule trace is collected', () => {
    const source = 'ordinary prose line.\n& [unclosed'
    const none = parse(source, { eventPolicy: 'none' })
    const diagnostics = parse(source, { eventPolicy: 'diagnostics' })
    const trace = parse(source, { eventPolicy: 'trace' })

    expect(none.events).toEqual([])
    expect(none.warnings.map(warning => (warning.data as { code?: string }).code)).toEqual(['prose-degradation'])
    expect(withoutStamp(none.warnings)).toEqual(withoutStamp(diagnostics.warnings))
    expect(withoutStamp(none.errors)).toEqual(withoutStamp(trace.errors))
    expect(none.ast).toEqual(trace.ast)
    expect(diagnostics.events.every(event => event.type === 'error' || event.type === 'warning')).toBe(true)
  })

  it('still yields every enter and exit when a trace is requested', () => {
    const source = '^seed{ a . b }'
    const trace = parse(source, { eventPolicy: 'trace' })
    const none = parse(source, { eventPolicy: 'none' })
    const enters = trace.events.filter(event => event.type === 'enter')
    const exits = trace.events.filter(event => event.type === 'exit')

    expect(enters.length).toBe(exits.length)
    expect(enters.length).toBeGreaterThan(0)
    expect(enters.some(event => event.rule === 'seed')).toBe(true)
    expect(none.eventCounts.generated).toBeLessThan(trace.eventCounts.generated)
    expect(none.eventCounts.retained).toBe(0)
    expect(none.ast).toEqual(trace.ast)
  })
})

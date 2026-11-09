import { describe, expect, it } from 'vitest'
import { $register } from '@spwashi/spw-seed'
import { runSpw } from './run-spw'
import { Substrate } from './substrate'

describe('runSpw', () => {
  it('parses and interprets valid Spw input', () => {
    const result = runSpw('!["hello"]')
    if (!result.success) throw new Error('expected successful runSpw')

    expect(result.parse.success).toBe(true)
    expect(result.runtime.registers.focusKey).toBe('"')
    expect(result.runtime.traces.length).toBeGreaterThan(0)
    expect(result.telemetry.events).toEqual([])
    expect(result.telemetry.resonances).toEqual([])
  })

  it('returns parse issues for invalid input', () => {
    const result = runSpw('\u0000')
    if (result.success) throw new Error('expected runSpw failure')

    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0]?.stage).toBe('parse')
    expect(result.telemetry.events).toEqual([])
    expect(result.telemetry.resonances).toEqual([])
  })

  it('carries current-write operator valence into register metadata and telemetry', () => {
    const result = runSpw('*boon{"hello"}')

    expect(result.success).toBe(true)
    if (!result.success) return

    const focus = result.runtime.registers.entries[$register`"`]
    expect(focus?.value).toBe('"hello"')
    expect(focus?.meta.operator).toBe('*')
    expect(focus?.meta.valence).toEqual(['boon'])
    expect(focus?.meta.registerRole).toBe('collapse')
    expect(focus?.meta.descriptor.containerAffinity).toBe('value')
    expect(focus?.meta.semanticFrames).toMatchObject({
      bound: {
        kind: 'body',
        form: 'boundary',
        occupancy: 'inhabited',
        actPlacement: 'prefix',
      },
    })
    expect(focus?.meta.phases?.current).toBe('pragmatic')
    expect(result.telemetry.events).toHaveLength(2)
    expect(result.telemetry.events[0]).toMatchObject({
      kind: 'phase-advance',
      key: '"',
      phase: 'pragmatic',
      operator: '*',
      valence: ['boon'],
      registerRole: 'collapse',
    })
    expect(result.telemetry.events[1]).toMatchObject({
      kind: 'write',
      key: '"',
      phase: 'pragmatic',
      operator: '*',
      valence: ['boon'],
      registerRole: 'collapse',
    })
  })

  it('captures only per-run telemetry when substrate already has history', () => {
    const substrate = new Substrate('shared')
    substrate.emit({ kind: 'write', key: $register`old`, value: 'seed', at: new Date().toISOString() })

    const result = runSpw('!["hello"]', { substrate })

    expect(result.success).toBe(true)
    expect(result.telemetry.events.every(event => event.key !== 'old')).toBe(true)
    expect(substrate.eventCount).toBeGreaterThan(result.telemetry.events.length)
  })
})

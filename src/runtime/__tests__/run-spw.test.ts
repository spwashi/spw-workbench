import { describe, expect, it } from 'vitest'
import { runSpw } from '../pipeline/run-spw'
import { Substrate } from '../pipeline/substrate'

describe('runSpw', () => {
  it('parses and interprets valid Spw input', () => {
    const result = runSpw('!["hello"]')

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.parse.success).toBe(true)
    expect(result.runtime.registers.focusKey).toBe('"')
    expect(result.runtime.traces.length).toBeGreaterThan(0)
    expect(result.telemetry.events).toEqual([])
    expect(result.telemetry.resonances).toEqual([])
  })

  it('returns parse issues for invalid input', () => {
    const result = runSpw('\u0000')

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0]?.stage).toBe('parse')
    expect(result.telemetry.events).toEqual([])
    expect(result.telemetry.resonances).toEqual([])
  })

  it('carries current-write operator valence into register metadata and telemetry', () => {
    const result = runSpw('*boon{"hello"}')

    expect(result.success).toBe(true)
    if (!result.success) return

    const focus = result.runtime.registers.entries['"']
    expect(focus?.value).toBe('"hello"')
    expect(focus?.meta.operator).toBe('*')
    expect(focus?.meta.valence).toEqual(['boon'])
    expect(focus?.meta.registerRole).toBe('collapse')
    expect(focus?.meta.descriptor.containerAffinity).toBe('value')
    expect(focus?.meta.semanticFrames).toBeUndefined()
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
    substrate.emit({ kind: 'write', key: 'old', value: 'seed', at: new Date().toISOString() })

    const result = runSpw('!["hello"]', { substrate })

    expect(result.success).toBe(true)
    expect(result.telemetry.events.every(event => event.key !== 'old')).toBe(true)
    expect(substrate.eventCount).toBeGreaterThan(result.telemetry.events.length)
  })

  it('carries operator valence into register metadata', () => {
    const result = runSpw('*boon{"hello"}')

    expect(result.success).toBe(true)
    if (!result.success) return

    const focus = result.runtime.registers.entries['"']
    expect(focus?.value).toBe('"hello"')
    expect(focus?.meta.operator).toBe('*')
    expect(focus?.meta.valence).toContain('boon')
    expect(focus?.meta.registerRole).toBe('op')
    expect(focus?.meta.descriptor.containerAffinity).toBe('value')
    expect(focus?.meta.semanticFrames).toMatchObject({
      reg: 'op',
      valence: ['boon'],
    })
  })
})

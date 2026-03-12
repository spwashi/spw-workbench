import { describe, expect, it } from 'vitest'
import { runSpw } from '../pipeline/run-spw'

describe('runSpw', () => {
  it('parses and interprets valid Spw input', () => {
    const result = runSpw('!["hello"]')

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.parse.success).toBe(true)
    expect(result.runtime.registers.focusKey).toBe('"')
    expect(result.runtime.traces.length).toBeGreaterThan(0)
  })

  it('returns parse issues for invalid input', () => {
    const result = runSpw('\u0000')

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0]?.stage).toBe('parse')
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

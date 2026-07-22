import { describe, it, expect } from 'vitest'
import { $register, applyMobilityRule, runHigherOrderForm } from '@spwashi/spw-seed'
import { RegisterBank } from '@spwashi/spw-runtime'
import {
  applyRegisterBridgeEffect,
  bridgeRegisterLiminality,
  parseSubstrateMetaSurface,
  REGISTER_LIMINALITY_BRIDGE_PROFILE,
} from '../../../packages/spw-runtime/src/state/liminality-bridge'

describe('liminality bridge (effect.l1.memory)', () => {
  it('parses $(label) substrate meta surfaces', () => {
    expect(parseSubstrateMetaSurface('$(cell)')).toBe('cell')
    expect(parseSubstrateMetaSurface('  $(x)  ')).toBe('x')
    expect(parseSubstrateMetaSurface('@(cell)')).toBeNull()
  })

  it('promotes a new cell from local toward global', () => {
    const bank = new RegisterBank()
    const result = bridgeRegisterLiminality(bank, { label: 'topic', target: 'global' })
    expect(result).not.toBeNull()
    expect(result!.before).toBe('local')
    expect(result!.after).toBe('global')
    expect(result!.reached).toBe(true)
    expect(result!.steps).toBe(3) // local→liminal→visible→global
    expect(result!.created).toBe(true)
    expect(result!.profile).toBe(REGISTER_LIMINALITY_BRIDGE_PROFILE)
    expect(bank.materialize($register`topic`)?.liminality).toBe('global')
  })

  it('single-step promote when maxSteps is 1', () => {
    const bank = new RegisterBank()
    const result = bridgeRegisterLiminality(bank, { label: 'a', maxSteps: 1 })
    expect(result!.after).toBe('liminal')
    expect(result!.steps).toBe(1)
  })

  it('rejects invalid labels and step budgets', () => {
    const bank = new RegisterBank()
    expect(bridgeRegisterLiminality(bank, { label: 'bad label' })).toBeNull()
    expect(bridgeRegisterLiminality(bank, { label: 'ok', maxSteps: -1 })).toBeNull()
    expect(bank.materialize($register`ok`)).toBeUndefined()
  })

  it('rejects conflicting label evidence and does not call an overshoot reached', () => {
    const bank = new RegisterBank()
    expect(bridgeRegisterLiminality(bank, { label: 'a', source: '$(b)' })).toBeNull()
    expect(bank.materialize($register`a`)).toBeUndefined()
    const global = bridgeRegisterLiminality(bank, { label: 'topic' })
    expect(global?.after).toBe('global')
    const lowerTarget = bridgeRegisterLiminality(bank, { label: 'topic', target: 'visible' })
    expect(lowerTarget?.after).toBe('global')
    expect(lowerTarget?.reached).toBe(false)
  })

  it('applies bridge from surface geometry $(L)', () => {
    const surface = runHigherOrderForm('hof.publish_to_register', 'gate')
    expect(surface?.source).toBe('$(gate)')
    const bank = new RegisterBank()
    const effect = applyRegisterBridgeEffect(bank, surface!.source)
    expect(effect?.label).toBe('gate')
    expect(effect?.after).toBe('global')
    expect(effect?.reached).toBe(true)
  })

  it('composes seed mobility with runtime promote', () => {
    const bank = new RegisterBank()
    // free → @(cell) → $(cell)
    const ref = applyMobilityRule('ingress.ref_handle', 'cell', 'cell')
    expect(ref.ok && ref.source).toBe('@(cell)')
    if (!ref.ok) return
    const meta = applyMobilityRule('promote.register_bridge', ref.source, 'cell')
    expect(meta.ok && meta.source).toBe('$(cell)')
    if (!meta.ok) return
    const effect = applyRegisterBridgeEffect(bank, meta.source, { seedValue: 'ready' })
    expect(effect?.reached).toBe(true)
    expect(bank.get($register`cell`)).toBe('ready')
  })
})

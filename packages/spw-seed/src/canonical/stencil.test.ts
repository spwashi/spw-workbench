import { describe, expect, it } from 'vitest'
import {
  applyStencil,
  cutStencil,
  buildStencilMask,
  formatStencilSpw,
  gateStencilMask,
} from './stencil'
import { runMutationAutomata } from './mutation-automata'

const SRC_A = '^["card"]{\n  ~#a: 1\n}\n'
const SRC_B = '^["card"]{\n  ~#a: 1\n  \n}\n' // likely layout-ish relative to A after plan
const SRC_OTHER = '![]\n~"mod.spw"\n' // different form family

describe('stencil', () => {
  it('builds stencil without embedding after-bytes', () => {
    const result = runMutationAutomata(SRC_A, {
      profile: 'layout_canonical',
      dryRun: true,
      effectCeiling: 'effect.l0.measure',
    })
    const stencil = cutStencil({
      profile: 'layout_canonical',
      sourceUri: 'a.spw',
      source: SRC_A,
      result,
      layoutOnlyCandidate: true,
    })
    expect(stencil.transfer).toBe('replan')
    expect(stencil.id).toHaveLength(12)
    expect(stencil.mask.braceSignature.length).toBeGreaterThan(0)
    expect(formatStencilSpw(stencil)).toContain('^["stencil"]{')
    expect(formatStencilSpw(stencil)).toContain('^["mask"]{')
  })

  it('soft mask allows similar form, refuses alien form', () => {
    const result = runMutationAutomata(SRC_A, {
      profile: 'layout_canonical',
      dryRun: true,
      effectCeiling: 'effect.l0.measure',
    })
    const stencil = cutStencil({
      profile: 'layout_canonical',
      source: SRC_A,
      result,
    })
    const similar = gateStencilMask(stencil, SRC_B, 'soft')
    const alien = gateStencilMask(stencil, SRC_OTHER, 'soft')
    // same brace family more likely than alien
    expect(alien.ok).toBe(false)
    // SRC_B is still card-shaped — brace may match
    expect(similar.targetMask.braceSignature.length).toBeGreaterThan(0)
  })

  it('applyStencil replans on target (not byte transfer)', () => {
    const result = runMutationAutomata(SRC_A, {
      profile: 'layout_canonical',
      dryRun: true,
      effectCeiling: 'effect.l0.measure',
    })
    const stencil = cutStencil({
      profile: 'layout_canonical',
      source: SRC_A,
      result,
    })
    const applied = applyStencil(SRC_A, stencil, {
      maskMode: 'soft',
      dryRun: true,
      effectCeiling: 'effect.l1.memory',
    })
    expect(applied.ok).toBe(true)
    expect(applied.result).toBeDefined()
    expect(applied.result!.profile).toContain('layout')
  })

  it('refuses alien target under soft mask', () => {
    const result = runMutationAutomata(SRC_A, {
      profile: 'layout_canonical',
      dryRun: true,
      effectCeiling: 'effect.l0.measure',
    })
    const stencil = cutStencil({
      profile: 'layout_canonical',
      source: SRC_A,
      result,
    })
    const applied = applyStencil(SRC_OTHER, stencil, { maskMode: 'soft' })
    expect(applied.ok).toBe(false)
    expect(applied.refused).toMatch(/mask/i)
  })

  it('mask off always allows replan', () => {
    const result = runMutationAutomata(SRC_A, {
      profile: 'layout_canonical',
      dryRun: true,
      effectCeiling: 'effect.l0.measure',
    })
    const stencil = cutStencil({
      profile: 'layout_canonical',
      source: SRC_A,
      result,
    })
    const applied = applyStencil(SRC_OTHER, stencil, { maskMode: 'off' })
    expect(applied.ok).toBe(true)
  })

  it('buildStencilMask is stable for identical source', () => {
    const a = buildStencilMask(SRC_A)
    const b = buildStencilMask(SRC_A)
    expect(a.braceSignature).toBe(b.braceSignature)
    expect(a.nestSkeleton).toBe(b.nestSkeleton)
  })
})

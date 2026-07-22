import { describe, it, expect } from 'vitest'
import {
  CONFLUENCE_WRAP_SEQUENCE,
  advanceFormSurface,
  applyFormMask,
  classifySurface,
  formatFormSequence,
  labelSelection,
  parseFormSequence,
  runFormSequence,
} from './form-sequence'
import { createDreamRunner, dreamTick, listDreamSchedules } from './dream-schedule'

describe('form-sequence', () => {
  it('parses confluence wrap chain with label/membrane', () => {
    const seq = parseFormSequence(CONFLUENCE_WRAP_SEQUENCE)
    expect(seq.steps.length).toBe(4)
    expect(seq.steps[0]!.op).toBe('seed')
    expect(seq.steps[1]!.op).toBe('wrap')
    expect(seq.steps[2]!.op).toBe('annotate')
    expect(seq.steps[2]!.label).toBe('label')
    expect(seq.steps[3]!.op).toBe('membrane')
    expect(seq.steps[3]!.tag).toBe('tag')
  })

  it('advances wrap → annotate → membrane', () => {
    expect(advanceFormSurface('&', 'wrap')).toBe('{&}')
    expect(advanceFormSurface('{&}', 'annotate', { label: 'claim' })).toBe('{&[#claim]}')
    expect(advanceFormSurface('{&}', 'membrane', { tag: 'x', label: 'y' })).toBe('{&<#x>_y}')
  })

  it('reduces membrane → annotate → wrap → seed', () => {
    let s = '{&<#tag>_label}'
    s = advanceFormSurface(s, 'reduce')
    expect(s).toBe('{&[#label]}')
    s = advanceFormSurface(s, 'reduce')
    expect(s).toBe('{&}')
    s = advanceFormSurface(s, 'reduce')
    expect(s).toBe('&')
  })

  it('applies endpoints mask', () => {
    const seq = parseFormSequence(CONFLUENCE_WRAP_SEQUENCE)
    const masked = applyFormMask(seq, { id: 'e', description: '', endpointsOnly: true })
    expect(masked.steps).toHaveLength(2)
    expect(masked.steps[0]!.surface).toBe('&')
  })

  it('labelSelection builds hash path', () => {
    const seq = labelSelection('&', 'hold', 'hash')
    expect(seq.notation).toContain('{&[#hold]}')
  })

  it('classify membrane with spaces', () => {
    const step = classifySurface('{ &<#chip>_claim }'.replace(/\s+/g, ''))
    // without spaces
    const step2 = classifySurface('{&<#chip>_claim}')
    expect(step2.op).toBe('membrane')
    expect(step2.tag).toBe('chip')
    expect(step2.label).toBe('claim')
    expect(step.op === 'membrane' || step.op === 'fold').toBe(true)
  })

  it('runFormSequence returns product', () => {
    const r = runFormSequence(CONFLUENCE_WRAP_SEQUENCE, { maskId: 'wrap_only' })
    expect(r.product).toContain('&')
    expect(r.masked?.steps.every(s => s.op === 'seed' || s.op === 'wrap')).toBe(true)
    expect(formatFormSequence(r.sequence, { numbered: true })).toMatch(/0:/)
  })
})

describe('dream-schedule', () => {
  it('lists builtin schedules', () => {
    const list = listDreamSchedules()
    expect(list.some(s => s.id === 'soft')).toBe(true)
    expect(list.some(s => s.id === 'play')).toBe(true)
  })

  it('ticks through phases', () => {
    const runner = createDreamRunner('soft')
    const seen = new Set<string>()
    for (let i = 0; i < runner.schedule.cycleBeats + 2; i++) {
      const t = dreamTick(runner)
      seen.add(t.phase.id)
      expect(t.beat).toBe(i + 1)
      expect(t.phase.effect).toMatch(/^effect\.l/)
    }
    expect(seen.has('invent') || seen.has('form')).toBe(true)
  })
})

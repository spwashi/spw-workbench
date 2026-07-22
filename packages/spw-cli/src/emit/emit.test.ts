import { describe, it, expect } from 'vitest'
import { emitPackFromSource, listBuiltinRegisters } from './index'
import { holdPositive, countNegationSpine } from './positive-ground'
import { applyDimSets, resolveRegisterDims, phrasesForDims } from './registers'
import { parseAnchors, measureContinuity } from './continuity'

describe('builtin registers', () => {
  it('lists voice registers without vendor names', () => {
    const names = listBuiltinRegisters()
    expect(names.some((n) => n.includes('voice_'))).toBe(true)
    expect(names.join(' ')).not.toMatch(/gpt|claude|openai|anthropic/i)
  })

  it('resolves and overrides dims', () => {
    const dims = applyDimSets(resolveRegisterDims('voice_web_quiet'), {
      'density.sparse': 0.9,
    })
    expect(dims.density?.sparse).toBe(0.9)
    expect(phrasesForDims(dims).length).toBeGreaterThan(0)
  })
})

describe('positive ground', () => {
  it('accepts positive fill', () => {
    const r = holdPositive('plain speech, one clear next step, thrift of chrome')
    expect(r.ok).toBe(true)
    expect(r.hits).toBe(0)
  })

  it('flags negation spines', () => {
    const text = 'do not be stiff; avoid robotic tone; not generic, not corporate'
    expect(countNegationSpine(text)).toBeGreaterThan(0)
    expect(holdPositive(text).ok).toBe(false)
  })
})

describe('continuity', () => {
  it('parses pipe anchors', () => {
    expect(parseAnchors('Quiet Board | one screen | one verb')).toEqual([
      'Quiet Board',
      'one screen',
      'one verb',
    ])
  })

  it('reports missing anchors', () => {
    const r = measureContinuity('Quiet Board is ready', ['Quiet Board', 'one verb'])
    expect(r.ok).toBe(false)
    expect(r.missing).toContain('one verb')
  })
})

describe('emit pack extract', () => {
  const sample = `
#>sample_brief
^"intent"{
 ~#goal: "Keep the work visible."
 ~#taste: "thrift of chrome"
}
^"emit"{
 register: #voice_web_quiet
 short_prompt = "One screen. One verb."
 final_prompt = "Keep the work visible. One screen. One clear next step."
 ~#claim: "A small tool that keeps craft readable."
 ~#proof: "one screen, one verb"
 ~#door: "Open the board"
}
`

  it('extracts slots and traits into IR', () => {
    const { ir, pack } = emitPackFromSource(sample, 'sample.spw', {
      host: 'plain',
      set: {},
    })
    expect(ir.version).toBe('spw.emit/1')
    expect(ir.slots.final_prompt).toContain('Keep the work visible')
    expect(ir.traits.claim).toContain('craft readable')
    expect(pack.text).toContain('Keep the work visible')
    expect(pack.measure.hold_positive).toBe(true)
    expect(pack.measure.continuity).toBeDefined()
  })

  it('emits mj fields', () => {
    const { pack } = emitPackFromSource(sample, 'sample.spw', {
      host: 'mj',
      register: 'voice_braided_relation',
      set: {},
    })
    expect(pack.fields.short_prompt).toBeTruthy()
    expect(pack.fields.final_prompt).toBeTruthy()
    expect(pack.host).toBe('mj')
  })

  it('emits web_copy claim/proof/door', () => {
    const { pack } = emitPackFromSource(sample, 'sample.spw', {
      host: 'web_copy',
      set: {},
    })
    expect(pack.fields.claim).toBeTruthy()
    expect(pack.fields.door).toContain('Open')
  })

  it('strict positive fails on negation spine in slots', () => {
    const bad = `
^"emit"{
 final_prompt = "do not be stiff; avoid robotic; not generic, not corporate"
}
`
    expect(() =>
      emitPackFromSource(bad, 'bad.spw', { host: 'plain', set: {}, strictPositive: true }),
    ).toThrow(/positive_ground/)
  })
})

describe('publishing hosts', () => {
  const pub = `
^"title"{
 working_title: "Quiet Board"
 ~#claim: "Keep the work visible."
 ~#audience: "makers who ship small surfaces"
}
^"emit"{
 register: #voice_web_quiet
 ~#title: "Quiet Board"
 ~#claim: "Keep the work visible."
 ~#proof: "one screen, one verb"
 ~#door: "Open the board"
 ~#goal: "Hero for Quiet Board."
 ~#acceptance: "Anchors and door are clear."
 continuity: "Quiet Board | one screen | one verb"
 headline = "Keep the work visible."
 dek = "Quiet Board: one screen, one verb."
 hook = "One screen. One verb."
 cold_open = "Quiet Board opens on one surface."
 body = "Quiet Board keeps craft readable. One screen. One verb. One clear next step."
 cta = "Open the board"
 duration = "30s"
 final_prompt = "Quiet Board keeps craft readable. One screen. One verb."
}
`

  it('emits brief with goal and acceptance', () => {
    const { pack, ir } = emitPackFromSource(pub, 'pub.spw', { host: 'brief', set: {} })
    expect(pack.host).toBe('brief')
    expect(pack.fields.goal).toContain('Hero')
    expect(pack.fields.acceptance).toContain('Anchors')
    expect(pack.text).toContain('Quiet Board')
    expect(ir.anchors).toEqual(expect.arrayContaining(['Quiet Board', 'one screen', 'one verb']))
    expect(pack.measure.continuity.ok).toBe(true)
  })

  it('emits copy with headline/dek/body', () => {
    const { pack } = emitPackFromSource(pub, 'pub.spw', { host: 'copy', set: {} })
    expect(pack.fields.headline).toContain('visible')
    expect(pack.fields.body).toContain('Quiet Board')
    expect(pack.fields.door).toContain('Open')
  })

  it('emits audio with cold open and duration', () => {
    const { pack } = emitPackFromSource(pub, 'pub.spw', { host: 'audio', set: {} })
    expect(pack.fields.cold_open).toContain('Quiet Board')
    expect(pack.fields.duration).toBe('30s')
    expect(pack.fields.cta).toContain('Open')
  })

  it('emits social with hook', () => {
    const { pack } = emitPackFromSource(pub, 'pub.spw', { host: 'social', set: {} })
    expect(pack.fields.hook).toContain('One screen')
    expect(pack.fields.door).toContain('Open')
  })

  it('strict continuity fails when anchors drop out', () => {
    const thin = `
^"emit"{
 ~#title: "Quiet Board"
 continuity: "Quiet Board | mycelium ledger"
 final_prompt = "Quiet Board ships today."
}
`
    expect(() =>
      emitPackFromSource(thin, 'thin.spw', {
        host: 'plain',
        set: {},
        strictContinuity: true,
      }),
    ).toThrow(/continuity/)
  })
})

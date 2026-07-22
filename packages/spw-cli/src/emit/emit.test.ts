import { describe, it, expect } from 'vitest'
import { emitPackFromSource, listBuiltinRegisters } from './index'
import { holdPositive, countNegationSpine } from './positive-ground'
import { applyDimSets, resolveRegisterDims, phrasesForDims } from './registers'
import { parseAnchors, measureContinuity } from './continuity'
import {
  listFractalProfiles,
  resolveFractalProfile,
  mergeFractalConfig,
  planFractalMutation,
  runFractalEmit,
  parseHostList,
} from './fractal'
import {
  holdProduct,
  literacyProduct,
  normalizeSalience,
  salienceForContext,
  holdAlphaForContext,
  cacheAxisContext,
  parseAxisContext,
  defaultContextForProfile,
  AXIS_CATALOG,
  AXIS_CONTEXTS,
} from './axes'
import {
  expandTemplate,
  reportHoles,
  parseBindingsList,
  stampDerivative,
  BUILTIN_TEMPLATE_IDS,
  BUILTIN_TEMPLATE_PATHS,
} from './template-fill'

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

describe('fractal profiles', () => {
  it('lists builtin profiles', () => {
    const names = listFractalProfiles()
    expect(names).toContain('fractal_merge')
    expect(names).toContain('pe_style_lock')
    expect(names).toContain('line_propagate')
  })

  it('plans nest/fold steps under fractal_merge', () => {
    const cfg = resolveFractalProfile('fractal_merge')
    const plan = planFractalMutation(cfg.mutation)
    expect(plan.maxDepth).toBe(3)
    expect(plan.steps.some(s => s.type === 'nest')).toBe(true)
    expect(plan.steps.some(s => s.type === 'fold')).toBe(true)
    expect(plan.streamText).toContain('>>[')
  })

  it('merges max-depth and hosts overlays', () => {
    const base = resolveFractalProfile('pe_style_lock')
    const merged = mergeFractalConfig(base, {
      maxDepth: 2,
      hosts: parseHostList('brief,social'),
      depthWeights: [0.7, 0.3],
    })
    expect(merged.mutation.maxDepth).toBe(2)
    expect(merged.emit.hosts).toEqual(['brief', 'social'])
    expect(merged.mutation.depthWeights).toEqual([0.7, 0.3])
  })

  it('runs multi-host fractal emit with composite score', () => {
    const sample = `
^"emit"{
 register: #voice_web_quiet
 ~#title: "Quiet Board"
 ~#claim: "Quiet Board keeps thrift of chrome for the board-keeper — one verb, one clear board."
 ~#proof: "one screen, one verb, thrift of chrome"
 ~#door: "Open the board"
 ~#goal: "Ship a readable board for the board-keeper"
 ~#audience: "makers who want one clear board"
 ~#acceptance: "anchors hold across brief and social"
 continuity: "Quiet Board | one screen | one verb"
 style_lock = "thrift of chrome | one verb"
 subject_lock = "board-keeper | one clear board"
 body = "Quiet Board keeps craft readable for the board-keeper. One screen. One verb. Thrift of chrome. One clear board."
 final_prompt = "Quiet Board, board-keeper, thrift of chrome, one screen, one verb, one clear board"
 headline = "Keep thrift of chrome visible for the board-keeper"
 hook = "One screen. One verb. One clear board for the board-keeper — thrift of chrome."
}
`
    const cfg = mergeFractalConfig(resolveFractalProfile('line_propagate'), {
      hosts: parseHostList('brief,social'),
      maxDepth: 0,
    })
    const result = runFractalEmit(sample, 'sample.spw', cfg)
    expect(result.hosts.length).toBe(2)
    expect(result.composite.score).toBeGreaterThan(0)
    expect(result.composite.context).toBe('canon')
    expect(result.composite.literacy.L).toBeGreaterThan(0)
    expect(result.axes.version).toBe('spw.axes/1')
    expect(result.axes.context).toBe('canon')
    expect(result.plan.streamText.length).toBeGreaterThan(0)
    expect(result.hosts[0]!.text.length).toBeGreaterThan(0)
    // Canon α puts full weight on style/subject — missing anchors zero Hold (math)
    expect(result.composite.byHost.brief?.hold).toBeGreaterThan(0)
    expect(result.composite.byHost.social?.hold).toBeGreaterThan(0)
  })

  it('pe_style_lock plan is shallow without nest when maxDepth 0', () => {
    const cfg = mergeFractalConfig(resolveFractalProfile('pe_style_lock'), { maxDepth: 0 })
    const plan = planFractalMutation(cfg.mutation)
    expect(plan.steps.every(s => s.type !== 'nest')).toBe(true)
    expect(plan.steps.some(s => s.type === 'mutate')).toBe(true)
  })

  it('context overlay reweights hold alpha without changing hosts', () => {
    const base = resolveFractalProfile('pe_style_lock')
    const thrift = mergeFractalConfig(base, { context: 'thrift' })
    expect(thrift.emit.context).toBe('thrift')
    expect(thrift.emit.hosts).toEqual(base.emit.hosts)
    const aProd = holdAlphaForContext('production')
    const aThrift = holdAlphaForContext('thrift')
    expect(aThrift['hold.thrift']).toBeGreaterThan(aProd['hold.thrift'])
  })
})

describe('dimensional axes', () => {
  it('lists contexts and catalog families', () => {
    expect(AXIS_CONTEXTS).toContain('production')
    expect(AXIS_CONTEXTS).toContain('canon')
    expect(AXIS_CATALOG.some(a => a.id === 'hold.positive')).toBe(true)
    expect(AXIS_CATALOG.some(a => a.family === 'literacy')).toBe(true)
  })

  it('normalizes salience to unit mass', () => {
    const s = normalizeSalience({ a: 2, b: 2 })
    expect(s.a).toBeCloseTo(0.5)
    expect(s.b).toBeCloseTo(0.5)
  })

  it('F2 hold product respects exponents', () => {
    const h = holdProduct(
      { 'hold.positive': 1, 'hold.continuity': 0.5, 'hold.style': 1, 'hold.subject': 1, 'hold.genre': 1, 'hold.thrift': 1 },
      { 'hold.positive': 1, 'hold.continuity': 2, 'hold.style': 0, 'hold.subject': 0, 'hold.genre': 0, 'hold.thrift': 0 },
    )
    expect(h).toBeCloseTo(0.25)
  })

  it('F8 literacy collapses on zero memory', () => {
    expect(literacyProduct({ form: 1, agency: 1, evidence: 1, memory: 0 })).toBe(0)
    expect(literacyProduct({ form: 1, agency: 1, evidence: 1, memory: 1 })).toBe(1)
  })

  it('caches axis context with relations', () => {
    const snap = cacheAxisContext('pedagogy')
    expect(snap.version).toBe('spw.axes/1')
    expect(snap.context).toBe('pedagogy')
    expect(Object.keys(snap.salience).length).toBeGreaterThan(10)
    expect(snap.formulas.F8).toMatch(/Form/)
  })

  it('parses context and profile defaults', () => {
    expect(parseAxisContext('canon')).toBe('canon')
    expect(parseAxisContext('#thrift')).toBe('thrift')
    expect(defaultContextForProfile('line_propagate')).toBe('canon')
    expect(defaultContextForProfile('fractal_merge')).toBe('production')
    expect(() => parseAxisContext('nope')).toThrow(/unknown axis context/)
  })

  it('production boosts continuity over language tempo in raw salience', () => {
    const s = salienceForContext('production')
    expect(s['hold.continuity']).toBeGreaterThan(s['tempo.language'])
  })
})

describe('template fill', () => {
  it('expands braced defaults and bindings', () => {
    const src = 'host: ${host=mj}\ntitle: $title\nclaim: ${claim=_}'
    const r = expandTemplate(src, { title: 'Quiet Board', claim: 'Keep it visible.' })
    expect(r.text).toContain('host: mj')
    expect(r.text).toContain('title: Quiet Board')
    expect(r.text).toContain('claim: Keep it visible.')
    expect(r.defaultsUsed).toContain('host')
    expect(r.filled).toEqual(expect.arrayContaining(['title', 'claim']))
    expect(r.open).toEqual([])
  })

  it('reports open required slots', () => {
    const r = expandTemplate('x: $need', {})
    expect(r.open).toContain('need')
    expect(r.complete).toBe(false)
  })

  it('strict holes throws', () => {
    expect(() => expandTemplate('x: $need', {}, { strictHoles: true })).toThrow(/incomplete/)
  })

  it('parses bind list', () => {
    expect(parseBindingsList(['a=1', 'b=two words'])).toEqual({ a: '1', b: 'two words' })
  })

  it('reports holes and lineage', () => {
    const src = [
      '^"lineage"{',
      ' mode: #fork',
      ' base: ~"prompts/templates/publish/job-instance.spw"',
      ' revision: 1',
      ' derivative_id: "job.demo"',
      '}',
      'title: $title',
      'host: ${host=brief}',
      '_',
    ].join('\n')
    const h = reportHoles(src)
    expect(h.named.some(n => n.name === 'title' && !n.hasDefault)).toBe(true)
    expect(h.named.some(n => n.name === 'host' && n.hasDefault)).toBe(true)
    expect(h.bareHoleCount).toBeGreaterThanOrEqual(1)
    expect(h.lineage?.mode).toBe('fork')
    expect(h.lineage?.base).toContain('job-instance')
  })

  it('stamps derivative lineage', () => {
    const out = stampDerivative('# t\n\n^"emit"{}\n', {
      mode: 'fork',
      base: 'prompts/templates/media/brief.spw',
      revision: 2,
      derivative_id: 'brief.quiet.v2',
    })
    expect(out).toContain('mode: #fork')
    expect(out).toContain('derivative_id: "brief.quiet.v2"')
    expect(out).toContain('revision: 2')
  })

  it('lists builtin template catalog paths', () => {
    expect(BUILTIN_TEMPLATE_IDS.length).toBeGreaterThan(10)
    expect(BUILTIN_TEMPLATE_PATHS['publish.job']).toContain('job-instance')
    expect(BUILTIN_TEMPLATE_PATHS['media.image']).toContain('image.spw')
  })
})


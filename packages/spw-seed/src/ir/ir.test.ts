import { describe, expect, it } from 'vitest'
import {
  emptyInterconnect,
  putNode,
  link,
  neighbors,
  enableOpt,
  interconnectSummary,
  irRef,
  irRefKey,
  makeLens,
  openOptChannel,
  buildSurfaceInterconnect,
  DEFAULT_OPT_CHANNELS,
} from './index'

describe('ir interconnect', () => {
  it('keys refs by kind, hash, dialect, channel, lens', () => {
    const a = irRef('parse', {
      contentHash: 'abc',
      dialect: 'Spw.b',
      channel: 'trial',
      lens: makeLens('file', 'default'),
    })
    const key = irRefKey(a)
    expect(key).toContain('k:parse')
    expect(key).toContain('h:abc')
    expect(key).toContain('ch:trial')
    expect(key).toContain('lens:file:default')
  })

  it('links produces/consumes and finds neighbors', () => {
    const g = emptyInterconnect()
    const parseK = putNode(g, { ref: irRef('parse', { uri: 'a.spw' }) })
    const formK = putNode(g, { ref: irRef('form', { uri: 'a.spw' }) })
    link(g, 'produces', parseK, formK)
    const outs = neighbors(g, parseK, 'produces', 'out')
    expect(outs).toHaveLength(1)
    expect(outs[0]!.ref.kind).toBe('form')
  })

  it('opens opt channels and summarizes density', () => {
    const g = emptyInterconnect()
    putNode(g, { ref: irRef('phrase', { uri: 'a.spw' }) })
    enableOpt(g, openOptChannel('phrase_opt', ['phrase', 'form']))
    const s = interconnectSummary(g)
    expect(s.nodeCount).toBe(1)
    expect(s.openOpts).toContain('phrase_opt')
    expect(DEFAULT_OPT_CHANNELS.length).toBeGreaterThan(2)
  })

  it('builds surface interconnect from stack+flow', () => {
    const g = buildSurfaceInterconnect({
      uri: 'demo.spw',
      contentHash: 'h1',
      channel: 'experimental',
      stack: { dialect: 'Spw.b', dialectSource: 'default', review: 'canon_surface' },
      form: { maxDepth: 2, braceKinds: ['body'], topOps: [{ op: '!', count: 3 }] },
      phrases: { 'phrase.select_empty': 1 },
      flow: {
        roles: {
          flow: 1,
          routine: 0,
          strategy: 0,
          procedure: 1,
          bias: 0,
          probe: 0,
          measure: 0,
          hold: 0,
          unknown: 0,
        },
        units: [],
        schedules: ['<< ~ ; ? >>'],
        biasAxes: [],
        hooks: [],
      },
      precipitates: [{ stage: 'parse', delta: 'ok' }],
      lenses: {
        primary: makeLens('file', 'surface'),
        optChannels: [openOptChannel('phrase_opt', ['phrase'])],
      },
    })
    const s = interconnectSummary(g)
    expect(s.nodeCount).toBeGreaterThanOrEqual(4)
    expect(s.kinds.identity).toBe(1)
    expect(s.kinds.stack).toBe(1)
    expect(s.edgeCount).toBeGreaterThan(0)
    expect(s.openOpts).toContain('phrase_opt')
  })
})

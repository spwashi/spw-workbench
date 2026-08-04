import { describe, expect, it } from 'vitest'
import { handleSpwProbe } from '../handlers/spw-probes'
import type { HandlerDeps } from '../types'

const SOURCE = `
@dialect:Spw.b
^seed[Probe.Demo v:0.1 @profile:Spw.b]
=exp[ id: flow.sigma_chain , status: proposed ]
=exp[ id: totally.unknown.exp ]
![]
~"x.spw"
`

function deps(text: string): HandlerDeps {
  return {
    workspaceRoot: process.cwd(),
    getDocumentText: async () => text,
    pathFromUri: (uri: string) => uri.replace('file://', ''),
  } as unknown as HandlerDeps
}

describe('spw/surfaceProfile + phraseScan + channelPolicy', () => {
  it('returns stack, exp known/unknown, and phrases', async () => {
    const result = (await handleSpwProbe(
      'spw/surfaceProfile',
      { text: SOURCE, uri: 'file:///tmp/demo.spw' },
      deps(SOURCE),
    )) as any
    expect(result.stack.dialect).toBe('Spw.b')
    expect(result.experimental.known).toContain('flow.sigma_chain')
    expect(result.experimental.unknown).toContain('totally.unknown.exp')
    expect(result.phrases['phrase.select_empty']).toBeGreaterThanOrEqual(1)
  })

  it('phraseScan lists hits', async () => {
    const result = (await handleSpwProbe(
      'spw/phraseScan',
      { text: '![] *{ x } data~' },
      deps(''),
    )) as any
    expect(result.total).toBeGreaterThan(0)
    expect(result.counts['phrase.select_empty']).toBe(1)
  })

  it('channelPolicy lists or resolves', async () => {
    const all = (await handleSpwProbe('spw/channelPolicy', {}, deps(''))) as any
    expect(all.channels).toContain('stable')
    expect(all.channels).toContain('ocean')
    const one = (await handleSpwProbe(
      'spw/channelPolicy',
      { channel: 'live' },
      deps(''),
    )) as any
    expect(one.id).toBe('live')
    expect(one.cacheDefaultTier).toBe('hot')
  })

  it('flowProtocol and geometricResonance and probeMeasure', async () => {
    const src = `
<< ~ ; ? ; % >>
?["q"]{ !probe{ x } $%[a] }
!boon{ go }
`
    const flow = (await handleSpwProbe('spw/flowProtocol', { text: src }, deps(''))) as any
    expect(flow.summary).toMatch(/flow-protocol/)
    expect(flow.roles.flow + flow.roles.probe + flow.roles.procedure).toBeGreaterThan(0)

    const geo = (await handleSpwProbe('spw/geometricResonance', { text: src }, deps(''))) as any
    expect(geo.resonances).toBeDefined()
    expect(Array.isArray(geo.resonances)).toBe(true)

    const pm = (await handleSpwProbe('spw/probeMeasure', { text: src }, deps(''))) as any
    expect(pm.wonderCount).toBe(1)
    expect(pm.probeCount).toBe(1)
  })
})

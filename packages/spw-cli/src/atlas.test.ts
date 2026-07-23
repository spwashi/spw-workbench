import { describe, it, expect } from 'vitest'
import { crawlWorkspace, type CrawlInput } from './atlas'

const META = { at: '2026-07-23T00:00:00.000Z', ref: 'testref' }

function crawl(files: Record<string, string>) {
  const inputs: CrawlInput[] = Object.entries(files).map(([path, source]) => ({ path, source }))
  return crawlWorkspace(inputs, META)
}

describe('crawlWorkspace — a workspace measured', () => {
  it('reads each region\'s dialect and its volatility', () => {
    const snap = crawl({
      'plans/wip.spw': '^["cache"]{\n ~#status: "x"\n ~#next: "y"\n ~#age: "z"\n}',
      'canon/reg.spw': '#>anchor\n#:layer #!canon\n^["intent"]{\n}',
    })
    const plans = snap.regions.find((r) => r.region === 'plans')!
    const canon = snap.regions.find((r) => r.region === 'canon')!
    expect(plans.volatility).toBe('volatile')
    expect(canon.volatility).toBe('durable')
    // Regions are ordered most-volatile first.
    expect(snap.regions[0].region).toBe('plans')
  })

  it('counts inbound references and ranks the load-bearing surface first', () => {
    const snap = crawl({
      'hub.spw': '#>h\n',
      'a.spw': '=r{ ~"./hub.spw" }\n',
      'b.spw': '=r{ ~"./hub.spw" }\n',
    })
    expect(snap.hubs[0]).toMatchObject({ path: 'hub.spw', inbound: 2 })
    expect(snap.edges).toBe(2)
  })

  it('flags a canon surface nothing points at as adrift', () => {
    const snap = crawl({
      'linked.spw': '#>l\n',
      'adrift.spw': '#>a\n',
      'entry.spw': '=r{ ~"./linked.spw" }\n',
    })
    expect(snap.orphans).toContain('adrift.spw')
    expect(snap.orphans).not.toContain('linked.spw')
  })

  it('groups the anchor namespace by name family', () => {
    const snap = crawl({
      'a.spw': '#>wonder_one\n?["q"]{\n}\n#>wonder_two\n?["r"]{\n}',
      'b.spw': '#>spw_index\n^["x"]{\n}',
    })
    const byGroup = new Map(snap.namespace.map((g) => [g.group, g.count]))
    expect(byGroup.get('wonder')).toBe(2)
    expect(byGroup.get('spw')).toBe(1)
  })

  it('reports a fragment whose target anchor does not exist as dangling', () => {
    const snap = crawl({
      'target.spw': '#>real_anchor\n^["x"]{\n}',
      'ref.spw': '=r{ ~"./target.spw#missing_anchor" }\n',
    })
    expect(snap.danglingRefs).toBe(1)
    expect(snap.dangling[0]).toMatchObject({ fragment: 'missing_anchor' })
  })

  it('does not flag a fragment that resolves to a real anchor', () => {
    const snap = crawl({
      'target.spw': '#>real_anchor\n^["x"]{\n}',
      'ref.spw': '=r{ ~"./target.spw#real_anchor" }\n',
    })
    expect(snap.danglingRefs).toBe(0)
  })

  it('carries the crawl metadata so snapshots are comparable across time', () => {
    const snap = crawl({ 'x.spw': '#>a\n' })
    expect(snap.at).toBe(META.at)
    expect(snap.ref).toBe(META.ref)
    expect(snap.surfaces).toBe(1)
  })
})

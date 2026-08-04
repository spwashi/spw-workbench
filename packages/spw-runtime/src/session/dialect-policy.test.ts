import { describe, expect, it } from 'vitest'
import {
  resolveDialectPolicy,
  resolveProductCacheTier,
  DIALECT_RUNTIME_POLICIES,
} from './dialect-policy'
import { createHotSession } from './hot-session'

describe('resolveDialectPolicy', () => {
  it('treats Spw.x as hot thrift subject with probe/bias handles', () => {
    const p = resolveDialectPolicy('Spw.x')
    expect(p.cacheTier).toBe('hot')
    expect(p.resonanceScheme).toBe('thrift')
    expect(p.optHandles).toContain('probe_opt')
    expect(p.optHandles).toContain('bias_rank')
    expect(p.optHandles).toContain('label_opt')
  })

  it('keeps Spw.p cold with agent scheme', () => {
    const p = resolveDialectPolicy('Spw.p')
    expect(p.cacheTier).toBe('cold')
    expect(p.resonanceScheme).toBe('agent')
    expect(p.inspectMemory).toBe(false)
  })

  it('covers all core dialects', () => {
    for (const id of ['Spw.b', 'Spw.l', 'Spw.m', 'Spw.x', 'Spw.q', 'Spw.f', 'Spw.p', 'Spw.t']) {
      expect(DIALECT_RUNTIME_POLICIES[id]?.subject.length).toBeGreaterThan(0)
    }
  })

  it('resolveProductCacheTier prefers hotter tier', () => {
    expect(resolveProductCacheTier('hot', 'warm')).toBe('hot')
    expect(resolveProductCacheTier('cold', 'warm')).toBe('warm')
  })
})

describe('HotRuntimeSession dialect planes', () => {
  it('inspect caches under Spw.b and exposes Spw dual-read', () => {
    const session = createHotSession({ channel: 'trial', id: 'dialect-test' })
    const src = '@dialect:Spw.b\n^seed[T v:0.1 @profile:Spw.b]\n?["q"]{ !probe{} $%[m] }\n'
    const a = session.inspect(src, { path: 't.spw' })
    const b = session.inspect(src, { path: 't.spw' })
    expect(a.cacheHit).toBe(false)
    expect(b.cacheHit).toBe(true)
    expect(a.bytecode.contentHash.length).toBe(16)
    expect(a.dialectPolicy.dialect).toBe('Spw.b')
    const spw = session.inspectAsSpw(src, { path: 't.spw' })
    expect(spw).toMatch(/Hot\.Inspect/)
    expect(spw).toMatch(/\^\["resonance"\]/)
  })

  it('interconnect opens dialect opt handles', () => {
    const session = createHotSession({ channel: 'experimental', id: 'ix' })
    const src = `@dialect:Spw.f
^seed[F v:0.1 @profile:Spw.f]
=phi[ id: soft ]{ << ~ ; ? ; % >> }
?["p"]{ !probe{} $%[m] }
`
    const { summary, policy } = session.interconnect(src, { path: 'f.spw' })
    expect(policy.dialect).toBe('Spw.f')
    expect(policy.optHandles).toContain('schedule_opt')
    expect(summary.nodeCount).toBeGreaterThan(0)
    expect(summary.openOpts.length).toBeGreaterThan(0)
  })

  it('cite/follow/collapse use @bc pointers without JSON', () => {
    const session = createHotSession({ channel: 'trial', id: 'cite' })
    const src = `@dialect:Spw.x
^seed[X v:0.1 @profile:Spw.x]
?["q"]{ !probe{} $%[m] }
`
    const c = session.cite(src, { path: 'x.spw' })
    expect(c.pointer).toMatch(/^@bc:[0-9a-f]+$/)
    expect(c.grain.version).toBe('spw.granularity/1')
    const followed = session.follow(c.pointer)
    expect(followed?.inspect?.bytecode.contentHash).toBe(c.ref.contentHash)
    const col = session.collapse(c.pointer)
    expect(col.pointer).toBe(c.pointer)
    expect(col.ok || col.note.length > 0).toBe(true)
    expect(session.listPointers()).toContain(c.pointer)
  })
})

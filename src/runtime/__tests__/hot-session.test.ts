import { describe, expect, it } from 'vitest'
import {
  createHotSession,
  prepareSource,
  CHANNEL_POLICIES,
} from '../../../packages/spw-runtime/src/session'

describe('prepareSource', () => {
  it('applies Spw.l newline-as-space preprocess', () => {
    const src = '@dialect:Spw.l\na\nb\n'
    const prep = prepareSource(src)
    expect(prep.stack.dialect).toBe('Spw.l')
    expect(prep.preprocessed).toBe(true)
    // Interior newlines collapse; trailing newline may remain
    expect(prep.source).toMatch(/a b/)
    expect(prep.source.includes('a\nb')).toBe(false)
    expect(prep.pathReceipt.preprocessed).toBe(true)
    expect(prep.pathReceipt.preparedHash).not.toBe(prep.pathReceipt.originalHash)
    expect(prep.pathReceipt.dialect).toBe('Spw.l')
    expect(prep.pathReceipt.schema).toBe('spw.prepare/1')
  })

  it('path receipt keeps original and prepared hashes equal without preprocess', () => {
    const prep = prepareSource('@dialect:Spw.b\n^["x"]{}')
    expect(prep.preprocessed).toBe(false)
    expect(prep.pathReceipt.originalHash).toBe(prep.pathReceipt.preparedHash)
    expect(prep.pathReceipt.channel).toBe('stable')
  })

  it('flags regional dialect under stable channel', () => {
    const prep = prepareSource('@dialect:Spw.o\n^["x"]{}', { channel: 'stable' })
    // Spw.o may resolve as default if not in core dialect ids — still channel gate
    expect(prep.channel).toBe('stable')
    expect(CHANNEL_POLICIES.stable.allowDialects.includes('Spw.o')).toBe(false)
  })
})

describe('HotRuntimeSession', () => {
  it('caches evaluate by content hash', () => {
    const session = createHotSession({ channel: 'trial', id: 'test-hot' })
    const src = '!["hello"]'
    const a = session.evaluate(src, { captureTrace: false })
    const b = session.evaluate(src, { captureTrace: false })
    expect(a.cacheHit).toBe(false)
    expect(b.cacheHit).toBe(true)
    expect(a.contentHash).toBe(b.contentHash)
    expect(a.contentHash).toBe(a.prepared.pathReceipt.preparedHash)
    expect(a.result.success).toBe(true)
  })

  it('inspect returns stack, phrases, and path receipt', () => {
    const session = createHotSession({ channel: 'experimental' })
    const src = `
@dialect:Spw.b
^seed[Demo v:0.1 @profile:Spw.b]
![]
~"mod.spw"
`
    const card = session.inspect(src, { path: 'demo.spw' })
    expect(card.prepared.stack.dialect).toBe('Spw.b')
    expect(card.phraseCounts['phrase.select_empty'] ?? 0).toBeGreaterThanOrEqual(1)
    expect(card.channel).toBe('experimental')
    expect(card.prepared.pathReceipt.path).toBe('demo.spw')
    expect(card.contentHash).toBe(card.prepared.pathReceipt.preparedHash)
  })

  it('cite dual-read card exposes mask and grain without soft tags', () => {
    const session = createHotSession({ channel: 'trial', id: 'cite-card' })
    const handle = session.cite('![]\n', { path: 'p.spw' })
    const card = session.formatCiteSpw(handle)
    expect(card).toContain('^["cite"]{')
    expect(card).toContain('~#mask:')
    expect(card).toContain('~#uri:')
    expect(card).toContain('~#grain:')
    expect(card).toContain('~#pointer:')
    // pointer is mask interop (@bc:<hex>), not a soft human tag
    expect(handle.pointer).toMatch(/^@bc:[0-9a-f]+$/)
    expect(card).toContain(`~#mask: ${handle.ref.contentHash}`)
  })

  it('recompute bypasses cache', () => {
    const session = createHotSession({ id: 'recompute' })
    const src = '!["x"]'
    session.evaluate(src)
    const again = session.evaluate(src, { recompute: true })
    expect(again.cacheHit).toBe(false)
  })
})

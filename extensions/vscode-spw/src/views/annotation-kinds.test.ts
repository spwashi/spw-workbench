import { describe, expect, it } from 'vitest'
import type { SpwAnnotationKind } from '../lsp/custom-requests'
import { KIND_PHASE, annotationLabel, bucketByPhase, conceptKey } from './annotation-kinds'

const ALL_KINDS = Object.keys(KIND_PHASE) as SpwAnnotationKind[]

describe('annotation kinds shared by the views', () => {
  it('labels an apposition by its reading and every other kind by sigil and name', () => {
    expect(annotationLabel({ kind: 'apposition', name: 'lens', body: 'living system' })).toBe('~#lens(living system)')
    expect(annotationLabel({ kind: 'lens', name: 'depth' })).toBe('#:depth')
    expect(annotationLabel({ kind: 'prompt_root', name: 'root' })).toBe('##>root')
  })

  it('groups readings apart from the concept they share a name with', () => {
    expect(conceptKey({ kind: 'apposition', name: 'lens', body: 'x' })).toBe('~#lens(…)')
    expect(conceptKey({ kind: 'lens', name: 'lens' })).toBe('lens')
  })

  it('buckets by phase in spirit order, one bucket where two kinds share a phase', () => {
    const buckets = bucketByPhase([])
    expect(buckets.map((bucket) => bucket.phase.sigil)).toEqual(['?', '~', '@', '!', '^'])
    expect(buckets.find((bucket) => bucket.phase.sigil === '@')?.kinds).toEqual(['prompt_root', 'apposition'])
  })

  it('partitions the entries, so phase shares sum to the whole', () => {
    // Weighted so that appositions dominate, as they do in the real corpus.
    const entries = ALL_KINDS.flatMap((kind, i) =>
      Array.from({ length: kind === 'apposition' ? 290 : i + 1 }, () => ({ kind })))
    const buckets = bucketByPhase(entries)

    expect(buckets.reduce((sum, bucket) => sum + bucket.entries.length, 0)).toBe(entries.length)
    const observer = buckets.find((bucket) => bucket.phase.sigil === '@')!
    expect(observer.entries.length).toBe(290 + ALL_KINDS.indexOf('prompt_root') + 1)
  })
})

import { describe, expect, it } from 'vitest'
import { shouldSkipCorpusSurface } from './derived-surface'

describe('corpus surface ownership', () => {
  it('excludes declared derived suffixes and the generated product plane', () => {
    expect(shouldSkipCorpusSurface('docs/example.expanded.spw')).toBe(true)
    expect(shouldSkipCorpusSurface('.spw/gen/session/corpus-memo/report.spw')).toBe(true)
    expect(shouldSkipCorpusSurface('/workspace/.spw/gen/field/atlas.spw')).toBe(true)
  })

  it('keeps authored dotted surfaces in the corpus', () => {
    expect(shouldSkipCorpusSurface('docs/example.v0.3.spw')).toBe(false)
    expect(shouldSkipCorpusSurface('.spw/canon-mount.spw')).toBe(false)
  })
})

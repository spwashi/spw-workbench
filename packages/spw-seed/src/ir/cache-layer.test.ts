import { describe, expect, it } from 'vitest'
import {
  CACHE_LAYER_SURFACE,
  CACHE_PLANES,
  assembleCacheLayers,
  formatCacheLayerLines,
  omitCacheLayer,
  presentCacheLayer,
} from './cache-layer'

describe('cache.layer/1', () => {
  it('always names the four planes, filling omissions for absent hosts', () => {
    const layers = assembleCacheLayers({
      runtime_cache: { source: 'hot-session', stats: { hits: 1, misses: 1 } },
    })

    expect(layers.map(layer => layer.plane)).toEqual([...CACHE_PLANES])
    expect(layers.filter(layer => layer.present).map(layer => layer.plane)).toEqual(['runtime_cache'])
    expect(layers.find(layer => layer.plane === 'editor_probe_cache')).toMatchObject({
      present: false,
      omission: expect.stringContaining('probe cache'),
    })
  })

  it('keeps present and omitted cards on the same surface', () => {
    const present = presentCacheLayer('lsp_session_reflection', 'language-server', { size: 3 })
    const omitted = omitCacheLayer('corpus_memo')
    expect(present.surface).toBe(CACHE_LAYER_SURFACE)
    expect(omitted.surface).toBe(CACHE_LAYER_SURFACE)
    expect(present.present).toBe(true)
    expect(omitted.present).toBe(false)
    expect(omitted.next).toContain('census')
  })

  it('formats peer-readable lines that keep omissions visible', () => {
    const lines = formatCacheLayerLines(assembleCacheLayers()).join('\n')
    for (const plane of CACHE_PLANES) {
      expect(lines).toContain(`## ${plane}`)
      expect(lines).toContain('present: false')
    }
  })
})

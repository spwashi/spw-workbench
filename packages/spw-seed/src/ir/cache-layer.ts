/**
 * Named cache planes for host and CLI receipts.
 *
 * Parity is of these four questions, not of editor chrome. A host that cannot
 * fill a plane still names it and says why.
 */

export const CACHE_LAYER_SURFACE = 'cache.layer/1' as const

export const CACHE_PLANES = [
  'editor_probe_cache',
  'lsp_session_reflection',
  'runtime_cache',
  'corpus_memo',
] as const

export type CachePlane = (typeof CACHE_PLANES)[number]

export interface CacheLayerStats {
  size?: number
  hits?: number
  misses?: number
  [key: string]: number | string | boolean | undefined
}

export interface CacheLayerCard {
  surface: typeof CACHE_LAYER_SURFACE
  plane: CachePlane
  present: boolean
  source: string
  omission?: string
  next?: string
  stats?: CacheLayerStats
}

export const CACHE_LAYER_DEFAULTS: Record<CachePlane, Pick<CacheLayerCard, 'source' | 'omission' | 'next'>> = {
  editor_probe_cache: {
    source: 'editor-local TTL probe cache',
    omission: 'this host does not keep an editor probe cache',
  },
  lsp_session_reflection: {
    source: 'language-server session reflection',
    omission: 'no LSP session in this process',
    next: 'open a Spw file in an editor with spw-lsp',
  },
  runtime_cache: {
    source: 'hot-session evaluate/inspect cache',
    omission: 'runtime cache not sampled here',
    next: 'spw inspect cache <file.spw>',
  },
  corpus_memo: {
    source: 'corpus product memo',
    omission: 'corpus memo not sampled here',
    next: 'spw census --json',
  },
}

export function omitCacheLayer(
  plane: CachePlane,
  overrides: Partial<Pick<CacheLayerCard, 'source' | 'omission' | 'next'>> = {},
): CacheLayerCard {
  const fallback = CACHE_LAYER_DEFAULTS[plane]
  return {
    surface: CACHE_LAYER_SURFACE,
    plane,
    present: false,
    source: overrides.source ?? fallback.source,
    omission: overrides.omission ?? fallback.omission,
    next: overrides.next ?? fallback.next,
  }
}

export function presentCacheLayer(
  plane: CachePlane,
  source: string,
  stats?: CacheLayerStats,
): CacheLayerCard {
  return {
    surface: CACHE_LAYER_SURFACE,
    plane,
    present: true,
    source,
    stats,
  }
}

export function assembleCacheLayers(
  present: Partial<Record<CachePlane, { source: string; stats?: CacheLayerStats }>> = {},
): CacheLayerCard[] {
  return CACHE_PLANES.map((plane) => {
    const filled = present[plane]
    return filled
      ? presentCacheLayer(plane, filled.source, filled.stats)
      : omitCacheLayer(plane)
  })
}

export function formatCacheLayerLines(layers: readonly CacheLayerCard[]): string[] {
  const lines = [`# ${CACHE_LAYER_SURFACE}`, '']
  for (const layer of layers) {
    lines.push(`## ${layer.plane}`)
    lines.push(`present: ${layer.present}`)
    lines.push(`source: ${layer.source}`)
    if (!layer.present && layer.omission) lines.push(`omission: ${layer.omission}`)
    if (layer.next) lines.push(`next: ${layer.next}`)
    if (layer.stats) {
      const stats = Object.entries(layer.stats)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')
      if (stats) lines.push(stats)
    }
    lines.push('')
  }
  return lines
}

/**
 * Indexing configuration handles — acknowledge performance ↔ completeness tradeoffs.
 *
 * Not a full search engine: knobs for LSP/ServerIndex and CLI corpus scans so
 * agents and hosts can dial geometry/annotation/ref indexing without code edits.
 */

export type IndexDepth = 'minimal' | 'standard' | 'full'

export interface IndexConfig {
  version: 'spw.index/1'
  depth: IndexDepth
  /** Index path refs (~"…" / @root) — needed for navigation; cheap */
  pathRefs: boolean
  /** Index # annotations — concepts tree; medium cost */
  annotations: boolean
  /** Index brace geometry signatures per file — expensive on huge trees */
  braceGeometry: boolean
  /** Index operator histograms — cheap text scan */
  operatorCensus: boolean
  /** Index form-ladder product regs (set/facet/select) from ONF — needs parse */
  onfProducts: boolean
  /** Index stream sinks + foldReady — needs parse */
  streamMeta: boolean
  /** Max files for full-depth scans (0 = unlimited) */
  maxFiles: number
  /** Concurrent parse workers for corpus (1 = sequential) */
  concurrency: number
  /** Skip paths matching these substrings */
  excludeSubstrings: string[]
}

export const INDEX_PRESETS: Record<IndexDepth, IndexConfig> = {
  minimal: {
    version: 'spw.index/1',
    depth: 'minimal',
    pathRefs: true,
    annotations: false,
    braceGeometry: false,
    operatorCensus: false,
    onfProducts: false,
    streamMeta: false,
    maxFiles: 200,
    concurrency: 4,
    excludeSubstrings: ['node_modules', 'dist', '_workbench', '.git'],
  },
  standard: {
    version: 'spw.index/1',
    depth: 'standard',
    pathRefs: true,
    annotations: true,
    braceGeometry: false,
    operatorCensus: true,
    onfProducts: false,
    streamMeta: false,
    maxFiles: 2000,
    concurrency: 8,
    excludeSubstrings: ['node_modules', 'dist', '_workbench', '.git'],
  },
  full: {
    version: 'spw.index/1',
    depth: 'full',
    pathRefs: true,
    annotations: true,
    braceGeometry: true,
    operatorCensus: true,
    onfProducts: true,
    streamMeta: true,
    maxFiles: 0,
    concurrency: 8,
    excludeSubstrings: ['node_modules', 'dist', '_workbench', '.git'],
  },
}

/** Design notes for hosts choosing a preset. */
export const INDEX_TRADEOFFS = {
  minimal:
    'Navigation-only: fast open. Misses concept trees and geometry lessons.',
  standard:
    'Default LSP-like: path refs + annotations + cheap op census. No full ONF.',
  full:
    'Parse-heavy: brace signatures, ONF products, stream meta. Use for audits / offline invent.',
} as const

export function resolveIndexConfig(
  depthOrPartial?: IndexDepth | Partial<IndexConfig>,
): IndexConfig {
  if (!depthOrPartial) return { ...INDEX_PRESETS.standard }
  if (typeof depthOrPartial === 'string') {
    return { ...INDEX_PRESETS[depthOrPartial] }
  }
  const base = INDEX_PRESETS[depthOrPartial.depth ?? 'standard']
  return { ...base, ...depthOrPartial, version: 'spw.index/1' }
}

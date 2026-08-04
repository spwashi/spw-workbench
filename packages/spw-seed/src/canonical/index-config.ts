/**
 * Indexing configuration handles — acknowledge performance ↔ completeness tradeoffs.
 *
 * Not a full search engine: knobs for LSP/ServerIndex and CLI corpus scans so
 * agents and hosts can dial geometry/annotation/ref indexing without code edits.
 *
 * Dimensional handles (labels, bias axes, dialect column, bytecode hash) let
 * familiarity grow: experts query by axis; learners start with pathRefs only.
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
  /**
   * Record dialect + dialectSource on each row — primary subject for
   * dialect-partitioned walks and cache keys.
   */
  dialectColumn: boolean
  /** Geometry bytecode contentHash when available — dimensional form handle. */
  bytecodeHash: boolean
  /** Pipe/frame label anchors — label_opt expertise surface. */
  labels: boolean
  /** =bias axes — bias_rank opt handle. */
  biasAxes: boolean
  /** Skip derived `*.expanded.spw` and `.spw/gen/**` (always recommended). */
  skipDerivedAndGen: boolean
  /** Max files for full-depth scans (0 = unlimited) */
  maxFiles: number
  /** Concurrent parse workers for corpus (1 = sequential) */
  concurrency: number
  /** Skip paths matching these substrings */
  excludeSubstrings: string[]
}

const EXCLUDE = ['node_modules', 'dist', '_workbench', '.git', '.spw/gen'] as const

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
    dialectColumn: true,
    bytecodeHash: false,
    labels: false,
    biasAxes: false,
    skipDerivedAndGen: true,
    maxFiles: 200,
    concurrency: 4,
    excludeSubstrings: [...EXCLUDE],
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
    dialectColumn: true,
    bytecodeHash: true,
    labels: true,
    biasAxes: true,
    skipDerivedAndGen: true,
    maxFiles: 2000,
    concurrency: 8,
    excludeSubstrings: [...EXCLUDE],
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
    dialectColumn: true,
    bytecodeHash: true,
    labels: true,
    biasAxes: true,
    skipDerivedAndGen: true,
    maxFiles: 0,
    concurrency: 8,
    excludeSubstrings: [...EXCLUDE],
  },
}

/** Design notes for hosts choosing a preset. */
export const INDEX_TRADEOFFS = {
  minimal:
    'Navigation-only: pathRefs + dialect column. Misses concepts, labels, geometry.',
  standard:
    'Default: path refs, annotations, op census, bytecode hash, labels, bias axes. No full ONF.',
  full:
    'Parse-heavy: brace signatures, ONF products, stream meta. Audits / offline invent.',
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

/**
 * Merge dialect runtime bias into an index config (host may call after
 * resolving SurfaceProfileStack.dialect).
 */
export function applyDialectIndexBias(
  config: IndexConfig,
  bias: IndexDepth | undefined,
): IndexConfig {
  if (!bias || bias === config.depth) return config
  const from = INDEX_PRESETS[bias]
  // Widen only: never drop pathRefs/dialectColumn when dialect asks for less.
  return {
    ...config,
    depth: rankDepth(config.depth) >= rankDepth(bias) ? config.depth : bias,
    braceGeometry: config.braceGeometry || from.braceGeometry,
    onfProducts: config.onfProducts || from.onfProducts,
    streamMeta: config.streamMeta || from.streamMeta,
    bytecodeHash: config.bytecodeHash || from.bytecodeHash,
    labels: config.labels || from.labels,
    biasAxes: config.biasAxes || from.biasAxes,
  }
}

function rankDepth(d: IndexDepth): number {
  return d === 'minimal' ? 0 : d === 'standard' ? 1 : 2
}

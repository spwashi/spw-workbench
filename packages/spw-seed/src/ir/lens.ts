/**
 * Lens + optimization channels — open hooks for unique traversal effects.
 */

import type { IrChannelId, IrLens, IrLensLevel } from './ref'
import type { IrEdgeKind, IrKind } from './kinds'

/** Named traversal effect applied when walking the IR graph under a lens. */
export type TraversalEffectKind =
  | 'promote_cache' // hot-tier working set
  | 'demote_cache'
  | 'rekey' // contentHash/dialect/channel key change
  | 'mutate_lens' // depth-local id reinterpret
  | 'open_opt' // enable OptChannel
  | 'close_opt'
  | 'precipitate' // force stage fallout capture
  | 'skip_stage' // short-circuit pipeline
  | 'bias_rank' // reorder neighbors
  | 'disclose' // force envelope meta

export interface TraversalEffect {
  kind: TraversalEffectKind
  /** Target IR kind or edge, when scoped. */
  target?: IrKind | IrEdgeKind
  strength?: number
  note?: string
  params?: Record<string, string | number | boolean>
}

/**
 * Open channel for unique optimizations — not a stability channel.
 * Multiple opt channels may coexist on one traversal (e.g. phrase_opt + path_memo).
 */
export interface OptChannel {
  id: string
  /** What may be rewritten or memoized. */
  on: readonly IrKind[]
  /** Allowed edge kinds for this opt. */
  via?: readonly IrEdgeKind[]
  /** Cost budget hints (beats, nodes, ms). */
  budget?: { beats?: number; nodes?: number; ms?: number }
  /** Scheme id for measure-gated accept (thrift, hold, …). */
  scheme?: string
  /** Cache key fragment for OptCacheIR. */
  cacheFragment?: string
  enabled: boolean
}

export interface LensBundle {
  primary: IrLens
  /** Stacked lenses (outer first). */
  stack?: readonly IrLens[]
  effects?: readonly TraversalEffect[]
  optChannels?: readonly OptChannel[]
  /** Stability/effect wall for the walk. */
  channel?: IrChannelId
}

export function makeLens(
  level: IrLensLevel,
  id: string,
  extra: Omit<IrLens, 'level' | 'id'> = {},
): IrLens {
  return { level, id, ...extra }
}

export function openOptChannel(
  id: string,
  on: readonly IrKind[],
  extra: Omit<OptChannel, 'id' | 'on' | 'enabled'> = {},
): OptChannel {
  return { id, on, enabled: true, ...extra }
}

/** Default opt channels plans may enable without inventing new verbs. */
export const DEFAULT_OPT_CHANNELS: readonly OptChannel[] = [
  openOptChannel('phrase_opt', ['phrase', 'form', 'flow'], {
    scheme: 'thrift',
    via: ['optimizes', 'projects'],
  }),
  openOptChannel('path_memo', ['graph', 'selection'], {
    via: ['traverses', 'cites'],
    budget: { nodes: 4096 },
  }),
  openOptChannel('parse_reuse', ['parse', 'lex', 'preprocess'], {
    via: ['produces', 'consumes'],
  }),
  openOptChannel('precipitate_cite', ['precipitate', 'onf', 'parse'], {
    via: ['precipitates', 'projects'],
  }),
  /** Pipe/frame labels as rewrite anchors — expertise reward for named structure. */
  openOptChannel('label_opt', ['phrase', 'form', 'identity'], {
    scheme: 'default',
    via: ['optimizes', 'cites'],
    cacheFragment: 'label',
  }),
  /** =bias axes reorder attention / neighbor rank. */
  openOptChannel('bias_rank', ['bias', 'flow', 'attention'], {
    via: ['optimizes', 'resonates'],
    cacheFragment: 'bias',
  }),
  openOptChannel('schedule_opt', ['flow', 'stream'], {
    via: ['resonates', 'projects'],
    cacheFragment: 'schedule',
  }),
  openOptChannel('probe_opt', ['probe', 'measure', 'resonance'], {
    scheme: 'thrift',
    via: ['resonates', 'optimizes'],
    cacheFragment: 'probe',
  }),
]

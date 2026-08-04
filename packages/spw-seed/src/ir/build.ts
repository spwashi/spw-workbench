/**
 * Build interconnect graphs from common stage products.
 */

import { emptyInterconnect, link, putNode, type InterconnectGraph } from './graph'
import { irRef } from './ref'
import type { LensBundle } from './lens'
import type {
  FormIR,
  SelectionIR,
  StackIR,
  SurfaceCardIR,
  CacheIR,
  PrecipitateCite,
  GeometryBytecodeIR,
  ResonanceIR,
} from './slices'
import type { FlowProtocolModule } from '../canonical/flow-protocol'

export interface BuildSurfaceGraphInput {
  uri?: string
  contentHash?: string
  dialect?: string
  channel?: string
  stack?: StackIR
  form?: FormIR
  selection?: SelectionIR
  flow?: FlowProtocolModule
  phrases?: Record<string, number>
  cache?: CacheIR
  precipitates?: PrecipitateCite[]
  lenses?: LensBundle
  /** Intermediate geometry bytecode (cache / dimensional index handle). */
  bytecode?: GeometryBytecodeIR
  /** Weighted geometric resonances (post-scheme). */
  resonance?: ResonanceIR
  /** =bias axes — opt handle for bias_rank. */
  biasAxes?: string[]
  /** Label / phrase anchors — opt handle for label_opt. */
  labels?: string[]
}

/**
 * Surface card → small interconnect graph (stack, form, flow, cache, precipitates).
 */
export function buildSurfaceInterconnect(input: BuildSurfaceGraphInput): InterconnectGraph {
  const g = emptyInterconnect(input.lenses)
  const base = {
    uri: input.uri,
    contentHash: input.contentHash,
    dialect: input.dialect ?? input.stack?.dialect,
    channel: input.channel,
  }

  const identityKey = putNode(g, {
    ref: irRef('identity', { ...base, producer: 'surface' }),
    label: input.uri,
  })

  if (input.stack) {
    const k = putNode(g, {
      ref: irRef('stack', base),
      data: input.stack,
      label: input.stack.dialect,
    })
    link(g, 'projects', identityKey, k)
    link(g, 'produces', k, identityKey, { note: 'stack feeds card' })
  }

  if (input.form) {
    const k = putNode(g, {
      ref: irRef('form', base),
      data: input.form,
    })
    link(g, 'projects', identityKey, k)
  }

  if (input.flow) {
    const k = putNode(g, {
      ref: irRef('flow', base),
      data: {
        roles: input.flow.roles,
        schedules: input.flow.schedules,
        biasAxes: input.flow.biasAxes,
      },
    })
    link(g, 'projects', identityKey, k)
    link(g, 'resonates', k, identityKey, { note: 'protocol roles' })
  }

  if (input.phrases && Object.keys(input.phrases).length) {
    const k = putNode(g, {
      ref: irRef('phrase', base),
      data: input.phrases,
    })
    link(g, 'projects', identityKey, k)
    if (input.lenses?.optChannels?.some(c => c.id === 'phrase_opt' && c.enabled)) {
      link(g, 'optimizes', k, identityKey, { note: 'phrase_opt open' })
    }
    if (input.lenses?.optChannels?.some(c => c.id === 'label_opt' && c.enabled)) {
      link(g, 'optimizes', k, identityKey, { note: 'label_opt open' })
    }
  }

  if (input.bytecode) {
    const k = putNode(g, {
      ref: irRef('form', { ...base, producer: 'bytecode' }),
      data: input.bytecode,
      label: input.bytecode.contentHash,
    })
    link(g, 'projects', identityKey, k)
    if (input.lenses?.optChannels?.some(c => c.id === 'parse_reuse' && c.enabled)) {
      link(g, 'optimizes', k, identityKey, { note: 'bytecode cache key' })
    }
  }

  if (input.resonance && input.resonance.edges.length) {
    const k = putNode(g, {
      ref: irRef('resonance', base),
      data: {
        scheme: input.resonance.scheme,
        n: input.resonance.edges.length,
        edges: input.resonance.edges.slice(0, 16),
      },
      label: input.resonance.scheme,
    })
    link(g, 'resonates', identityKey, k, { note: 'geometric resonance' })
    if (input.lenses?.optChannels?.some(c => c.id === 'probe_opt' && c.enabled)) {
      link(g, 'optimizes', k, identityKey, { note: 'probe_opt open' })
    }
  }

  if (input.biasAxes && input.biasAxes.length) {
    const k = putNode(g, {
      ref: irRef('bias', base),
      data: { axes: input.biasAxes },
      label: input.biasAxes.slice(0, 4).join(','),
    })
    link(g, 'projects', identityKey, k)
    if (input.lenses?.optChannels?.some(c => c.id === 'bias_rank' && c.enabled)) {
      link(g, 'optimizes', k, identityKey, { note: 'bias_rank open' })
    }
  }

  if (input.labels && input.labels.length) {
    const k = putNode(g, {
      ref: irRef('phrase', { ...base, producer: 'labels' }),
      data: { labels: input.labels },
      label: `${input.labels.length} labels`,
    })
    link(g, 'cites', identityKey, k, { note: 'label anchors' })
  }

  if (input.selection) {
    const k = putNode(g, {
      ref: irRef('selection', { channel: input.channel }),
      data: input.selection,
    })
    link(g, 'consumes', identityKey, k)
  }

  if (input.cache) {
    const k = putNode(g, {
      ref: irRef('cache', { ...base, producer: input.cache.key }),
      data: input.cache,
    })
    link(g, 'projects', identityKey, k)
    if (input.cache.hit) {
      link(g, 'optimizes', k, identityKey, { note: 'cache hit' })
    }
  }

  for (const p of input.precipitates ?? []) {
    const k = putNode(g, {
      ref: irRef('precipitate', { ...base, producer: p.stage }),
      data: p,
      label: p.stage,
    })
    link(g, 'precipitates', identityKey, k, { note: p.delta })
  }

  return g
}

export function surfaceCardToBuildInput(
  card: SurfaceCardIR,
  extra: { contentHash?: string; channel?: string; cache?: CacheIR } = {},
): BuildSurfaceGraphInput {
  return {
    uri: card.uri,
    contentHash: extra.contentHash,
    dialect: card.stack.dialect,
    channel: extra.channel ?? card.cache?.key,
    stack: card.stack,
    form: card.form,
    flow: card.flow,
    phrases: card.phrases,
    cache: extra.cache ?? card.cache,
    resonance: card.geometric
      ? {
          scheme: 'default',
          edges: card.geometric.resonances.slice(0, 16).map(r => ({
            type: r.type,
            ends: r.ends,
            strength: r.strength,
            line: r.line,
          })),
        }
      : undefined,
  }
}

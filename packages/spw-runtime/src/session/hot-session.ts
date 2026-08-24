/**
 * HotRuntimeSession — long-lived registers + beat cache for hot re-interpret.
 *
 * Cache strategy: **dialect is the primary subject** (what we are optimizing);
 * channel is the wall (who may run). Keys always include channel × dialect ×
 * contentHash; tier/TTL bias and opt handles come from dialect-policy.
 *
 * Two memory planes:
 *   evaluate cache — interpret products
 *   inspect cache  — form/resonance/bytecode cards (dialect.inspectMemory)
 *
 * Split: types → hot-session-types; opt → hot-session-opt; format → hot-session-format.
 *
 * @see packages/spw-runtime/src/session/dialect-policy.ts
 * @see docs/theory/spw/brace-charge-crawl.spw
 */

import {
  parse,
  detectGeometricResonances,
  scanFlowProtocol,
  buildSurfaceInterconnect,
  interconnectSummary,
  makeLens,
  irRef,
  irRefKey,
  resolveGranularity,
  grainWantsResonance,
  grainWantsEval,
  grainWantsInterconnect,
  resolveWeightScheme,
  type InterconnectGraph,
  type GeometricResonanceReport,
  type IrRef,
  type Granularity,
  type ResolveGranularityInput,
} from '@spwashi/spw-seed'
import { RegisterBank } from '../state/register-bank'
import { BeatCache, cacheKey } from '../state/memory-cache'
import { Substrate } from '../pipeline/substrate'
import { runSpw } from '../pipeline/run-spw'
import type { RunSpwOptions } from '../pipeline/types'
import type { StabilityChannel } from './channels'
import { resolveChannelPolicy, channelCacheParts } from './channels'
import type { ConsumerContext } from './consumer'
import { prepareSource } from './prepare'
import {
  scanBracePhrases,
  countPhrasesById,
  countFixity,
  phraseKeysForHits,
} from './phrases'
import { resolveRuntimeMedium } from './medium-matrix'
import { measureProbesAndSubstrate } from './probe-measure'
import {
  resolveDialectPolicy,
  resolveProductCacheTier,
  type DialectRuntimePolicy,
} from './dialect-policy'
import {
  type HotSessionOptions,
  type HotEvalOptions,
  type HotCiteHandle,
  type HotEvalRecord,
  type HotInspectRecord,
  productHash,
} from './hot-session-types'
import { optChannelsFor } from './hot-session-opt'
import { formatCiteSpw as formatCiteSpwCard, formatInspectSpw } from './hot-session-format'

export type {
  HotSessionOptions,
  HotEvalOptions,
  HotCiteHandle,
  HotEvalRecord,
  HotInspectRecord,
} from './hot-session-types'

/**
 * Persistent interpret session: shared bank/substrate, beat-tiered caches.
 */
export class HotRuntimeSession {
  readonly id: string
  readonly substrate: Substrate
  readonly registers: RegisterBank
  readonly cache: BeatCache<HotEvalRecord>
  /** Inspect-plane memory (form + resonance + bytecode) when dialect.inspectMemory. */
  readonly inspectCache: BeatCache<HotInspectRecord>
  /** Content-addressed cites — bytecode pointers for dual-read follow/collapse. */
  private readonly handles = new Map<string, HotCiteHandle>()
  readonly channel: StabilityChannel
  readonly consumer?: ConsumerContext

  constructor(options: HotSessionOptions = {}) {
    this.id = options.id ?? 'hot-session'
    this.channel = resolveChannelPolicy(options.channel ?? options.consumer?.channel).id
    this.consumer = options.consumer
    this.substrate = new Substrate(this.id)
    this.registers = new RegisterBank({}, this.substrate)
    const channelTier = resolveChannelPolicy(this.channel).cacheDefaultTier
    this.cache = new BeatCache({
      maxEntries: options.cacheMaxEntries ?? 256,
      defaultTier: options.defaultTier ?? channelTier,
    })
    this.inspectCache = new BeatCache({
      maxEntries: options.cacheMaxEntries ?? 128,
      defaultTier: 'warm',
    })
  }

  /** Resolve grain from dialect/channel/consumer + overrides. */
  grainFor(
    preparedDialect: string,
    override?: Partial<ResolveGranularityInput>,
  ): Granularity {
    return resolveGranularity({
      dialect: preparedDialect,
      channel: this.channel,
      consumerMode: this.consumer?.mode,
      ...override,
    })
  }

  /**
   * Advance beat clock; volatility from language physics may demote extra.
   * Higher grain.volatility → more ticks (session memory pressure).
   */
  tick(n = 1, volatility = 0): number {
    const extra = volatility > 0 ? Math.floor(volatility * 2) : 0
    const steps = Math.max(0, Math.floor(n)) + extra
    this.inspectCache.tick(steps)
    return this.cache.tick(steps)
  }

  currentBeat(): number {
    return this.cache.currentBeat()
  }

  cacheStats() {
    const evaluate = this.cache.stats()
    const inspect = this.inspectCache.stats()
    return {
      ...evaluate,
      evaluate,
      inspect,
    }
  }

  /**
   * Prepare + parse + interpret, reusing registers/substrate.
   * Cached by contentHash × dialect × channel.
   */
  evaluate(source: string, options: HotEvalOptions = {}): HotEvalRecord {
    const prepared = prepareSource(source, {
      path: options.path,
      dialect: options.dialect,
      autoDialect: options.autoDialect,
      channel: this.channel,
    })

    const policy = resolveDialectPolicy(prepared.stack.dialect)
    const contentHash = productHash(prepared)
    const parseEventPolicy = options.parseEventPolicy ?? 'trace'
    const runtimeTracePolicy = options.runtimeTracePolicy
      ?? (options.captureTrace === true ? 'evaluation' : 'none')
    const evaluateProfile = [
      options.path ? `path:${options.path}` : '',
      `desugar:${options.desugar ?? true}`,
      `parse-events:${parseEventPolicy}`,
      `runtime-trace:${runtimeTracePolicy}`,
    ].filter(Boolean).join('|')
    const key = cacheKey(
      channelCacheParts({
        channel: this.channel,
        dialect: prepared.stack.dialect,
        fileHash: contentHash,
        extra: evaluateProfile,
      }),
    )

    if (!options.recompute) {
      const hit = this.cache.get(key)
      if (hit) {
        return { ...hit, cacheHit: true, atBeat: this.cache.currentBeat() }
      }
    }

    const runOpts: RunSpwOptions = {
      desugar: options.desugar,
      parseEventPolicy: options.parseEventPolicy,
      runtimeTracePolicy: options.runtimeTracePolicy,
      captureTrace: options.captureTrace ?? false,
      registers: this.registers,
      substrate: this.substrate,
      path: options.path,
      dialect: prepared.stack.dialect,
      autoDialect: false,
      channel: this.channel,
    }

    const result = runSpw(prepared.source, runOpts)
    const phrases = scanBracePhrases(prepared.original)
    const record: HotEvalRecord = {
      contentHash,
      prepared,
      result,
      phrases,
      phraseCounts: countPhrasesById(phrases),
      cacheHit: false,
      atBeat: this.cache.currentBeat(),
      dialectPolicy: policy.dialect,
    }

    const channelTier = resolveChannelPolicy(this.channel).cacheDefaultTier
    const tier =
      options.tier ?? resolveProductCacheTier(policy.cacheTier, channelTier)

    this.cache.set(key, record, tier)
    return record
  }

  /**
   * Parse-only surface card: flow, geometric resonance (scheme from grain/dialect),
   * bytecode, probes. Optionally cached in inspect plane.
   */
  inspect(source: string, options: HotEvalOptions = {}): HotInspectRecord {
    const prepared = prepareSource(source, {
      path: options.path,
      dialect: options.dialect,
      autoDialect: options.autoDialect,
      channel: this.channel,
    })
    const policy = resolveDialectPolicy(prepared.stack.dialect)
    const grain = this.grainFor(prepared.stack.dialect, {
      resonanceScheme: options.resonanceScheme,
      ...options.grain,
    })
    const contentHash = productHash(prepared)
    const scheme = options.resonanceScheme ?? grain.resonanceScheme
    const parseEventPolicy = options.parseEventPolicy ?? 'trace'
    const key = cacheKey(
      channelCacheParts({
        channel: this.channel,
        dialect: prepared.stack.dialect,
        fileHash: contentHash,
        extra: `inspect|${options.path ? `path:${options.path}` : ''}|parse-events:${parseEventPolicy}|${scheme}|${grain.depth}|${grain.plane}`,
      }),
    )

    if (!options.recompute && policy.inspectMemory) {
      const hit = this.inspectCache.get(key)
      if (hit) {
        if (grain.volatility > 0.5) this.tick(0, grain.volatility * 0.25)
        return {
          ...hit,
          cacheHit: true,
          atBeat: this.cache.currentBeat(),
          cache: this.cache.stats(),
        }
      }
    }

    const parseResult = parse(prepared.source, {
      autoDialect: false,
      dialect: prepared.stack.dialect,
      path: options.path,
      eventPolicy: parseEventPolicy,
    })
    const phrases = scanBracePhrases(prepared.original)
    const fixityCounts = countFixity(phrases)
    const phraseKeys = phraseKeysForHits(phrases, {
      dialect: prepared.stack.dialect,
      channel: this.channel,
      contentHash,
    })
    const medium = resolveRuntimeMedium(this.channel, prepared.stack.dialect)
    const flow = scanFlowProtocol(prepared.original, options.path)

    let geometric: GeometricResonanceReport
    if (grainWantsResonance(grain)) {
      geometric = detectGeometricResonances(prepared.original, {
        uri: options.path,
        scheme: {
          ...resolveWeightScheme(scheme),
          limit: grain.resonanceLimit,
        },
      })
    } else {
      geometric = detectGeometricResonances(prepared.original, {
        uri: options.path,
        scheme: { ...resolveWeightScheme(scheme), limit: 0, floor: 1 },
      })
    }

    const probeMeasure = measureProbesAndSubstrate(prepared.original, this.substrate)

    const record: HotInspectRecord = {
      contentHash,
      prepared,
      parse: parseResult,
      phrases,
      phraseCounts: countPhrasesById(phrases),
      fixityCounts,
      phraseKeys,
      medium,
      experimentalRefs: parseResult.experimentalRefs ?? [],
      flow,
      geometric,
      probeMeasure,
      channel: this.channel,
      cache: this.cache.stats(),
      dialectPolicy: policy,
      bytecode: geometric.bytecode,
      cacheHit: false,
      atBeat: this.cache.currentBeat(),
    }

    if (policy.inspectMemory) {
      const channelTier = resolveChannelPolicy(this.channel).cacheDefaultTier
      const tier = resolveProductCacheTier(policy.cacheTier, channelTier)
      this.inspectCache.set(key, record, tier)
    }

    if (grain.volatility > 0.4) this.tick(0, grain.volatility * 0.5)

    return record
  }

  /**
   * Build interconnect graph for a surface using dialect opt handles.
   */
  interconnect(source: string, options: HotEvalOptions = {}): {
    graph: InterconnectGraph
    summary: ReturnType<typeof interconnectSummary>
    policy: DialectRuntimePolicy
    inspect: HotInspectRecord
  } {
    const card = this.inspect(source, options)
    const policy = card.dialectPolicy
    const opts = optChannelsFor(policy.optHandles)
    const graph = buildSurfaceInterconnect({
      uri: options.path,
      contentHash: card.contentHash,
      channel: this.channel,
      dialect: card.prepared.stack.dialect,
      stack: {
        dialect: card.prepared.stack.dialect,
        dialectSource: card.prepared.stack.dialectSource,
        review: card.prepared.stack.review,
        format: card.prepared.stack.format,
      },
      form: {
        maxDepth: card.bytecode.maxDepth,
        braceKinds: Object.keys(card.bytecode.braceKinds),
        topOps: card.geometric.geometry.topOps,
        contentHash: card.bytecode.contentHash,
      },
      phrases: card.phraseCounts,
      flow: card.flow,
      bytecode: {
        version: 'spw.geometry.bc/1',
        contentHash: card.bytecode.contentHash,
        maxDepth: card.bytecode.maxDepth,
        unitCount: card.bytecode.unitCount,
        scheduleCount: card.bytecode.scheduleCount,
      },
      resonance: {
        scheme: card.geometric.scheme,
        edges: card.geometric.resonances.slice(0, 24).map(r => ({
          type: r.type,
          ends: r.ends,
          strength: r.strength,
          features: r.features,
          uri: r.uri,
          line: r.line,
        })),
      },
      biasAxes: card.flow.biasAxes,
      labels: Object.keys(card.phraseCounts).filter(
        k => k.includes('label') || k.startsWith('phrase.'),
      ),
      lenses: {
        primary: makeLens('session', this.id),
        optChannels: opts,
        channel: this.channel,
      },
    })
    return {
      graph,
      summary: interconnectSummary(graph),
      policy,
      inspect: card,
    }
  }

  /** Spw-native inspect surface (not JSON). */
  inspectAsSpw(source: string, options: HotEvalOptions = {}): string {
    const cite = this.cite(source, options)
    return formatInspectSpw(cite.inspect!, cite.grain, cite.pointer, {
      path: options.path,
      channel: this.channel,
    })
  }

  /** Dual-read cite card — uri + mask + grain. */
  formatCiteSpw(handle: HotCiteHandle): string {
    return formatCiteSpwCard(handle, this.channel)
  }

  /**
   * Point arm — content-addressed form product without host JSON.
   * Mask = bytecode contentHash; pointer keeps @bc: for follow interop only.
   */
  cite(source: string, options: HotEvalOptions = {}): HotCiteHandle {
    const inspect = this.inspect(source, options)
    const grain = this.grainFor(inspect.prepared.stack.dialect, {
      resonanceScheme: options.resonanceScheme,
      ...options.grain,
    })
    const ref = irRef('form', {
      uri: options.path,
      contentHash: inspect.bytecode.contentHash,
      dialect: inspect.prepared.stack.dialect,
      channel: this.channel,
      producer: this.id,
      bornBeat: this.currentBeat(),
      schema: 'spw.geometry.bc/1',
      lens: makeLens('session', this.id, {
        labels: grain.plane === 'resonance' ? ['resonance'] : ['bytecode'],
      }),
    })
    const key = irRefKey(ref)
    const pointer = `@bc:${inspect.bytecode.contentHash}`
    const handle: HotCiteHandle = {
      ref,
      pointer,
      grain,
      source,
      path: options.path,
      inspect,
    }
    this.handles.set(key, handle)
    this.handles.set(pointer, handle)
    this.handles.set(inspect.bytecode.contentHash, handle)
    return handle
  }

  /**
   * Follow arm — resolve a cite under granularity (soft/hard).
   * Hard follow may evaluate when grain.plane=eval and dialect allows.
   */
  follow(
    pointerOrRef: string | IrRef,
    options: HotEvalOptions = {},
  ): HotCiteHandle | null {
    const key =
      typeof pointerOrRef === 'string'
        ? pointerOrRef
        : irRefKey(pointerOrRef)
    let handle = this.handles.get(key) ?? this.handles.get(key.replace(/^@bc:/, ''))
    if (!handle) return null

    const grain = options.grain
      ? this.grainFor(handle.ref.dialect ?? 'Spw.b', options.grain)
      : handle.grain

    if (grainWantsInterconnect(grain) || grain.follow !== 'point') {
      handle = {
        ...handle,
        inspect: this.inspect(handle.source, {
          ...options,
          path: handle.path,
          grain: {
            depth: grain.depth,
            plane: grain.plane,
            follow: grain.follow,
            resonanceScheme: grain.resonanceScheme,
          },
        }),
        grain,
      }
      this.handles.set(handle.pointer, handle)
    }

    if (grainWantsEval(grain) && grain.follow === 'hard') {
      handle = {
        ...handle,
        evaluate: this.evaluate(handle.source, {
          ...options,
          path: handle.path,
        }),
        grain,
      }
      this.handles.set(handle.pointer, handle)
    }

    return handle
  }

  /**
   * Hot collapse — Spw.x-shaped `* @bc` under hard follow + channel allowance.
   * Returns evaluate success + cacheHit; does not write host trees.
   */
  collapse(
    pointerOrRef: string | IrRef,
    options: HotEvalOptions = {},
  ): { ok: boolean; cacheHit?: boolean; pointer: string; note: string } {
    const dialect =
      typeof pointerOrRef === 'string'
        ? this.handles.get(pointerOrRef)?.ref.dialect
        : pointerOrRef.dialect
    const grain = this.grainFor(dialect ?? 'Spw.x', {
      plane: 'eval',
      follow: 'hard',
      depth: 'card',
      ...options.grain,
    })
    const ptr =
      typeof pointerOrRef === 'string' ? pointerOrRef : irRefKey(pointerOrRef)
    if (grain.follow !== 'hard') {
      return {
        ok: false,
        pointer: ptr,
        note: 'collapse requires follow=hard (Spw.x / live channel)',
      }
    }
    const policy = resolveChannelPolicy(this.channel)
    if (policy.effectCeiling === 'none') {
      return {
        ok: false,
        pointer: ptr,
        note: 'channel effectCeiling=none forbids collapse',
      }
    }
    const handle = this.follow(pointerOrRef, {
      ...options,
      grain: { plane: 'eval', follow: 'hard', depth: 'card' },
    })
    if (!handle?.evaluate) {
      return {
        ok: false,
        pointer: ptr,
        note: 'no handle — cite first, then collapse',
      }
    }
    return {
      ok: !!handle.evaluate.result.success,
      cacheHit: handle.evaluate.cacheHit,
      pointer: handle.pointer,
      note: handle.evaluate.cacheHit ? 'cache hit' : 'evaluated',
    }
  }

  /** List live bytecode pointers (Spw dual-read). */
  listPointers(): string[] {
    const out: string[] = []
    for (const k of this.handles.keys()) {
      if (k.startsWith('@bc:')) out.push(k)
    }
    return out
  }

  invalidateAll(): void {
    this.cache.tick(512)
    this.inspectCache.tick(512)
    this.handles.clear()
  }

  /** Invalidate by content hash prefix (both planes + handles). */
  invalidateContentHash(hash: string): number {
    let n =
      this.cache.invalidateFileHash(hash) + this.inspectCache.invalidateFileHash(hash)
    for (const [k, h] of [...this.handles.entries()]) {
      if (h.ref.contentHash === hash || k.includes(hash)) {
        this.handles.delete(k)
        n++
      }
    }
    return n
  }
}

export function createHotSession(options?: HotSessionOptions): HotRuntimeSession {
  return new HotRuntimeSession(options)
}

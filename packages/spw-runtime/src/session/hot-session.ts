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
 * @see packages/spw-runtime/src/session/dialect-policy.ts
 * @see docs/theory/spw/brace-charge-crawl.spw
 */

import { createHash } from 'node:crypto'
import {
  parse,
  type DialectId,
  detectGeometricResonances,
  scanFlowProtocol,
  buildSurfaceInterconnect,
  interconnectSummary,
  makeLens,
  openOptChannel,
  irRef,
  irRefKey,
  resolveGranularity,
  grainWantsResonance,
  grainWantsEval,
  grainWantsInterconnect,
  formatGranularityAsSpw,
  formatResonanceAsSpw,
  resolveWeightScheme,
  type InterconnectGraph,
  type GeometricResonanceReport,
  type GeometryBytecode,
  type IrRef,
  type Granularity,
  type ResolveGranularityInput,
} from '@spwashi/spw-seed'
import { RegisterBank } from '../state/register-bank'
import { BeatCache, cacheKey, type CacheTier } from '../state/memory-cache'
import { Substrate } from '../pipeline/substrate'
import { runSpw } from '../pipeline/run-spw'
import type { RunSpwOptions, RunSpwResult } from '../pipeline/types'
import type { StabilityChannel } from './channels'
import { resolveChannelPolicy, channelCacheParts } from './channels'
import type { ConsumerContext } from './consumer'
import { prepareSource, type PreparedSource } from './prepare'
import { scanBracePhrases, countPhrasesById, type PhraseHit } from './phrases'
import { measureProbesAndSubstrate } from './probe-measure'
import {
  resolveDialectPolicy,
  resolveProductCacheTier,
  type DialectRuntimePolicy,
  type OptHandleId,
} from './dialect-policy'

export interface HotSessionOptions {
  channel?: StabilityChannel | string
  consumer?: ConsumerContext
  cacheMaxEntries?: number
  defaultTier?: CacheTier
  /** Session id for substrate naming. */
  id?: string
}

export interface HotEvalOptions {
  path?: string
  dialect?: DialectId | string
  autoDialect?: boolean
  desugar?: boolean
  captureTrace?: boolean
  /** Force recompute even on cache hit. */
  recompute?: boolean
  /** Cache tier for this entry. */
  tier?: CacheTier
  /** Override resonance scheme (else dialect policy / grain). */
  resonanceScheme?: string
  /** Granularity overrides (depth/plane/follow/disclose). */
  grain?: Partial<ResolveGranularityInput>
}

/** In-memory handle for bytecode / surface cites (point arm). */
export interface HotCiteHandle {
  ref: IrRef
  /** Spw dual-read pointer form. */
  pointer: string
  grain: Granularity
  source: string
  path?: string
  inspect?: HotInspectRecord
  evaluate?: HotEvalRecord
}

export interface HotEvalRecord {
  /** Hash of prepared source bytes (post-dialect cut). */
  contentHash: string
  prepared: PreparedSource
  result: RunSpwResult
  phrases: PhraseHit[]
  phraseCounts: Record<string, number>
  cacheHit: boolean
  atBeat: number
  dialectPolicy?: string
}

export interface HotInspectRecord {
  /** Hash of prepared source bytes (post-dialect cut). */
  contentHash: string
  prepared: PreparedSource
  parse: ReturnType<typeof parse>
  phrases: PhraseHit[]
  phraseCounts: Record<string, number>
  experimentalRefs: string[]
  flow: ReturnType<typeof scanFlowProtocol>
  geometric: GeometricResonanceReport
  probeMeasure: ReturnType<typeof measureProbesAndSubstrate>
  channel: StabilityChannel
  cache: ReturnType<BeatCache<unknown>['stats']>
  dialectPolicy: DialectRuntimePolicy
  bytecode: GeometryBytecode
  cacheHit: boolean
  atBeat: number
}

function hashContent(source: string): string {
  return createHash('sha256').update(source).digest('hex').slice(0, 16)
}

/** Prefer path receipt preparedHash when present (same algorithm as prepare). */
function productHash(prepared: PreparedSource): string {
  return prepared.pathReceipt?.preparedHash ?? hashContent(prepared.source)
}

function optChannelsFor(handles: readonly OptHandleId[]) {
  const all: Record<string, ReturnType<typeof openOptChannel>> = {
    parse_reuse: openOptChannel('parse_reuse', ['parse', 'lex', 'preprocess'], {
      via: ['produces', 'consumes'],
    }),
    phrase_opt: openOptChannel('phrase_opt', ['phrase', 'form', 'flow'], {
      scheme: 'thrift',
      via: ['optimizes', 'projects'],
    }),
    path_memo: openOptChannel('path_memo', ['graph', 'selection'], {
      via: ['traverses', 'cites'],
      budget: { nodes: 4096 },
    }),
    label_opt: openOptChannel('label_opt', ['phrase', 'form', 'identity'], {
      scheme: 'default',
      via: ['optimizes', 'cites'],
      cacheFragment: 'label',
    }),
    bias_rank: openOptChannel('bias_rank', ['bias', 'flow', 'attention'], {
      via: ['optimizes', 'resonates'],
      cacheFragment: 'bias',
    }),
    schedule_opt: openOptChannel('schedule_opt', ['flow', 'stream'], {
      via: ['resonates', 'projects'],
      cacheFragment: 'schedule',
    }),
    probe_opt: openOptChannel('probe_opt', ['probe', 'measure', 'resonance'], {
      scheme: 'thrift',
      via: ['resonates', 'optimizes'],
      cacheFragment: 'probe',
    }),
    precipitate_cite: openOptChannel('precipitate_cite', ['precipitate', 'onf', 'parse'], {
      via: ['precipitates', 'projects'],
    }),
  }
  return handles.map(h => all[h]).filter((c): c is NonNullable<typeof c> => !!c)
}

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
  grainFor(preparedDialect: string, override?: Partial<ResolveGranularityInput>): Granularity {
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
    // Top-level fields stay evaluate-plane for sense-cycle / callers;
    // nested planes disclose both memories.
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
    // Product identity uses prepared cut × dialect × channel (path receipt proves why).
    const contentHash = productHash(prepared)
    const key = cacheKey(
      channelCacheParts({
        channel: this.channel,
        dialect: prepared.stack.dialect,
        fileHash: contentHash,
        extra: options.path ? `path:${options.path}` : undefined,
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
   * Resonance volume is a product of language physics (volatility × scheme limit).
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
    const key = cacheKey(
      channelCacheParts({
        channel: this.channel,
        dialect: prepared.stack.dialect,
        fileHash: contentHash,
        extra: `inspect|${options.path ? `path:${options.path}` : ''}|${scheme}|${grain.depth}|${grain.plane}`,
      }),
    )

    if (!options.recompute && policy.inspectMemory) {
      const hit = this.inspectCache.get(key)
      if (hit) {
        // Soft volatility pressure on hits
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
    })
    const phrases = scanBracePhrases(prepared.original)
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
      // Skim/bytecode-only: still compile bytecode via detect with limit 0 edges
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

    // Volatility demotes stale working set after materialize
    if (grain.volatility > 0.4) this.tick(0, grain.volatility * 0.5)

    return record
  }

  /**
   * Build interconnect graph for a surface using dialect opt handles
   * (labels, bias, schedule, probe as optimization levers).
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
      labels: Object.keys(card.phraseCounts).filter(k => k.includes('label') || k.startsWith('phrase.')),
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

  /**
   * Spw-native inspect surface (not JSON) — dual-read card for agents/humans.
   */
  inspectAsSpw(source: string, options: HotEvalOptions = {}): string {
    const cite = this.cite(source, options)
    const card = cite.inspect!
    const p = card.dialectPolicy
    const grain = cite.grain
    const receipt = card.prepared.pathReceipt
    const lines = [
      `// hot-inspect  channel=${this.channel}  beat=${card.atBeat}`,
      `@dialect:${card.prepared.stack.dialect}`,
      `^seed[Hot.Inspect v:0.1 @profile:${card.prepared.stack.dialect} @intent:inspect]`,
      formatGranularityAsSpw(grain),
      `^["policy"]{`,
      `  subject: "${p.subject.replace(/"/g, '\\"')}"`,
      `  cacheTier: ${p.cacheTier}`,
      `  resonanceScheme: ${grain.resonanceScheme}`,
      `  opt: #[ ${p.optHandles.join(' ; ')} ]`,
      `  literacy: "${p.literacy.replace(/"/g, '\\"')}"`,
      `}`,
      `^["path_receipt"]{`,
      `  ~#originalHash: ${receipt.originalHash}`,
      `  ~#preparedHash: ${receipt.preparedHash}`,
      `  ~#preprocessed: ${receipt.preprocessed}`,
      `  ~#dialectSource: ${receipt.dialectSource}`,
      `  ~#schema: ${receipt.schema}`,
      `}`,
      `^["card"]{`,
      `  path: ${options.path ? `~"${options.path}"` : '_'}`,
      `  ~#mask: ${card.bytecode.contentHash}`,
      `  ~#preparedHash: ${card.contentHash}`,
      `  ~#plane: ${grain.plane}`,
      `  ~#grain: ${grain.depth}`,
      `  pointer: ${cite.pointer}`,
      `  parseOk: ${card.parse.success ? '#yes' : '#no'}`,
      `  inspectHit: ${card.cacheHit ? '#yes' : '#no'}`,
      `}`,
      formatResonanceAsSpw(card.geometric, options.path),
    ]
    return lines.join('\n')
  }

  /**
   * Dual-read cite card — uri + mask + grain; pointer is mask facet for follow interop.
   * Soft tags are not first-class; use @bind or ~# cells for human names.
   */
  formatCiteSpw(handle: HotCiteHandle): string {
    const r = handle.inspect?.prepared.pathReceipt
    const mask = handle.ref.contentHash ?? handle.pointer.replace(/^@bc:/, '')
    return [
      `// cite  dual-read point arm`,
      `^["cite"]{`,
      `  ~#uri: ${handle.path ? `~"${handle.path}"` : '_'}`,
      `  ~#mask: ${mask}`,
      `  ~#plane: ${handle.grain.plane}`,
      `  ~#grain: ${handle.grain.depth}`,
      `  ~#follow: ${handle.grain.follow}`,
      `  ~#channel: ${handle.ref.channel ?? this.channel}`,
      `  ~#dialect: ${handle.ref.dialect ?? '_'}`,
      `  ~#schema: ${handle.ref.schema ?? 'spw.geometry.bc/1'}`,
      r
        ? `  ~#preparedHash: ${r.preparedHash}`
        : `  ~#preparedHash: ${handle.inspect?.contentHash ?? '_'}`,
      r ? `  ~#preprocessed: ${r.preprocessed}` : null,
      `  ~#pointer: ${handle.pointer}`,
      `}`,
    ]
      .filter(Boolean)
      .join('\n')
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
      lens: makeLens('session', this.id, { labels: grain.plane === 'resonance' ? ['resonance'] : ['bytecode'] }),
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
        ? pointerOrRef.startsWith('@bc:')
          ? pointerOrRef
          : pointerOrRef
        : irRefKey(pointerOrRef)
    let handle = this.handles.get(key) ?? this.handles.get(key.replace(/^@bc:/, ''))
    if (!handle && options.path) {
      // Re-cite if source provided via recompute path only
      return null
    }
    if (!handle) return null

    const grain = options.grain
      ? this.grainFor(handle.ref.dialect ?? 'Spw.b', options.grain)
      : handle.grain

    if (grainWantsInterconnect(grain) || grain.follow !== 'point') {
      // Refresh inspect under current grain
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
    if (grain.follow !== 'hard') {
      return {
        ok: false,
        pointer: typeof pointerOrRef === 'string' ? pointerOrRef : irRefKey(pointerOrRef),
        note: 'collapse requires follow=hard (Spw.x / live channel)',
      }
    }
    const policy = resolveChannelPolicy(this.channel)
    if (policy.effectCeiling === 'none') {
      return {
        ok: false,
        pointer: typeof pointerOrRef === 'string' ? pointerOrRef : irRefKey(pointerOrRef),
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
        pointer: typeof pointerOrRef === 'string' ? pointerOrRef : irRefKey(pointerOrRef),
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

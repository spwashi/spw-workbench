/**
 * Sense cycle — inspectable multi-step processing over before/after surfaces.
 *
 * effect.l0.measure by design: no host writes. Used by CLI `spw cycle` and tests.
 *
 * Pipeline (composable steps):
 *   prepare → parse → inspect (flow/geometry/phrases/probes) → optional evaluate
 * Cache interactions via HotRuntimeSession; beat ticks between steps when requested.
 *
 * @see docs/theory/spw/measure-context-kernel.spw
 * @see packages/spw-seed/src/ir
 */

import { createHash } from 'node:crypto'
import {
  interconnectSummary,
  type InterconnectGraph,
} from '@spwashi/spw-seed'
import { createHotSession, type HotRuntimeSession } from './hot-session'
import type { StabilityChannel } from './channels'

export type SenseCycleStepId =
  | 'prepare'
  | 'parse'
  | 'inspect'
  | 'evaluate'
  | 'beat'
  | 'interconnect'

export interface SenseCycleSurface {
  /** Relative or logical path for dialect/path defaults. */
  path?: string
  text: string
}

export interface SenseCycleOptions {
  before: SenseCycleSurface
  /** If omitted, cycle re-inspects `before` (cache / beat probes). */
  after?: SenseCycleSurface
  channel?: StabilityChannel | string
  /** Steps to run (default: prepare, parse, inspect, interconnect). */
  steps?: SenseCycleStepId[]
  /** Beat ticks between before and after (default 0). */
  beatsBetween?: number
  /** Re-evaluate after on same session to surface cache hits. */
  probeCache?: boolean
  session?: HotRuntimeSession
}

export interface CycleStepReceipt {
  step: SenseCycleStepId
  phase: 'before' | 'after' | 'between'
  atBeat: number
  note?: string
  data?: Record<string, unknown>
}

export interface CycleCard {
  path?: string
  contentHash: string
  dialect?: string
  dialectSource?: string
  parseOk: boolean
  parseErrors: number
  experimentalRefs: string[]
  phraseCounts: Record<string, number>
  flowSummary?: string
  flowRoles?: Record<string, number>
  schedules?: string[]
  probeSummary?: string
  geometricResonanceCount?: number
  cache?: { size: number; hits: number; misses: number; beat: number }
  evaluateOk?: boolean
}

export interface SenseCycleResult {
  schema: 'spw.sense.cycle/1'
  channel: string
  steps: CycleStepReceipt[]
  before: CycleCard
  after: CycleCard
  delta: {
    contentChanged: boolean
    parseOkChanged: boolean
    dialectChanged: boolean
    phraseKeysChanged: string[]
    flowRoleDeltas: Record<string, number>
    cache: {
      beforeHits: number
      afterHits: number
      secondAfterHit?: boolean
    }
  }
  interconnect?: {
    before: ReturnType<typeof interconnectSummary>
    after: ReturnType<typeof interconnectSummary>
  }
  /** Full graphs when callers need them (tests); omit from default CLI text. */
  graphs?: { before: InterconnectGraph; after: InterconnectGraph }
}

function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function cardFromInspect(
  path: string | undefined,
  text: string,
  session: HotRuntimeSession,
  evaluate?: boolean,
): { card: CycleCard; inspect: ReturnType<HotRuntimeSession['inspect']> } {
  const inspect = session.inspect(text, { path })
  let evaluateOk: boolean | undefined
  if (evaluate) {
    const ev = session.evaluate(text, { path, captureTrace: false })
    evaluateOk = ev.result.success
  }
  const card: CycleCard = {
    path,
    contentHash: hash(inspect.prepared.source),
    dialect: inspect.prepared.stack.dialect,
    dialectSource: inspect.prepared.stack.dialectSource,
    parseOk: !!inspect.parse.success,
    parseErrors: inspect.parse.errors?.length ?? 0,
    experimentalRefs: inspect.experimentalRefs ?? [],
    phraseCounts: inspect.phraseCounts,
    flowSummary: undefined,
    flowRoles: inspect.flow.roles as unknown as Record<string, number>,
    schedules: inspect.flow.schedules,
    probeSummary: inspect.probeMeasure.summary,
    geometricResonanceCount: inspect.geometric.resonances.length,
    cache: {
      size: inspect.cache.size,
      hits: inspect.cache.hits,
      misses: inspect.cache.misses,
      beat: inspect.cache.beat,
    },
    evaluateOk,
  }
  // format flow summary without importing formatFlowProtocolSummary dependency cycle risk
  const roles = inspect.flow.roles as Record<string, number>
  const parts = Object.entries(roles)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `${r}x${n}`)
  card.flowSummary = `flow-protocol ${parts.join(' ')}`
  return { card, inspect }
}

function phraseKeyDiff(a: Record<string, number>, b: Record<string, number>): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const changed: string[] = []
  for (const k of keys) {
    if ((a[k] ?? 0) !== (b[k] ?? 0)) changed.push(k)
  }
  return changed.sort()
}

function roleDeltas(
  a: Record<string, number> | undefined,
  b: Record<string, number> | undefined,
): Record<string, number> {
  const out: Record<string, number> = {}
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])
  for (const k of keys) {
    const d = (b?.[k] ?? 0) - (a?.[k] ?? 0)
    if (d !== 0) out[k] = d
  }
  return out
}

/**
 * Run an inspectable sense cycle over before/after surfaces.
 */
export function runSenseCycle(options: SenseCycleOptions): SenseCycleResult {
  const stepsWanted = options.steps ?? (['prepare', 'parse', 'inspect', 'interconnect'] as SenseCycleStepId[])
  const wantEval = stepsWanted.includes('evaluate')
  const session =
    options.session ??
    createHotSession({
      channel: options.channel ?? 'trial',
      id: 'sense-cycle',
    })

  const receipts: CycleStepReceipt[] = []
  const afterSurface = options.after ?? options.before

  // ── Before ──────────────────────────────────────────────────
  if (stepsWanted.includes('prepare') || stepsWanted.includes('parse') || stepsWanted.includes('inspect')) {
    receipts.push({
      step: 'prepare',
      phase: 'before',
      atBeat: session.currentBeat(),
      note: `channel=${session.channel}`,
    })
  }

  const beforePack = cardFromInspect(options.before.path, options.before.text, session, wantEval)
  receipts.push({
    step: 'inspect',
    phase: 'before',
    atBeat: session.currentBeat(),
    data: {
      parseOk: beforePack.card.parseOk,
      dialect: beforePack.card.dialect,
      phrases: beforePack.card.phraseCounts,
    },
  })
  if (wantEval) {
    receipts.push({
      step: 'evaluate',
      phase: 'before',
      atBeat: session.currentBeat(),
      data: { ok: beforePack.card.evaluateOk },
    })
  }

  const beforeHits = session.cacheStats().hits

  // ── Beats between ───────────────────────────────────────────
  const beats = options.beatsBetween ?? 0
  if (beats > 0 || stepsWanted.includes('beat')) {
    session.tick(Math.max(1, beats))
    receipts.push({
      step: 'beat',
      phase: 'between',
      atBeat: session.currentBeat(),
      note: `ticked ${Math.max(1, beats)}`,
    })
  }

  // ── After ───────────────────────────────────────────────────
  const afterPack = cardFromInspect(afterSurface.path, afterSurface.text, session, wantEval)
  receipts.push({
    step: 'inspect',
    phase: 'after',
    atBeat: session.currentBeat(),
    data: {
      parseOk: afterPack.card.parseOk,
      dialect: afterPack.card.dialect,
      phrases: afterPack.card.phraseCounts,
    },
  })
  if (wantEval) {
    receipts.push({
      step: 'evaluate',
      phase: 'after',
      atBeat: session.currentBeat(),
      data: { ok: afterPack.card.evaluateOk, role: 'card' },
    })
  }

  let secondAfterHit: boolean | undefined
  if (options.probeCache !== false) {
    // Ensure the after surface is warm: inspect alone does not populate BeatCache.
    // When evaluate was not in steps, prime once, then re-eval for the hit probe.
    if (!wantEval) {
      const prime = session.evaluate(afterSurface.text, {
        path: afterSurface.path,
        captureTrace: false,
      })
      receipts.push({
        step: 'evaluate',
        phase: 'after',
        atBeat: session.currentBeat(),
        note: prime.cacheHit ? 'cache hit (prime)' : 'cache miss (prime)',
        data: { cacheHit: prime.cacheHit, success: prime.result.success, role: 'prime' },
      })
    }
    const again = session.evaluate(afterSurface.text, {
      path: afterSurface.path,
      captureTrace: false,
    })
    secondAfterHit = again.cacheHit
    receipts.push({
      step: 'evaluate',
      phase: 'after',
      atBeat: session.currentBeat(),
      note: again.cacheHit ? 'cache hit (probe)' : 'cache miss (probe)',
      data: { cacheHit: again.cacheHit, success: again.result.success, role: 'probe' },
    })
  }

  const afterHits = session.cacheStats().hits

  // ── Interconnect (dialect opt handles: labels, bias, probe, schedule) ──
  let interconnect: SenseCycleResult['interconnect']
  let graphs: SenseCycleResult['graphs']
  if (stepsWanted.includes('interconnect')) {
    const beforeIx = session.interconnect(options.before.text, { path: options.before.path })
    const afterIx = session.interconnect(afterSurface.text, { path: afterSurface.path })
    interconnect = {
      before: interconnectSummary(beforeIx.graph),
      after: interconnectSummary(afterIx.graph),
    }
    graphs = { before: beforeIx.graph, after: afterIx.graph }
    receipts.push({
      step: 'interconnect',
      phase: 'after',
      atBeat: session.currentBeat(),
      data: {
        beforeNodes: interconnect.before.nodeCount,
        afterNodes: interconnect.after.nodeCount,
        beforeDialect: beforeIx.policy.dialect,
        afterDialect: afterIx.policy.dialect,
        afterOpts: beforeIx.policy.optHandles,
      },
    })
  }

  return {
    schema: 'spw.sense.cycle/1',
    channel: session.channel,
    steps: receipts,
    before: beforePack.card,
    after: afterPack.card,
    delta: {
      contentChanged: beforePack.card.contentHash !== afterPack.card.contentHash,
      parseOkChanged: beforePack.card.parseOk !== afterPack.card.parseOk,
      dialectChanged: beforePack.card.dialect !== afterPack.card.dialect,
      phraseKeysChanged: phraseKeyDiff(beforePack.card.phraseCounts, afterPack.card.phraseCounts),
      flowRoleDeltas: roleDeltas(beforePack.card.flowRoles, afterPack.card.flowRoles),
      cache: {
        beforeHits,
        afterHits,
        secondAfterHit,
      },
    },
    interconnect,
    graphs,
  }
}

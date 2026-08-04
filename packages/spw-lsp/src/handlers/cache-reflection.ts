/**
 * Cache reflection — reading the index back as a record of attention.
 *
 * The document cache exists to make the server fast, but it incidentally
 * records something else: which surfaces were opened, how often they were
 * returned to, which were written and then left alone. Read that way it
 * answers questions about the session rather than about the workspace —
 * where attention actually went, and where a held reading has gone stale.
 *
 * Two readings come out of the same data:
 *
 *   notes     — observations about this session's attention
 *   families  — surfaces grouped by what their marks make them, so a
 *               workspace's own construct kinds become visible
 *
 * Everything here is scoped to what the cache honestly saw. A surface never
 * opened is absent, not durable-and-unvisited; the reflection describes a
 * session, and says so.
 */

import { particleMixTotal, type ParticleMix } from '@spwashi/spw-seed'
import type { HandlerDeps } from '../types'
import { volatilityOf, type Volatility } from './workspace'

/** A surface returned to this many times is one the work keeps leaning on. */
const RETURNING_VISITS = 3
/** Edits before a surface counts as actively churning. */
const CHURNING_WRITES = 3
/** Beats after an edit without reopening before the write reads as left behind. */
const ABANDON_AGE = 8

export type AttentionKind =
  | 'returning'
  | 'churning'
  | 'wrote-without-return'
  | 'expired-view'

export interface AttentionNote {
  kind: AttentionKind
  uri: string
  detail: string
}

/**
 * What a surface's shape makes it. Derived from marks and outbound references
 * rather than from its path, so the naming survives files moving and follows
 * what a surface does instead of where it was filed.
 *
 * Deliberately few. A fifth kind for anchor-heavy surfaces was tried and
 * dropped: nearly every canonical surface here opens with the same header
 * stack, so anchor counts are near-constant and the distinction was never
 * real. Telling indexes from working state from settled canon is what this
 * corpus actually supports.
 */
export type Archetype = 'index' | 'working-state' | 'classified' | 'plain'

/** References before outward-pointing is the surface's main business. */
const INDEX_REFS = 12

export interface SignatureFamily {
  archetype: Archetype
  volatility: Volatility
  uris: string[]
}

export interface CacheReflection {
  beat: number
  tracked: number
  /** Share of all opens spent on the single most-visited surface, 0–1. */
  concentration: number
  notes: AttentionNote[]
  families: SignatureFamily[]
}

/**
 * Name a surface from what it spends itself on.
 *
 * Aspect-heavy means it is holding state mid-flight. Reference-heavy means its
 * job is sending the reader elsewhere. Otherwise, marks that classify are
 * settled canon.
 */
export function archetypeOf(mix: ParticleMix, refCount = 0): Archetype {
  const total = particleMixTotal(mix)
  if (total === 0 && refCount === 0) return 'plain'

  const classified = mix.case + mix.mood
  if (mix.aspect > classified && mix.aspect > mix.deixis) return 'working-state'
  if (refCount >= INDEX_REFS) return 'index'
  if (classified > 0 || mix.deixis > 0) return 'classified'
  return 'plain'
}

function noteFor(
  doc: { uri: string; visits: number; writeCount: number; lastWriteEpoch: number; tier: string },
  volatility: Volatility,
  requestEpoch: number,
): AttentionNote | null {
  const { uri } = doc

  if (doc.visits >= RETURNING_VISITS && doc.writeCount === 0) {
    return {
      kind: 'returning',
      uri,
      detail: `opened ${doc.visits} times and never edited — consulted, not worked on`,
    }
  }

  if (doc.writeCount >= CHURNING_WRITES) {
    return { kind: 'churning', uri, detail: `${doc.writeCount} edits this session` }
  }

  if (doc.writeCount > 0 && doc.lastWriteEpoch >= 0 && requestEpoch - doc.lastWriteEpoch > ABANDON_AGE && doc.tier !== 'hot') {
    return {
      kind: 'wrote-without-return',
      uri,
      detail: `edited ${requestEpoch - doc.lastWriteEpoch} request-epochs ago and not reopened since`,
    }
  }

  if (volatility === 'volatile' && doc.tier !== 'hot') {
    return {
      kind: 'expired-view',
      uri,
      detail: 'deferred state throughout, and the held reading is no longer current',
    }
  }

  return null
}

export function cacheReflection(deps: HandlerDeps): CacheReflection {
  const { serverIndex } = deps
  const beat = serverIndex.getCurrentBeat()

  const notes: AttentionNote[] = []
  const byFamily = new Map<string, SignatureFamily>()
  let tracked = 0
  let totalVisits = 0
  let peakVisits = 0

  for (const [uri, doc] of serverIndex.allDocuments()) {
    tracked += 1
    totalVisits += doc.visits
    peakVisits = Math.max(peakVisits, doc.visits)

    const { volatility } = volatilityOf(doc.mix)
    const note = noteFor({ ...doc, uri }, volatility, beat)
    if (note) notes.push(note)

    const archetype = archetypeOf(doc.mix, doc.selectorHits?.length ?? 0)
    const key = `${archetype}:${volatility}`
    const family = byFamily.get(key) ?? { archetype, volatility, uris: [] }
    family.uris.push(uri)
    byFamily.set(key, family)
  }

  return {
    beat,
    tracked,
    concentration: totalVisits > 0 ? peakVisits / totalVisits : 0,
    // Loudest observations first: a stale reading matters more than a tally.
    notes: notes.sort((a, b) => NOTE_ORDER.indexOf(a.kind) - NOTE_ORDER.indexOf(b.kind)),
    families: [...byFamily.values()].sort((a, b) => b.uris.length - a.uris.length),
  }
}

const NOTE_ORDER: AttentionKind[] = [
  'expired-view',
  'wrote-without-return',
  'returning',
  'churning',
]

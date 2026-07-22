/**
 * Beat-tiered cache — hot / warm / cold TTL in discrete beats.
 *
 * Aligns with `.spw/biome/ocean/algos/cache.spw`:
 *   hot ttlBeats=8, warm=64, cold=256
 * Invalidation by key prefix (e.g. fileHash:) for deterministic expiry.
 *
 * Portable: no DOM. Use for LSP warm paths, selector resolution, and
 * runtime working sets that need beat-clock demotion.
 */

export type CacheTier = 'hot' | 'warm' | 'cold'

export interface BeatCacheOptions {
  /** Default TTL beats by tier (ocean algo defaults). */
  ttl?: Partial<Record<CacheTier, number>>
  /** Hard cap on entries; excess swept by coldest first. */
  maxEntries?: number
  /** Default tier for set() when omitted. */
  defaultTier?: CacheTier
}

export interface BeatCacheEntry<V> {
  value: V
  tier: CacheTier
  /** Beat when written or last promoted */
  bornBeat: number
  /** Beat of last successful get */
  lastAccessBeat: number
  hits: number
}

export interface BeatCacheStats {
  beat: number
  size: number
  byTier: Record<CacheTier, number>
  hits: number
  misses: number
  expired: number
  evicted: number
}

const DEFAULT_TTL: Record<CacheTier, number> = {
  hot: 8,
  warm: 64,
  cold: 256,
}

const TIER_RANK: Record<CacheTier, number> = {
  hot: 0,
  warm: 1,
  cold: 2,
}

/**
 * Discrete-time cache with tier TTLs and prefix invalidation.
 */
export class BeatCache<V = unknown> {
  private readonly entries = new Map<string, BeatCacheEntry<V>>()
  private readonly ttl: Record<CacheTier, number>
  private readonly maxEntries: number
  private readonly defaultTier: CacheTier
  private beat = 0
  private hits = 0
  private misses = 0
  private expired = 0
  private evicted = 0

  constructor(options: BeatCacheOptions = {}) {
    this.ttl = { ...DEFAULT_TTL, ...options.ttl }
    this.maxEntries = options.maxEntries ?? 1024
    this.defaultTier = options.defaultTier ?? 'warm'
  }

  /** Advance the beat clock by n (default 1) and sweep expired entries. */
  tick(n = 1): number {
    const steps = Math.max(0, Math.floor(n))
    this.beat += steps
    if (steps > 0) this.sweep()
    return this.beat
  }

  currentBeat(): number {
    return this.beat
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  get(key: string): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) {
      this.misses++
      return undefined
    }
    if (this.isExpired(entry)) {
      this.entries.delete(key)
      this.expired++
      this.misses++
      return undefined
    }
    entry.lastAccessBeat = this.beat
    entry.hits++
    this.hits++
    // Warmth: repeated access promotes tier
    if (entry.hits >= 3 && entry.tier !== 'hot') {
      this.promote(key)
    }
    return entry.value
  }

  set(key: string, value: V, tier: CacheTier = this.defaultTier): void {
    this.entries.set(key, {
      value,
      tier,
      bornBeat: this.beat,
      lastAccessBeat: this.beat,
      hits: 0,
    })
    if (this.entries.size > this.maxEntries) {
      this.evictOverflow()
    }
  }

  /** Raise tier toward hot and refresh birth beat. */
  promote(key: string): CacheTier | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.tier === 'cold') entry.tier = 'warm'
    else if (entry.tier === 'warm') entry.tier = 'hot'
    entry.bornBeat = this.beat
    entry.lastAccessBeat = this.beat
    return entry.tier
  }

  /** Lower tier toward cold (or delete if already cold and stale). */
  demote(key: string): CacheTier | 'deleted' | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.tier === 'hot') {
      entry.tier = 'warm'
      entry.bornBeat = this.beat
      return entry.tier
    }
    if (entry.tier === 'warm') {
      entry.tier = 'cold'
      entry.bornBeat = this.beat
      return entry.tier
    }
    this.entries.delete(key)
    this.evicted++
    return 'deleted'
  }

  delete(key: string): boolean {
    return this.entries.delete(key)
  }

  /** Expire all keys sharing a prefix (fileHash-style invalidation). */
  invalidatePrefix(prefix: string): number {
    let n = 0
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key)
        n++
      }
    }
    this.evicted += n
    return n
  }

  /** Convenience: invalidate keys `hash:{fileHash}:…` */
  invalidateFileHash(fileHash: string): number {
    return this.invalidatePrefix(`hash:${fileHash}`)
  }

  clear(): void {
    this.entries.clear()
  }

  size(): number {
    return this.entries.size
  }

  stats(): BeatCacheStats {
    const byTier: Record<CacheTier, number> = { hot: 0, warm: 0, cold: 0 }
    for (const e of this.entries.values()) {
      byTier[e.tier]++
    }
    return {
      beat: this.beat,
      size: this.entries.size,
      byTier,
      hits: this.hits,
      misses: this.misses,
      expired: this.expired,
      evicted: this.evicted,
    }
  }

  /** Remove expired entries; returns count removed. */
  sweep(): number {
    let n = 0
    for (const [key, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.entries.delete(key)
        n++
        this.expired++
      }
    }
    return n
  }

  private isExpired(entry: BeatCacheEntry<V>): boolean {
    const ttl = this.ttl[entry.tier]
    return this.beat - entry.lastAccessBeat > ttl
  }

  private evictOverflow(): void {
    // Prefer cold, then warm, then least-recently accessed
    const ranked = [...this.entries.entries()].sort((a, b) => {
      const tr = TIER_RANK[b[1].tier] - TIER_RANK[a[1].tier]
      if (tr !== 0) return tr
      return a[1].lastAccessBeat - b[1].lastAccessBeat
    })
    while (this.entries.size > this.maxEntries && ranked.length) {
      const next = ranked.shift()
      if (!next) break
      this.entries.delete(next[0])
      this.evicted++
    }
  }
}

/** Build a stable cache key from file hash + selector channel. */
export function cacheKey(parts: {
  fileHash?: string
  selectorId?: string
  dialect?: string
  channel?: string
  extra?: string
}): string {
  const segs: string[] = []
  if (parts.fileHash) segs.push(`hash:${parts.fileHash}`)
  if (parts.selectorId) segs.push(`sel:${parts.selectorId}`)
  if (parts.dialect) segs.push(`d:${parts.dialect}`)
  if (parts.channel) segs.push(`ch:${parts.channel}`)
  if (parts.extra) segs.push(parts.extra)
  return segs.join('|') || 'empty'
}

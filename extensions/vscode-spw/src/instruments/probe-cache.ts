export type ProbeCacheReadState = 'hit' | 'miss' | 'expired' | 'disabled'

export interface ProbeCacheRead<T> {
  state: ProbeCacheReadState
  value?: T
  ageMs?: number
}

export interface ProbeCacheSnapshot {
  entries: number
  ttlMs: number
  hits: number
  misses: number
  expired: number
  disabled: number
  writes: number
  clears: number
}

/** Small TTL cache with a receipt suitable for explicit editor probes. */
export class ProbeCache {
  private readonly map = new Map<string, { at: number; value: unknown }>()
  private readonly stats = { hits: 0, misses: 0, expired: 0, disabled: 0, writes: 0, clears: 0 }

  constructor(
    private ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  setTtl(ms: number): void { this.ttlMs = ms }

  get<T>(key: string): T | undefined {
    return this.read<T>(key).value
  }

  read<T>(key: string): ProbeCacheRead<T> {
    if (this.ttlMs <= 0) {
      this.stats.disabled += 1
      return { state: 'disabled' }
    }
    const hit = this.map.get(key)
    if (!hit) {
      this.stats.misses += 1
      return { state: 'miss' }
    }
    const ageMs = this.now() - hit.at
    if (ageMs > this.ttlMs) {
      this.map.delete(key)
      this.stats.expired += 1
      return { state: 'expired', ageMs }
    }
    this.stats.hits += 1
    return { state: 'hit', value: hit.value as T, ageMs }
  }

  set(key: string, value: unknown): void {
    if (this.ttlMs <= 0) return
    this.map.set(key, { at: this.now(), value })
    this.stats.writes += 1
  }

  clear(): void {
    this.map.clear()
    this.stats.clears += 1
  }

  snapshot(): ProbeCacheSnapshot {
    return {
      entries: this.map.size,
      ttlMs: this.ttlMs,
      ...this.stats,
    }
  }
}

import { descriptorForKey } from './type-affinities'
import type { Substrate } from '../pipeline/substrate'
import type {
  PhaseFacet,
  PhaseEnvelope,
  Liminality,
  RegisterEntry,
  RegisterMeta,
  RegisterPhase,
  RegisterSnapshot,
  RegisterWriteOptions,
  RuntimePacket,
  RuntimeRecord,
  RuntimeValue,
  ScopeFrame,
} from './types'
import { PHASE_ORDER } from './types'

const DEFAULT_ACTIVE_KEY = '"'
const HISTORY_KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

function nowIso(): string {
  return new Date().toISOString()
}

function isRuntimePacket(value: RuntimeValue): value is RuntimePacket {
  return typeof value === 'object' && value !== null && 'kind' in value
}

function isScopeFrame(value: RuntimeValue): value is ScopeFrame {
  return typeof value === 'object' && value !== null && 'observer' in value && 'capturedAt' in value
}

function isRuntimeRecord(value: RuntimeValue): value is RuntimeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !isRuntimePacket(value) && !isScopeFrame(value)
}

function cloneRuntimeValue(value: RuntimeValue): RuntimeValue {
  if (value === undefined || value === null) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) {
    return value.map(item => cloneRuntimeValue(item))
  }

  if (isScopeFrame(value)) {
    return {
      observer: value.observer,
      capturedAt: value.capturedAt,
      value: cloneRuntimeValue(value.value),
    }
  }

  if (isRuntimePacket(value)) {
    return {
      ...value,
      payload: cloneRuntimeValue(value.payload),
      tags: value.tags ? [...value.tags] : undefined,
    }
  }

  const copy: RuntimeRecord = {}
  for (const [key, item] of Object.entries(value)) {
    copy[key] = cloneRuntimeValue(item)
  }
  return copy
}

function mergeRuntimeValues(left: RuntimeValue, right: RuntimeValue): RuntimeValue {
  if (right === undefined) return cloneRuntimeValue(left)
  if (left === undefined) return cloneRuntimeValue(right)

  if (Array.isArray(left) && Array.isArray(right)) {
    return [...left.map(cloneRuntimeValue), ...right.map(cloneRuntimeValue)]
  }

  if (isRuntimeRecord(left) && isRuntimeRecord(right)) {
    const merged: RuntimeRecord = { ...left }
    for (const [key, value] of Object.entries(right)) {
      merged[key] = cloneRuntimeValue(value)
    }
    return merged
  }

  return cloneRuntimeValue(right)
}

function runtimeMagnitude(value: RuntimeValue): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return Math.abs(value)
  if (typeof value === 'string') return value.length
  if (typeof value === 'boolean') return value ? 1 : 0
  if (Array.isArray(value)) return value.length
  if (isScopeFrame(value)) return runtimeMagnitude(value.value)
  if (isRuntimePacket(value)) return runtimeMagnitude(value.payload)
  return Object.keys(value).length
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export class RegisterBank {
  private readonly entries = new Map<string, RegisterEntry>()
  private readonly lensIndex = new Map<string, Set<string>>()
  /** Circular buffer of write timestamps per cell (last N) for frequency computation */
  private readonly writeTimestamps = new Map<string, number[]>()
  /** Coupling edges: Map<keyA, Set<keyB>> (bidirectional) */
  private readonly couplingEdges = new Map<string, Set<string>>()
  private activeKey = DEFAULT_ACTIVE_KEY
  /** Optional substrate for event-driven processing. Opt-in: zero overhead when null. */
  private substrate: Substrate | null = null

  private static readonly FREQUENCY_WINDOW_SIZE = 10

  constructor(initial: Record<string, RuntimeValue> = {}, substrate?: Substrate) {
    if (substrate) this.substrate = substrate
    this.ensureEntry(DEFAULT_ACTIVE_KEY)
    for (const [key, value] of Object.entries(initial)) {
      this.set(key, value, { source: 'init', force: true })
    }
  }

  /** Attach a substrate for event-driven processing. */
  attachSubstrate(substrate: Substrate): void {
    this.substrate = substrate
  }

  /** Detach the current substrate. */
  detachSubstrate(): Substrate | null {
    const prev = this.substrate
    this.substrate = null
    return prev
  }

  setActive(key: string): void {
    this.ensureEntry(key)
    this.activeKey = key
  }

  getActiveKey(): string {
    return this.activeKey
  }

  listKeys(): string[] {
    return [...this.entries.keys()].sort((a, b) => a.localeCompare(b))
  }

  keysForLens(lens: string): string[] {
    const keys = this.lensIndex.get(lens)
    if (!keys) return []
    return [...keys].sort((a, b) => a.localeCompare(b))
  }

  set(key: string, value: RuntimeValue, options: RegisterWriteOptions = {}): boolean {
    const entry = this.ensureEntry(key)
    if (entry.meta.immutable && !options.force) {
      return false
    }

    const descriptor = options.descriptor
      ? {
        ...entry.meta.descriptor,
        ...options.descriptor,
      }
      : entry.meta.descriptor

    entry.value = cloneRuntimeValue(value)
    entry.meta = {
      ...entry.meta,
      descriptor,
      writes: entry.meta.writes + 1,
      lastUsedAt: nowIso(),
      immutable: options.immutable ?? entry.meta.immutable,
      provenance: this.pushProvenance(entry.meta.provenance, options.source ?? 'set'),
    }

    // Track write timestamp for frequency computation
    this.recordWriteTimestamp(key)

    // Phase enrichment — additive, in-place on existing cells
    if (options.phase) {
      entry.meta.phases = this.advancePhase(
        entry.meta.phases,
        options.phase,
        options.source ?? 'set',
      )
    }

    // Substrate emission — event-driven processing
    this.substrate?.emit({
      kind: 'write',
      key,
      value: entry.value,
      phase: options.phase,
      source: options.source,
      at: nowIso(),
    })

    return true
  }

  /**
   * Enrich a register cell's phase without changing its value.
   * Useful for progressive enrichment (e.g., lex → parse → sem).
   */
  enrichPhase(key: string, phase: RegisterPhase, source?: string): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false

    entry.meta.phases = this.advancePhase(
      entry.meta.phases,
      phase,
      source ?? `enrich:${phase}`,
    )
    entry.meta.lastUsedAt = nowIso()
    return true
  }

  /**
   * Return the current phase of a register cell, or undefined if unphased.
   */
  phaseOf(key: string): RegisterPhase | undefined {
    return this.entries.get(key)?.meta.phases?.current
  }

  get(key: string = this.activeKey): RuntimeValue {
    const entry = this.ensureEntry(key)
    return cloneRuntimeValue(entry.value)
  }

  yank(value: RuntimeValue, source = 'yank'): boolean {
    const wroteActive = this.set(this.activeKey, value, { source })
    this.set(DEFAULT_ACTIVE_KEY, value, { source: `${source}:default`, force: true })
    this.rotateHistory(value, source)
    return wroteActive
  }

  paste(key: string = this.activeKey): RuntimeValue {
    const entry = this.ensureEntry(key)
    entry.meta.lastUsedAt = nowIso()
    entry.meta.provenance = this.pushProvenance(entry.meta.provenance, 'paste')
    return cloneRuntimeValue(entry.value)
  }

  access(base: RuntimeValue, path: string[]): RuntimeValue {
    let current: RuntimeValue = cloneRuntimeValue(base)

    for (const segment of path) {
      if (current === undefined || current === null) {
        return undefined
      }

      if (Array.isArray(current)) {
        const index = Number.parseInt(segment, 10)
        if (!Number.isFinite(index)) return undefined
        current = current[index]
        continue
      }

      if (isRuntimeRecord(current)) {
        current = current[segment]
        continue
      }

      return undefined
    }

    return cloneRuntimeValue(current)
  }

  resonate(name: string, value: RuntimeValue, tag?: string): boolean {
    const lens = tag ?? 'default'
    const resonated = this.set(name, value, {
      source: `resonate:${lens}`,
      descriptor: descriptorForKey('#'),
      force: true,
    })

    if (resonated) {
      const entry = this.ensureEntry(name)
      entry.meta.lenses = this.pushLens(entry.meta.lenses, lens)
      this.addLensIndex(lens, name)
    }

    return resonated
  }

  observe(observer: string, value: RuntimeValue): ScopeFrame {
    const frame: ScopeFrame = {
      observer,
      value: cloneRuntimeValue(value),
      capturedAt: nowIso(),
    }

    this.set('@', frame, {
      source: `observe:${observer}`,
      descriptor: descriptorForKey('@'),
      force: true,
    })

    return frame
  }

  confluent(name: string, ...sources: RuntimeValue[]): RuntimeValue {
    const merged = sources.reduce<RuntimeValue>((acc, item) => mergeRuntimeValues(acc, item), undefined)
    this.set(name, merged, {
      source: 'confluent',
      descriptor: descriptorForKey('&'),
      force: true,
    })
    return cloneRuntimeValue(merged)
  }

  materialize(name: string): RegisterMeta | undefined {
    const entry = this.entries.get(name)
    if (!entry) return undefined
    return {
      ...entry.meta,
      descriptor: { ...entry.meta.descriptor },
      provenance: [...entry.meta.provenance],
    }
  }

  measure(name: string, scale = 1): number {
    const entry = this.entries.get(name)
    if (entry) {
      entry.meta.measureDepth = (entry.meta.measureDepth ?? 0) + 1
    }
    const value = this.get(name)
    const denominator = scale > 0 ? scale : 1
    return clamp01(runtimeMagnitude(value) / denominator)
  }

  // ── Liminality ──────────────────────────────────────────────

  /** Promote a cell's liminality (0→1→2→3). Returns new level or undefined if cell doesn't exist. */
  promote(key: string): Liminality | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    const current = entry.meta.liminality ?? 0
    const next = Math.min(current + 1, 3) as Liminality
    entry.meta.liminality = next
    return next
  }

  /** Demote a cell's liminality (3→2→1→0). Returns new level or undefined if cell doesn't exist. */
  demote(key: string): Liminality | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    const current = entry.meta.liminality ?? 0
    const next = Math.max(current - 1, 0) as Liminality
    entry.meta.liminality = next
    return next
  }

  /** Return the current acoustic frequency of a cell (writes/sec). */
  frequencyOf(key: string): number | undefined {
    return this.entries.get(key)?.meta.frequency
  }

  // ── Marks ──────────────────────────────────────────────────

  /**
   * Register a named positional mark — Vim `'a` equivalent.
   * Stores the value at a mark-prefixed register key.
   */
  markPosition(name: string, value: RuntimeValue): void {
    const markKey = `mark:${name}`
    this.set(markKey, value, {
      source: `mark:${name}`,
      descriptor: { name: `Mark ${name}`, accessMode: 'structural', containerAffinity: 'value' },
      force: true,
    })

    // Substrate emission (mark-specific, in addition to write from set())
    this.substrate?.emit({
      kind: 'mark',
      key: markKey,
      value,
      source: `mark:${name}`,
      at: nowIso(),
    })
  }

  /**
   * Retrieve a named mark's value.
   */
  getMark(name: string): RuntimeValue {
    return this.get(`mark:${name}`)
  }

  // ── Coupling ───────────────────────────────────────────────

  /** Register a coupling edge between two cells. Bidirectional. */
  couple(keyA: string, keyB: string): void {
    this.ensureEntry(keyA)
    this.ensureEntry(keyB)

    // Add bidirectional edges
    if (!this.couplingEdges.has(keyA)) this.couplingEdges.set(keyA, new Set())
    if (!this.couplingEdges.has(keyB)) this.couplingEdges.set(keyB, new Set())
    this.couplingEdges.get(keyA)!.add(keyB)
    this.couplingEdges.get(keyB)!.add(keyA)

    // Update normalized coupling on both cells
    this.updateCoupling(keyA)
    this.updateCoupling(keyB)

    // Substrate emission
    this.substrate?.emit({
      kind: 'couple',
      key: keyA,
      value: this.get(keyA),
      coupledWith: keyB,
      at: nowIso(),
    })
  }

  /** Return the coupling value (0–1) for a cell. */
  couplingOf(key: string): number | undefined {
    return this.entries.get(key)?.meta.coupling
  }

  snapshot(): RegisterSnapshot {
    const entries: RegisterSnapshot['entries'] = {}
    const lensIndex: RegisterSnapshot['lensIndex'] = {}

    for (const [key, entry] of this.entries.entries()) {
      entries[key] = {
        key,
        value: cloneRuntimeValue(entry.value),
        meta: {
          ...entry.meta,
          descriptor: { ...entry.meta.descriptor },
          provenance: [...entry.meta.provenance],
          lenses: [...entry.meta.lenses],
          phases: entry.meta.phases
            ? {
              ...entry.meta.phases,
              facets: entry.meta.phases.facets.map(f => ({ ...f })),
              lineage: entry.meta.phases.lineage ? [...entry.meta.phases.lineage] : undefined,
            }
            : undefined,
        },
      }
    }

    for (const [lens, keys] of this.lensIndex.entries()) {
      lensIndex[lens] = [...keys].sort((a, b) => a.localeCompare(b))
    }

    return {
      activeKey: this.activeKey,
      entries,
      lensIndex,
    }
  }

  private rotateHistory(value: RuntimeValue, source: string): void {
    for (let index = HISTORY_KEYS.length - 1; index > 0; index -= 1) {
      const currentKey = HISTORY_KEYS[index]
      const previousKey = HISTORY_KEYS[index - 1]
      const previousValue = this.entries.get(previousKey)?.value
      this.set(currentKey, previousValue, {
        source: `${source}:history`,
        force: true,
      })
    }

    this.set(HISTORY_KEYS[0], value, {
      source: `${source}:history`,
      force: true,
    })
  }

  private ensureEntry(key: string): RegisterEntry {
    const existing = this.entries.get(key)
    if (existing) {
      return existing
    }

    const descriptor = descriptorForKey(key)
    const entry: RegisterEntry = {
      key,
      value: undefined,
      meta: {
        key,
        descriptor,
        writes: 0,
        lastUsedAt: nowIso(),
        immutable: false,
        provenance: ['init'],
        lenses: [],
        liminality: 0,
        frequency: 0,
        coupling: 0,
        measureDepth: 0,
      },
    }

    this.entries.set(key, entry)
    return entry
  }

  private pushProvenance(provenance: string[], source: string): string[] {
    const next = [...provenance, source]
    if (next.length <= 16) return next
    return next.slice(next.length - 16)
  }

  private pushLens(lenses: string[], lens: string): string[] {
    if (lenses.includes(lens)) return lenses
    return [...lenses, lens]
  }

  private addLensIndex(lens: string, key: string): void {
    const bucket = this.lensIndex.get(lens) ?? new Set<string>()
    bucket.add(key)
    this.lensIndex.set(lens, bucket)
  }

  /**
   * Advance (or create) a phase envelope — in-place, additive.
   * If the cell is already at the target phase, the facet is still recorded.
   */
  private advancePhase(
    existing: PhaseEnvelope | undefined,
    phase: RegisterPhase,
    source: string,
  ): PhaseEnvelope {
    const phaseIndex = PHASE_ORDER.indexOf(phase)
    const facet: PhaseFacet = {
      phase,
      enrichedAt: nowIso(),
      source,
      memoryWeight: phaseIndex >= 0 ? (phaseIndex + 1) / PHASE_ORDER.length : 0.5,
    }

    if (!existing) {
      return {
        current: phase,
        facets: [facet],
      }
    }

    return {
      current: phase,
      facets: [...existing.facets, facet],
      lineage: existing.lineage,
      evictable: existing.evictable,
    }
  }

  /** Record a write timestamp and recompute acoustic frequency for a cell. */
  private recordWriteTimestamp(key: string): void {
    const now = Date.now()
    let timestamps = this.writeTimestamps.get(key)
    if (!timestamps) {
      timestamps = []
      this.writeTimestamps.set(key, timestamps)
    }

    timestamps.push(now)
    // Keep only the last N timestamps (circular buffer)
    if (timestamps.length > RegisterBank.FREQUENCY_WINDOW_SIZE) {
      timestamps.splice(0, timestamps.length - RegisterBank.FREQUENCY_WINDOW_SIZE)
    }

    // Compute frequency: writes per second over the window
    const entry = this.entries.get(key)
    if (entry && timestamps.length >= 2) {
      const windowMs = now - timestamps[0]
      entry.meta.frequency = windowMs > 0
        ? (timestamps.length - 1) / (windowMs / 1000)
        : 0
    }
  }

  /** Recompute normalized coupling for a cell based on its edge count. */
  private updateCoupling(key: string): void {
    const entry = this.entries.get(key)
    if (!entry) return
    const edges = this.couplingEdges.get(key)
    const edgeCount = edges ? edges.size : 0
    const totalCells = Math.max(this.entries.size - 1, 1) // exclude self
    entry.meta.coupling = clamp01(edgeCount / totalCells)
  }
}

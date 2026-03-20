import { descriptorForKey } from './type-affinities'
import type { Substrate } from '../pipeline/substrate'
import type {
  PhaseFacet,
  PhaseEnvelope,
  Liminality,
  RegisterEntry,
  RegisterId,
  RegisterMeta,
  RegisterPhase,
  RegisterPhaseInput,
  RegisterSnapshot,
  RegisterWriteOptions,
  RuntimeValence,
  RuntimePacket,
  RuntimeRecord,
  RuntimeValue,
  ScopeFrame,
} from './types'
import { LIMINALITY_ORDER, PHASE_ORDER, normalizeRegisterPhase } from './types'
import { $register } from '@spw/seed'

const DEFAULT_FOCUS_KEY = '"'
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

function cloneValence(valence: RuntimeValence[] | undefined): RuntimeValence[] {
  return valence ? [...valence] : []
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
  /**
   * @spw:axis[representation=4] - Absolute magnitude as weighted resolution.
   */
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
  /**
   * @spw:axis[quality=bone] - Normalization clamp for structural stability.
   */
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function cloneSemanticFrames(
  frames: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!frames) return undefined
  return { ...frames }
}

export class RegisterBank {
  private readonly entries = new Map<RegisterId, RegisterEntry>()
  private readonly lensIndex = new Map<string, Set<RegisterId>>()
  /** Circular buffer of write timestamps per cell (last N) for frequency computation */
  private readonly writeTimestamps = new Map<string, number[]>()
  /** Coupling edges: Map<keyA, Set<keyB>> (bidirectional) */
  private readonly couplingEdges = new Map<RegisterId, Set<RegisterId>>()
  private focusKey = $register`"`
  /** Optional substrate for event-driven processing. Opt-in: zero overhead when null. */
  private substrate: Substrate | null = null

  /** @spw:axis[timing] - Window size for write cadence resolution. */
  private static readonly FREQUENCY_WINDOW_SIZE = 10

  constructor(initial: Record<string, RuntimeValue> = {}, substrate?: Substrate) {
    if (substrate) this.substrate = substrate
    this.ensureEntry(this.focusKey)
    for (const [key, value] of Object.entries(initial)) {
      this.set($register`${key}`, value, { source: 'init', force: true })
    }
  }

  /** Attach a substrate for event-driven processing. */
  attachSubstrate(substrate: Substrate): void {
    this.substrate = substrate
  }

  /** Inspect the currently attached substrate, if any. */
  attachedSubstrate(): Substrate | null {
    return this.substrate
  }

  /** Detach the current substrate. */
  detachSubstrate(): Substrate | null {
    const prev = this.substrate
    this.substrate = null
    return prev
  }

  focus(key: RegisterId): void {
    this.ensureEntry(key)
    this.focusKey = key
  }

  getFocusKey(): RegisterId {
    return this.focusKey
  }

  listKeys(): RegisterId[] {
    return [...this.entries.keys()].sort((a, b) => a.localeCompare(b))
  }

  keysForLens(lens: string): RegisterId[] {
    const keys = this.lensIndex.get(lens)
    if (!keys) return []
    return [...keys].sort((a, b) => a.localeCompare(b))
  }

  set(key: RegisterId, value: RuntimeValue, options: RegisterWriteOptions = {}): boolean {
    const entry = this.ensureEntry(key)
    if (entry.meta.immutable && !options.force) {
      return false
    }

    const descriptor = options.descriptor
      ? {
        ...descriptorForKey(key),
        ...options.descriptor,
      }
      : descriptorForKey(key)

    const normalizedPhase = options.phase ? normalizeRegisterPhase(options.phase) : undefined
    const semanticFrames = cloneSemanticFrames(options.semanticFrames)
    const eventAt = nowIso()

    entry.value = cloneRuntimeValue(value)
    entry.meta = {
      ...entry.meta,
      descriptor,
      writes: entry.meta.writes + 1,
      lastUsedAt: eventAt,
      immutable: options.immutable ?? entry.meta.immutable,
      operator: options.operator,
      registerRole: options.registerRole,
      valence: cloneValence(options.valence),
      semanticFrames,
      provenance: this.pushProvenance(entry.meta.provenance, options.source ?? 'set'),
    }

    // Track write timestamp for frequency computation
    this.recordWriteTimestamp(key)

    // Phase enrichment — additive, in-place on existing cells
    if (normalizedPhase) {
      entry.meta.phases = this.advancePhase(
        entry.meta.phases,
        normalizedPhase,
        options.source ?? 'set',
      )

      entry.meta.address = {
        ...(entry.meta.address ?? { key }),
        key,
        operator: options.operator,
        phase: normalizedPhase,
      }

      this.substrate?.emit({
        kind: 'phase-advance',
        key,
        value: entry.value,
        phase: normalizedPhase,
        source: options.source,
        operator: entry.meta.operator,
        valence: cloneValence(entry.meta.valence),
        registerRole: entry.meta.registerRole,
        semanticFrames: cloneSemanticFrames(entry.meta.semanticFrames),
        at: eventAt,
      })
    }

    // Substrate emission — event-driven processing
    this.substrate?.emit({
      kind: 'write',
      key,
      value: entry.value,
      phase: normalizedPhase,
      source: options.source,
      operator: entry.meta.operator,
      valence: cloneValence(entry.meta.valence),
      registerRole: entry.meta.registerRole,
      semanticFrames: cloneSemanticFrames(entry.meta.semanticFrames),
      at: eventAt,
    })

    return true
  }

  /**
   * Enrich a register cell's phase without changing its value.
   * Useful for progressive enrichment (e.g., lex → parse → semantic).
   */
  enrichPhase(key: RegisterId, phase: RegisterPhaseInput, source?: string): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false
    const normalizedPhase = normalizeRegisterPhase(phase)
    const eventAt = nowIso()

    entry.meta.phases = this.advancePhase(
      entry.meta.phases,
      normalizedPhase,
      source ?? `enrich:${normalizedPhase}`,
    )
    entry.meta.address = {
      ...(entry.meta.address ?? { key }),
      key,
      phase: normalizedPhase,
    }
    entry.meta.lastUsedAt = eventAt

    this.substrate?.emit({
      kind: 'phase-advance',
      key,
      value: entry.value,
      phase: normalizedPhase,
      source: source ?? `enrich:${normalizedPhase}`,
      operator: entry.meta.operator,
      valence: cloneValence(entry.meta.valence),
      registerRole: entry.meta.registerRole,
      semanticFrames: cloneSemanticFrames(entry.meta.semanticFrames),
      at: eventAt,
    })

    return true
  }

  /**
   * Return the current phase of a register cell, or undefined if unphased.
   */
  phaseOf(key: RegisterId): RegisterPhase | undefined {
    return this.entries.get(key)?.meta.phases?.current
  }

  get(key: RegisterId = this.focusKey): RuntimeValue {
    const entry = this.ensureEntry(key)
    return cloneRuntimeValue(entry.value)
  }

  extract(value: RuntimeValue, source = 'extract'): boolean {
    const wroteActive = this.set(this.focusKey, value, { source })
    this.set($register`"`, value, { source: `${source}:default`, force: true })
    this.rotateHistory(value, source)
    return wroteActive
  }

  deposit(key: RegisterId = this.focusKey): RuntimeValue {
    const entry = this.ensureEntry(key)
    entry.meta.lastUsedAt = nowIso()
    entry.meta.provenance = this.pushProvenance(entry.meta.provenance, 'deposit')
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

  resonate(name: RegisterId, value: RuntimeValue, tag?: string, options: RegisterWriteOptions = {}): boolean {
    const lens = tag ?? 'default'
    const resonated = this.set(name, value, {
      ...options,
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

  observe(observer: string, value: RuntimeValue, options: RegisterWriteOptions = {}): ScopeFrame {
    const frame: ScopeFrame = {
      observer,
      value: cloneRuntimeValue(value),
      capturedAt: nowIso(),
    }

    this.set($register`@`, frame, {
      ...options,
      source: `observe:${observer}`,
      descriptor: descriptorForKey('@'),
      force: true,
    })

    return frame
  }

  confluent(name: RegisterId, sources: RuntimeValue[], options: RegisterWriteOptions = {}): RuntimeValue {
    const merged = sources.reduce<RuntimeValue>((acc, item) => mergeRuntimeValues(acc, item), undefined)
    this.set(name, merged, {
      ...options,
      source: 'confluent',
      descriptor: descriptorForKey('&'),
      force: true,
    })
    return cloneRuntimeValue(merged)
  }

  materialize(name: RegisterId): RegisterMeta | undefined {
    const entry = this.entries.get(name)
    if (!entry) return undefined
    return {
      ...entry.meta,
      descriptor: { ...entry.meta.descriptor },
      provenance: [...entry.meta.provenance],
      lenses: [...entry.meta.lenses],
      valence: cloneValence(entry.meta.valence),
      semanticFrames: cloneSemanticFrames(entry.meta.semanticFrames),
    }
  }

  measure(name: RegisterId, scale = 1): number {
    const entry = this.entries.get(name)
    if (entry) {
      entry.meta.measureDepth = (entry.meta.measureDepth ?? 0) + 1
    }
    const value = this.get(name)
    const denominator = scale > 0 ? scale : 1
    return clamp01(runtimeMagnitude(value) / denominator)
  }

  // ── Liminality ──────────────────────────────────────────────

  /** Promote a cell's liminality (local→liminal→visible→global). Returns new level or undefined if cell doesn't exist. */
  promote(key: RegisterId): Liminality | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    const current = entry.meta.liminality ?? LIMINALITY_ORDER[0]
    const currentIndex = LIMINALITY_ORDER.indexOf(current)
    const next = LIMINALITY_ORDER[Math.min(currentIndex + 1, LIMINALITY_ORDER.length - 1)]
    entry.meta.liminality = next
    return next
  }

  /** Demote a cell's liminality (global→visible→liminal→local). Returns new level or undefined if cell doesn't exist. */
  demote(key: RegisterId): Liminality | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    const current = entry.meta.liminality ?? LIMINALITY_ORDER[0]
    const currentIndex = LIMINALITY_ORDER.indexOf(current)
    const next = LIMINALITY_ORDER[Math.max(currentIndex - 1, 0)]
    entry.meta.liminality = next
    return next
  }

  frequencyOf(key: RegisterId): number | undefined {
    return this.entries.get(key)?.meta.frequency
  }

  // ── Marks ──────────────────────────────────────────────────

  /**
   * Register a named positional mark — Vim `'a` equivalent.
   * Stores the value at a mark-prefixed register key.
   */
  markPosition(name: string, value: RuntimeValue, options: RegisterWriteOptions = {}): void {
    const markKey = $register`mark:${name}`
    const eventAt = nowIso()
    this.set(markKey, value, {
      ...options,
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
      operator: options.operator,
      valence: cloneValence(options.valence),
      registerRole: options.registerRole,
      semanticFrames: cloneSemanticFrames(options.semanticFrames),
      at: eventAt,
    })
  }

  getMark(name: string): RuntimeValue {
    return this.get($register`mark:${name}`)
  }

  // ── Coupling ───────────────────────────────────────────────

  /** Register a coupling edge between two cells. Bidirectional. */
  couple(keyA: RegisterId, keyB: RegisterId): void {
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
      operator: this.entries.get(keyA)?.meta.operator,
      valence: cloneValence(this.entries.get(keyA)?.meta.valence),
      registerRole: this.entries.get(keyA)?.meta.registerRole,
      semanticFrames: cloneSemanticFrames(this.entries.get(keyA)?.meta.semanticFrames),
      at: nowIso(),
    })
  }

  couplingOf(key: RegisterId): number | undefined {
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
          valence: cloneValence(entry.meta.valence),
          semanticFrames: cloneSemanticFrames(entry.meta.semanticFrames),
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
      focusKey: this.focusKey,
      entries,
      lensIndex,
    }
  }

  private rotateHistory(value: RuntimeValue, source: string): void {
    for (let index = HISTORY_KEYS.length - 1; index > 0; index -= 1) {
      const currentKey = HISTORY_KEYS[index]
      const previousKey = HISTORY_KEYS[index - 1]
      const previousValue = this.entries.get($register`${previousKey}`)?.value
      this.set($register`${currentKey}`, previousValue, {
        source: `${source}:history`,
        force: true,
      })
    }

    this.set($register`${HISTORY_KEYS[0]}`, value, {
      source: `${source}:history`,
      force: true,
    })
  }

  private ensureEntry(key: RegisterId): RegisterEntry {
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
        valence: [],
        liminality: LIMINALITY_ORDER[0],
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
    /** @spw:axis[stability] - Fixed-depth provenance for memory bound. */
    if (next.length <= 16) return next
    return next.slice(next.length - 16)
  }

  private pushLens(lenses: string[], lens: string): string[] {
    if (lenses.includes(lens)) return lenses
    return [...lenses, lens]
  }

  private addLensIndex(lens: string, key: RegisterId): void {
    const bucket = this.lensIndex.get(lens) ?? new Set<RegisterId>()
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
      /** @spw:axis[representation=semantic] - Phase weight for cost model. */
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
  private recordWriteTimestamp(key: RegisterId): void {
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
  private updateCoupling(key: RegisterId): void {
    const entry = this.entries.get(key)
    if (!entry) return
    const edges = this.couplingEdges.get(key)
    const edgeCount = edges ? edges.size : 0
    const totalCells = Math.max(this.entries.size - 1, 1) // exclude self
    entry.meta.coupling = clamp01(edgeCount / totalCells)
  }
}

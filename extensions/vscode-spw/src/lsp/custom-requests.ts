import {
  SPW_WORKSPACE_MANIFEST_METHOD_V1,
  parseSpwWorkspaceManifestV1,
  type SpwWorkspaceManifestV1,
  type SpwWorkspaceRootEvidence,
  type SpwWorkspaceRootSource,
} from '@spwashi/spw-lsp/workspace-protocol'

export type SpwWorkspaceManifest = SpwWorkspaceManifestV1
export type SpwWorkspaceRootEntry = SpwWorkspaceRootEvidence
export type { SpwWorkspaceRootSource }

export type SpwAnnotationKind = 'topic' | 'lens' | 'intent' | 'anchor' | 'prompt_root'
export type SpwMaterializationState = 'priming' | 'concept' | 'frame' | 'body'

export interface SpwAnnotationRecord {
  uri: string
  line: number
  kind: SpwAnnotationKind
  name: string
  sectionLabel?: string
  framePath: string[]
}

export interface SpwResonanceEdge {
  channel: string
  strength: number
  targetUri: string
}

export interface SpwWorkspaceTemperatureEntry {
  uri: string
  /** How recently the surface was read. */
  tier: string
  beatAge: number
  writeCount: number
  /** What the surface is made of: whether its content keeps or expires. */
  volatility?: 'volatile' | 'settled' | 'durable'
  /** Aspect (`~#`) marks as a share of all particle marks, 0–1. */
  aspectShare?: number
}

/** An observation about where this session's attention went. */
export interface SpwAttentionNote {
  kind: 'returning' | 'churning' | 'wrote-without-return' | 'expired-view'
  uri: string
  detail: string
}

/** Surfaces grouped by what their shape makes them. */
export interface SpwSignatureFamily {
  archetype: 'index' | 'working-state' | 'classified' | 'plain'
  volatility: 'volatile' | 'settled' | 'durable'
  uris: string[]
}

export interface SpwCacheReflection {
  beat: number
  tracked: number
  /** Share of all opens spent on the single most-visited surface, 0–1. */
  concentration: number
  notes: SpwAttentionNote[]
  families: SpwSignatureFamily[]
}

export interface SpwRegisterEntry {
  name: string
  phase: number
  fileUri: string
  value?: unknown
  provenance?: string[]
}

export interface SpwRegisterSnapshot {
  registers: SpwRegisterEntry[]
  timestamp: number
  fileUri: string
}

export interface SpwOperatorFrequencyEntry {
  operator: string
  count: number
  percent: number
}

export interface SpwOperatorFrequencyResult {
  target: string
  dominantOperator: string | null
  entries: SpwOperatorFrequencyEntry[]
}

export interface SpwPosition {
  line: number
  character: number
}

export interface SpwPhaseContextResult {
  phase: number | null
  sigil: string | null
  materializationState: SpwMaterializationState | null
}

export interface SpwContextAtPositionResult {
  framePath: string[]
  ambientBraids: string[]
  localBraids: string[]
  enteredFrame: string | null
  deltaBraids: string[]
}

export interface SpwCustomRequestMap {
  'spw/annotations': {
    params: Record<string, never>
    result: SpwAnnotationRecord[]
  }
  'spw/resonance': {
    params: { uri: string }
    result: SpwResonanceEdge[]
  }
  'spw/workspaceTemperature': {
    params: Record<string, never>
    result: SpwWorkspaceTemperatureEntry[]
  }
  'spw/cacheReflection': {
    params: Record<string, never>
    result: SpwCacheReflection
  }
  'spw/registerSnapshot': {
    params: { uri: string }
    result: SpwRegisterSnapshot
  }
  'spw/operatorFrequency': {
    params: { uri?: string, root?: string }
    result: SpwOperatorFrequencyResult
  }
  'spw/phaseContext': {
    params: { uri: string, position: SpwPosition }
    result: SpwPhaseContextResult
  }
  'spw/contextAtPosition': {
    params: { uri: string, position: SpwPosition }
    result: SpwContextAtPositionResult | null
  }
  'spw/workspaceManifest/v1': {
    params: Record<string, never>
    result: SpwWorkspaceManifest
  }
  'spw/formSequence': {
    params: { notation?: string, catalog?: boolean }
    result: {
      notation: string
      steps: Array<{ surface: string, op: string, label?: string, tag?: string }>
      terminal: string
      catalog?: Array<{ id: string, surface: string, role: string }>
    }
  }
  'spw/geometry': {
    params: { uri?: string, text?: string }
    result: {
      uri: string | null
      version: string
      braces: {
        kinds: Record<string, number>
        coupleOps: number
        medials: number
        shells: number
        channels: string[]
        signature: string
      }
      operators: Array<{ sigil: string, count: number, percent: number, role: string }>
      nesting: { maxDepth: number, openBalance: number, deepLines: number }
      lessons: string[]
    }
  }
}

export type SpwCustomRequestMethod = keyof SpwCustomRequestMap

export interface SpwCustomRequestClient {
  request<K extends SpwCustomRequestMethod>(
    method: K,
    params: SpwCustomRequestMap[K]['params'],
  ): Promise<SpwCustomRequestMap[K]['result']>
  annotations(): Promise<SpwAnnotationRecord[]>
  contextAtPosition(uri: string, position: SpwPosition): Promise<SpwContextAtPositionResult | null>
  workspaceManifest(): Promise<SpwWorkspaceManifest>
  workspaceTemperature(): Promise<SpwWorkspaceTemperatureEntry[]>
  cacheReflection(): Promise<SpwCacheReflection | null>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAnnotationKind(value: unknown): value is SpwAnnotationKind {
  return value === 'topic' || value === 'lens' || value === 'intent' || value === 'anchor' || value === 'prompt_root'
}

function isAnnotationRecord(value: unknown): value is SpwAnnotationRecord {
  if (!isRecord(value)) return false
  return typeof value.uri === 'string'
    && typeof value.line === 'number'
    && isAnnotationKind(value.kind)
    && typeof value.name === 'string'
    && (typeof value.sectionLabel === 'undefined' || typeof value.sectionLabel === 'string')
    && Array.isArray(value.framePath)
    && value.framePath.every((segment) => typeof segment === 'string')
}

function parseAnnotationRecords(value: unknown): SpwAnnotationRecord[] {
  if (!Array.isArray(value)) {
    throw new Error('spw/annotations returned a non-array payload')
  }

  const records: SpwAnnotationRecord[] = []
  for (const entry of value) {
    if (!isAnnotationRecord(entry)) {
      throw new Error('spw/annotations returned an invalid annotation entry')
    }
    records.push(entry)
  }

  return records
}

function isWorkspaceTemperatureEntry(value: unknown): value is SpwWorkspaceTemperatureEntry {
  if (!isRecord(value)) return false
  return typeof value.uri === 'string'
    && typeof value.tier === 'string'
    && typeof value.beatAge === 'number'
    && typeof value.writeCount === 'number'
}

function parseWorkspaceTemperatureEntries(value: unknown): SpwWorkspaceTemperatureEntry[] {
  if (!Array.isArray(value)) {
    throw new Error('spw/workspaceTemperature returned a non-array payload')
  }

  const entries: SpwWorkspaceTemperatureEntry[] = []
  for (const entry of value) {
    if (!isWorkspaceTemperatureEntry(entry)) {
      throw new Error('spw/workspaceTemperature returned an invalid entry')
    }
    entries.push(entry)
  }

  return entries
}

export interface SpwRequestTransport {
  sendRequest<R>(method: string, params: unknown): Promise<R>
}

class SpwLanguageServerRequests implements SpwCustomRequestClient {
  constructor(private readonly client: SpwRequestTransport) {}

  async request<K extends SpwCustomRequestMethod>(
    method: K,
    params: SpwCustomRequestMap[K]['params'],
  ): Promise<SpwCustomRequestMap[K]['result']> {
    return this.client.sendRequest<SpwCustomRequestMap[K]['result']>(method, params)
  }

  async annotations(): Promise<SpwAnnotationRecord[]> {
    const payload = await this.request('spw/annotations', {})
    return parseAnnotationRecords(payload)
  }

  async contextAtPosition(uri: string, position: SpwPosition): Promise<SpwContextAtPositionResult | null> {
    return this.request('spw/contextAtPosition', { uri, position })
  }

  async workspaceManifest(): Promise<SpwWorkspaceManifest> {
    const payload = await this.request(SPW_WORKSPACE_MANIFEST_METHOD_V1, {})
    return parseSpwWorkspaceManifestV1(payload)
  }

  async workspaceTemperature(): Promise<SpwWorkspaceTemperatureEntry[]> {
    const payload = await this.request('spw/workspaceTemperature', {})
    return parseWorkspaceTemperatureEntries(payload)
  }

  async cacheReflection(): Promise<SpwCacheReflection | null> {
    const payload = await this.request('spw/cacheReflection', {})
    if (!isRecord(payload) || typeof payload.tracked !== 'number') return null
    return {
      beat: typeof payload.beat === 'number' ? payload.beat : 0,
      tracked: payload.tracked,
      concentration: typeof payload.concentration === 'number' ? payload.concentration : 0,
      notes: Array.isArray(payload.notes) ? (payload.notes as SpwAttentionNote[]) : [],
      families: Array.isArray(payload.families) ? (payload.families as SpwSignatureFamily[]) : [],
    }
  }
}

export function createSpwCustomRequestClient(client: SpwRequestTransport): SpwCustomRequestClient {
  return new SpwLanguageServerRequests(client)
}

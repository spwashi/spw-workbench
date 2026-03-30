import type { LanguageClient } from 'vscode-languageclient/node'

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
  tier: string
  beatAge: number
  writeCount: number
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

export interface SpwWorkspaceRootEntry {
  sigil: string
  resolvedPath: string
  uri: string
}

export interface SpwWorkspaceProjectionEntry {
  name: string
  root: string
  source: string
  specOwner: string
  status: string
}

export interface SpwWorkspaceManifest {
  rootSource: 'manifest' | 'inferred'
  manifestUri: string | null
  roots: SpwWorkspaceRootEntry[]
  projections: SpwWorkspaceProjectionEntry[]
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
  'spw/workspaceManifest': {
    params: Record<string, never>
    result: SpwWorkspaceManifest
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

function isWorkspaceRootEntry(value: unknown): value is SpwWorkspaceRootEntry {
  if (!isRecord(value)) return false
  return typeof value.sigil === 'string'
    && typeof value.resolvedPath === 'string'
    && typeof value.uri === 'string'
}

function isWorkspaceProjectionEntry(value: unknown): value is SpwWorkspaceProjectionEntry {
  if (!isRecord(value)) return false
  return typeof value.name === 'string'
    && typeof value.root === 'string'
    && typeof value.source === 'string'
    && typeof value.specOwner === 'string'
    && typeof value.status === 'string'
}

function isWorkspaceManifest(value: unknown): value is SpwWorkspaceManifest {
  if (!isRecord(value)) return false
  return (value.rootSource === 'manifest' || value.rootSource === 'inferred')
    && (value.manifestUri === null || typeof value.manifestUri === 'string')
    && Array.isArray(value.roots)
    && value.roots.every(isWorkspaceRootEntry)
    && Array.isArray(value.projections)
    && value.projections.every(isWorkspaceProjectionEntry)
}

function parseWorkspaceManifest(value: unknown): SpwWorkspaceManifest {
  if (!isWorkspaceManifest(value)) {
    throw new Error('spw/workspaceManifest returned an invalid payload')
  }
  return value
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

class SpwLanguageServerRequests implements SpwCustomRequestClient {
  constructor(private readonly client: LanguageClient) {}

  async request<K extends SpwCustomRequestMethod>(
    method: K,
    params: SpwCustomRequestMap[K]['params'],
  ): Promise<SpwCustomRequestMap[K]['result']> {
    return this.client.sendRequest(method, params)
  }

  async annotations(): Promise<SpwAnnotationRecord[]> {
    const payload = await this.request('spw/annotations', {})
    return parseAnnotationRecords(payload)
  }

  async contextAtPosition(uri: string, position: SpwPosition): Promise<SpwContextAtPositionResult | null> {
    return this.request('spw/contextAtPosition', { uri, position })
  }

  async workspaceManifest(): Promise<SpwWorkspaceManifest> {
    const payload = await this.request('spw/workspaceManifest', {})
    return parseWorkspaceManifest(payload)
  }

  async workspaceTemperature(): Promise<SpwWorkspaceTemperatureEntry[]> {
    const payload = await this.request('spw/workspaceTemperature', {})
    return parseWorkspaceTemperatureEntries(payload)
  }
}

export function createSpwCustomRequestClient(client: LanguageClient): SpwCustomRequestClient {
  return new SpwLanguageServerRequests(client)
}

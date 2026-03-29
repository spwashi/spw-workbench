import type { LanguageClient } from 'vscode-languageclient/node'

export type SpwAnnotationKind = 'topic' | 'lens' | 'intent' | 'anchor'
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
}

export type SpwCustomRequestMethod = keyof SpwCustomRequestMap

export interface SpwCustomRequestClient {
  request<K extends SpwCustomRequestMethod>(
    method: K,
    params: SpwCustomRequestMap[K]['params'],
  ): Promise<SpwCustomRequestMap[K]['result']>
  annotations(): Promise<SpwAnnotationRecord[]>
  contextAtPosition(uri: string, position: SpwPosition): Promise<SpwContextAtPositionResult | null>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAnnotationKind(value: unknown): value is SpwAnnotationKind {
  return value === 'topic' || value === 'lens' || value === 'intent' || value === 'anchor'
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
}

export function createSpwCustomRequestClient(client: LanguageClient): SpwCustomRequestClient {
  return new SpwLanguageServerRequests(client)
}

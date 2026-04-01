import * as vscode from 'vscode'
import { AnnotationIndex } from './annotation-index'
import type {
  SpwCustomRequestClient,
  SpwContextAtPositionResult,
  SpwMaterializationState,
  SpwRegisterSnapshot,
  SpwWorkspaceTemperatureEntry,
} from './lsp/custom-requests'
import type { SigilSemantic } from './semantics'

export interface SpwManifestState {
  sourceUri?: string
  roots: Array<{ sigil: string, resolvedPath: string }>
}

export interface SpwActiveRoot {
  sigil: string
  resolvedPath: string
}

export interface SpwFocusedRegister {
  name: string
  phase: number
  fileUri: string
}

export interface SpwActivePhase {
  phase: number
  sigil: string
  cursorUri: string
  line: number
}

export interface SpwProbeResult {
  probeId: string
  target: string
  result: unknown
  resonances: string[]
}

export interface SpwCursorContextSnapshot {
  uri: string
  version: number
  line: number
  character: number
  value: SpwContextAtPositionResult | null
}

export interface SpwEventMap {
  'atlas.rootSelected': {
    sigil: string
    resolvedPath: string
    manifestFrame: string | null
  }
  'atlas.perspectiveRotated': {
    perspective: 'topology' | 'contract' | 'resonance' | 'phase' | 'query'
  }
  'register.focused': {
    name: string
    phase: number
    provenance: string[]
    file: string
  }
  'register.phaseChanged': {
    name: string
    previousPhase: number
    currentPhase: number
  }
  'probe.completed': SpwProbeResult
  'authoring.phaseEntered': SpwActivePhase
  'materialization.advanced': {
    uri: string
    previousStage: string
    currentStage: string
  }
}

export type SpwEventName = keyof SpwEventMap

export interface SpwEventBus extends vscode.Disposable {
  emit<K extends SpwEventName>(event: K, payload: SpwEventMap[K]): void
  on<K extends SpwEventName>(
    event: K,
    listener: (payload: SpwEventMap[K]) => unknown,
    thisArgs?: unknown,
    disposables?: vscode.Disposable[],
  ): vscode.Disposable
}

type SpwEmitterMap = {
  [K in SpwEventName]: vscode.EventEmitter<SpwEventMap[K]>
}

const EVENT_NAMES = [
  'atlas.rootSelected',
  'atlas.perspectiveRotated',
  'register.focused',
  'register.phaseChanged',
  'probe.completed',
  'authoring.phaseEntered',
  'materialization.advanced',
] as const satisfies readonly SpwEventName[]

class TypedSpwEventBus implements SpwEventBus {
  private readonly emitters: SpwEmitterMap = {
    'atlas.rootSelected': new vscode.EventEmitter<SpwEventMap['atlas.rootSelected']>(),
    'atlas.perspectiveRotated': new vscode.EventEmitter<SpwEventMap['atlas.perspectiveRotated']>(),
    'register.focused': new vscode.EventEmitter<SpwEventMap['register.focused']>(),
    'register.phaseChanged': new vscode.EventEmitter<SpwEventMap['register.phaseChanged']>(),
    'probe.completed': new vscode.EventEmitter<SpwEventMap['probe.completed']>(),
    'authoring.phaseEntered': new vscode.EventEmitter<SpwEventMap['authoring.phaseEntered']>(),
    'materialization.advanced': new vscode.EventEmitter<SpwEventMap['materialization.advanced']>(),
  }

  emit<K extends SpwEventName>(event: K, payload: SpwEventMap[K]): void {
    this.emitters[event].fire(payload)
  }

  on<K extends SpwEventName>(
    event: K,
    listener: (payload: SpwEventMap[K]) => unknown,
    thisArgs?: unknown,
    disposables?: vscode.Disposable[],
  ): vscode.Disposable {
    return this.emitters[event].event(listener, thisArgs, disposables)
  }

  dispose(): void {
    for (const event of EVENT_NAMES) {
      this.emitters[event].dispose()
    }
  }
}

export interface CreateSpwContextOptions {
  documentSelector: vscode.DocumentSelector
  annotationIndex: AnnotationIndex
  requests: SpwCustomRequestClient
  resolveRoot: (sigil: string, workspaceRoot: string, documentUri: vscode.Uri) => string
  ROOT_MAP: Record<string, string[]>
  SIGIL_SEMANTICS: Record<string, SigilSemantic>
}

export interface SpwContext {
  readonly documentSelector: vscode.DocumentSelector
  readonly annotationIndex: AnnotationIndex
  readonly requests: SpwCustomRequestClient
  readonly events: SpwEventBus
  readonly resolveRoot: (sigil: string, workspaceRoot: string, documentUri: vscode.Uri) => string
  readonly ROOT_MAP: Record<string, string[]>
  readonly SIGIL_SEMANTICS: Record<string, SigilSemantic>
  manifestState: SpwManifestState | null
  workspaceTemperature: Map<string, SpwWorkspaceTemperatureEntry>
  activeRoot: SpwActiveRoot | null
  registerSnapshot: SpwRegisterSnapshot | null
  focusedRegister: SpwFocusedRegister | null
  activePhase: SpwActivePhase | null
  materializationState: SpwMaterializationState | null
  probeHistory: SpwProbeResult[]
  cursorContextSnapshot: SpwCursorContextSnapshot | null
}

export function createSpwEventBus(): SpwEventBus {
  return new TypedSpwEventBus()
}

export function createSpwContext(options: CreateSpwContextOptions): SpwContext {
  return {
    ...options,
    events: createSpwEventBus(),
    manifestState: null,
    workspaceTemperature: new Map(),
    activeRoot: null,
    registerSnapshot: null,
    focusedRegister: null,
    activePhase: null,
    materializationState: null,
    probeHistory: [],
    cursorContextSnapshot: null,
  }
}

export async function getCursorContextAtEditor(
  spw: SpwContext,
  editor: vscode.TextEditor,
): Promise<SpwContextAtPositionResult | null> {
  const uri = editor.document.uri.toString()
  const version = editor.document.version
  const position = editor.selection.active
  const snapshot = spw.cursorContextSnapshot

  if (
    snapshot
    && snapshot.uri === uri
    && snapshot.version === version
    && snapshot.line === position.line
    && snapshot.character === position.character
  ) {
    return snapshot.value
  }

  const value = await spw.requests.contextAtPosition(uri, {
    line: position.line,
    character: position.character,
  })

  spw.cursorContextSnapshot = {
    uri,
    version,
    line: position.line,
    character: position.character,
    value,
  }

  return value
}

/**
 * LSP Type Definitions
 *
 * Shared interfaces for the Spw language server protocol implementation.
 */

// ── Position, Range, Location ───────────────────────────────────

export interface LspPosition { line: number; character: number }
export interface LspRange { start: LspPosition; end: LspPosition }
export interface LspLocation { uri: string; range: LspRange }

// ── Diagnostics ─────────────────────────────────────────────────

export interface LspDiagnostic {
    range: LspRange
    severity: number // 1=Error 2=Warning 3=Info 4=Hint
    source: string
    message: string
}

// ── Symbols ─────────────────────────────────────────────────────

export interface LspSymbolInfo {
    name: string
    kind: number
    location: LspLocation
    containerName?: string
}

export interface LspDocumentSymbol {
    name: string
    detail: string
    kind: number
    range: LspRange
    selectionRange: LspRange
    children?: LspDocumentSymbol[]
}

// ── Completion ──────────────────────────────────────────────────

export interface LspCompletionItem {
    label: string
    kind: number
    detail?: string
    insertText?: string
    insertTextFormat?: number // 1=PlainText 2=Snippet
    sortText?: string
}

// ── Code Lens ───────────────────────────────────────────────────

export interface LspCodeLens {
    range: LspRange
    command?: { title: string; command: string; arguments?: any[] }
}

// ── Hover ────────────────────────────────────────────────────────

export interface LspHover {
    contents: { kind: 'markdown'; value: string }
    range?: LspRange
}

// ── Code Action ─────────────────────────────────────────────────

export interface LspCodeAction {
    title: string
    kind?: string
    edit?: LspWorkspaceEdit
    command?: { title: string; command: string; arguments?: any[] }
}

// ── Text Edit ───────────────────────────────────────────────────

export interface LspTextEdit {
    range: LspRange
    newText: string
}

// ── Inlay Hints ─────────────────────────────────────────────────

export interface LspInlayHint {
    position: LspPosition
    label: string
    kind?: 1 | 2
    tooltip?: string
    paddingLeft?: boolean
    paddingRight?: boolean
}

// ── Document Highlight ──────────────────────────────────────────

export interface LspDocumentHighlight {
    range: LspRange
    kind?: 1 | 2 | 3 // 1=Text 2=Read 3=Write
}

// ── Folding Ranges ──────────────────────────────────────────────

export interface LspFoldingRange {
    startLine: number
    endLine: number
    kind?: string
}

// ── Rename ──────────────────────────────────────────────────────

export interface LspPrepareRenameResult {
    range: LspRange
    placeholder: string
}

export interface LspWorkspaceEdit {
    changes: Record<string, LspTextEdit[]>
}

// ── JSON-RPC ────────────────────────────────────────────────────

export interface JsonRpcRequest {
    jsonrpc: '2.0'
    id?: number | string
    method: string
    params?: any
}

export interface JsonRpcResponse {
    jsonrpc: '2.0'
    id: number | string | null
    result?: any
    error?: { code: number; message: string; data?: any }
}

// ── Config ──────────────────────────────────────────────────────

export interface SpwConfig {
    inlayHints?: {
        paths?: boolean
        annotations?: boolean
        frames?: boolean
    }
    diagnostics?: {
        unresolvedRefs?: 'error' | 'warning' | 'hint' | 'off'
        staleProjections?: boolean
    }
    roots?: Record<string, string>
    workspace?: {
        exclude?: string[]
    }
    formatOnSave?: boolean
}

export const DEFAULT_CONFIG: Required<SpwConfig> = {
    inlayHints: { paths: true, annotations: true, frames: true },
    diagnostics: { unresolvedRefs: 'warning', staleProjections: true },
    roots: {},
    workspace: { exclude: ['node_modules', '.git', '.claude'] },
    formatOnSave: false,
}

// ── Constants ───────────────────────────────────────────────────

export type RootMap = Record<string, string>

/** LSP SymbolKind constants */
export const SK = {
    Module: 2,
    Property: 7,
    Event: 24,
    Boolean: 17,
    Key: 20,
    Enum: 10,
    Interface: 11,
    Variable: 13,
    Struct: 23,
    Folder: 19,
    File: 1,
} as const

/** LSP CompletionItemKind constants */
export const CK = {
    Folder: 19,
    File: 17,
    Keyword: 14,
    Reference: 18,
    Field: 5,
    Variable: 6,
} as const

// ── Request Param Types ─────────────────────────────────────────

export interface TextDocumentIdentifier {
    uri: string
}

export interface TextDocumentPositionParams {
    textDocument: TextDocumentIdentifier
    position: LspPosition
}

export interface DocumentParams {
    textDocument: TextDocumentIdentifier
}

export interface HoverParams extends TextDocumentPositionParams { }
export interface DefinitionParams extends TextDocumentPositionParams { }
export interface CompletionParams extends TextDocumentPositionParams { }
export interface ReferencesParams extends TextDocumentPositionParams {
    context?: { includeDeclaration?: boolean }
}
export interface RenameParams extends TextDocumentPositionParams {
    newName: string
}

export interface CodeActionParams {
    textDocument: TextDocumentIdentifier
    range: LspRange
    context: {
        diagnostics: LspDiagnostic[]
        only?: string[]
    }
}

export interface DocumentFormattingParams {
    textDocument: TextDocumentIdentifier
    options: { tabSize: number; insertSpaces: boolean }
}

export interface DocumentRangeFormattingParams extends DocumentFormattingParams {
    range: LspRange
}

export interface InlayHintParams {
    textDocument: TextDocumentIdentifier
    range: LspRange
}

// ── Handler Dependencies ────────────────────────────────────────
// All capability handler clusters receive this interface.
// An LLM agent reading this type knows every dependency available.

import type { ServerIndex } from './server-index'
import type { SpwSelectorHit } from './spw-selector'

export interface HandlerDeps {
    serverIndex: ServerIndex
    config: Required<SpwConfig>
    workspaceRoot: string

    // Path resolution
    pathFromUri(uri: string): string | null
    uriFromPath(filePath: string): string
    resolveReferencePath(
        hit: SpwSelectorHit, source: string, docPath: string,
        options?: { allowDirectory?: boolean },
    ): Promise<string | null>
    suggestNearbyReference(
        hit: SpwSelectorHit, source: string, docPath: string,
    ): Promise<string | null>
    defaultRoots(fileDir: string): RootMap
    mergeRoots(source: string, fileDir: string): RootMap
    getDocumentText(uri: string): Promise<string | null>
    getWorkspaceSpwFiles(): Promise<string[]>
    mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]>

    // Transport
    sendNotification(method: string, params: any): void
    log(message: string): void

    // Runtime
    trialRunSpw(source: string, uri: string): any
    loadObservableState(): Promise<Record<string, any>>
    observableState: Record<string, any> | null
    observableStateLoadedAt: number
}

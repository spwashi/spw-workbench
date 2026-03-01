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
} as const

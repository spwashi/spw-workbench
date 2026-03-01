#!/usr/bin/env tsx
/**
 * Spw LSP Server — stdio transport
 *
 * Thin server shell: state management, dependency construction, and
 * request dispatch. All capability logic lives in handler clusters:
 *   handlers/analysis.ts  — diagnostics + folding
 *   handlers/display.ts   — hover, symbols, code-lens, inlay-hints
 *   handlers/editing.ts   — completion, formatting
 *   handlers/navigation.ts — definition, links, references, rename
 */

import path from 'node:path'
import { selectPathRefs, type SpwSelectorHit } from './spw-selector'
import { ServerIndex } from './server-index'

// ── Types ───────────────────────────────────────────────────────
import type {
  SpwConfig, RootMap, JsonRpcRequest, JsonRpcResponse, HandlerDeps,
} from './types'
import { DEFAULT_CONFIG } from './types'
import { ServerContext } from './context'

// ── Handler Clusters ────────────────────────────────────────────
import { publishDiagnostics as _publishDiagnostics, foldingRanges as _foldingRanges } from './handlers/analysis'
import { hover as _hover, documentSymbols as _documentSymbols, workspaceSymbols as _workspaceSymbols, codeLens as _codeLens, inlayHints as _inlayHints } from './handlers/display'
import { completion as _completion, formatting as _formatting } from './handlers/editing'
import { definition as _definition, documentLinks as _documentLinks, references as _references, prepareRename as _prepareRename, rename as _rename } from './handlers/navigation'

// ── Helpers (extracted) ─────────────────────────────────────────
import {
  pathFromUri, uriFromPath,
  parseWorkspaceRoot as _parseWorkspaceRoot,
  loadConfig as _loadConfig,
  defaultRoots as _defaultRoots, mergeRoots as _mergeRoots,
  resolveReferencePath as _resolveReferencePath,
  getWorkspaceSpwFiles as _getWorkspaceSpwFiles,
  mapWithConcurrency,
  suggestNearbyReference as _suggestNearbyReference,
  getDocumentText as _getDocumentText,
} from './helpers'

// ── Server state (via context) ──────────────────────────────────

const ctx = new ServerContext(process.cwd())

let WORKSPACE_ROOT = ctx.workspaceRoot
let SHUTDOWN = ctx.shutdown
let incoming = Buffer.alloc(0)
let serverIndex: ServerIndex
let CONFIG: Required<SpwConfig> = ctx.config

const DIAGNOSTIC_DEBOUNCE = ctx.diagnosticDebounce
const DIAGNOSTIC_DELAY_MS = ctx.diagnosticDelayMs
let workspaceFilesCache = ctx.workspaceFilesCache

let observableState = ctx.observableState
let observableStateLoadedAt = ctx.observableStateLoadedAt

async function loadObservableState(): Promise<Record<string, any>> {
  const result = await ctx.loadObservableState()
  observableState = ctx.observableState
  observableStateLoadedAt = ctx.observableStateLoadedAt
  return result
}

function trialRunSpw(source: string, uri: string) {
  return ctx.trialRunSpw(source, uri)
}

function log(message: string): void { ctx.log(message) }
function sendResult(id: number | string | null, result: any): void { ctx.sendResult(id, result) }
function sendError(id: number | string | null, code: number, message: string, data?: any): void { ctx.sendError(id, code, message, data) }
function sendNotification(method: string, params: any): void { ctx.sendNotification(method, params) }

// ── Thin wrappers (close over module-level state) ───────────────

function parseWorkspaceRoot(params: any): string {
  return _parseWorkspaceRoot(params, WORKSPACE_ROOT)
}

async function loadConfig(root: string, initOptions?: any) {
  return _loadConfig(root, initOptions, ctx)
}

function defaultRoots(fileDir: string) {
  return _defaultRoots(fileDir, WORKSPACE_ROOT, serverIndex)
}

function mergeRoots(source: string, fileDir: string) {
  return _mergeRoots(source, fileDir, WORKSPACE_ROOT, CONFIG, serverIndex)
}

async function resolveReferencePath(
  hit: SpwSelectorHit, source: string, docPath: string,
  options?: { allowDirectory?: boolean },
) {
  return _resolveReferencePath(hit, source, docPath, WORKSPACE_ROOT, CONFIG, serverIndex, options)
}

async function getWorkspaceSpwFiles() {
  ctx.workspaceRoot = WORKSPACE_ROOT
  ctx.config = CONFIG
  const result = await _getWorkspaceSpwFiles(ctx)
  workspaceFilesCache = ctx.workspaceFilesCache
  return result
}

async function suggestNearbyReference(hit: SpwSelectorHit, source: string, docPath: string) {
  return _suggestNearbyReference(hit, source, docPath, WORKSPACE_ROOT, CONFIG, serverIndex)
}

async function getDocumentText(uri: string) {
  return _getDocumentText(uri, serverIndex)
}

// ── Handler Deps Factory ────────────────────────────────────────
// Single integration point between legacy globals and typed handler clusters.
// An LLM agent reading HandlerDeps knows every dependency available.

function getDeps(): HandlerDeps {
  return {
    serverIndex,
    config: CONFIG,
    workspaceRoot: WORKSPACE_ROOT,
    pathFromUri,
    uriFromPath,
    resolveReferencePath,
    suggestNearbyReference,
    defaultRoots,
    mergeRoots,
    getDocumentText,
    getWorkspaceSpwFiles,
    mapWithConcurrency,
    sendNotification,
    log,
    trialRunSpw,
    loadObservableState,
    observableState,
    observableStateLoadedAt,
  }
}

// ── Diagnostics debounce ────────────────────────────────────────

function debounceDiagnostics(uri: string): void {
  const existing = DIAGNOSTIC_DEBOUNCE.get(uri)
  if (existing) clearTimeout(existing)
  DIAGNOSTIC_DEBOUNCE.set(uri, setTimeout(() => {
    DIAGNOSTIC_DEBOUNCE.delete(uri)
    void _publishDiagnostics(uri, getDeps())
  }, DIAGNOSTIC_DELAY_MS))
}

// ── Request dispatcher ──────────────────────────────────────────

async function handleRequest(message: JsonRpcRequest): Promise<void> {
  const id = message.id ?? null
  serverIndex.tick()

  try {
    const deps = getDeps()
    switch (message.method) {
      case 'initialize': {
        WORKSPACE_ROOT = parseWorkspaceRoot(message.params)
        CONFIG = await loadConfig(WORKSPACE_ROOT, message.params?.initializationOptions)
        serverIndex = new ServerIndex(WORKSPACE_ROOT)
        loadObservableState()
        log(`initialize workspace=${WORKSPACE_ROOT} config=${JSON.stringify(CONFIG)}`)

        sendResult(id, {
          serverInfo: { name: 'spw-lsp', version: '0.2.0-alpha.3' },
          capabilities: {
            textDocumentSync: 1,
            definitionProvider: true,
            declarationProvider: true,
            referencesProvider: true,
            renameProvider: { prepareProvider: true },
            documentLinkProvider: { resolveProvider: false },
            hoverProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            completionProvider: { triggerCharacters: ['@', '~', '/', '#'] },
            codeLensProvider: { resolveProvider: false },
            documentFormattingProvider: true,
            inlayHintProvider: true,
            foldingRangeProvider: true,
          },
        })

        void serverIndex.scanWorkspace().then(() => {
          log(`workspace scan complete: ${serverIndex.allAnnotations().length} annotations`)
        })
        return
      }

      case 'shutdown':
        SHUTDOWN = true
        sendResult(id, null)
        return

      case 'textDocument/definition':
      case 'textDocument/declaration':
        sendResult(id, await _definition(message.params, deps))
        return

      case 'textDocument/documentLink':
        sendResult(id, await _documentLinks(message.params, deps))
        return

      case 'textDocument/hover':
        sendResult(id, await _hover(message.params, deps))
        return

      case 'textDocument/documentSymbol':
        sendResult(id, _documentSymbols(message.params, deps))
        return

      case 'workspace/symbol':
        sendResult(id, _workspaceSymbols(message.params, deps))
        return

      case 'textDocument/completion':
        sendResult(id, await _completion(message.params, deps))
        return

      case 'textDocument/codeLens':
        sendResult(id, _codeLens(message.params, deps))
        return

      case 'textDocument/formatting':
        sendResult(id, _formatting(message.params, deps))
        return

      case 'textDocument/inlayHint':
        sendResult(id, await _inlayHints(message.params, deps))
        return

      case 'textDocument/references':
        sendResult(id, await _references(message.params, deps))
        return

      case 'textDocument/prepareRename':
        sendResult(id, await _prepareRename(message.params, deps))
        return

      case 'textDocument/rename':
        sendResult(id, await _rename(message.params, deps))
        return

      case 'textDocument/foldingRange':
        sendResult(id, _foldingRanges(message.params, deps))
        return

      case 'spw/select': {
        const uri = message.params?.textDocument?.uri
        const source = uri ? await getDocumentText(uri) : null
        sendResult(id, source ? selectPathRefs(source) : [])
        return
      }

      default:
        if (typeof id === 'number' || typeof id === 'string') {
          sendError(id, -32601, `Method not found: ${message.method}`)
        }
        return
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    sendError(id, -32603, 'Internal error', details)
  }
}

// ── Notification handler ────────────────────────────────────────

function handleNotification(message: JsonRpcRequest): void {
  switch (message.method) {
    case 'initialized':
      return

    case 'exit':
      process.exit(SHUTDOWN ? 0 : 1)

    case 'textDocument/didOpen': {
      const uri = message.params?.textDocument?.uri
      const text = message.params?.textDocument?.text
      const version = Number(message.params?.textDocument?.version ?? 1)
      if (!uri || typeof text !== 'string') return
      const filePath = pathFromUri(uri)
      if (!filePath) return
      serverIndex.openDocument(uri, filePath, text, version)
      debounceDiagnostics(uri)
      return
    }

    case 'textDocument/didChange': {
      const uri = message.params?.textDocument?.uri
      const version = Number(message.params?.textDocument?.version ?? 1)
      const changes = Array.isArray(message.params?.contentChanges) ? message.params.contentChanges : []
      const latest = changes[changes.length - 1]
      if (!uri || typeof latest?.text !== 'string') return
      serverIndex.updateDocument(uri, latest.text, version)
      debounceDiagnostics(uri)
      return
    }

    case 'textDocument/didSave': {
      const uri = message.params?.textDocument?.uri
      if (!uri) return
      serverIndex.saveDocument(uri)
      debounceDiagnostics(uri)
      loadObservableState()
      return
    }

    case 'textDocument/didClose': {
      const uri = message.params?.textDocument?.uri
      if (!uri) return
      serverIndex.closeDocument(uri)
      sendNotification('textDocument/publishDiagnostics', { uri, diagnostics: [] })
      return
    }

    case 'workspace/didChangeWatchedFiles': {
      const changes = Array.isArray(message.params?.changes) ? message.params.changes : []
      for (const change of changes as Array<{ uri: string; type: number }>) {
        const filePath = pathFromUri(change.uri)
        if (!filePath || !filePath.endsWith('.spw')) continue
        void serverIndex.refreshFileAnnotations(filePath)
      }
      return
    }

    case '$/cancelRequest':
      return

    default:
      return
  }
}

// ── Transport ───────────────────────────────────────────────────

serverIndex = new ServerIndex(WORKSPACE_ROOT)

function processIncoming(): void {
  while (true) {
    const headerEnd = incoming.indexOf('\r\n\r\n')
    if (headerEnd === -1) return

    const headerRaw = incoming.subarray(0, headerEnd).toString('utf8')
    const lengthLine = headerRaw
      .split('\r\n')
      .find((line) => line.toLowerCase().startsWith('content-length:'))
    if (!lengthLine) {
      incoming = incoming.subarray(headerEnd + 4)
      continue
    }

    const contentLength = Number(lengthLine.split(':')[1]?.trim() ?? '')
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      incoming = incoming.subarray(headerEnd + 4)
      continue
    }

    const messageStart = headerEnd + 4
    const messageEnd = messageStart + contentLength
    if (incoming.length < messageEnd) return

    const body = incoming.subarray(messageStart, messageEnd).toString('utf8')
    incoming = incoming.subarray(messageEnd)

    let message: JsonRpcRequest
    try {
      message = JSON.parse(body)
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error)
      sendError(null, -32700, 'Parse error', details)
      continue
    }

    if (typeof message.id !== 'undefined') {
      void handleRequest(message)
    } else {
      handleNotification(message)
    }
  }
}

process.stdin.on('data', (chunk: Buffer) => {
  incoming = Buffer.concat([incoming, chunk])
  processIncoming()
})

process.stdin.on('error', (error) => { log(`stdin error: ${error.message}`) })
process.on('uncaughtException', (error) => { log(`uncaughtException: ${error.message}`) })
process.on('unhandledRejection', (error) => {
  const details = error instanceof Error ? error.message : String(error)
  log(`unhandledRejection: ${details}`)
})

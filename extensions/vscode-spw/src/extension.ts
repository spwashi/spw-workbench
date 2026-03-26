import * as vscode from 'vscode'
import * as path from 'path'
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node'
import { AnnotationIndex } from './annotation-index'
import type { SpwContext } from './context'
import { ROOT_MAP, resolveRoot } from './roots'
import { SIGIL_SEMANTICS } from './semantics'
import { registerConceptsTreeView } from './views/concepts-tree'

let client: LanguageClient | undefined

export function activate(context: vscode.ExtensionContext): void {
  const documentSelector: vscode.DocumentSelector = { language: 'spw' }

  // ── LSP Client ──────────────────────────────────────────────────
  // The stdio-server.ts handles: definition, documentLink, hover,
  // documentSymbol, workspaceSymbol, completion, codeLens,
  // formatting, diagnostics.

  const serverScript = resolveServerPath()

  // Use node --import tsx to run the TypeScript server directly.
  // This mirrors the approach used in smoke-navigation.ts.
  const serverOptions: ServerOptions = {
    run: {
      command: process.execPath,
      args: ['--import', 'tsx', serverScript],
    },
    debug: {
      command: process.execPath,
      args: ['--import', 'tsx', serverScript],
    },
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'spw' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.spw'),
    },
  }

  client = new LanguageClient(
    'spwLanguageServer',
    'Spw Language Server',
    serverOptions,
    clientOptions,
  )

  client.start()
  context.subscriptions.push({ dispose: () => { void client?.stop() } })

  // ── Extension-only features ─────────────────────────────────────
  // These remain client-side because:
  // - Semantic tokens: uses VS Code SemanticTokensBuilder API
  // - Concepts tree: VS Code-specific TreeDataProvider UI

  const annotationIndex = new AnnotationIndex()
  void annotationIndex.activate()
  context.subscriptions.push({ dispose: () => annotationIndex.dispose() })

  const spw: SpwContext = {
    documentSelector,
    annotationIndex,
    resolveRoot,
    ROOT_MAP,
    SIGIL_SEMANTICS,
  }

  const disposables: vscode.Disposable[] = [
    ...registerConceptsTreeView(spw),
  ]

  context.subscriptions.push(...disposables)
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop()
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function resolveServerPath(): string {
  // Resolve the LSP server relative to the workspace root.
  // The server lives at <repo>/packages/spw-lsp/src/stdio-server.ts
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (workspaceFolder) {
    return path.join(workspaceFolder.uri.fsPath, 'packages', 'spw-lsp', 'src', 'stdio-server.ts')
  }
  // Fallback: assume extension is installed inside the repo
  return path.resolve(__dirname, '..', '..', '..', 'packages', 'spw-lsp', 'src', 'stdio-server.ts')
}

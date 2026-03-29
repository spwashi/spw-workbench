import * as vscode from 'vscode'
import * as path from 'path'
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node'
import { AnnotationIndex } from './annotation-index'
import { createSpwContext } from './context'
import { registerContextStrip } from './context-strip'
import { createSpwCustomRequestClient } from './lsp/custom-requests'
import { ROOT_MAP, resolveRoot } from './roots'
import { SIGIL_SEMANTICS } from './semantics'
import { registerConceptsTreeView } from './views/concepts-tree'

let client: LanguageClient | undefined

export function activate(context: vscode.ExtensionContext): void {
  const documentSelector: vscode.DocumentSelector = { language: 'spw' }
  client = createLanguageClient()
  client.start()

  const requests = createSpwCustomRequestClient(client)
  const annotationIndex = new AnnotationIndex(requests)
  const spw = createSpwContext({
    documentSelector,
    annotationIndex,
    requests,
    resolveRoot,
    ROOT_MAP,
    SIGIL_SEMANTICS,
  })

  void annotationIndex.activate()

  context.subscriptions.push(
    { dispose: () => { void client?.stop() } },
    annotationIndex,
    spw.events,
  )

  const disposables: vscode.Disposable[] = [
    ...registerContextStrip(spw),
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

function createLanguageClient(): LanguageClient {
  // The stdio-server.ts handles: definition, documentLink, hover,
  // documentSymbol, workspaceSymbol, completion, codeLens,
  // formatting, diagnostics, and the custom `spw/*` request lane.
  return new LanguageClient(
    'spwLanguageServer',
    'Spw Language Server',
    createServerOptions(resolveServerPath()),
    createClientOptions(),
  )
}

function createServerOptions(serverScript: string): ServerOptions {
  // Use node --import tsx to run the TypeScript server directly.
  // This mirrors the approach used in smoke-navigation.ts.
  return {
    run: {
      command: process.execPath,
      args: ['--import', 'tsx', serverScript],
    },
    debug: {
      command: process.execPath,
      args: ['--import', 'tsx', serverScript],
    },
  }
}

function createClientOptions(): LanguageClientOptions {
  return {
    documentSelector: [{ scheme: 'file', language: 'spw' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.spw'),
    },
  }
}

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

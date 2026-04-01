import * as vscode from 'vscode'
import * as fs from 'node:fs'
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
import { registerWorkspaceAtlasView } from './views/workspace-tree'

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
    ...registerWorkspaceAtlasView(spw),
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
  if (serverScript.endsWith('.js')) {
    return {
      run: {
        command: process.execPath,
        args: [serverScript],
      },
      debug: {
        command: process.execPath,
        args: [serverScript],
      },
    }
  }

  // Fall back to tsx only when the built server is unavailable.
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
  const candidateRoots = new Set<string>()
  const workspaceRoots = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? []

  if (process.env.SPW_WORKBENCH_ROOT) {
    candidateRoots.add(process.env.SPW_WORKBENCH_ROOT)
  }

  for (const workspaceRoot of workspaceRoots) {
    candidateRoots.add(workspaceRoot)
    candidateRoots.add(path.join(workspaceRoot, '.spw', '_workbench'))
    candidateRoots.add(path.join(workspaceRoot, 'node_modules', 'spw-workbench'))
  }

  candidateRoots.add(path.resolve(__dirname, '..', '..', '..'))

  for (const root of candidateRoots) {
    const builtCandidate = path.join(root, 'packages', 'spw-lsp', 'dist', 'stdio-server.js')
    if (fs.existsSync(builtCandidate)) {
      return builtCandidate
    }

    const sourceCandidate = path.join(root, 'packages', 'spw-lsp', 'src', 'stdio-server.ts')
    if (fs.existsSync(sourceCandidate)) {
      return sourceCandidate
    }
  }

  if (workspaceRoots[0]) {
    return path.join(workspaceRoots[0], 'packages', 'spw-lsp', 'src', 'stdio-server.ts')
  }

  return path.resolve(__dirname, '..', '..', '..', 'packages', 'spw-lsp', 'src', 'stdio-server.ts')
}

import * as vscode from 'vscode'
import {
  LanguageClient,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node'
import { AnnotationIndex } from './annotation-index'
import { createSpwContext } from './context'
import { registerContextStrip } from './context-strip'
import { createSpwCustomRequestClient } from './lsp/custom-requests'
import { registerSpwNavigation } from './navigation'
import { SIGIL_SEMANTICS } from './semantics'
import { registerConceptsTreeView } from './views/concepts-tree'
import { registerWorkspaceAtlasView } from './views/workspace-tree'
import { registerSpwCommands } from './commands'
import { registerSpwInstrumentCommands } from './instruments/commands'
import { ProbeCache } from './instruments/probe-cache'
import { readSurfaceConfig, registerSurfaceDecorations } from './surface-decorations'

let client: LanguageClient | undefined

export function activate(context: vscode.ExtensionContext): void {
  const documentSelector: vscode.DocumentSelector = { scheme: 'file', language: 'spw' }
  client = createLanguageClient(context)
  client.start()

  const requests = createSpwCustomRequestClient(client)
  const annotationIndex = new AnnotationIndex(requests)
  const spw = createSpwContext({
    documentSelector,
    annotationIndex,
    requests,
    SIGIL_SEMANTICS,
  })

  void annotationIndex.activate()

  const probeCache = new ProbeCache(readSurfaceConfig().probeCacheMs)

  context.subscriptions.push(
    { dispose: () => { void client?.stop() } },
    annotationIndex,
    spw.events,
  )

  const disposables: vscode.Disposable[] = [
    ...registerContextStrip(spw),
    ...registerSpwNavigation(spw),
    ...registerConceptsTreeView(spw),
    ...registerWorkspaceAtlasView(spw),
    ...registerSurfaceDecorations(probeCache, (doc) => {
      void vscode.commands.executeCommand('spw.inspectGeometry')
    }),
    ...registerSpwCommands(client, requests),
    ...registerSpwInstrumentCommands(client, requests, probeCache),
  ]

  context.subscriptions.push(...disposables)
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop()
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function createLanguageClient(
  context: vscode.ExtensionContext,
): LanguageClient {
  // The stdio-server.ts handles: definition, documentLink, hover,
  // documentSymbol, workspaceSymbol, completion, codeLens,
  // formatting, diagnostics, and the custom `spw/*` request lane.
  return new LanguageClient(
    'spwLanguageServer',
    'Spw Language Server',
    createServerOptions(context),
    createClientOptions(),
  )
}

function createServerOptions(context: vscode.ExtensionContext): ServerOptions {
  const module = configuredServerPath(context)
  return {
    run: { module, transport: TransportKind.stdio },
    debug: { module, transport: TransportKind.stdio },
  }
}

function createClientOptions(): LanguageClientOptions {
  const cfg = vscode.workspace.getConfiguration('spw')
  return {
    documentSelector: [{ scheme: 'file', language: 'spw' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.spw'),
      configurationSection: 'spw',
    },
    initializationOptions: {
      inlayHints: {
        paths: cfg.get<boolean>('inlayHints.paths', true),
        annotations: cfg.get<boolean>('inlayHints.annotations', true),
        frames: cfg.get<boolean>('inlayHints.frames', true),
      },
      diagnostics: {
        unresolvedRefs: cfg.get<string>('diagnostics.unresolvedRefs', 'warning'),
      },
    },
    middleware: undefined,
  }
}

function configuredServerPath(context: vscode.ExtensionContext): string {
  const manifest = context.extension.packageJSON as { spw?: { server?: unknown } }
  const configured = manifest.spw?.server
  if (
    typeof configured !== 'string' ||
    !configured.startsWith('./') ||
    configured.split('/').includes('..')
  ) {
    throw new Error('The extension manifest does not declare a safe bundled Spw server path.')
  }
  return context.asAbsolutePath(configured.slice(2))
}

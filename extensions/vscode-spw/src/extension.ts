import * as vscode from 'vscode'
import { AnnotationIndex } from './annotation-index'
import type { SpwContext } from './context'
import { ROOT_MAP, resolveRoot } from './roots'
import { SIGIL_SEMANTICS } from './semantics'
import { registerCompletionProvider } from './providers/completion'
import { registerCodeLensProvider } from './providers/codelens'
import { registerDocumentLinkProvider } from './providers/document-link'
import { registerDocumentSymbolProvider } from './providers/document-symbol'
import { registerHoverProvider } from './providers/hover'
import { registerSemanticTokensProvider } from './providers/semantic-tokens'
import { registerWorkspaceSymbolProvider } from './providers/workspace-symbol'
import { registerConceptsTreeView } from './views/concepts-tree'

export function activate(context: vscode.ExtensionContext): void {
  const documentSelector: vscode.DocumentSelector = { language: 'spw' }

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
    registerDocumentLinkProvider(spw),
    registerCompletionProvider(spw),
    registerHoverProvider(spw),
    registerDocumentSymbolProvider(spw),
    registerSemanticTokensProvider(spw),
    registerWorkspaceSymbolProvider(spw),
    registerCodeLensProvider(spw),
    ...registerConceptsTreeView(spw),
  ]

  context.subscriptions.push(...disposables)
}

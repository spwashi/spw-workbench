/**
 * Client-side code lens shaping: `spw.codeLens.enabled` hides the extension's
 * lenses, and reference-count lenses open a references peek.
 */
import * as vscode from 'vscode'
import type { LanguageClient, Middleware } from 'vscode-languageclient/node'
import { isNavigableReferenceLens, referenceLookupCharacters } from './reference-lenses'

export const PEEK_REFERENCES_COMMAND = 'spw.peekReferences'
const ENABLED_SETTING = 'codeLens.enabled'

export function codeLensMiddleware(): Middleware {
  return {
    provideCodeLenses: async (document, token, next) => {
      if (!codeLensesEnabled(document)) return []
      const lenses = await next(document, token)
      return lenses?.map(lens => withReferencePeek(document, lens)) ?? lenses
    },
  }
}

/** The peek command and the setting listener; both need the started client. */
export function registerCodeLensControls(client: LanguageClient): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(PEEK_REFERENCES_COMMAND, peekReferences),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(`spw.${ENABLED_SETTING}`)) refreshCodeLenses(client)
    }),
  ]
}

function codeLensesEnabled(document: vscode.TextDocument): boolean {
  return vscode.workspace.getConfiguration('spw', document).get<boolean>(ENABLED_SETTING, true)
}

function withReferencePeek(document: vscode.TextDocument, lens: vscode.CodeLens): vscode.CodeLens {
  if (!isNavigableReferenceLens(lens.command)) return lens
  const at = lens.range.start
  const line = at.line < document.lineCount ? document.lineAt(at.line).text : ''
  lens.command = {
    title: lens.command!.title,
    tooltip: 'Peek references',
    command: PEEK_REFERENCES_COMMAND,
    arguments: [document.uri, at, referenceLookupCharacters(line, at.character)],
  }
  return lens
}

async function peekReferences(
  uri: vscode.Uri,
  at: vscode.Position,
  characters: number[],
): Promise<void> {
  for (const character of characters) {
    const locations = await vscode.commands.executeCommand<vscode.Location[] | undefined>(
      'vscode.executeReferenceProvider',
      uri,
      new vscode.Position(at.line, character),
    )
    if (locations?.length) {
      await vscode.commands.executeCommand('editor.action.showReferences', uri, at, locations)
      return
    }
  }
  void vscode.window.showInformationMessage('The language server found no references for this lens.')
}

/** Asks VS Code to re-request lenses for every open Spw document. */
function refreshCodeLenses(client: LanguageClient): void {
  const feature = client.getFeature('textDocument/codeLens')
  const fired = new Set<vscode.EventEmitter<void>>()
  for (const document of vscode.workspace.textDocuments) {
    if (document.languageId !== 'spw') continue
    const emitter = feature.getProvider(document)?.onDidChangeCodeLensEmitter
    if (emitter && !fired.has(emitter)) {
      fired.add(emitter)
      emitter.fire()
    }
  }
}

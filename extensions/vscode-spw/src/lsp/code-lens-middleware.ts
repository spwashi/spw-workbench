/**
 * Client-side code lens shaping: `spw.codeLens.enabled` hides the extension's
 * lenses, reference-count lenses open a references peek, and a citation lens
 * shows the sites it names. The lenses a document gets also tell the
 * generated-surface guard what the document is.
 */
import * as vscode from 'vscode'
import type { LanguageClient, Middleware } from 'vscode-languageclient/node'
import type { GeneratedSurfaces } from './generated-surface'
import {
  SHOW_LOCATIONS_COMMAND,
  isNavigableReferenceLens,
  locationLensArguments,
  referenceLookupCharacters,
} from './reference-lenses'

export const PEEK_REFERENCES_COMMAND = 'spw.peekReferences'
const ENABLED_SETTING = 'codeLens.enabled'

export function codeLensMiddleware(generated?: GeneratedSurfaces): Middleware {
  return {
    provideCodeLenses: async (document, token, next) => {
      if (!codeLensesEnabled(document)) return []
      const lenses = await next(document, token)
      generated?.learn(document.uri.toString(), lenses?.map(lens => lens.command) ?? [])
      return lenses?.map(lens => withReferencePeek(document, lens)) ?? lenses
    },
  }
}

/** The lens commands and the setting listener; the listener needs the started client. */
export function registerCodeLensControls(client: LanguageClient): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(PEEK_REFERENCES_COMMAND, peekReferences),
    vscode.commands.registerCommand(SHOW_LOCATIONS_COMMAND, showLocations),
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

/** A citation lens's sites, in the same peek a reference lens opens. */
async function showLocations(uri: unknown, at: unknown, locations: unknown): Promise<void> {
  const args = locationLensArguments(uri, at, locations)
  if (!args) return
  const toPosition = (p: { line: number; character: number }) => new vscode.Position(p.line, p.character)
  await vscode.commands.executeCommand(
    'editor.action.showReferences',
    vscode.Uri.parse(args.uri),
    toPosition(args.at),
    args.locations.map(location => new vscode.Location(
      vscode.Uri.parse(location.uri),
      new vscode.Range(toPosition(location.range.start), toPosition(location.range.end)),
    )),
  )
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

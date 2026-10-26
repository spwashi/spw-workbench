/**
 * Generated-surface guard: the Open source and Rebuild lens commands, and a
 * warning the first time a generated file is edited in a session.
 *
 * VS Code cannot cancel a save (onWillSave only delays one), so the guard
 * speaks at the first edit instead: it names the source and the rebuild that
 * will replace the edit, and offers both. Rebuild types the registry's
 * command into a fresh terminal and leaves running it to the reader.
 */
import path from 'node:path'
import * as vscode from 'vscode'
import {
  OPEN_URI_COMMAND,
  REBUILD_GENERATED_COMMAND,
  dirtyWarning,
  isGeneratedSurface,
  type GeneratedSurface,
  type GeneratedSurfaces,
} from './generated-surface'

const REBUILD_TERMINAL = 'Spw rebuild'
const OPEN_SOURCE = 'Open source'
const REBUILD = 'Rebuild'

export function registerGeneratedSurfaceGuard(generated: GeneratedSurfaces): vscode.Disposable[] {
  const warned = new Set<string>()
  return [
    vscode.commands.registerCommand(OPEN_URI_COMMAND, openUri),
    vscode.commands.registerCommand(REBUILD_GENERATED_COMMAND, rebuildGenerated),
    vscode.workspace.onDidChangeTextDocument(event => {
      const document = event.document
      if (document.languageId !== 'spw' || !document.isDirty || event.contentChanges.length === 0) return
      const key = document.uri.toString()
      const surface = generated.get(key)
      if (!surface || warned.has(key)) return
      warned.add(key)
      void warnOnEdit(document, surface)
    }),
  ]
}

async function warnOnEdit(document: vscode.TextDocument, surface: GeneratedSurface): Promise<void> {
  const actions = surface.sourceUri ? [OPEN_SOURCE, REBUILD] : [REBUILD]
  const choice = await vscode.window.showWarningMessage(
    dirtyWarning(path.basename(document.uri.fsPath), surface),
    ...actions,
  )
  if (choice === OPEN_SOURCE) await openUri(surface.sourceUri)
  else if (choice === REBUILD) await rebuildGenerated(surface)
}

/** Opens the file a lens names: a generated file's source, its spec, or its generator. */
async function openUri(uri: unknown): Promise<void> {
  if (typeof uri !== 'string') return
  await vscode.window.showTextDocument(vscode.Uri.parse(uri))
}

/** Types the rebuild for the reader to run, or opens the generator when the registry names no command. */
async function rebuildGenerated(surface: unknown): Promise<void> {
  if (!isGeneratedSurface(surface)) return
  if (surface.command) {
    const terminal = vscode.window.createTerminal({ name: REBUILD_TERMINAL, cwd: surface.cwd })
    terminal.show()
    terminal.sendText(surface.command, false)
    return
  }
  await openUri(surface.generatorUri)
}

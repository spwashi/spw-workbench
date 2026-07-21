import * as path from 'node:path'
import * as vscode from 'vscode'
import type { AnnotationEntry } from './annotation-index'
import type { SpwContext } from './context'

type NavigationTarget =
  | { kind: 'root'; sigil: string; resolvedPath: string }
  | { kind: 'annotation'; entry: AnnotationEntry }

interface NavigationItem extends vscode.QuickPickItem {
  target: NavigationTarget
}

const ANNOTATION_ICONS: Record<AnnotationEntry['kind'], string> = {
  topic: 'symbol-key',
  lens: 'eye',
  intent: 'zap',
  anchor: 'link',
  prompt_root: 'compass',
}

export function registerSpwNavigation(spw: SpwContext): vscode.Disposable[] {
  return [vscode.commands.registerCommand('spw.navigate', async () => {
    const items = await navigationItems(spw)
    const selected = await vscode.window.showQuickPick(items, {
      title: 'Navigate Spw',
      placeHolder: 'Choose a declared root or indexed landmark',
      matchOnDescription: true,
      matchOnDetail: true,
    })
    if (!selected) return

    if (selected.target.kind === 'root') {
      const { sigil, resolvedPath } = selected.target
      spw.activeRoot = { sigil, resolvedPath }
      spw.events.emit('atlas.rootSelected', { sigil, resolvedPath, manifestFrame: null })
      await openWorkspaceTarget(resolvedPath)
      return
    }

    await openAnnotation(selected.target.entry)
  })]
}

export async function openWorkspaceTarget(resolvedPath: string): Promise<void> {
  const uri = vscode.Uri.file(resolvedPath)
  try {
    const stat = await vscode.workspace.fs.stat(uri)
    if ((stat.type & vscode.FileType.Directory) !== 0) {
      await vscode.commands.executeCommand('revealInExplorer', uri)
      return
    }
  } catch {
    // Let the editor report an unresolvable file target.
  }
  await vscode.commands.executeCommand('vscode.open', uri)
}

async function navigationItems(spw: SpwContext): Promise<NavigationItem[]> {
  const items: NavigationItem[] = []
  try {
    const manifest = await spw.requests.workspaceManifest()
    for (const root of manifest.roots) {
      items.push({
        label: `$(${rootIcon(root.resolvedPath)}) @${root.sigil}`,
        description: relativeDisplayPath(root.resolvedPath),
        detail: manifest.rootSource === 'manifest' ? 'declared workspace root' : 'inferred workspace root',
        target: { kind: 'root', sigil: root.sigil, resolvedPath: root.resolvedPath },
      })
    }
  } catch {
    // The annotation index still provides useful navigation while the LSP starts.
  }

  for (const entry of spw.annotationIndex.all()) {
    items.push({
      label: `$(${ANNOTATION_ICONS[entry.kind]}) ${entry.name}`,
      description: `${relativeDisplayPath(entry.file.fsPath)}:${entry.line + 1}`,
      detail: entry.framePath.length > 0 ? entry.framePath.join(' › ') : entry.kind,
      target: { kind: 'annotation', entry },
    })
  }
  return items
}

async function openAnnotation(entry: AnnotationEntry): Promise<void> {
  const document = await vscode.workspace.openTextDocument(entry.file)
  const editor = await vscode.window.showTextDocument(document)
  const position = new vscode.Position(entry.line, 0)
  editor.selection = new vscode.Selection(position, position)
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport)
}

function relativeDisplayPath(target: string): string {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(target))
  return folder ? path.relative(folder.uri.fsPath, target) || '.' : path.basename(target)
}

function rootIcon(target: string): string {
  return path.extname(target) ? 'file' : 'root-folder'
}

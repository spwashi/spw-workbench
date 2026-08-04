import * as vscode from 'vscode'
import type { AnnotationEntry } from './annotation-index'
import type { SpwContext } from './context'
import type { SpwWorkspaceRootEntry } from './lsp/custom-requests'

type NavigationTarget =
  | { kind: 'root', entry: SpwWorkspaceRootEntry }
  | { kind: 'annotation', entry: AnnotationEntry }

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
      placeHolder: 'Choose a workspace root or indexed landmark',
      matchOnDescription: true,
      matchOnDetail: true,
    })
    if (!selected) return

    if (selected.target.kind === 'root') {
      const { sigil, uri } = selected.target.entry
      spw.activeRoot = { sigil, uri }
      spw.events.emit('atlas.rootSelected', { sigil, uri, manifestFrame: null })
      await openWorkspaceTarget(uri, selected.target.entry.kind)
      return
    }

    await openAnnotation(selected.target.entry)
  })]
}

export async function openWorkspaceTarget(
  targetUri: string,
  knownKind?: SpwWorkspaceRootEntry['kind'],
): Promise<void> {
  const uri = vscode.Uri.parse(targetUri)
  try {
    const kind = knownKind ?? await pathKind(uri)
    if (kind === 'directory') {
      await vscode.commands.executeCommand('revealInExplorer', uri)
      return
    }
  } catch {
    // Let vscode.open report a target that cannot be revealed as a directory.
  }
  await vscode.commands.executeCommand('vscode.open', uri)
}

export function displayWorkspaceUri(targetUri: string): string {
  const uri = vscode.Uri.parse(targetUri)
  const folder = vscode.workspace.getWorkspaceFolder(uri)
  if (folder) return vscode.workspace.asRelativePath(uri, false) || '.'
  return uri.toString(true)
}

async function navigationItems(spw: SpwContext): Promise<NavigationItem[]> {
  const items: NavigationItem[] = []
  try {
    const manifest = await spw.requests.workspaceManifest()
    if (manifest.roots.length > 0) {
      items.push({
        label: 'Workspace Roots',
        kind: vscode.QuickPickItemKind.Separator,
      } as unknown as NavigationItem)
    }
    for (const entry of manifest.roots) {
      items.push({
        label: `$(${rootIcon(entry.kind)}) @${entry.sigil}`,
        description: displayWorkspaceUri(entry.uri),
        detail: `${manifest.rootSource} · ${entry.role} · ${entry.kind}`,
        target: { kind: 'root', entry },
      })
    }
  } catch {
    // Indexed annotations remain useful while workspace evidence is unavailable.
  }

  const annotations = spw.annotationIndex.all()
  if (annotations.length > 0) {
    items.push({
      label: 'Indexed Landmarks & Annotations',
      kind: vscode.QuickPickItemKind.Separator,
    } as unknown as NavigationItem)
  }
  for (const entry of annotations) {
    items.push({
      label: `$(${ANNOTATION_ICONS[entry.kind]}) ${entry.name}`,
      description: `${displayWorkspaceUri(entry.file.toString())}:${entry.line + 1}`,
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
  editor.revealRange(
    new vscode.Range(position, position),
    vscode.TextEditorRevealType.InCenterIfOutsideViewport,
  )
}

async function pathKind(uri: vscode.Uri): Promise<SpwWorkspaceRootEntry['kind']> {
  const stat = await vscode.workspace.fs.stat(uri)
  if ((stat.type & vscode.FileType.Directory) !== 0) return 'directory'
  if ((stat.type & vscode.FileType.File) !== 0) return 'file'
  return 'other'
}

function rootIcon(kind: SpwWorkspaceRootEntry['kind']): string {
  if (kind === 'directory') return 'root-folder'
  if (kind === 'file') return 'file'
  if (kind === 'unreadable') return 'lock'
  if (kind === 'missing') return 'warning'
  return 'question'
}

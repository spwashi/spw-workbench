/**
 * VS Code side of the instruments: which editor and folder a reading is for,
 * where the CLI lives, and how a result is shown.
 */
import * as vscode from 'vscode'
import { resolveSpwCliHost, type SpwCliHost } from './cli-invocation'

export function activeSpwEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.document.languageId !== 'spw') {
    void vscode.window.showInformationMessage('Open a .spw file first.')
    return undefined
  }
  return editor
}

export function activeWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const editor = vscode.window.activeTextEditor
  const folder = editor && vscode.workspace.getWorkspaceFolder(editor.document.uri)
    || vscode.workspace.workspaceFolders?.[0]
  if (!folder) void vscode.window.showInformationMessage('Open a workspace folder first.')
  return folder
}

/** The folder that holds a saved .spw file, or a message saying why there is none. */
export function fileWorkspaceFolder(document: vscode.TextDocument): vscode.WorkspaceFolder | undefined {
  const folder = document.uri.scheme === 'file'
    ? vscode.workspace.getWorkspaceFolder(document.uri)
    : undefined
  if (!folder) {
    void vscode.window.showInformationMessage('Save this .spw file inside an open workspace folder first.')
  }
  return folder
}

export async function resolveCliHostFor(
  folder: vscode.WorkspaceFolder,
  purpose: string,
): Promise<SpwCliHost | undefined> {
  const configuredToolRoot = vscode.workspace
    .getConfiguration('spw', folder.uri)
    .get<string>('cli.toolRoot', '')
  const host = await resolveSpwCliHost(folder.uri.fsPath, configuredToolRoot)
  if (!host) {
    void vscode.window.showErrorMessage(
      `${purpose} requires an npm \`spw\` script in the workspace, mounted \`.spw/_workbench\`, or spw.cli.toolRoot.`,
    )
  }
  return host
}

export async function showInstrument(
  lines: string[],
  language: string,
  beside = true,
): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content: lines.join('\n'), language })
  await vscode.window.showTextDocument(doc, {
    preview: true,
    ...(beside ? { viewColumn: vscode.ViewColumn.Beside } : {}),
  })
}

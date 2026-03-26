import * as path from 'path'
import * as vscode from 'vscode'

export const ROOT_MAP: Record<string, string[]> = {
  '@docs': ['docs'],
  '@src': ['src'],
  '@lib': ['lib'],
  '@spec': ['lib', 'spw-v0.3.0'],
  '@theory': ['docs', 'theory'],
  '@scripts': ['scripts'],
  '@core': ['src', 'core'],
  '@runtime': ['src', 'runtime'],
  '@design': ['src', 'design'],
  '@infra': ['src', 'infra'],
  '@spw': ['.spw'],
  '@biome': ['.spw', 'biome', 'ocean'],
  '@harness': ['.spw', 'harness'],
  '@gen': ['.spw', 'gen'],
  '@hot': ['.spw', 'hot.spw'],
  '@shelves': ['.spw', 'shelves.spw'],
  '@topology': ['.spw', 'topology.spw'],
  '@agents': ['.agents'],
  '@plans': ['.agents', 'plans'],
  '@state': ['.agents', 'state'],
  '@skills': ['.agents', 'skills'],
  '@library': ['docs', 'library'],
}

export function resolveRoot(sigil: string, workspaceRoot: string, documentUri: vscode.Uri): string {
  if (sigil === '@here') return path.dirname(documentUri.fsPath)
  const segments = ROOT_MAP[sigil]
  return segments ? path.join(workspaceRoot, ...segments) : workspaceRoot
}

export function getWorkspaceRoot(): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders || workspaceFolders.length === 0) return null
  return workspaceFolders[0].uri.fsPath
}

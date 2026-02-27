import * as vscode from 'vscode'
import type { SpwContext } from '../context'

export function registerWorkspaceSymbolProvider(spw: SpwContext): vscode.Disposable {
  return vscode.languages.registerWorkspaceSymbolProvider({
    provideWorkspaceSymbols(query: string): vscode.SymbolInformation[] {
      const q = query.startsWith('#') ? query.slice(1) : query
      const entries = q ? spw.annotationIndex.search(q) : spw.annotationIndex.all()

      const kindMap: Record<string, vscode.SymbolKind> = {
        topic: vscode.SymbolKind.Key,
        lens: vscode.SymbolKind.Enum,
        intent: vscode.SymbolKind.Event,
        anchor: vscode.SymbolKind.Interface,
      }
      const prefixMap: Record<string, string> = {
        topic: '#',
        lens: '#:',
        intent: '#!',
        anchor: '#>',
      }

      return entries.map((entry) => {
        const label = `${prefixMap[entry.kind]}${entry.name}`
        const location = new vscode.Location(entry.file, new vscode.Position(entry.line, 0))
        return new vscode.SymbolInformation(
          label,
          kindMap[entry.kind] || vscode.SymbolKind.Key,
          entry.sectionLabel || '',
          location,
        )
      })
    },
  })
}

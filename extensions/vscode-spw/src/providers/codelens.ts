import * as vscode from 'vscode'
import type { SpwContext } from '../context'

export function registerCodeLensProvider(spw: SpwContext): vscode.Disposable {
  return vscode.languages.registerCodeLensProvider(spw.documentSelector, {
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
      const lenses: vscode.CodeLens[] = []
      const fileAnnotations = spw.annotationIndex.forFile(document.uri)

      for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
        const line = document.lineAt(lineIndex).text

        const frameMatch = line.match(/^\s*\^(?:\["([^"]+)"\]|"([^"]+)")/)
        if (frameMatch) {
          const frameName = frameMatch[1] || frameMatch[2]
          const inFrame = fileAnnotations.filter((entry) => entry.sectionLabel === frameName)
          if (inFrame.length > 0) {
            const kindCounts = new Map<string, number>()
            for (const entry of inFrame) {
              kindCounts.set(entry.kind, (kindCounts.get(entry.kind) || 0) + 1)
            }
            const summary = [...kindCounts.entries()].map(([kind, count]) => `${count} ${kind}`).join(', ')
            lenses.push(new vscode.CodeLens(new vscode.Range(lineIndex, 0, lineIndex, line.length), {
              title: `$(symbol-misc) ${summary}`,
              command: '',
            }))
          }
        }

        const anchorMatch = line.match(/#>([a-zA-Z_][a-zA-Z0-9_]*)/)
        if (anchorMatch) {
          const name = anchorMatch[1]
          const refs = spw.annotationIndex.lookup(name)
          const otherFiles = refs.filter((entry) => entry.file.toString() !== document.uri.toString())
          const fileCount = new Set(otherFiles.map((entry) => entry.file.toString())).size
          if (fileCount > 0) {
            lenses.push(new vscode.CodeLens(new vscode.Range(lineIndex, 0, lineIndex, line.length), {
              title: `$(references) ${fileCount} file ref(s)`,
              command: 'workbench.action.showAllSymbols',
              arguments: [name],
            }))
          }
        }
      }

      return lenses
    },
  })
}

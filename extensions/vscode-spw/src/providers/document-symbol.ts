import * as vscode from 'vscode'
import type { SpwContext } from '../context'

export function registerDocumentSymbolProvider(spw: SpwContext): vscode.Disposable {
  return vscode.languages.registerDocumentSymbolProvider(spw.documentSelector, {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
      const symbols: vscode.DocumentSymbol[] = []
      const tapRegex = /^(\s*)\^\["([^"]+)"\]/
      const injectRegex = /^(\s*)!(?:boon|bone|bane|bonk|honk)?\["([^"]+)"\]/
      const probeRegex = /^(\s*)\?\["([^"]+)"\]/
      const configRegex = /^(\s*)=([a-zA-Z_][a-zA-Z0-9_]*):/
      const annotationRegex = /^(\s*)#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/

      const stack: Array<{ indent: number; symbol: vscode.DocumentSymbol }> = []

      function addSymbol(sym: vscode.DocumentSymbol, indent: number): void {
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
          stack.pop()
        }

        if (stack.length > 0) {
          const parent = stack[stack.length - 1].symbol
          parent.children.push(sym)
          parent.range = new vscode.Range(parent.range.start, sym.range.end)
        } else {
          symbols.push(sym)
        }

        stack.push({ indent, symbol: sym })
      }

      for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
        const line = document.lineAt(lineIndex)
        const lineRange = new vscode.Range(
          new vscode.Position(lineIndex, 0),
          new vscode.Position(lineIndex, line.text.length),
        )

        const tapMatch = tapRegex.exec(line.text)
        if (tapMatch) {
          const indent = tapMatch[1].length
          const name = tapMatch[2]
          const selectionRange = new vscode.Range(
            new vscode.Position(lineIndex, tapMatch.index),
            new vscode.Position(lineIndex, tapMatch.index + tapMatch[0].length),
          )
          addSymbol(new vscode.DocumentSymbol(name, 'Spw Domain', vscode.SymbolKind.Module, lineRange, selectionRange), indent)
          continue
        }

        const injectMatch = injectRegex.exec(line.text)
        if (injectMatch) {
          const indent = injectMatch[1].length
          const name = injectMatch[2]
          const selectionRange = new vscode.Range(
            new vscode.Position(lineIndex, injectMatch.index),
            new vscode.Position(lineIndex, injectMatch.index + injectMatch[0].length),
          )
          addSymbol(new vscode.DocumentSymbol(name, 'Spw Facet', vscode.SymbolKind.Event, lineRange, selectionRange), indent)
          continue
        }

        const probeMatch = probeRegex.exec(line.text)
        if (probeMatch) {
          const indent = probeMatch[1].length
          const name = probeMatch[2]
          const selectionRange = new vscode.Range(
            new vscode.Position(lineIndex, probeMatch.index),
            new vscode.Position(lineIndex, probeMatch.index + probeMatch[0].length),
          )
          addSymbol(new vscode.DocumentSymbol(`? ${name}`, 'Spw Probe', vscode.SymbolKind.Boolean, lineRange, selectionRange), indent)
          continue
        }

        const configMatch = configRegex.exec(line.text)
        if (configMatch) {
          const indent = configMatch[1].length
          const name = configMatch[2]
          const selectionRange = new vscode.Range(
            new vscode.Position(lineIndex, configMatch.index),
            new vscode.Position(lineIndex, configMatch.index + configMatch[0].length),
          )
          addSymbol(new vscode.DocumentSymbol(`= ${name}`, 'Spw Config', vscode.SymbolKind.Property, lineRange, selectionRange), indent)
          continue
        }

        const annotationMatch = annotationRegex.exec(line.text)
        if (annotationMatch) {
          const indent = annotationMatch[1].length
          const prefix = annotationMatch[2] || ''
          const name = annotationMatch[3]

          let symbolKind: vscode.SymbolKind
          let detail: string
          switch (prefix) {
            case ':':
              symbolKind = vscode.SymbolKind.Enum
              detail = 'Spw Lens'
              break
            case '!':
              symbolKind = vscode.SymbolKind.Event
              detail = 'Spw Intent'
              break
            case '>':
              symbolKind = vscode.SymbolKind.Interface
              detail = 'Spw Anchor'
              break
            default:
              symbolKind = vscode.SymbolKind.Key
              detail = 'Spw Topic'
              break
          }

          const selectionRange = new vscode.Range(
            new vscode.Position(lineIndex, annotationMatch.index),
            new vscode.Position(lineIndex, annotationMatch.index + annotationMatch[0].length),
          )
          addSymbol(new vscode.DocumentSymbol(`# ${name}`, detail, symbolKind, lineRange, selectionRange), indent)
          continue
        }

        if (stack.length > 0) {
          const top = stack[stack.length - 1].symbol
          top.range = new vscode.Range(top.range.start, lineRange.end)
        }
      }

      return symbols
    },
  })
}

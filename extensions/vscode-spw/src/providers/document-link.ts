import * as vscode from 'vscode'
import type { SpwContext } from '../context'
import { createPathRegex, expandOperatorEnvelopeBounds, resolveMatchedPath } from './path-support'

export function registerDocumentLinkProvider(spw: SpwContext): vscode.Disposable {
  return vscode.languages.registerDocumentLinkProvider(spw.documentSelector, {
    provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
      const links: vscode.DocumentLink[] = []
      const pathRegex = createPathRegex('g')

      for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
        const line = document.lineAt(lineIndex)
        pathRegex.lastIndex = 0

        let match: RegExpExecArray | null
        while ((match = pathRegex.exec(line.text)) !== null) {
          const matchedText = match[0]
          const start = match.index
          const endExclusive = match.index + matchedText.length
          const expanded = expandOperatorEnvelopeBounds(line.text, start, endExclusive)

          const range = new vscode.Range(
            new vscode.Position(lineIndex, expanded.start),
            new vscode.Position(lineIndex, expanded.endExclusive),
          )

          const targetUri = resolveMatchedPath(match, matchedText, document.uri, spw)
          if (targetUri) {
            links.push(new vscode.DocumentLink(range, targetUri))
          }
        }
      }

      return links
    },
  })
}

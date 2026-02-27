import * as vscode from 'vscode'
import type { SpwContext } from '../context'

const TOKEN_TYPES = ['operator', 'type', 'variable', 'property', 'function', 'string', 'keyword', 'comment']
const TOKEN_MODIFIERS = ['declaration', 'definition', 'readonly', 'deprecated', 'modification', 'async']

export function registerSemanticTokensProvider(spw: SpwContext): vscode.Disposable {
  const legend = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS)

  return vscode.languages.registerDocumentSemanticTokensProvider(
    spw.documentSelector,
    {
      provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.SemanticTokens {
        const builder = new vscode.SemanticTokensBuilder(legend)

        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex += 1) {
          const lineText = document.lineAt(lineIndex).text
          let col = 0

          while (col < lineText.length) {
            const ch = lineText[col]
            const rest = lineText.slice(col)

            if (/\s/.test(ch)) {
              col += 1
              continue
            }

            if (rest.startsWith('//')) {
              builder.push(lineIndex, col, lineText.length - col, TOKEN_TYPES.indexOf('comment'), 0)
              break
            }

            const hashMatch = rest.match(/^#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/)
            if (hashMatch) {
              const len = hashMatch[0].length
              builder.push(lineIndex, col, len, TOKEN_TYPES.indexOf('type'), 0)
              col += len
              continue
            }

            if (ch === '^') {
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('keyword'), 1 << TOKEN_MODIFIERS.indexOf('declaration'))
              col += 1
              continue
            }
            if (ch === '!') {
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('function'), 1 << TOKEN_MODIFIERS.indexOf('modification'))
              col += 1
              continue
            }
            if (ch === '?') {
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('function'), 1 << TOKEN_MODIFIERS.indexOf('async'))
              col += 1
              continue
            }
            if (ch === '~') {
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('variable'), 1 << TOKEN_MODIFIERS.indexOf('deprecated'))
              col += 1
              continue
            }
            if (ch === '=') {
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('property'), 1 << TOKEN_MODIFIERS.indexOf('readonly'))
              col += 1
              continue
            }
            if (ch === '%') {
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('operator'), 0)
              col += 1
              continue
            }
            if (ch === '@') {
              const refMatch = rest.match(/^@[a-zA-Z_][a-zA-Z0-9_]*/)
              if (refMatch) {
                builder.push(lineIndex, col, refMatch[0].length, TOKEN_TYPES.indexOf('variable'), 0)
                col += refMatch[0].length
                continue
              }
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('variable'), 0)
              col += 1
              continue
            }
            if (ch === '.' || ch === '&' || ch === '$' || ch === '*') {
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('operator'), 0)
              col += 1
              continue
            }

            if (ch === '[' || ch === ']' || ch === '{' || ch === '}' || ch === '(' || ch === ')' || ch === '<' || ch === '>') {
              builder.push(lineIndex, col, 1, TOKEN_TYPES.indexOf('operator'), 1 << TOKEN_MODIFIERS.indexOf('definition'))
              col += 1
              continue
            }

            if (ch === '"') {
              const strMatch = rest.match(/^"([^"\\]|\\.)*"/)
              if (strMatch) {
                builder.push(lineIndex, col, strMatch[0].length, TOKEN_TYPES.indexOf('string'), 0)
                col += strMatch[0].length
                continue
              }
            }

            col += 1
          }
        }

        return builder.build()
      },
    },
    legend,
  )
}

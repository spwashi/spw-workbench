import * as path from 'path'
import * as vscode from 'vscode'
import type { SpwContext } from '../context'

const PATH_REGEX_SOURCE = '(?:~[^\"]*"([^\"]+)")|(?:(@[A-Za-z_][A-Za-z0-9_]*)(?:\\/(?:\\.\\.|[A-Za-z_*])[A-Za-z0-9_.\\-*]*)+)|(?:(?:\\.\\.|[A-Za-z_])[A-Za-z0-9_.\\-]*(?:\\/(?:\\.\\.|[A-Za-z_*])[A-Za-z0-9_.\\-*]*)+)'
const REF_ENVELOPE_OPERATORS = new Set(['&', '^', '*', '?', '~', '!', '%', '='])

export function createPathRegex(flags = 'g'): RegExp {
  return new RegExp(PATH_REGEX_SOURCE, flags)
}

function isEnvelopeOperator(ch: string | undefined): boolean {
  return !!ch && REF_ENVELOPE_OPERATORS.has(ch)
}

export function expandOperatorEnvelopeBounds(lineText: string, start: number, endExclusive: number): { start: number; endExclusive: number } {
  let nextStart = start
  let nextEnd = endExclusive

  while (nextStart > 0 && isEnvelopeOperator(lineText[nextStart - 1])) {
    nextStart -= 1
  }

  while (nextEnd < lineText.length && isEnvelopeOperator(lineText[nextEnd])) {
    nextEnd += 1
  }

  return { start: nextStart, endExclusive: nextEnd }
}

export function resolveMatchedPath(
  match: RegExpExecArray,
  matchedText: string,
  documentUri: vscode.Uri,
  spw: SpwContext,
): vscode.Uri | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders

  // 1. Tilde strings: ~"./foo"
  if (match[1]) {
    const relativePath = match[1]
    const dir = path.dirname(documentUri.fsPath)
    return vscode.Uri.file(path.resolve(dir, relativePath))
  }

  // 2. Sigil paths: @docs/index.spw
  if (match[2]) {
    if (!workspaceFolders || workspaceFolders.length === 0) return undefined
    const sigil = match[2]
    const resolvedRoot = spw.resolveRoot(sigil, workspaceFolders[0].uri.fsPath, documentUri)
    const relativePart = matchedText.slice(sigil.length + 1)
    return vscode.Uri.file(path.join(resolvedRoot, relativePart))
  }

  // 3. Bare paths: src/core/index.ts
  if (!workspaceFolders || workspaceFolders.length === 0) return undefined
  return vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, matchedText))
}

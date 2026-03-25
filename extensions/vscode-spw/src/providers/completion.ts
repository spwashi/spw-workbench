import * as path from 'path'
import * as vscode from 'vscode'
import type { SpwContext } from '../context'

export function registerCompletionProvider(spw: SpwContext): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    spw.documentSelector,
    {
      async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.slice(0, position.character)
        const items: vscode.CompletionItem[] = []

        const makeSnippet = (label: string, snippet: string, detail: string): vscode.CompletionItem => {
          const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet)
          item.insertText = new vscode.SnippetString(snippet)
          item.detail = detail
          return item
        }

        // Complete @-roots
        if (linePrefix.endsWith('@')) {
          const roots = Object.keys(spw.ROOT_MAP).map((key) => ({
            name: key.slice(1),
            detail: spw.ROOT_MAP[key].join('/'),
          }))
          roots.push({ name: 'here', detail: 'Current file directory' })

          for (const root of roots) {
            const item = new vscode.CompletionItem(root.name, vscode.CompletionItemKind.Folder)
            item.detail = root.detail
            items.push(item)
          }

          return items
        }

        const sigilPrefix = /(?:^|\s)([\^!@&*?~#=%])$/.exec(linePrefix)
        if (sigilPrefix) {
          const sigil = sigilPrefix[1]
          const snippets: Record<string, Array<[string, string, string]>> = {
            '#': [
              ['##>prompt_root', '##>${1:prompt_root}', 'Prompt root anchor'],
              ['#>anchor', '#>${1:anchor}', 'Anchor annotation'],
              ['#:lens', '#:${1:lens}', 'Lens annotation'],
              ['#!intent', '#!${1:intent}', 'Intent annotation'],
            ],
            '~': [
              ['~#trait: value', '~#${1:trait}: ${2:value}', 'Concise trait'],
              ['~"path"', '~"${1:path}"', 'Quoted path reference'],
            ],
            '&': [
              ['&[path.ref]', '&[${1:path.ref}]', 'Inline subject/path reference'],
            ],
            '%': [
              ['%[measure.path]', '%[${1:measure.path}]', 'Measure expression'],
            ],
            '*': [
              ['*variant', '*${1:variant}', 'Variant selector'],
            ],
          }

          for (const [label, snippet, detail] of snippets[sigil] ?? []) {
            items.push(makeSnippet(label, snippet, detail))
          }

          if (items.length > 0) {
            return items
          }
        }

        // File-system completion for ~"../" and @root/
        const fsPathMatch = /(?:~"((?:\.\.?\/)+)|@([A-Za-z_][A-Za-z0-9_]*)\/)([^"]*)$/.exec(linePrefix)
        if (!fsPathMatch) return items

        let searchDir: string | undefined

        if (fsPathMatch[1]) {
          searchDir = path.resolve(path.dirname(document.uri.fsPath), fsPathMatch[1])
        } else if (fsPathMatch[2]) {
          const workspaceFolders = vscode.workspace.workspaceFolders
          if (workspaceFolders && workspaceFolders.length > 0) {
            const sigil = `@${fsPathMatch[2]}`
            searchDir = spw.resolveRoot(sigil, workspaceFolders[0].uri.fsPath, document.uri)
          }
        }

        if (!searchDir) return items

        try {
          const directoryItems = await vscode.workspace.fs.readDirectory(vscode.Uri.file(searchDir))

          for (const [name, type] of directoryItems) {
            if (name.startsWith('.') && name !== '..' && name !== '.') continue

            const kind = type === vscode.FileType.Directory
              ? vscode.CompletionItemKind.Folder
              : vscode.CompletionItemKind.File

            const item = new vscode.CompletionItem(name, kind)
            if (type === vscode.FileType.Directory) {
              item.insertText = `${name}/`
              item.sortText = `0-${name}`
            } else {
              item.sortText = `1-${name}`
            }
            items.push(item)
          }
        } catch {
          // Best-effort completion.
        }

        return items
      },
    },
    '@', '~', '/', '#', '%', '&', '*',
  )
}

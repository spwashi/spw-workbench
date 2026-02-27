import * as vscode from 'vscode'
import type { SpwContext } from '../context'
import { createPathRegex, resolveMatchedPath } from './path-support'

export function registerHoverProvider(spw: SpwContext): vscode.Disposable {
  return vscode.languages.registerHoverProvider(spw.documentSelector, {
    async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | null> {
      const line = document.lineAt(position).text
      const charAtPos = line[position.character]

      // 1. #-annotation hover
      const annotRe = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g
      let annotMatch: RegExpExecArray | null
      while ((annotMatch = annotRe.exec(line)) !== null) {
        const start = annotMatch.index
        const end = start + annotMatch[0].length
        if (position.character >= start && position.character < end) {
          const prefix = annotMatch[1] || ''
          const name = annotMatch[2]
          const kindLabel: Record<string, string> = { '': 'topic', ':': 'lens', '!': 'intent', '>': 'anchor' }
          const kind = kindLabel[prefix] || 'topic'
          const entries = spw.annotationIndex.lookup(name)
          const fileCount = new Set(entries.map((entry) => entry.file.toString())).size

          const md = new vscode.MarkdownString()
          md.appendMarkdown(`**#${prefix}${name}** — *${kind}*\n\n`)
          md.appendMarkdown(`Referenced in **${fileCount}** file(s), **${entries.length}** occurrence(s)\n\n`)

          const seen = new Set<string>()
          for (const entry of entries) {
            const rel = vscode.workspace.asRelativePath(entry.file)
            if (!seen.has(rel) && seen.size < 5) {
              seen.add(rel)
              md.appendMarkdown(`- \`${rel}\`:${entry.line + 1}${entry.sectionLabel ? ` (${entry.sectionLabel})` : ''}\n`)
            }
          }

          if (fileCount > 5) {
            md.appendMarkdown(`- *...and ${fileCount - 5} more*\n`)
          }

          return new vscode.Hover(md, new vscode.Range(position.line, start, position.line, end))
        }
      }

      // 2. ^["frame"] hover
      const frameRe = /\^(?:\["([^"]+)"\]|"([^"]+)")/
      const frameMatch = line.match(frameRe)
      if (frameMatch) {
        const frameStart = line.indexOf(frameMatch[0])
        const frameEnd = frameStart + frameMatch[0].length

        if (position.character >= frameStart && position.character < frameEnd) {
          const frameName = frameMatch[1] || frameMatch[2]
          const fileAnnotations = spw.annotationIndex.forFile(document.uri)
          const inSection = fileAnnotations.filter((entry) => entry.sectionLabel === frameName)

          const md = new vscode.MarkdownString()
          md.appendMarkdown(`**^["${frameName}"]** — *frame*\n\n`)

          if (inSection.length > 0) {
            md.appendMarkdown('Annotations:\n\n')
            const prefixByKind: Record<string, string> = { topic: '#', lens: '#:', intent: '#!', anchor: '#>' }
            for (const entry of inSection) {
              md.appendMarkdown(`- \`${prefixByKind[entry.kind]}${entry.name}\` (${entry.kind})\n`)
            }
          } else {
            md.appendMarkdown('*No annotations in this frame*\n')
          }

          return new vscode.Hover(md, new vscode.Range(position.line, frameStart, position.line, frameEnd))
        }
      }

      // 3. Bare sigil hover
      if (charAtPos && spw.SIGIL_SEMANTICS[charAtPos]) {
        const sem = spw.SIGIL_SEMANTICS[charAtPos]
        const md = new vscode.MarkdownString()
        md.appendMarkdown(`**\`${charAtPos}\`** — *${sem.role}*\n\n`)
        md.appendMarkdown('| | |\n|:--|:--|\n')
        md.appendMarkdown(`| **Physics** | ${sem.physics} |\n`)
        md.appendMarkdown(`| **Phase** | ${sem.phase} |\n`)
        return new vscode.Hover(md, new vscode.Range(position.line, position.character, position.line, position.character + 1))
      }

      // 3.5. @-root hover
      const rootMatch = /@([A-Za-z_][A-Za-z0-9_]*)/.exec(line)
      if (rootMatch) {
        const rootStart = rootMatch.index ?? 0
        const rootEnd = rootStart + rootMatch[0].length
        if (position.character >= rootStart && position.character <= rootEnd) {
          const sigil = `@${rootMatch[1]}`
          const segments = spw.ROOT_MAP[sigil]
          if (segments) {
            const md = new vscode.MarkdownString()
            md.appendMarkdown(`**\`${sigil}\`** → \`${segments.join('/')}\`\n\n`)

            const rootPath = segments.join('/')
            const allAnnotations = spw.annotationIndex.all()
            const underRoot = allAnnotations.filter((entry) => entry.file.fsPath.includes(rootPath))
            const uniqueFiles = new Set(underRoot.map((entry) => entry.file.fsPath))
            const lenses = [...new Set(underRoot.filter((entry) => entry.kind === 'lens').map((entry) => entry.name))]

            md.appendMarkdown(`**${uniqueFiles.size}** file(s), **${underRoot.length}** annotation(s)\n\n`)
            if (lenses.length > 0) {
              md.appendMarkdown(`Lenses: ${lenses.slice(0, 8).map((lens) => `\`#:${lens}\``).join(', ')}\n`)
            }

            return new vscode.Hover(md, new vscode.Range(position.line, rootStart, position.line, rootEnd))
          }
        }
      }

      // 4. Path peek
      const pathRegex = createPathRegex('g')
      const range = document.getWordRangeAtPosition(position, pathRegex)
      if (!range) return null

      const matchedText = document.getText(range)
      const matchRegex = createPathRegex('g')
      const match = matchRegex.exec(matchedText)
      if (!match) return null

      const targetUri = resolveMatchedPath(match, matchedText, document.uri, spw)
      if (!targetUri) return null

      try {
        const fileData = await vscode.workspace.fs.readFile(targetUri)
        const fileText = new TextDecoder('utf-8').decode(fileData)
        const lines = fileText.split('\n').slice(0, 10)
        const markdown = new vscode.MarkdownString()
        markdown.appendCodeblock(lines.join('\n') + (fileText.split('\n').length > 10 ? '\n...' : ''), 'spw')
        markdown.appendMarkdown(`\n*Peek: \`${vscode.workspace.asRelativePath(targetUri)}\`*`)
        return new vscode.Hover(markdown, range)
      } catch {
        return null
      }
    },
  })
}

import * as vscode from 'vscode'
import type { SpwContext } from '../context'
import type { AnnotationEntry } from '../annotation-index'

type ConceptNode = ConceptGroupNode | ConceptEntryNode

interface ConceptGroupNode {
  kind: 'group'
  name: string
  entries: AnnotationEntry[]
}

interface ConceptEntryNode {
  kind: 'entry'
  entry: AnnotationEntry
}

class ConceptsTreeDataProvider implements vscode.TreeDataProvider<ConceptNode> {
  private changed = new vscode.EventEmitter<ConceptNode | undefined | void>()
  readonly onDidChangeTreeData = this.changed.event

  constructor(private readonly spw: SpwContext) {
    this.spw.annotationIndex.onDidUpdate(() => this.refresh())
  }

  refresh(): void {
    this.changed.fire()
  }

  getTreeItem(element: ConceptNode): vscode.TreeItem {
    if (element.kind === 'group') {
      const kindSet = new Set(element.entries.map((entry) => entry.kind))
      const fileSet = new Set(element.entries.map((entry) => entry.file.fsPath))
      const label = `${element.name}`
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed)
      item.description = `${element.entries.length} · ${fileSet.size} file${fileSet.size > 1 ? 's' : ''}`

      // Kind distribution for tooltip
      const kindCounts = new Map<string, number>()
      for (const entry of element.entries) {
        kindCounts.set(entry.kind, (kindCounts.get(entry.kind) || 0) + 1)
      }
      const kindSummary = [...kindCounts.entries()].map(([k, c]) => `${c} ${k}`).join(', ')
      item.tooltip = `${element.entries.length} occurrence(s) across ${fileSet.size} file(s): ${kindSummary}`
      item.contextValue = 'spwConceptGroup'

      // Kind-specific icon based on dominant kind
      const dominantKind = [...kindCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'topic'
      const kindIcons: Record<string, string> = {
        topic: 'symbol-key',
        lens: 'eye',
        intent: 'zap',
        anchor: 'link',
      }
      item.iconPath = new vscode.ThemeIcon(kindIcons[dominantKind] || 'symbol-key')
      return item
    }

    const rel = vscode.workspace.asRelativePath(element.entry.file)
    const kindPrefix: Record<string, string> = {
      topic: '#',
      lens: '#:',
      intent: '#!',
      anchor: '#>',
    }

    const item = new vscode.TreeItem(
      `${kindPrefix[element.entry.kind] ?? '#'}${element.entry.name}`,
      vscode.TreeItemCollapsibleState.None,
    )

    item.description = `${rel}:${element.entry.line + 1}`
    item.tooltip = `${rel}:${element.entry.line + 1}${element.entry.sectionLabel ? ` (${element.entry.sectionLabel})` : ''}`
    item.contextValue = 'spwConceptEntry'
    item.iconPath = new vscode.ThemeIcon('symbol-reference')
    item.command = {
      command: 'spwConcepts.openEntry',
      title: 'Open Concept Entry',
      arguments: [element.entry],
    }

    return item
  }

  getChildren(element?: ConceptNode): ConceptNode[] {
    if (!element) {
      const clusters = this.spw.annotationIndex.conceptClusters()
      const groups: ConceptGroupNode[] = []

      for (const [name, entries] of clusters.entries()) {
        groups.push({ kind: 'group', name, entries })
      }

      groups.sort((a, b) => {
        const byCount = b.entries.length - a.entries.length
        if (byCount !== 0) return byCount
        return a.name.localeCompare(b.name)
      })

      return groups
    }

    if (element.kind === 'group') {
      return [...element.entries]
        .sort((a, b) => {
          const fileA = a.file.fsPath.localeCompare(b.file.fsPath)
          if (fileA !== 0) return fileA
          return a.line - b.line
        })
        .map((entry) => ({ kind: 'entry', entry }))
    }

    return []
  }
}

export function registerConceptsTreeView(spw: SpwContext): vscode.Disposable[] {
  const provider = new ConceptsTreeDataProvider(spw)

  const tree = vscode.window.createTreeView('spwConcepts', { treeDataProvider: provider })

  const openCommand = vscode.commands.registerCommand('spwConcepts.openEntry', async (entry: AnnotationEntry) => {
    const doc = await vscode.workspace.openTextDocument(entry.file)
    const editor = await vscode.window.showTextDocument(doc, { preview: false })
    const position = new vscode.Position(entry.line, 0)
    editor.selection = new vscode.Selection(position, position)
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter)
  })

  return [tree, openCommand]
}

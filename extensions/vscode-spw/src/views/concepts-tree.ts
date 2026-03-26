import * as vscode from 'vscode'
import type { SpwContext } from '../context'
import type { AnnotationEntry } from '../annotation-index'

type ConceptNode = ConceptGroupNode | ConceptEntryNode
type GroupingMode = 'concept' | 'kind' | 'file'
type GroupNodeKind = GroupingMode | 'concept-kind'
type AnnotationKind = AnnotationEntry['kind']

interface ConceptGroupNode {
  kind: 'group'
  groupKind: GroupNodeKind
  key: string
  label: string
  entries: AnnotationEntry[]
}

interface ConceptEntryNode {
  kind: 'entry'
  entry: AnnotationEntry
}

const GROUPING_LABELS: Record<GroupingMode, string> = {
  concept: 'Concept',
  kind: 'Kind',
  file: 'File',
}

const KIND_GROUP_LABELS: Record<AnnotationEntry['kind'], string> = {
  topic: 'Topics',
  lens: 'Lenses',
  intent: 'Intents',
  anchor: 'Anchors',
}

const KIND_ICONS: Record<AnnotationEntry['kind'], string> = {
  topic: 'symbol-key',
  lens: 'eye',
  intent: 'zap',
  anchor: 'link',
}

const KIND_NOUNS: Record<AnnotationKind, { singular: string, plural: string }> = {
  topic: { singular: 'topic', plural: 'topics' },
  lens: { singular: 'lens', plural: 'lenses' },
  intent: { singular: 'intent', plural: 'intents' },
  anchor: { singular: 'anchor', plural: 'anchors' },
}

class ConceptsTreeDataProvider implements vscode.TreeDataProvider<ConceptNode> {
  private changed = new vscode.EventEmitter<ConceptNode | undefined | void>()
  private grouping: GroupingMode = 'concept'
  private filter = ''
  readonly onDidChangeTreeData = this.changed.event

  constructor(private readonly spw: SpwContext) {
    this.spw.annotationIndex.onDidUpdate(() => this.refresh())
  }

  refresh(): void {
    this.changed.fire()
  }

  setGrouping(grouping: GroupingMode): void {
    if (this.grouping === grouping) return
    this.grouping = grouping
    this.refresh()
  }

  getGrouping(): GroupingMode {
    return this.grouping
  }

  setFilter(filter: string): void {
    const next = filter.trim()
    if (this.filter === next) return
    this.filter = next
    this.refresh()
  }

  clearFilter(): void {
    this.setFilter('')
  }

  getFilter(): string {
    return this.filter
  }

  getStatusMessage(): string {
    const parts = [`Grouping: ${GROUPING_LABELS[this.grouping]}`]
    if (this.filter) {
      parts.push(`Filter: ${this.filter}`)
    }

    const count = this.filteredEntries().length
    parts.push(`${count} match${count === 1 ? '' : 'es'}`)
    return parts.join(' · ')
  }

  getTreeItem(element: ConceptNode): vscode.TreeItem {
    if (element.kind === 'group') {
      const kindSet = new Set(element.entries.map((entry) => entry.kind))
      const fileSet = new Set(element.entries.map((entry) => entry.file.fsPath))
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed)
      const kindCounts = countKinds(element.entries)
      item.description = describeGroup(element.groupKind, element.entries, kindSet.size, fileSet.size)
      item.tooltip = buildGroupTooltip(element.groupKind, element.entries.length, fileSet.size, kindCounts)
      item.contextValue = 'spwConceptGroup'

      if ((element.groupKind === 'kind' || element.groupKind === 'concept-kind') && isAnnotationKind(element.key)) {
        item.iconPath = new vscode.ThemeIcon(KIND_ICONS[element.key])
      } else if (element.groupKind === 'file') {
        item.iconPath = new vscode.ThemeIcon('file')
      } else {
        const dominantKind = dominantAnnotationKind(kindCounts)
        item.iconPath = new vscode.ThemeIcon(KIND_ICONS[dominantKind] || 'symbol-key')
      }

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
      return this.groupEntries(this.filteredEntries())
    }

    if (element.kind === 'group') {
      if (element.groupKind === 'concept') {
        return this.childrenForConceptGroup(element.entries)
      }

      return entryNodes(element.entries)
    }

    return []
  }

  private filteredEntries(): AnnotationEntry[] {
    const entries = [...this.spw.annotationIndex.all()]
    if (!this.filter) return entries

    const query = this.filter.toLowerCase()
    return entries.filter((entry) => {
      const file = vscode.workspace.asRelativePath(entry.file).toLowerCase()
      return entry.name.toLowerCase().includes(query)
        || entry.kind.toLowerCase().includes(query)
        || file.includes(query)
        || entry.sectionLabel?.toLowerCase().includes(query)
    })
  }

  private groupEntries(entries: AnnotationEntry[]): ConceptGroupNode[] {
    switch (this.grouping) {
      case 'kind':
        return this.groupByKind(entries)
      case 'file':
        return this.groupByFile(entries)
      case 'concept':
      default:
        return this.groupByConcept(entries)
    }
  }

  private groupByConcept(entries: AnnotationEntry[]): ConceptGroupNode[] {
    const groups = new Map<string, AnnotationEntry[]>()
    for (const entry of entries) {
      const bucket = groups.get(entry.name) ?? []
      bucket.push(entry)
      groups.set(entry.name, bucket)
    }

    return [...groups.entries()]
      .map(([key, groupEntries]) => ({
        kind: 'group' as const,
        groupKind: 'concept' as const,
        key,
        label: key,
        entries: groupEntries,
      }))
      .sort((a, b) => {
        const byCount = b.entries.length - a.entries.length
        if (byCount !== 0) return byCount
        return a.label.localeCompare(b.label)
      })
  }

  private groupByKind(entries: AnnotationEntry[]): ConceptGroupNode[] {
    return this.kindGroups(entries, 'kind')
  }

  private groupByFile(entries: AnnotationEntry[]): ConceptGroupNode[] {
    const groups = new Map<string, AnnotationEntry[]>()
    for (const entry of entries) {
      const file = vscode.workspace.asRelativePath(entry.file)
      const bucket = groups.get(file) ?? []
      bucket.push(entry)
      groups.set(file, bucket)
    }

    return [...groups.entries()]
      .map(([key, groupEntries]) => ({
        kind: 'group' as const,
        groupKind: 'file' as const,
        key,
        label: key,
        entries: groupEntries,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  private childrenForConceptGroup(entries: AnnotationEntry[]): ConceptNode[] {
    const kindGroups = this.kindGroups(entries, 'concept-kind')
    if (kindGroups.length <= 1) {
      return entryNodes(entries)
    }

    return kindGroups
  }

  private kindGroups(entries: AnnotationEntry[], groupKind: Extract<GroupNodeKind, 'kind' | 'concept-kind'>): ConceptGroupNode[] {
    return ANNOTATION_KIND_ORDER
      .map((kind) => ({
        kind: 'group' as const,
        groupKind,
        key: kind,
        label: KIND_GROUP_LABELS[kind],
        entries: entries.filter((entry) => entry.kind === kind),
      }))
      .filter((group) => group.entries.length > 0)
  }
}

export function registerConceptsTreeView(spw: SpwContext): vscode.Disposable[] {
  const provider = new ConceptsTreeDataProvider(spw)
  const tree = vscode.window.createTreeView('spwConcepts', { treeDataProvider: provider })
  const updateTreeMessage = (): void => {
    tree.message = provider.getStatusMessage()
  }
  updateTreeMessage()

  const openCommand = vscode.commands.registerCommand('spwConcepts.openEntry', async (entry: AnnotationEntry) => {
    const doc = await vscode.workspace.openTextDocument(entry.file)
    const editor = await vscode.window.showTextDocument(doc, { preview: false })
    const position = new vscode.Position(entry.line, 0)
    editor.selection = new vscode.Selection(position, position)
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter)
  })

  const groupingCommand = vscode.commands.registerCommand('spwConcepts.setGrouping', async () => {
    const selected = await vscode.window.showQuickPick([
      { label: 'Concept', description: 'Group by annotation name', mode: 'concept' as const },
      { label: 'Kind', description: 'Group by topic/lens/intent/anchor', mode: 'kind' as const },
      { label: 'File', description: 'Group by source file', mode: 'file' as const },
    ], {
      placeHolder: `Current grouping: ${GROUPING_LABELS[provider.getGrouping()]}`,
    })

    if (!selected) return
    provider.setGrouping(selected.mode)
    updateTreeMessage()
  })

  const filterCommand = vscode.commands.registerCommand('spwConcepts.setFilter', async () => {
    const value = await vscode.window.showInputBox({
      prompt: 'Filter concepts by name, kind, file, or section label',
      placeHolder: 'physics',
      value: provider.getFilter(),
    })

    if (value === undefined) return
    provider.setFilter(value)
    updateTreeMessage()
  })

  const clearFilterCommand = vscode.commands.registerCommand('spwConcepts.clearFilter', () => {
    provider.clearFilter()
    updateTreeMessage()
  })

  const refreshCommand = vscode.commands.registerCommand('spwConcepts.refresh', async () => {
    await spw.annotationIndex.rebuild()
    provider.refresh()
    updateTreeMessage()
  })

  const providerListener = provider.onDidChangeTreeData(() => updateTreeMessage())

  return [tree, openCommand, groupingCommand, filterCommand, clearFilterCommand, refreshCommand, providerListener]
}

function isAnnotationKind(value: string): value is AnnotationEntry['kind'] {
  return value === 'topic' || value === 'lens' || value === 'intent' || value === 'anchor'
}

const ANNOTATION_KIND_ORDER: AnnotationKind[] = ['topic', 'lens', 'intent', 'anchor']

function entryNodes(entries: AnnotationEntry[]): ConceptEntryNode[] {
  return [...entries]
    .sort((a, b) => {
      const fileA = a.file.fsPath.localeCompare(b.file.fsPath)
      if (fileA !== 0) return fileA
      return a.line - b.line
    })
    .map((entry) => ({ kind: 'entry', entry }))
}

function countKinds(entries: AnnotationEntry[]): Map<AnnotationKind, number> {
  const counts = new Map<AnnotationKind, number>()
  for (const entry of entries) {
    counts.set(entry.kind, (counts.get(entry.kind) || 0) + 1)
  }

  return counts
}

function dominantAnnotationKind(kindCounts: Map<AnnotationKind, number>): AnnotationKind {
  return [...kindCounts.entries()]
    .sort((a, b) => b[1] - a[1] || ANNOTATION_KIND_ORDER.indexOf(a[0]) - ANNOTATION_KIND_ORDER.indexOf(b[0]))[0]?.[0] ?? 'topic'
}

function describeGroup(groupKind: GroupNodeKind, entries: AnnotationEntry[], kindCount: number, fileCount: number): string {
  if (groupKind === 'concept') {
    if (kindCount === 1) {
      const kind = entries[0]?.kind ?? 'topic'
      return `${entries.length} ${kindLabel(kind, entries.length)} · ${fileCount} file${fileCount === 1 ? '' : 's'}`
    }

    return `${entries.length} · ${kindCount} kinds · ${fileCount} file${fileCount === 1 ? '' : 's'}`
  }

  return `${entries.length} · ${fileCount} file${fileCount === 1 ? '' : 's'}`
}

function buildGroupTooltip(
  groupKind: GroupNodeKind,
  entryCount: number,
  fileCount: number,
  kindCounts: Map<AnnotationKind, number>,
): string {
  if (groupKind === 'concept') {
    return `${entryCount} occurrence(s) across ${fileCount} file(s): ${kindSummary(kindCounts)}`
  }

  if (groupKind === 'concept-kind') {
    const kind = dominantAnnotationKind(kindCounts)
    return `${entryCount} ${kindLabel(kind, entryCount)} across ${fileCount} file(s)`
  }

  return `${entryCount} occurrence(s) across ${fileCount} file(s): ${kindSummary(kindCounts)}`
}

function kindSummary(kindCounts: Map<AnnotationKind, number>): string {
  return ANNOTATION_KIND_ORDER
    .map((kind) => {
      const count = kindCounts.get(kind)
      return count ? `${count} ${kindLabel(kind, count)}` : null
    })
    .filter((part): part is string => part !== null)
    .join(', ')
}

function kindLabel(kind: AnnotationKind, count: number): string {
  return count === 1 ? KIND_NOUNS[kind].singular : KIND_NOUNS[kind].plural
}

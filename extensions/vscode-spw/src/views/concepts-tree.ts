/**
 * Concepts Tree View — Cognitive Exercise Edition
 *
 * Visual encoding strategy:
 *   - ThemeIcon + ThemeColor: kind-specific color per annotation type
 *   - TreeItemLabel highlights: sigil prefix emphasis for pattern recognition
 *   - Density bars: spatial frequency encoding via unicode block elements
 *   - Phase grouping: spirit-sequence materialization cycle as organizational axis
 *   - Co-occurrence resonance: concepts that appear in the same files surface as children
 *   - Braid display: lens/intent pairing partner shown in concept group descriptions
 *
 * Breadcrumb: mutation velocity is highest in groupEntries / getTreeItem.
 * Observation velocity is highest in filteredEntries / co-occurrence computation.
 */

import * as vscode from 'vscode'
import type { SpwContext } from '../context'
import type { AnnotationEntry } from '../annotation-index'

// ── Core types ──────────────────────────────────────────────────

type ConceptNode =
  | ConceptGroupNode
  | ConceptEntryNode
  | ResonanceNode

type GroupingMode = 'concept' | 'kind' | 'file' | 'phase'
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

/** Co-occurring concept — appears in same file(s) as parent concept */
interface ResonanceNode {
  kind: 'resonance'
  name: string
  sharedFileCount: number
  totalOccurrences: number
  dominantKind: AnnotationKind
}

// ── Constants ───────────────────────────────────────────────────

const GROUPING_LABELS: Record<GroupingMode, string> = {
  concept: 'Concept',
  kind: 'Kind',
  file: 'File',
  phase: 'Phase',
}

const KIND_GROUP_LABELS: Record<AnnotationKind, string> = {
  topic: 'Topics',
  lens: 'Lenses',
  intent: 'Intents',
  anchor: 'Anchors',
  prompt_root: 'Prompt Roots',
}

const KIND_ICONS: Record<AnnotationKind, string> = {
  topic: 'symbol-key',
  lens: 'eye',
  intent: 'zap',
  anchor: 'link',
  prompt_root: 'compass',
}

/** Maps annotation kinds to extension-contributed ThemeColor IDs */
const KIND_COLORS: Record<AnnotationKind, string> = {
  topic: 'spw.topic',
  lens: 'spw.lens',
  intent: 'spw.intent',
  anchor: 'spw.anchor',
  prompt_root: 'spw.promptRoot',
}

const KIND_NOUNS: Record<AnnotationKind, { singular: string; plural: string }> = {
  topic: { singular: 'topic', plural: 'topics' },
  lens: { singular: 'lens', plural: 'lenses' },
  intent: { singular: 'intent', plural: 'intents' },
  anchor: { singular: 'anchor', plural: 'anchors' },
  prompt_root: { singular: 'prompt root', plural: 'prompt roots' },
}

const KIND_PREFIX: Record<AnnotationKind, string> = {
  topic: '#',
  lens: '#:',
  intent: '#!',
  anchor: '#>',
  prompt_root: '##>',
}

const ANNOTATION_KIND_ORDER: AnnotationKind[] = ['lens', 'intent', 'anchor', 'prompt_root', 'topic']

/**
 * Spirit-sequence phase mapping for annotation kinds.
 * The spirit sequence ?~@&*^ maps wonder→potential→observer→merge→collapse→integration.
 * Annotation kinds map to phases by their semantic role:
 *   - lens (#:)    → ? wonder (probing, measurement)
 *   - intent (#!)  → ! action (injection, effect)
 *   - anchor (#>)  → ^ integration (framing, binding)
 *   - prompt_root (##>) → @ observer (navigation landmark, perspective)
 *   - topic (#)    → ~ potential (naming, superposition)
 */
const KIND_PHASE: Record<AnnotationKind, { sigil: string; label: string; color: string }> = {
  lens:        { sigil: '?', label: 'Wonder',      color: 'spw.phaseWonder' },
  intent:      { sigil: '!', label: 'Action',       color: 'spw.phaseAction' },
  anchor:      { sigil: '^', label: 'Integration',  color: 'spw.phaseIntegration' },
  prompt_root: { sigil: '@', label: 'Observer',     color: 'spw.phaseMeta' },
  topic:       { sigil: '~', label: 'Potential',    color: 'spw.phaseWonder' },
}

/** Density bar using unicode block elements — visual frequency encoding */
function densityBar(count: number, maxCount: number, width: number = 8): string {
  if (maxCount <= 0) return '░'.repeat(width)
  const filled = Math.round((count / maxCount) * width)
  return '█'.repeat(Math.min(filled, width)) + '░'.repeat(Math.max(0, width - filled))
}

// ── Tree data provider ──────────────────────────────────────────

class ConceptsTreeDataProvider implements vscode.TreeDataProvider<ConceptNode> {
  private changed = new vscode.EventEmitter<ConceptNode | undefined | void>()
  private grouping: GroupingMode = 'concept'
  private filter = ''
  readonly onDidChangeTreeData = this.changed.event

  // Cached co-occurrence matrix — rebuilt on each data change
  private coOccurrence = new Map<string, Map<string, number>>()
  // Cached braid pairs — concepts that share a line (lens+intent pairing)
  private braidPairs = new Map<string, Map<string, number>>()
  // Max group size for density bar normalization
  private maxGroupSize = 1

  constructor(private readonly spw: SpwContext) {
    this.spw.annotationIndex.onDidUpdate(() => {
      this.rebuildDerivedState()
      this.refresh()
    })
    this.rebuildDerivedState()
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

  // ── Tree item rendering ─────────────────────────────────────

  getTreeItem(element: ConceptNode): vscode.TreeItem {
    switch (element.kind) {
      case 'group':
        return this.renderGroupItem(element)
      case 'entry':
        return this.renderEntryItem(element)
      case 'resonance':
        return this.renderResonanceItem(element)
    }
  }

  private renderGroupItem(element: ConceptGroupNode): vscode.TreeItem {
    const kindSet = new Set(element.entries.map((e) => e.kind))
    const fileSet = new Set(element.entries.map((e) => e.file.fsPath))
    const kindCounts = countKinds(element.entries)

    const state = element.entries.length > 0
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None

    // Phase grouping uses phase sigil prefix in label
    const label = element.groupKind === 'phase'
      ? `${element.key} ${element.label}`
      : element.label

    const item = new vscode.TreeItem(label, state)
    item.contextValue = 'spwConceptGroup'

    // ── Description with density bar ──
    const bar = densityBar(element.entries.length, this.maxGroupSize)
    const baseDesc = describeGroup(element.groupKind, element.entries, kindSet.size, fileSet.size)
    const braidHint = this.braidHintFor(element)
    item.description = braidHint
      ? `${bar} ${baseDesc} · ${braidHint}`
      : `${bar} ${baseDesc}`

    // ── Tooltip ──
    item.tooltip = buildGroupTooltip(element.groupKind, element.entries.length, fileSet.size, kindCounts)

    // ── Icon with kind-specific color ──
    if ((element.groupKind === 'kind' || element.groupKind === 'concept-kind') && isAnnotationKind(element.key)) {
      item.iconPath = new vscode.ThemeIcon(KIND_ICONS[element.key], new vscode.ThemeColor(KIND_COLORS[element.key]))
    } else if (element.groupKind === 'file') {
      item.iconPath = new vscode.ThemeIcon('file')
    } else if (element.groupKind === 'phase') {
      // Phase groups get phase-colored icon
      const phaseInfo = Object.values(KIND_PHASE).find((p) => p.label === element.label)
      if (phaseInfo) {
        item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(phaseInfo.color))
      } else {
        item.iconPath = new vscode.ThemeIcon('circle-outline')
      }
    } else {
      // Concept grouping: colored by dominant kind
      const dominantKind = dominantAnnotationKind(kindCounts)
      item.iconPath = new vscode.ThemeIcon(
        KIND_ICONS[dominantKind] || 'symbol-key',
        new vscode.ThemeColor(KIND_COLORS[dominantKind]),
      )
    }

    return item
  }

  private renderEntryItem(element: ConceptEntryNode): vscode.TreeItem {
    const entry = element.entry
    const prefix = KIND_PREFIX[entry.kind] ?? '#'
    const fullLabel = `${prefix}${entry.name}`

    // TreeItemLabel with highlighted sigil prefix for visual cortex pattern recognition
    const highlightEnd = prefix.length
    const treeLabel: vscode.TreeItemLabel = {
      label: fullLabel,
      highlights: [[0, highlightEnd]],
    }

    const item = new vscode.TreeItem(treeLabel, vscode.TreeItemCollapsibleState.None)

    const rel = vscode.workspace.asRelativePath(entry.file)
    const frameCtx = entry.framePath.length > 0 ? entry.framePath.join(' › ') : null
    const sectionCtx = entry.sectionLabel ?? null
    const contextStr = frameCtx ?? sectionCtx ?? null

    item.description = contextStr
      ? `${contextStr} · ${rel}:${entry.line + 1}`
      : `${rel}:${entry.line + 1}`

    const tooltipParts = [`${rel}:${entry.line + 1}`]
    if (contextStr) tooltipParts.push(`Context: ${contextStr}`)
    if (entry.framePath.length > 0) tooltipParts.push(`Frame: ${entry.framePath.join(' › ')}`)
    tooltipParts.push(`Kind: ${entry.kind}`)
    item.tooltip = tooltipParts.join('\n')

    item.contextValue = 'spwConceptEntry'

    // Kind-colored icon
    item.iconPath = new vscode.ThemeIcon(
      KIND_ICONS[entry.kind] ?? 'symbol-reference',
      new vscode.ThemeColor(KIND_COLORS[entry.kind] ?? 'spw.topic'),
    )

    item.command = {
      command: 'spwConcepts.openEntry',
      title: 'Open Concept Entry',
      arguments: [entry],
    }

    return item
  }

  private renderResonanceItem(element: ResonanceNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `↔ ${element.name}`,
      vscode.TreeItemCollapsibleState.None,
    )
    item.description = `${element.sharedFileCount} shared file${element.sharedFileCount === 1 ? '' : 's'} · ${element.totalOccurrences} total`
    item.tooltip = `Co-occurs with parent concept in ${element.sharedFileCount} file(s)\nTotal occurrences: ${element.totalOccurrences}\nClick to filter to this concept`
    item.contextValue = 'spwConceptResonance'
    item.iconPath = new vscode.ThemeIcon(
      'git-compare',
      new vscode.ThemeColor(KIND_COLORS[element.dominantKind]),
    )
    // Click navigates to that concept's filter
    item.command = {
      command: 'spwConcepts.filterToName',
      title: 'Filter to Concept',
      arguments: [element.name],
    }

    return item
  }

  // ── Children ────────────────────────────────────────────────

  getChildren(element?: ConceptNode): ConceptNode[] {
    if (!element) {
      return this.groupEntries(this.filteredEntries())
    }

    if (element.kind === 'group') {
      if (element.groupKind === 'concept') {
        return this.childrenForConceptGroup(element)
      }

      return entryNodes(element.entries)
    }

    return []
  }

  /**
   * Concept group children: kind sub-groups (if multi-kind) + resonance nodes.
   * Resonance nodes surface co-occurring concepts — reward for learning connections.
   */
  private childrenForConceptGroup(group: ConceptGroupNode): ConceptNode[] {
    const children: ConceptNode[] = []

    // Kind sub-groups if multi-kind
    const kindGroups = this.kindGroups(group.entries, 'concept-kind')
    if (kindGroups.length > 1) {
      children.push(...kindGroups)
    } else {
      children.push(...entryNodes(group.entries))
    }

    // Resonance children — top co-occurring concepts
    const resonanceNodes = this.getResonanceChildren(group.key)
    if (resonanceNodes.length > 0) {
      children.push(...resonanceNodes)
    }

    return children
  }

  // ── Filtering ───────────────────────────────────────────────

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
        || entry.framePath.some((f) => f.toLowerCase().includes(query))
    })
  }

  // ── Grouping strategies ─────────────────────────────────────

  private groupEntries(entries: AnnotationEntry[]): ConceptGroupNode[] {
    // Recompute max group size for density bars
    const grouped = this.computeGroups(entries)
    this.maxGroupSize = Math.max(1, ...grouped.map((g) => g.entries.length))
    return grouped
  }

  private computeGroups(entries: AnnotationEntry[]): ConceptGroupNode[] {
    switch (this.grouping) {
      case 'kind':
        return this.groupByKind(entries)
      case 'file':
        return this.groupByFile(entries)
      case 'phase':
        return this.groupByPhase(entries)
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
      .map(([key, groupEntries]) => {
        const kindCounts = countKinds(groupEntries)
        const dominantRank = ANNOTATION_KIND_ORDER.indexOf(dominantAnnotationKind(kindCounts))
        return { key, groupEntries, dominantRank }
      })
      .sort((a, b) => {
        if (a.dominantRank !== b.dominantRank) return a.dominantRank - b.dominantRank
        const byCount = b.groupEntries.length - a.groupEntries.length
        if (byCount !== 0) return byCount
        return a.key.localeCompare(b.key)
      })
      .map(({ key, groupEntries }) => ({
        kind: 'group' as const,
        groupKind: 'concept' as const,
        key,
        label: key,
        entries: groupEntries,
      }))
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

  /**
   * Phase grouping: group by spirit-sequence phase derived from annotation kind.
   * This surfaces the materialization cycle as an organizational axis — wonder → potential
   * → observer → action → integration. Learning the phases builds fluency with the
   * spirit sequence (?~@&*^).
   */
  private groupByPhase(entries: AnnotationEntry[]): ConceptGroupNode[] {
    // Phase order follows the spirit sequence
    const phaseOrder: AnnotationKind[] = ['lens', 'topic', 'prompt_root', 'intent', 'anchor']

    return phaseOrder
      .map((kind) => {
        const phase = KIND_PHASE[kind]
        return {
          kind: 'group' as const,
          groupKind: 'phase' as const,
          key: phase.sigil,
          label: phase.label,
          entries: entries.filter((e) => e.kind === kind),
        }
      })
      .filter((group) => group.entries.length > 0)
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

  // ── Derived state (co-occurrence + braids) ──────────────────

  private rebuildDerivedState(): void {
    this.coOccurrence.clear()
    this.braidPairs.clear()

    const allEntries = [...this.spw.annotationIndex.all()]

    // Build file → names index for co-occurrence
    const fileToNames = new Map<string, Set<string>>()
    // Build file+line → entries index for braid detection
    const lineIndex = new Map<string, AnnotationEntry[]>()

    for (const entry of allEntries) {
      const fileKey = entry.file.toString()

      // Co-occurrence: track which names appear in which files
      const names = fileToNames.get(fileKey) ?? new Set()
      names.add(entry.name)
      fileToNames.set(fileKey, names)

      // Braid detection: same file + same line
      const lineKey = `${fileKey}:${entry.line}`
      const lineEntries = lineIndex.get(lineKey) ?? []
      lineEntries.push(entry)
      lineIndex.set(lineKey, lineEntries)
    }

    // Compute co-occurrence matrix (name → name → shared file count)
    for (const names of fileToNames.values()) {
      const nameList = [...names]
      for (let i = 0; i < nameList.length; i++) {
        for (let j = i + 1; j < nameList.length; j++) {
          const a = nameList[i]!
          const b = nameList[j]!
          incMapMap(this.coOccurrence, a, b)
          incMapMap(this.coOccurrence, b, a)
        }
      }
    }

    // Compute braid pairs (lens/intent on same line → pairing)
    for (const entries of lineIndex.values()) {
      if (entries.length < 2) continue
      const lenses = entries.filter((e) => e.kind === 'lens')
      const intents = entries.filter((e) => e.kind === 'intent')
      for (const lens of lenses) {
        for (const intent of intents) {
          incMapMap(this.braidPairs, lens.name, intent.name)
          incMapMap(this.braidPairs, intent.name, lens.name)
        }
      }
    }
  }

  /** Top N co-occurring concepts for a given concept name */
  private getResonanceChildren(conceptName: string, topN: number = 5): ResonanceNode[] {
    const coMap = this.coOccurrence.get(conceptName)
    if (!coMap || coMap.size === 0) return []

    const allEntries = [...this.spw.annotationIndex.all()]

    return [...coMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name, sharedFileCount]) => {
        const nameEntries = allEntries.filter((e) => e.name === name)
        const kindCounts = countKinds(nameEntries)
        return {
          kind: 'resonance' as const,
          name,
          sharedFileCount,
          totalOccurrences: nameEntries.length,
          dominantKind: dominantAnnotationKind(kindCounts),
        }
      })
  }

  /** Braid hint: most frequent pairing partner for a concept group */
  private braidHintFor(group: ConceptGroupNode): string | null {
    if (group.groupKind !== 'concept') return null

    const pairs = this.braidPairs.get(group.key)
    if (!pairs || pairs.size === 0) return null

    const [topPartner, count] = [...pairs.entries()]
      .sort((a, b) => b[1] - a[1])[0] ?? [null, 0]

    if (!topPartner || count === 0) return null

    // Determine if partner is lens or intent to show the right sigil
    const partnerEntries = this.spw.annotationIndex.lookup(topPartner)
    const partnerKind = partnerEntries[0]?.kind
    const partnerPrefix = partnerKind ? KIND_PREFIX[partnerKind] : '#'

    return `⟨${partnerPrefix}${topPartner}⟩`
  }
}

// ── Registration ────────────────────────────────────────────────

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
      { label: 'Phase', description: 'Group by spirit-sequence phase (?~@!^)', mode: 'phase' as const },
    ], {
      placeHolder: `Current grouping: ${GROUPING_LABELS[provider.getGrouping()]}`,
    })

    if (!selected) return
    provider.setGrouping(selected.mode)
    updateTreeMessage()
  })

  const filterCommand = vscode.commands.registerCommand('spwConcepts.setFilter', async () => {
    const value = await vscode.window.showInputBox({
      prompt: 'Filter concepts by name, kind, file, section label, or frame path',
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

  // Programmatic filter — used by resonance node clicks
  const filterToNameCommand = vscode.commands.registerCommand('spwConcepts.filterToName', (name: string) => {
    provider.setFilter(name)
    updateTreeMessage()
  })

  const providerListener = provider.onDidChangeTreeData(() => updateTreeMessage())

  return [tree, openCommand, groupingCommand, filterCommand, clearFilterCommand, refreshCommand, filterToNameCommand, providerListener]
}

// ── Utility functions ───────────────────────────────────────────

function isAnnotationKind(value: string): value is AnnotationKind {
  return value === 'topic' || value === 'lens' || value === 'intent' || value === 'anchor' || value === 'prompt_root'
}

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

  if (groupKind === 'phase') {
    return `${entries.length} · ${fileCount} file${fileCount === 1 ? '' : 's'}`
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

  if (groupKind === 'phase') {
    return `Spirit phase: ${entryCount} annotation(s) across ${fileCount} file(s)\n${kindSummary(kindCounts)}`
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

/** Increment a nested Map<string, Map<string, number>> */
function incMapMap(map: Map<string, Map<string, number>>, keyA: string, keyB: string): void {
  const inner = map.get(keyA) ?? new Map()
  inner.set(keyB, (inner.get(keyB) ?? 0) + 1)
  map.set(keyA, inner)
}

/**
 * Workspace Atlas Tree View
 *
 * Renders the workspace contract as a navigable tree of roots, memory tiers,
 * cursor context, and spirit-phase distribution.
 *
 * Data flows from three sources:
 *   - Workspace evidence: spw/workspaceManifest/v1 (URI-first roots with
 *     manifest/fallback/blocked provenance)
 *   - Index observation: spw/workspaceTemperature (behavioral observations)
 *   - Active editor: spw/contextAtPosition (cursor frame context)
 *
 * Inferred data is never silently presented as manifest truth.
 *
 * Breadcrumb: cursor context section has high observation velocity —
 * debounce carefully to avoid flooding LSP on rapid cursor movement.
 */

import * as vscode from 'vscode'
import { getCursorContextAtEditor, type SpwContext } from '../context'
import type {
  SpwWorkspaceRootEntry,
  SpwWorkspaceTemperatureEntry,
  SpwWorkspaceManifest,
  SpwContextAtPositionResult,
} from '../lsp/custom-requests'
import type { AnnotationEntry } from '../annotation-index'
import { displayWorkspaceUri, openWorkspaceTarget } from '../navigation'

// ── Node types ────────────────────────────────────────────────────

type AtlasNode =
  | SectionNode
  | RootItemNode
  | MemoryTierNode
  | MemoryFileNode
  | PlaceholderNode
  | CursorContextNode
  | CursorDetailNode
  | SpiritPhaseNode

interface SectionNode {
  kind: 'section'
  id: 'roots' | 'memory' | 'cursor' | 'spirit'
  label: string
  icon: string
  description?: string
}

interface RootItemNode {
  kind: 'root'
  entry: SpwWorkspaceRootEntry
}

interface MemoryTierNode {
  kind: 'tier'
  tier: 'hot' | 'warm' | 'cold'
  files: SpwWorkspaceTemperatureEntry[]
}

interface MemoryFileNode {
  kind: 'memory-file'
  entry: SpwWorkspaceTemperatureEntry
}

interface PlaceholderNode {
  kind: 'placeholder'
  label: string
}

/** "You Are Here" — live cursor context from LSP */
interface CursorContextNode {
  kind: 'cursor-context'
  contextType: 'frame-path' | 'ambient-braids' | 'local-braids' | 'entered-frame' | 'delta-braids'
  label: string
  detail: string
}

/** Individual item within cursor context (braid name, frame segment) */
interface CursorDetailNode {
  kind: 'cursor-detail'
  label: string
  annotationKind?: AnnotationEntry['kind']
}

/** Spirit-sequence phase distribution from annotation index */
interface SpiritPhaseNode {
  kind: 'spirit-phase'
  sigil: string
  phaseLabel: string
  count: number
  total: number
  annotationKind: AnnotationEntry['kind']
}

// ── Phase mapping ─────────────────────────────────────────────────

type AnnotationKind = AnnotationEntry['kind']

const PHASE_MAP: Record<AnnotationKind, { sigil: string; label: string; color: string }> = {
  lens:        { sigil: '?', label: 'Wonder',      color: 'spw.phaseWonder' },
  topic:       { sigil: '~', label: 'Potential',    color: 'spw.phaseWonder' },
  prompt_root: { sigil: '@', label: 'Observer',     color: 'spw.phaseMeta' },
  intent:      { sigil: '!', label: 'Action',       color: 'spw.phaseAction' },
  anchor:      { sigil: '^', label: 'Integration',  color: 'spw.phaseIntegration' },
}

const TIER_COLORS: Record<string, string> = {
  hot: 'spw.tierHot',
  warm: 'spw.tierWarm',
  cold: 'spw.tierCold',
}

const TIER_ICONS: Record<string, string> = {
  hot: 'flame',
  warm: 'circle-filled',
  cold: 'circle-outline',
}

/** What a surface's aspect density means for reading it again. */
const VOLATILITY_HINT: Record<string, string> = {
  volatile: 'Volatile — deferred state throughout; re-read rather than trust a cached view',
  settled: 'Settled — some deferred state; expect revision',
  durable: 'Durable — canon marks; safe to hold',
}

/** Density bar for phase distribution */
function densityBar(count: number, total: number, width: number = 6): string {
  if (total <= 0) return '░'.repeat(width)
  const filled = Math.round((count / total) * width)
  return '█'.repeat(Math.min(filled, width)) + '░'.repeat(Math.max(0, width - filled))
}

// ── Tree data provider ────────────────────────────────────────────

class WorkspaceAtlasProvider implements vscode.TreeDataProvider<AtlasNode>, vscode.Disposable {
  private changed = new vscode.EventEmitter<AtlasNode | undefined | void>()
  readonly onDidChangeTreeData = this.changed.event

  private manifest: SpwWorkspaceManifest | null = null
  private temperature: SpwWorkspaceTemperatureEntry[] = []
  private cursorContext: SpwContextAtPositionResult | null = null
  private cursorFileLabel: string | null = null
  private readonly subscriptions: vscode.Disposable[]
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private cursorTimer: ReturnType<typeof setTimeout> | null = null
  private isVisible = false
  private pendingRefresh = false

  constructor(private readonly spw: SpwContext) {
    // Debounced refresh on annotation index updates
    const indexSub = spw.annotationIndex.onDidUpdate(() => {
      if (!this.isVisible) {
        this.pendingRefresh = true
        return
      }

      if (this.refreshTimer) clearTimeout(this.refreshTimer)
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null
        void this.refresh()
      }, 1500)
    })

    // Track active editor cursor for "You Are Here" section
    const cursorSub = vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor.document.languageId !== 'spw') {
        if (this.cursorContext !== null) {
          this.cursorContext = null
          this.cursorFileLabel = null
          this.changed.fire()
        }
        return
      }
      if (!this.isVisible) return
      // Debounce cursor context requests — high velocity
      if (this.cursorTimer) clearTimeout(this.cursorTimer)
      this.cursorTimer = setTimeout(() => {
        this.cursorTimer = null
        void this.refreshCursorContext(e.textEditor)
      }, 300)
    })

    const editorSub = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor || editor.document.languageId !== 'spw') {
        if (this.cursorContext !== null) {
          this.cursorContext = null
          this.cursorFileLabel = null
          this.changed.fire()
        }
      }
    })

    this.subscriptions = [indexSub, cursorSub, editorSub]
  }

  dispose(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    if (this.cursorTimer) clearTimeout(this.cursorTimer)
    for (const sub of this.subscriptions) sub.dispose()
    this.changed.dispose()
  }

  async refresh(): Promise<void> {
    if (!this.isVisible) {
      this.pendingRefresh = true
      return
    }

    this.pendingRefresh = false
    await this.loadData()
    this.changed.fire()
  }

  setVisible(visible: boolean): void {
    if (this.isVisible === visible) return
    this.isVisible = visible

    if (!visible) {
      if (this.refreshTimer) clearTimeout(this.refreshTimer)
      if (this.cursorTimer) clearTimeout(this.cursorTimer)
      return
    }

    const activeEditor = vscode.window.activeTextEditor
    const shouldRefresh = this.pendingRefresh || this.manifest === null && this.temperature.length === 0
    if (shouldRefresh) {
      void this.refresh()
    } else {
      this.changed.fire()
    }

    if (activeEditor?.document.languageId === 'spw') {
      void this.refreshCursorContext(activeEditor)
    } else if (this.cursorContext !== null) {
      this.cursorContext = null
      this.cursorFileLabel = null
      this.changed.fire()
    }
  }

  private async loadData(): Promise<void> {
    try {
      this.manifest = await this.spw.requests.workspaceManifest()
      this.spw.manifestState = this.manifest.rootSource !== 'blocked'
        ? {
            sourceUri: this.manifest.manifest.uri,
            rootSource: this.manifest.rootSource,
            roots: this.manifest.roots.map((entry) => ({
              sigil: entry.sigil,
              uri: entry.uri,
            })),
          }
        : null
    } catch {
      this.manifest = null
      this.spw.manifestState = null
    }
    try {
      this.temperature = await this.spw.requests.workspaceTemperature()
      this.spw.workspaceTemperature = new Map(
        this.temperature.map((entry) => [entry.uri, entry]),
      )
    } catch {
      this.temperature = []
      this.spw.workspaceTemperature = new Map()
    }
  }

  private async refreshCursorContext(editor: vscode.TextEditor): Promise<void> {
    if (!this.isVisible) return

    const uri = editor.document.uri.toString()
    try {
      this.cursorContext = await getCursorContextAtEditor(this.spw, editor)
      this.cursorFileLabel = vscode.workspace.asRelativePath(editor.document.uri)
      this.changed.fire()
    } catch {
      this.cursorContext = null
      this.cursorFileLabel = null
    }
  }

  getTreeItem(node: AtlasNode): vscode.TreeItem {
    switch (node.kind) {
      case 'section': {
        const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Collapsed)
        item.iconPath = new vscode.ThemeIcon(node.icon)
        item.contextValue = `atlas-section-${node.id}`
        if (node.description) item.description = node.description
        return item
      }

      case 'root': {
        const item = new vscode.TreeItem(
          `@${node.entry.sigil}`,
          vscode.TreeItemCollapsibleState.None,
        )
        item.description = displayWorkspaceUri(node.entry.uri)
        item.iconPath = new vscode.ThemeIcon(rootKindIcon(node.entry.kind))
        item.tooltip = [
          `Root: @${node.entry.sigil}`,
          `Role: ${node.entry.role}`,
          `Kind: ${node.entry.kind}`,
          node.entry.uri,
        ].join('\n')
        item.command = {
          command: 'spwWorkspace.selectRoot',
          title: 'Select Workspace Root',
          arguments: [node],
        }
        item.contextValue = 'atlas-root'
        return item
      }

      case 'tier': {
        const label = node.tier === 'hot' ? 'Hot' : node.tier === 'warm' ? 'Warm' : 'Cold'
        const item = new vscode.TreeItem(
          `${label} (${node.files.length})`,
          node.files.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
        )
        // Colored tier icons
        item.iconPath = new vscode.ThemeIcon(
          TIER_ICONS[node.tier] ?? 'circle-outline',
          new vscode.ThemeColor(TIER_COLORS[node.tier] ?? 'spw.tierCold'),
        )
        item.contextValue = `atlas-tier-${node.tier}`
        return item
      }

      case 'memory-file': {
        const short = node.entry.uri.split('/').pop() ?? node.entry.uri
        const item = new vscode.TreeItem(short, vscode.TreeItemCollapsibleState.None)
        const { volatility, aspectShare } = node.entry
        // Recency and volatility are independent: age says when it was last
        // read, volatility says whether that reading still holds.
        item.description = volatility
          ? `${node.entry.tier} · ${volatility} · age ${node.entry.beatAge}`
          : `${node.entry.tier} · age ${node.entry.beatAge}`
        item.iconPath = new vscode.ThemeIcon(
          'file',
          new vscode.ThemeColor(TIER_COLORS[node.entry.tier] ?? 'spw.tierCold'),
        )
        const stance = volatility
          ? `\n${VOLATILITY_HINT[volatility]}${
            typeof aspectShare === 'number' ? ` (${Math.round(aspectShare * 100)}% aspect)` : ''
          }`
          : ''
        item.tooltip = `${node.entry.uri}\nTier: ${node.entry.tier} · Beat age: ${node.entry.beatAge} · Writes: ${node.entry.writeCount}${stance}`
        item.command = {
          command: 'vscode.open',
          title: 'Open',
          arguments: [vscode.Uri.parse(node.entry.uri)],
        }
        item.contextValue = 'atlas-memory-file'
        return item
      }

      case 'placeholder': {
        const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.None)
        item.iconPath = new vscode.ThemeIcon('info')
        item.contextValue = 'atlas-placeholder'
        return item
      }

      case 'cursor-context': {
        const item = new vscode.TreeItem(
          node.label,
          node.detail ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        )
        item.description = node.detail
        item.contextValue = `atlas-cursor-${node.contextType}`

        const iconMap: Record<string, string> = {
          'frame-path': 'symbol-namespace',
          'ambient-braids': 'link-external',
          'local-braids': 'link',
          'entered-frame': 'arrow-right',
          'delta-braids': 'diff',
        }
        item.iconPath = new vscode.ThemeIcon(iconMap[node.contextType] ?? 'info')
        return item
      }

      case 'cursor-detail': {
        const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.None)
        if (node.annotationKind) {
          const KIND_ICONS: Record<string, string> = {
            topic: 'symbol-key', lens: 'eye', intent: 'zap',
            anchor: 'link', prompt_root: 'compass',
          }
          const KIND_COLORS: Record<string, string> = {
            topic: 'spw.topic', lens: 'spw.lens', intent: 'spw.intent',
            anchor: 'spw.anchor', prompt_root: 'spw.promptRoot',
          }
          item.iconPath = new vscode.ThemeIcon(
            KIND_ICONS[node.annotationKind] ?? 'symbol-reference',
            new vscode.ThemeColor(KIND_COLORS[node.annotationKind] ?? 'spw.topic'),
          )
        }
        item.contextValue = 'atlas-cursor-detail'
        return item
      }

      case 'spirit-phase': {
        const bar = densityBar(node.count, node.total)
        const pct = node.total > 0 ? Math.round((node.count / node.total) * 100) : 0
        const item = new vscode.TreeItem(
          `${node.sigil} ${node.phaseLabel}`,
          vscode.TreeItemCollapsibleState.None,
        )
        item.description = `${bar} ${node.count} (${pct}%)`
        item.iconPath = new vscode.ThemeIcon(
          'circle-filled',
          new vscode.ThemeColor(PHASE_MAP[node.annotationKind]?.color ?? 'spw.topic'),
        )
        item.tooltip = `${node.phaseLabel} phase (${node.sigil})\n${node.count} of ${node.total} annotations (${pct}%)`
        item.contextValue = 'atlas-spirit-phase'
        return item
      }
    }
  }

  getChildren(node?: AtlasNode): AtlasNode[] {
    if (!node) {
      return this.getRootSections()
    }

    switch (node.kind) {
      case 'section':
        return this.getSectionChildren(node)
      case 'tier':
        return node.files.map((entry): MemoryFileNode => ({ kind: 'memory-file', entry }))
      case 'cursor-context':
        return this.getCursorContextChildren(node)
      default:
        return []
    }
  }

  private getRootSections(): SectionNode[] {
    const rootCount = this.manifest?.roots.length ?? 0
    const totalFiles = this.temperature.length
    const rootSource = this.manifest?.rootSource
    const hasCursor = this.cursorContext !== null

    const sections: SectionNode[] = []

    // "You Are Here" — only shown when cursor is in a .spw file
    if (hasCursor) {
      sections.push({
        kind: 'section', id: 'cursor', label: 'You Are Here', icon: 'compass',
        description: this.cursorFileLabel ?? undefined,
      })
    }

    sections.push(
      {
        kind: 'section', id: 'roots', label: 'Roots', icon: 'root-folder-opened',
        description: rootSource ? `${rootCount} · ${rootSource}` : undefined,
      },
      {
        kind: 'section', id: 'memory', label: 'Memory', icon: 'database',
        description: totalFiles > 0 ? `${totalFiles} tracked` : undefined,
      },
      {
        kind: 'section', id: 'spirit', label: 'Spirit', icon: 'pulse',
        description: this.getSpiritSummary(),
      },
    )

    return sections
  }

  private getSectionChildren(section: SectionNode): AtlasNode[] {
    switch (section.id) {
      case 'roots':
        return this.getRootNodes()
      case 'memory':
        return this.getMemoryTierNodes()
      case 'cursor':
        return this.getCursorNodes()
      case 'spirit':
        return this.getSpiritNodes()
    }
  }

  private getRootNodes(): AtlasNode[] {
    if (!this.manifest) {
      return [{ kind: 'placeholder', label: 'Workspace evidence unavailable' }]
    }
    if (this.manifest.rootSource === 'blocked') {
      return this.manifest.manifest.diagnostics.map((diagnostic): PlaceholderNode => ({
        kind: 'placeholder',
        label: `${diagnostic.code}: ${diagnostic.message}`,
      }))
    }
    if (this.manifest.roots.length === 0) {
      return [{ kind: 'placeholder', label: 'Workspace evidence contains no roots' }]
    }
    return this.manifest.roots.map((entry): RootItemNode => ({ kind: 'root', entry }))
  }

  private getMemoryTierNodes(): MemoryTierNode[] {
    const tiers = { hot: [] as SpwWorkspaceTemperatureEntry[], warm: [] as SpwWorkspaceTemperatureEntry[], cold: [] as SpwWorkspaceTemperatureEntry[] }
    for (const entry of this.temperature) {
      if (entry.tier === 'hot') tiers.hot.push(entry)
      else if (entry.tier === 'cold') tiers.cold.push(entry)
      else tiers.warm.push(entry)
    }
    return [
      { kind: 'tier', tier: 'hot', files: tiers.hot },
      { kind: 'tier', tier: 'warm', files: tiers.warm },
      { kind: 'tier', tier: 'cold', files: tiers.cold },
    ]
  }

  // ── Cursor context ("You Are Here") ──────────────────────────

  private getCursorNodes(): AtlasNode[] {
    const ctx = this.cursorContext
    if (!ctx) {
      return [{ kind: 'placeholder', label: 'Move cursor into a .spw file' }]
    }

    const nodes: CursorContextNode[] = []

    if (ctx.framePath.length > 0) {
      nodes.push({
        kind: 'cursor-context',
        contextType: 'frame-path',
        label: 'Frame',
        detail: ctx.framePath.join(' › '),
      })
    }

    if (ctx.enteredFrame) {
      nodes.push({
        kind: 'cursor-context',
        contextType: 'entered-frame',
        label: 'Entered',
        detail: ctx.enteredFrame,
      })
    }

    if (ctx.localBraids.length > 0) {
      nodes.push({
        kind: 'cursor-context',
        contextType: 'local-braids',
        label: 'Local Braids',
        detail: ctx.localBraids.join(', '),
      })
    }

    if (ctx.ambientBraids.length > 0) {
      nodes.push({
        kind: 'cursor-context',
        contextType: 'ambient-braids',
        label: 'Ambient Braids',
        detail: ctx.ambientBraids.join(', '),
      })
    }

    if (ctx.deltaBraids.length > 0) {
      nodes.push({
        kind: 'cursor-context',
        contextType: 'delta-braids',
        label: 'Delta',
        detail: ctx.deltaBraids.join(', '),
      })
    }

    if (nodes.length === 0) {
      return [{ kind: 'placeholder', label: 'No context at cursor position' }]
    }

    return nodes
  }

  private getCursorContextChildren(node: CursorContextNode): AtlasNode[] {
    const ctx = this.cursorContext
    if (!ctx) return []

    switch (node.contextType) {
      case 'frame-path':
        return ctx.framePath.map((segment): CursorDetailNode => ({
          kind: 'cursor-detail',
          label: segment,
        }))
      case 'local-braids':
        return ctx.localBraids.map((braid): CursorDetailNode => ({
          kind: 'cursor-detail',
          label: braid,
          annotationKind: this.guessKindForBraid(braid),
        }))
      case 'ambient-braids':
        return ctx.ambientBraids.map((braid): CursorDetailNode => ({
          kind: 'cursor-detail',
          label: braid,
          annotationKind: this.guessKindForBraid(braid),
        }))
      case 'delta-braids':
        return ctx.deltaBraids.map((braid): CursorDetailNode => ({
          kind: 'cursor-detail',
          label: braid,
          annotationKind: this.guessKindForBraid(braid),
        }))
      default:
        return []
    }
  }

  /** Best-effort kind guess for a braid name using the annotation index */
  private guessKindForBraid(name: string): AnnotationEntry['kind'] | undefined {
    const entries = this.spw.annotationIndex.lookup(name)
    if (entries.length === 0) return undefined
    // Return most specific kind (prefer lens/intent over topic)
    const kindOrder: AnnotationEntry['kind'][] = ['lens', 'intent', 'anchor', 'prompt_root', 'topic']
    for (const kind of kindOrder) {
      if (entries.some((e) => e.kind === kind)) return kind
    }
    return entries[0]?.kind
  }

  // ── Spirit-sequence phase distribution ──────────────────────

  private getSpiritNodes(): AtlasNode[] {
    const allEntries = [...this.spw.annotationIndex.all()]
    if (allEntries.length === 0) {
      return [{ kind: 'placeholder', label: 'No annotations indexed yet' }]
    }

    const total = allEntries.length
    // Spirit phase order: wonder(?), potential(~), observer(@), action(!), integration(^)
    const phaseOrder: AnnotationEntry['kind'][] = ['lens', 'topic', 'prompt_root', 'intent', 'anchor']

    return phaseOrder.map((annotationKind): SpiritPhaseNode => {
      const phase = PHASE_MAP[annotationKind]
      const count = allEntries.filter((e) => e.kind === annotationKind).length
      return {
        kind: 'spirit-phase',
        sigil: phase.sigil,
        phaseLabel: phase.label,
        count,
        total,
        annotationKind,
      }
    })
  }

  private getSpiritSummary(): string | undefined {
    const allEntries = [...this.spw.annotationIndex.all()]
    if (allEntries.length === 0) return undefined
    const dominant = this.getDominantPhase(allEntries)
    if (!dominant) return undefined
    return `${dominant.sigil} ${dominant.label} dominant`
  }

  private getDominantPhase(entries: AnnotationEntry[]): { sigil: string; label: string } | null {
    const counts = new Map<AnnotationEntry['kind'], number>()
    for (const entry of entries) {
      counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1)
    }
    let maxKind: AnnotationEntry['kind'] | null = null
    let maxCount = 0
    for (const [kind, count] of counts) {
      if (count > maxCount) {
        maxCount = count
        maxKind = kind
      }
    }
    if (!maxKind) return null
    const phase = PHASE_MAP[maxKind]
    return { sigil: phase.sigil, label: phase.label }
  }
}

// ── Registration ─────────────────────────────────────────────────

export function registerWorkspaceAtlasView(spw: SpwContext): vscode.Disposable[] {
  const provider = new WorkspaceAtlasProvider(spw)

  const treeView = vscode.window.createTreeView('spwWorkspace', {
    treeDataProvider: provider,
    showCollapseAll: true,
  })

  const visibilitySub = treeView.onDidChangeVisibility((event) => {
    provider.setVisible(event.visible)
  })

  const refreshCommand = vscode.commands.registerCommand('spwWorkspace.refresh', () => {
    void provider.refresh()
  })

  const rootSelectedCommand = vscode.commands.registerCommand(
    'spwWorkspace.selectRoot',
    async (node: AtlasNode) => {
      if (node.kind !== 'root') return
      spw.events.emit('atlas.rootSelected', {
        sigil: node.entry.sigil,
        uri: node.entry.uri,
        manifestFrame: null,
      })
      spw.activeRoot = { sigil: node.entry.sigil, uri: node.entry.uri }
      await openWorkspaceTarget(node.entry.uri, node.entry.kind)
    },
  )

  provider.setVisible(treeView.visible)

  return [provider, treeView, visibilitySub, refreshCommand, rootSelectedCommand]
}

function rootKindIcon(kind: SpwWorkspaceRootEntry['kind']): string {
  if (kind === 'directory') return 'root-folder'
  if (kind === 'file') return 'file'
  if (kind === 'unreadable') return 'lock'
  if (kind === 'missing') return 'warning'
  return 'question'
}

/**
 * Server Index — workspace intelligence backbone
 *
 * Owns the annotation index, parse cache, concept clusters,
 * and projection graph for the LSP server. All editor-facing
 * providers (hover, diagnostics, symbols, completion, code lens)
 * read from this index rather than re-parsing on every request.
 *
 * Cache tiers follow .spw/biome/ocean/algos/cache.spw:
 *   hot  (8 beats)  — open files: parsed AST + selector hits + annotations
 *   warm (64 beats) — recent files: annotation index, resolved paths
 *   cold (256 beats) — workspace: full scan results, projection graph
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  parse,
  canonicalize,
  hashString,
  type ParseOutput,
} from '@spw/seed'
import { selectPathRefs, type SpwSelectorHit } from './spw-selector'

// ── Types ───────────────────────────────────────────────────────

export type AnnotationKind = 'topic' | 'lens' | 'intent' | 'anchor'

export interface AnnotationEntry {
  file: string
  line: number       // 0-indexed
  kind: AnnotationKind
  name: string
  sectionLabel?: string
}

export interface DocumentState {
  uri: string
  filePath: string
  text: string
  version: number
  contentHash: string
  parseResult: ParseOutput | null
  selectorHits: SpwSelectorHit[]
  annotations: AnnotationEntry[]
  lastAccessBeat: number
  tier: 'hot' | 'warm' | 'cold'
}

export interface ProjectionEntry {
  name: string
  root: string
  source: string
  specOwner: string
  generatorOwner: string
  status: string
}

export interface ConceptCluster {
  name: string
  entries: AnnotationEntry[]
  coOccurs: Map<string, number>
}

export interface SelectorDefinition {
  name: string
  include: string[]
  combine: string
  grounding: string
  file: string
}

// ── Constants ───────────────────────────────────────────────────

const WARM_TTL = 64
const COLD_TTL = 256

const ANNOTATION_RE = /(##>|#!|#:|#>|#)([a-zA-Z_][a-zA-Z0-9_]*)/g
const FRAME_RE = /^\s*\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_][A-Za-z0-9_]*)\])/
const SELECTOR_DEF_RE = /^\^selector\[([A-Za-z_][A-Za-z0-9_]*)\]/

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'release', '.claude'])

// ── Sigil semantics ─────────────────────────────────────────────

export interface SigilSemantic {
  role: string
  physics: string
  phase: string
  phaseIndex: number
  tuning: string
}

export const SIGIL_SEMANTICS: Record<string, SigilSemantic> = {
  '!': { role: 'action / injection', physics: 'kinetic — fires effect on world', phase: 'phase 0', phaseIndex: 0, tuning: 'gate effects behind deterministic spell macros' },
  '?': { role: 'wonder / probe', physics: 'measurement — is there something?', phase: 'phase 1', phaseIndex: 1, tuning: 'increase sampling density around high-drift zones' },
  '~': { role: 'potential / superposition', physics: 'wavefunction — defer, name', phase: 'phase 2', phaseIndex: 2, tuning: 'delay collapse until ambiguity drops below threshold' },
  '@': { role: 'perspective / observer', physics: 'observation — push scope', phase: 'phase 3', phaseIndex: 3, tuning: 'cache scope-local reads aggressively (hot tier)' },
  '&': { role: 'confluence / merge', physics: 'entanglement — combine frames', phase: 'phase 4', phaseIndex: 4, tuning: 'cluster before merge to reduce coupling pressure' },
  '*': { role: 'value / collapse', physics: 'collapse — scope to concrete', phase: 'phase 5', phaseIndex: 5, tuning: 'materialize selected projections only' },
  '^': { role: 'integration / framing', physics: 'emission — bind upward', phase: 'phase 6', phaseIndex: 6, tuning: 'commit invariant summaries; avoid full replay' },
  '=': { role: 'config / constraint', physics: 'bias — forcing state', phase: 'binding', phaseIndex: -1, tuning: 'stabilize noisy branches with explicit bounds' },
  '%': { role: 'measure / observation', physics: 'scalar — quantify relevance', phase: 'observe', phaseIndex: -1, tuning: 'promote repeated measures into cached aggregates' },
  '#': { role: 'annotation / resonance', physics: 'vibration — self-reference, meta', phase: 'meta', phaseIndex: -1, tuning: 'use anchors/lenses to reduce lookup entropy' },
  '.': { role: 'ground / access', physics: 'ground state — context, separator', phase: 'access', phaseIndex: -1, tuning: 'ground refs early for replayability' },
  '$': { role: 'selector / addressing', physics: 'addressing potential', phase: 'query', phaseIndex: -1, tuning: 'normalize selector forms to improve cache hit rate' },
  '_': { role: 'intrinsic / identity', physics: 'identity — core register', phase: 'identity', phaseIndex: -1, tuning: 'carry stable label identity across transforms' },
}

const SPIRIT_SEQUENCE = '?~ <#.> @(#.) &[#.] *{#.} ^'
const SPIRIT_PHASES = ['?~', '<#.>', '@(#.)', '&[#.]', '*{#.}', '^']

function escapeMarkdownInline(value: string): string {
  return value.replace(/[\\`*_{}\[\]()#+\-.!|]/g, '\\$&')
}

// ── ServerIndex ─────────────────────────────────────────────────

export class ServerIndex {
  private documents = new Map<string, DocumentState>()
  private workspaceAnnotations: AnnotationEntry[] = []
  private annotationsByName = new Map<string, AnnotationEntry[]>()
  private annotationsByFile = new Map<string, AnnotationEntry[]>()
  private projections: ProjectionEntry[] = []
  private selectorDefs = new Map<string, SelectorDefinition>()
  private beat = 0
  private workspaceRoot: string

  // ── Workspace config (loaded from .spw/shelves.spw, topology.spw, editing.spw) ──
  private shelfRoots = new Map<string, string>()             // name → absolute path
  private topologySubroots = new Map<string, {               // name → topology entry
    resolvedPath: string
    cachePrefix: string
  }>()
  private editingCategories = new Map<string, string[]>()    // category → shelf key array

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot
  }

  // ── Beat tracking ───────────────────────────────────────────

  tick(): void {
    this.beat += 1
    if (this.beat % WARM_TTL === 0) {
      this.evictStale()
    }
  }

  private evictStale(): void {
    for (const [uri, doc] of this.documents) {
      if (doc.tier === 'hot') continue // open docs stay hot
      const age = this.beat - doc.lastAccessBeat
      if (doc.tier === 'warm' && age > WARM_TTL) {
        doc.tier = 'cold'
      } else if (doc.tier === 'cold' && age > COLD_TTL) {
        this.documents.delete(uri)
      }
    }
  }

  // ── Document lifecycle ────────────────────────────────────────

  openDocument(uri: string, filePath: string, text: string, version: number): DocumentState {
    const doc = this.ensureDocument(uri, filePath, text, version)
    doc.tier = 'hot'
    return doc
  }

  updateDocument(uri: string, text: string, version: number): DocumentState | null {
    const doc = this.documents.get(uri)
    if (!doc) return null

    const newHash = hashString(text)
    if (newHash === doc.contentHash) {
      doc.version = version
      doc.lastAccessBeat = this.beat
      return doc
    }

    doc.text = text
    doc.version = version
    doc.contentHash = newHash
    doc.lastAccessBeat = this.beat

    // Reparse
    this.parseDocument(doc)
    return doc
  }

  closeDocument(uri: string): void {
    const doc = this.documents.get(uri)
    if (!doc) return
    doc.tier = 'warm'
    doc.lastAccessBeat = this.beat
  }

  saveDocument(uri: string): void {
    const doc = this.documents.get(uri)
    if (!doc) return

    // Reindex annotations for this file in the workspace index
    this.removeAnnotationsForFile(doc.filePath)
    for (const entry of doc.annotations) {
      this.addAnnotation(entry)
    }
  }

  getDocument(uri: string): DocumentState | null {
    const doc = this.documents.get(uri)
    if (doc) {
      doc.lastAccessBeat = this.beat
    }
    return doc ?? null
  }

  async getDocumentText(uri: string, filePath: string | null): Promise<string | null> {
    const doc = this.documents.get(uri)
    if (doc) return doc.text
    if (!filePath) return null
    try {
      return await fs.readFile(filePath, 'utf8')
    } catch {
      return null
    }
  }

  private ensureDocument(uri: string, filePath: string, text: string, version: number): DocumentState {
    const existing = this.documents.get(uri)
    if (existing) {
      const newHash = hashString(text)
      if (newHash !== existing.contentHash) {
        existing.text = text
        existing.contentHash = newHash
        this.parseDocument(existing)
      }
      existing.version = version
      existing.lastAccessBeat = this.beat
      return existing
    }

    const doc: DocumentState = {
      uri,
      filePath,
      text,
      version,
      contentHash: hashString(text),
      parseResult: null,
      selectorHits: [],
      annotations: [],
      lastAccessBeat: this.beat,
      tier: 'warm',
    }
    this.documents.set(uri, doc)
    this.parseDocument(doc)
    return doc
  }

  private parseDocument(doc: DocumentState): void {
    try {
      doc.parseResult = parse(doc.text)
    } catch {
      doc.parseResult = null
    }
    doc.selectorHits = selectPathRefs(doc.text)
    doc.annotations = this.extractAnnotations(doc.filePath, doc.text)
  }

  // ── Workspace config loading ──────────────────────────────────

  /** Parse @name: ~"./path" entries from .spw/shelves.spw */
  private async loadShelves(): Promise<void> {
    const shelvesPath = path.join(this.workspaceRoot, '.spw', 'shelves.spw')
    try {
      const text = await fs.readFile(shelvesPath, 'utf8')
      const shelvesDir = path.dirname(shelvesPath)
      const re = /^\s*@([A-Za-z0-9_-]+):\s*~"([^"]+)"/gm
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        this.shelfRoots.set(m[1], path.resolve(shelvesDir, m[2]))
      }
    } catch {
      // shelves.spw not found — fall back to defaults later
    }
  }

  /** Parse ^subroot[name]{ path: @shelf ... cache_key_prefix: ... } from topology.spw */
  private async loadTopology(): Promise<void> {
    const topologyPath = path.join(this.workspaceRoot, '.spw', 'topology.spw')
    try {
      const text = await fs.readFile(topologyPath, 'utf8')
      const blockRe = /\^subroot\[([A-Za-z0-9_-]+)\]([\s\S]*?)(?=\^subroot\[|\^"|$)/g
      let m: RegExpExecArray | null
      while ((m = blockRe.exec(text)) !== null) {
        const name = m[1]
        const body = m[2]
        const prefixMatch = body.match(/cache_key_prefix:\s*([A-Za-z0-9_-]+)/)
        const cachePrefix = prefixMatch?.[1] ?? name
        const pathMatch = body.match(/path:\s*@([A-Za-z0-9_-]+)/)
        const shelfName = pathMatch?.[1] ?? name
        const resolvedPath = this.shelfRoots.get(shelfName) ??
          path.join(this.workspaceRoot, '.spw', name)
        this.topologySubroots.set(name, { resolvedPath, cachePrefix })
      }
    } catch {
      // topology.spw not found
    }
  }

  /** Parse ^category[name]{ subroots: [@root/sub, ...] } from editing.spw */
  private async loadEditing(): Promise<void> {
    const editingPath = path.join(this.workspaceRoot, '.spw', 'editing.spw')
    try {
      const text = await fs.readFile(editingPath, 'utf8')
      const blockRe = /\^category\[([A-Za-z0-9_-]+)\]([\s\S]*?)(?=\^category\[|\^"|$)/g
      let m: RegExpExecArray | null
      while ((m = blockRe.exec(text)) !== null) {
        const name = m[1]
        const body = m[2]
        const subrootsMatch = body.match(/subroots:\s*\[([^\]]+)\]/)
        const keys = subrootsMatch
          ? (subrootsMatch[1].match(/@([A-Za-z0-9_/-]+)/g) ?? []).map(s => s.slice(1))
          : []
        this.editingCategories.set(name, keys)
      }
    } catch {
      // editing.spw not found
    }
  }

  // ── Workspace scanning ────────────────────────────────────────

  async scanWorkspace(): Promise<void> {
    this.workspaceAnnotations = []
    this.annotationsByName.clear()
    this.annotationsByFile.clear()
    this.projections = []
    this.selectorDefs.clear()

    // Load workspace config files first (shelves → topology depends on shelf roots)
    await this.loadShelves()
    await this.loadTopology()
    await this.loadEditing()

    const spwFiles = await this.collectSpwFiles(this.workspaceRoot)

    for (const filePath of spwFiles) {
      try {
        const text = await fs.readFile(filePath, 'utf8')
        const annotations = this.extractAnnotations(filePath, text)
        for (const entry of annotations) {
          this.addAnnotation(entry)
        }

        // Extract selector definitions from sel.spw-like files
        this.extractSelectorDefs(filePath, text)
      } catch {
        // skip unreadable files
      }
    }

    // Parse projection graph from gen/index.spw
    await this.parseProjectionGraph()
  }

  private async collectSpwFiles(dir: string): Promise<string[]> {
    const out: string[] = []
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
        const target = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          out.push(...await this.collectSpwFiles(target))
        } else if (entry.isFile() && entry.name.endsWith('.spw')) {
          out.push(target)
        }
      }
    } catch {
      // directory unreadable
    }
    return out
  }

  // ── Annotation extraction ─────────────────────────────────────

  private extractAnnotations(filePath: string, text: string): AnnotationEntry[] {
    const entries: AnnotationEntry[] = []
    const lines = text.split('\n')
    let currentSection: string | undefined

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]

      const frameMatch = line.match(FRAME_RE)
      if (frameMatch) {
        currentSection = frameMatch[1] || frameMatch[2] || frameMatch[3]
      }

      ANNOTATION_RE.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = ANNOTATION_RE.exec(line)) !== null) {
        const trimmed = line.trimStart()
        if (trimmed.startsWith('# ') || trimmed.startsWith('//')) {
          if (match.index > line.indexOf('#') + 1 && trimmed.startsWith('#')) {
            continue
          }
        }

        entries.push({
          file: filePath,
          line: i,
          kind: kindFromSigil(match[1]),
          name: match[2],
          sectionLabel: currentSection,
        })
      }
    }

    return entries
  }

  private addAnnotation(entry: AnnotationEntry): void {
    this.workspaceAnnotations.push(entry)

    const byName = this.annotationsByName.get(entry.name)
    if (byName) {
      byName.push(entry)
    } else {
      this.annotationsByName.set(entry.name, [entry])
    }

    const byFile = this.annotationsByFile.get(entry.file)
    if (byFile) {
      byFile.push(entry)
    } else {
      this.annotationsByFile.set(entry.file, [entry])
    }
  }

  /** Re-read a file from disk and refresh its annotation index entry. */
  async refreshFileAnnotations(filePath: string): Promise<void> {
    try {
      const text = await fs.readFile(filePath, 'utf8')
      this.removeAnnotationsForFile(filePath)
      const annotations = this.extractAnnotations(filePath, text)
      for (const entry of annotations) {
        this.addAnnotation(entry)
      }
      this.extractSelectorDefs(filePath, text)
    } catch {
      // file deleted or unreadable — clear its entries
      this.removeAnnotationsForFile(filePath)
    }
  }

  private removeAnnotationsForFile(filePath: string): void {
    const old = this.annotationsByFile.get(filePath) || []
    for (const entry of old) {
      const arr = this.annotationsByName.get(entry.name)
      if (arr) {
        const idx = arr.indexOf(entry)
        if (idx >= 0) arr.splice(idx, 1)
        if (arr.length === 0) this.annotationsByName.delete(entry.name)
      }
    }
    this.workspaceAnnotations = this.workspaceAnnotations.filter(e => e.file !== filePath)
    this.annotationsByFile.delete(filePath)
  }

  // ── Annotation queries ────────────────────────────────────────

  lookupAnnotation(name: string): AnnotationEntry[] {
    return this.annotationsByName.get(name) || []
  }

  searchAnnotations(query: string): AnnotationEntry[] {
    const q = query.toLowerCase()
    return this.workspaceAnnotations.filter(e => e.name.toLowerCase().includes(q))
  }

  annotationsForFile(filePath: string): AnnotationEntry[] {
    return this.annotationsByFile.get(filePath) || []
  }

  allAnnotationNames(): string[] {
    return [...this.annotationsByName.keys()].sort()
  }

  allAnnotations(): AnnotationEntry[] {
    return this.workspaceAnnotations
  }

  /** Compute co-occurrence: annotations that appear in the same file */
  coOccurrences(name: string): Map<string, number> {
    const entries = this.annotationsByName.get(name) || []
    const counts = new Map<string, number>()

    for (const entry of entries) {
      const siblings = this.annotationsByFile.get(entry.file) || []
      for (const sibling of siblings) {
        if (sibling.name === name) continue
        counts.set(sibling.name, (counts.get(sibling.name) ?? 0) + 1)
      }
    }

    return counts
  }

  /** Top N co-occurring annotations sorted by frequency */
  topCoOccurrences(name: string, limit: number = 5): Array<{ name: string; count: number }> {
    const counts = this.coOccurrences(name)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([n, count]) => ({ name: n, count }))
  }

  // ── Selector definitions ──────────────────────────────────────

  private extractSelectorDefs(filePath: string, text: string): void {
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const match = lines[i].match(SELECTOR_DEF_RE)
      if (!match) continue

      const name = match[1]
      // Parse the block that follows
      const include: string[] = []
      let combine = ''
      let grounding = ''

      for (let j = i + 1; j < lines.length && j < i + 10; j += 1) {
        const line = lines[j].trim()
        if (line.startsWith('include:')) {
          const content = line.slice('include:'.length).trim()
          const items = content.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean)
          include.push(...items)
        } else if (line.startsWith('combine:')) {
          combine = line.slice('combine:'.length).trim()
        } else if (line.startsWith('grounding:')) {
          grounding = line.slice('grounding:'.length).trim()
        } else if (line === '}') {
          break
        }
      }

      this.selectorDefs.set(name, { name, include, combine, grounding, file: filePath })
    }
  }

  getSelectorDef(name: string): SelectorDefinition | null {
    return this.selectorDefs.get(name) ?? null
  }

  // ── Projection graph ──────────────────────────────────────────

  private async parseProjectionGraph(): Promise<void> {
    const genIndexPath = path.join(this.workspaceRoot, '.spw', 'gen', 'index.spw')
    try {
      const text = await fs.readFile(genIndexPath, 'utf8')
      const projRe = /\^projection\[(\w+)\]\s*\{([^}]+)\}/g
      let match: RegExpExecArray | null
      while ((match = projRe.exec(text)) !== null) {
        const name = match[1]
        const body = match[2]
        const fields: Record<string, string> = {}
        for (const line of body.split('\n')) {
          const kv = line.match(/(\w+):\s*"?([^"\n]+)"?/)
          if (kv) fields[kv[1]] = kv[2].trim()
        }
        this.projections.push({
          name,
          root: fields.root || '',
          source: fields.source || '',
          specOwner: fields.spec_owner || '',
          generatorOwner: fields.generator_owner || '',
          status: fields.status || '',
        })
      }
    } catch {
      // gen/index.spw not found — no projections
    }
  }

  getProjections(): ProjectionEntry[] {
    return this.projections
  }

  getProjectionForFile(filePath: string): ProjectionEntry | null {
    const rel = path.relative(this.workspaceRoot, filePath)
    return this.projections.find(p =>
      rel.startsWith(p.root.replace(/^\.\//, '').replace(/\/$/, ''))
    ) ?? null
  }

  getProjectionsFromSpecOwner(filePath: string): ProjectionEntry[] {
    const rel = path.relative(this.workspaceRoot, filePath)
    const relNorm = './' + rel.replace(/\\/g, '/')
    const relNorm2 = '.spw/' + rel.replace(/\\/g, '/').replace(/^\.spw\//, '')
    return this.projections.filter(p =>
      p.specOwner === relNorm || p.specOwner === relNorm2 || p.specOwner.endsWith('/' + path.basename(filePath))
    )
  }

  // ── Topology ──────────────────────────────────────────────────

  getSubrootForFile(filePath: string): string | null {
    // Prefer topology-derived subroots (from topology.spw)
    for (const [name, { resolvedPath }] of this.topologySubroots) {
      if (filePath === resolvedPath || filePath.startsWith(resolvedPath + path.sep)) {
        return name
      }
    }
    // Fallback: path-pattern heuristics
    const rel = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/')
    if (rel.startsWith('.spw/biome/')) return 'biome'
    if (rel.startsWith('.spw/harness/')) return 'harness'
    if (rel.startsWith('.spw/gen/') || rel.startsWith('.spw/hot')) return 'hot'
    if (rel.startsWith('.agents/')) return 'agents'
    return null
  }

  getCacheTierForFile(filePath: string): string {
    const sub = this.getSubrootForFile(filePath)
    const rel = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/')
    if (rel.includes('/query/') || rel.includes('/expr/') || rel.includes('/ops/')) return 'hot'
    if (rel.includes('/algos/') || rel.includes('/style') || rel.includes('/phase')) return 'warm'
    if (rel.includes('/experiments/')) return 'cold'
    if (sub === 'hot') return 'hot'
    if (sub === 'harness') return 'warm'
    return 'warm'
  }

  /** Which editing category does a file belong to? (macro/measurement/prose/runtime) */
  getCategoryForFile(filePath: string): string | null {
    for (const [catName, keys] of this.editingCategories) {
      for (const key of keys) {
        // key format: "biome/spells" or "harness/probes" etc.
        const slashIdx = key.indexOf('/')
        const shelfName = slashIdx >= 0 ? key.slice(0, slashIdx) : key
        const subPath = slashIdx >= 0 ? key.slice(slashIdx + 1) : ''
        const shelfBase = this.shelfRoots.get(shelfName)
        if (!shelfBase) continue
        const target = subPath ? path.join(shelfBase, subPath) : shelfBase
        if (filePath === target || filePath.startsWith(target + path.sep)) {
          return catName
        }
      }
    }
    // Fallback by subroot name
    const sub = this.getSubrootForFile(filePath)
    if (sub === 'biome') return 'macro'
    if (sub === 'harness') return 'measurement'
    if (sub === 'hot') return 'runtime'
    if (sub === 'agents') return 'runtime'
    return null
  }

  /** Which workspace plane owns this file? */
  getWorkspacePlaneForFile(filePath: string): string | null {
    const rel = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/')
    const spwRel = rel.startsWith('.spw/') ? rel.slice(5) : rel
    if (/^gen\//.test(spwRel)) return 'projection'
    if (/^registries\//.test(spwRel)) return 'register'
    if (/^applications\//.test(spwRel)) return 'application'
    if (/^conventions\//.test(spwRel)) return 'convention'
    if (/^patterns\//.test(spwRel)) return 'pattern'
    if (/^harness\//.test(spwRel)) return 'measurement'
    if (/^literate\//.test(spwRel)) return 'pattern'
    if (/^biome\//.test(spwRel)) return 'biome'
    if (/^(index|workspace|mount|shelves|topology|editing|canon-mount|hot)\.spw$/.test(spwRel)) {
      return 'control'
    }
    return null
  }

  /** True if the file lives in the generated projection surface (.spw/gen/) */
  isGeneratedFile(filePath: string): boolean {
    const rel = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/')
    return rel.startsWith('.spw/gen/')
  }

  /** The parsed shelf roots from shelves.spw (name → absolute path). */
  getShelfRoots(): Map<string, string> {
    return this.shelfRoots
  }

  // ── Formatting ────────────────────────────────────────────────

  formatDocument(text: string): string {
    return canonicalize(text, {
      normalizeNewlines: true,
      trimTrailingWhitespace: true,
      ensureFinalNewline: true,
      collapseBlankLines: false,
      indentBraces: true,
      indentSize: 2,
      alignComments: true,
      commentColumn: 40,
      blankLineBetweenFrames: true,
    }).source
  }

  // ── Spirit sequence helpers ───────────────────────────────────

  getSpiritSequence(): string {
    return SPIRIT_SEQUENCE
  }

  getSpiritPhaseForSigil(sigil: string): string | null {
    const sem = SIGIL_SEMANTICS[sigil]
    if (!sem || sem.phaseIndex < 0) return null

    const phases = SPIRIT_PHASES
    const idx = Math.min(sem.phaseIndex, phases.length - 1)
    const markers = phases.map((p, i) => {
      const safe = escapeMarkdownInline(p)
      return i === idx ? `**${safe}**` : safe
    })
    return markers.join(' ')
  }

  getSigilSemantic(sigil: string): SigilSemantic | null {
    return SIGIL_SEMANTICS[sigil] ?? null
  }

  // ── Root resolution ───────────────────────────────────────────

  getWorkspaceRoot(): string {
    return this.workspaceRoot
  }

  setWorkspaceRoot(root: string): void {
    this.workspaceRoot = root
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function kindFromSigil(sigil: string | undefined): AnnotationKind {
  switch (sigil) {
    case '#:': return 'lens'
    case '#!': return 'intent'
    case '#>':
    case '##>':
      return 'anchor'
    default: return 'topic'
  }
}

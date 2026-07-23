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
  particleMix,
  type ParseOutput,
  type ParticleMix,
  type Token,
  type OperatorKind,
} from '@spwashi/spw-seed'
import { selectPathRefs, type SpwSelectorHit } from './spw-selector'

// ── Types ───────────────────────────────────────────────────────

export type AnnotationKind = 'topic' | 'lens' | 'intent' | 'anchor' | 'prompt_root'

export interface AnnotationEntry {
  file: string
  line: number       // 0-indexed
  kind: AnnotationKind
  name: string
  sectionLabel?: string
  framePath: string[]
}

export interface DocumentLineContext {
  framePath: string[]
  ambientBraids: string[]
  localBraids: string[]
  enteredFrame: string | null
  deltaBraids: string[]
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
  frames: FrameEntry[]
  lineContexts: DocumentLineContext[]
  /** Particle signature of the surface — the material behind its cache stance. */
  mix: ParticleMix
  lastAccessBeat: number
  tier: 'hot' | 'warm' | 'cold'
  writeCount: number
}

export interface ProjectionEntry {
  name: string
  root: string
  source: string
  specOwner: string
  generatorOwner: string
  status: string
}

export interface FrameEntry {
  file: string
  line: number       // 0-indexed
  name: string
  framePath: string[]  // full path including this frame
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
const DEFAULT_FORMAT_OPTIONS = {
  normalizeNewlines: true,
  trimTrailingWhitespace: true,
  ensureFinalNewline: true,
  collapseBlankLines: false,
  indentBraces: true,
  indentSize: 2,
  alignComments: true,
  commentColumn: 40,
  blankLineBetweenFrames: true,
} as const


const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'release', '.claude', '_workbench'])

// ── Sigil semantics ─────────────────────────────────────────────

export interface SigilSemantic {
  role: string
  physics: string
  phase: string
  phaseIndex: number
  tuning: string
}

// Validated against OperatorKind from @spwashi/spw-seed — satisfies ensures full coverage.
// Declared as Record<string, ...> so runtime string-key lookups stay type-safe.
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
  '<>': { role: 'capsule / shell', physics: 'enclosure — wrap and transport', phase: 'access', phaseIndex: -1, tuning: 'use for short-lived transport envelopes' },
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
  private workspaceFrames: FrameEntry[] = []
  private framesByName = new Map<string, FrameEntry[]>()
  private framesByFile = new Map<string, FrameEntry[]>()
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
    doc.writeCount++

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

    // Reindex annotations and frames for this file in the workspace index
    this.removeAnnotationsForFile(doc.filePath)
    for (const entry of doc.annotations) {
      this.addAnnotation(entry)
    }
    this.removeFramesForFile(doc.filePath)
    for (const entry of doc.frames) {
      this.addFrame(entry)
    }
  }

  allDocuments(): Map<string, DocumentState> {
    return this.documents
  }

  getCurrentBeat(): number {
    return this.beat
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
      frames: [],
      lineContexts: [],
      mix: { deixis: 0, case: 0, mood: 0, aspect: 0 },
      lastAccessBeat: this.beat,
      tier: 'warm',
      writeCount: 0,
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
    doc.mix = particleMix(doc.parseResult?.ast ?? null, doc.text)
    // Pass parse result so analyzeDocumentContext reuses tokens already produced
    const structure = analyzeDocumentContext(doc.filePath, doc.text, doc.parseResult)
    doc.annotations = structure.annotations
    doc.frames = structure.frames
    doc.lineContexts = structure.lineContexts
  }

  // ── Workspace config loading ──────────────────────────────────

  /** Parse @name: ~"./path" entries from .spw/shelves.spw using token stream */
  private async loadShelves(): Promise<void> {
    const shelvesPath = path.join(this.workspaceRoot, '.spw', 'shelves.spw')
    try {
      const text = await fs.readFile(shelvesPath, 'utf8')
      const shelvesDir = path.dirname(shelvesPath)
      const { tokens } = parse(text)
      const sig = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      for (let i = 0; i < sig.length; i++) {
        const tok = sig[i]
        // @name : ~"./path"
        if (tok.type !== 'OPERATOR' || tok.kind !== '@') continue
        const name = sig[i + 1]
        const colon = sig[i + 2]
        const tilde = sig[i + 3]
        const pathTok = sig[i + 4]
        if (
          name?.type === 'IDENTIFIER' &&
          colon?.type === 'COLON' &&
          tilde?.type === 'OPERATOR' && tilde.kind === '~' &&
          pathTok?.type === 'STRING'
        ) {
          const rel = pathTok.value.replace(/^["'`]|["'`]$/g, '')
          this.shelfRoots.set(name.value, path.resolve(shelvesDir, rel))
          i += 4
        }
      }
    } catch {
      // shelves.spw not found — fall back to defaults later
    }
  }

  /** Parse ^subroot[name]{ ... } from topology.spw using token stream */
  private async loadTopology(): Promise<void> {
    const topologyPath = path.join(this.workspaceRoot, '.spw', 'topology.spw')
    try {
      const text = await fs.readFile(topologyPath, 'utf8')
      const { tokens } = parse(text)
      const sig = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      for (let i = 0; i < sig.length; i++) {
        // ^subroot[name]{
        const tok = sig[i]
        if (tok.type !== 'OPERATOR' || tok.kind !== '^') continue
        const label = sig[i + 1]
        if (label?.type !== 'IDENTIFIER' || label.value !== 'subroot') continue
        const open = sig[i + 2]
        const nameTok = sig[i + 3]
        const close = sig[i + 4]
        const brace = sig[i + 5]
        if (
          open?.type === 'CONTAINER_OPEN' && open.kind === '[' &&
          nameTok?.type === 'IDENTIFIER' &&
          close?.type === 'CONTAINER_CLOSE' && close.kind === ']' &&
          brace?.type === 'CONTAINER_OPEN' && brace.kind === '{'
        ) {
          const name = nameTok.value
          i += 5
          // Scan body until matching }
          let depth = 1
          const bodyTokens: Token[] = []
          while (++i < sig.length && depth > 0) {
            const bt = sig[i]
            if (bt.type === 'CONTAINER_OPEN' && bt.kind === '{') depth++
            else if (bt.type === 'CONTAINER_CLOSE' && bt.kind === '}') { depth--; if (depth === 0) break }
            bodyTokens.push(bt)
          }
          // Extract path: @shelf and cache_key_prefix: key from bodyTokens
          let shelfName = name
          let cachePrefix = name
          for (let j = 0; j < bodyTokens.length; j++) {
            const key = bodyTokens[j]
            if (key?.type !== 'IDENTIFIER') continue
            const colon = bodyTokens[j + 1]
            if (colon?.type !== 'COLON') continue
            const val = bodyTokens[j + 2]
            if (key.value === 'path' && val?.type === 'OPERATOR' && val.kind === '@') {
              const rootName = bodyTokens[j + 3]
              if (rootName?.type === 'IDENTIFIER') shelfName = rootName.value
            } else if (key.value === 'cache_key_prefix' && val?.type === 'IDENTIFIER') {
              cachePrefix = val.value
            }
          }
          const resolvedPath = this.shelfRoots.get(shelfName) ??
            path.join(this.workspaceRoot, '.spw', name)
          this.topologySubroots.set(name, { resolvedPath, cachePrefix })
        }
      }
    } catch {
      // topology.spw not found
    }
  }

  /** Parse ^category[name]{ subroots: [...] } from editing.spw using token stream */
  private async loadEditing(): Promise<void> {
    const editingPath = path.join(this.workspaceRoot, '.spw', 'editing.spw')
    try {
      const text = await fs.readFile(editingPath, 'utf8')
      const { tokens } = parse(text)
      const sig = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      for (let i = 0; i < sig.length; i++) {
        // ^category[name]{
        const tok = sig[i]
        if (tok.type !== 'OPERATOR' || tok.kind !== '^') continue
        const label = sig[i + 1]
        if (label?.type !== 'IDENTIFIER' || label.value !== 'category') continue
        const open = sig[i + 2]
        const nameTok = sig[i + 3]
        const close = sig[i + 4]
        const brace = sig[i + 5]
        if (
          open?.type === 'CONTAINER_OPEN' && open.kind === '[' &&
          nameTok?.type === 'IDENTIFIER' &&
          close?.type === 'CONTAINER_CLOSE' && close.kind === ']' &&
          brace?.type === 'CONTAINER_OPEN' && brace.kind === '{'
        ) {
          const name = nameTok.value
          i += 5
          let depth = 1
          const bodyTokens: Token[] = []
          while (++i < sig.length && depth > 0) {
            const bt = sig[i]
            if (bt.type === 'CONTAINER_OPEN' && bt.kind === '{') depth++
            else if (bt.type === 'CONTAINER_CLOSE' && bt.kind === '}') { depth--; if (depth === 0) break }
            bodyTokens.push(bt)
          }
          // Find subroots: [ @root/sub, ... ]
          const keys: string[] = []
          for (let j = 0; j < bodyTokens.length; j++) {
            const bt = bodyTokens[j]
            if (bt?.type === 'OPERATOR' && bt.kind === '@') {
              // Collect @root/path/sub segments: @IDENT (/ IDENT)*
              let key = bodyTokens[j + 1]?.value ?? ''
              let k = j + 2
              while (
                bodyTokens[k]?.type === 'CONNECTOR' && bodyTokens[k]?.kind === '/' &&
                bodyTokens[k + 1]?.type === 'IDENTIFIER'
              ) {
                key += '/' + bodyTokens[k + 1].value
                k += 2
              }
              if (key) keys.push(key)
            }
          }
          this.editingCategories.set(name, keys)
        }
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
    this.workspaceFrames = []
    this.framesByName.clear()
    this.framesByFile.clear()
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
        const structure = analyzeDocumentContext(filePath, text)
        for (const entry of structure.annotations) {
          this.addAnnotation(entry)
        }
        for (const entry of structure.frames) {
          this.addFrame(entry)
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

  /** Re-read a file from disk and refresh its annotation and frame index entries. */
  async refreshFileAnnotations(filePath: string): Promise<void> {
    try {
      const text = await fs.readFile(filePath, 'utf8')
      this.removeAnnotationsForFile(filePath)
      this.removeFramesForFile(filePath)
      const structure = analyzeDocumentContext(filePath, text)
      for (const entry of structure.annotations) {
        this.addAnnotation(entry)
      }
      for (const entry of structure.frames) {
        this.addFrame(entry)
      }
      this.extractSelectorDefs(filePath, text)
    } catch {
      // file deleted or unreadable — clear its entries
      this.removeAnnotationsForFile(filePath)
      this.removeFramesForFile(filePath)
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

  private addFrame(entry: FrameEntry): void {
    this.workspaceFrames.push(entry)
    const byName = this.framesByName.get(entry.name)
    if (byName) { byName.push(entry) } else { this.framesByName.set(entry.name, [entry]) }
    const byFile = this.framesByFile.get(entry.file)
    if (byFile) { byFile.push(entry) } else { this.framesByFile.set(entry.file, [entry]) }
  }

  private removeFramesForFile(filePath: string): void {
    const old = this.framesByFile.get(filePath) || []
    for (const entry of old) {
      const arr = this.framesByName.get(entry.name)
      if (arr) {
        const idx = arr.indexOf(entry)
        if (idx >= 0) arr.splice(idx, 1)
        if (arr.length === 0) this.framesByName.delete(entry.name)
      }
    }
    this.workspaceFrames = this.workspaceFrames.filter(e => e.file !== filePath)
    this.framesByFile.delete(filePath)
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

  searchFrames(query: string): FrameEntry[] {
    const q = query.toLowerCase()
    return this.workspaceFrames.filter(e => e.name.toLowerCase().includes(q))
  }

  framesForFile(filePath: string): FrameEntry[] {
    return this.framesByFile.get(filePath) || []
  }

  getContextAtPosition(
    uri: string,
    position: { line: number, character: number },
  ): DocumentLineContext | null {
    const doc = this.documents.get(uri)
    if (!doc) return null
    const line = Math.max(0, Math.min(position.line, doc.lineContexts.length - 1))
    return doc.lineContexts[line] ?? null
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
    const { tokens } = parse(text)
    const sig = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

    for (let i = 0; i < sig.length; i++) {
      // ^selector[name]{
      const tok = sig[i]
      if (tok.type !== 'OPERATOR' || tok.kind !== '^') continue
      const label = sig[i + 1]
      if (label?.type !== 'IDENTIFIER' || label.value !== 'selector') continue
      const open = sig[i + 2]
      const nameTok = sig[i + 3]
      const close = sig[i + 4]
      const brace = sig[i + 5]
      if (
        open?.type === 'CONTAINER_OPEN' && open.kind === '[' &&
        nameTok?.type === 'IDENTIFIER' &&
        close?.type === 'CONTAINER_CLOSE' && close.kind === ']' &&
        brace?.type === 'CONTAINER_OPEN' && brace.kind === '{'
      ) {
        const name = nameTok.value
        i += 5
        let depth = 1
        const bodyTokens: Token[] = []
        while (++i < sig.length && depth > 0) {
          const bt = sig[i]
          if (bt.type === 'CONTAINER_OPEN' && bt.kind === '{') depth++
          else if (bt.type === 'CONTAINER_CLOSE' && bt.kind === '}') { depth--; if (depth === 0) break }
          bodyTokens.push(bt)
        }
        const include: string[] = []
        let combine = ''
        let grounding = ''
        for (let j = 0; j < bodyTokens.length; j++) {
          const key = bodyTokens[j]
          if (key?.type !== 'IDENTIFIER') continue
          const colon = bodyTokens[j + 1]
          if (colon?.type !== 'COLON') continue
          const val = bodyTokens[j + 2]
          if (!val) continue
          if (key.value === 'include' && val.type === 'CONTAINER_OPEN' && val.kind === '[') {
            let k = j + 3
            while (k < bodyTokens.length && !(bodyTokens[k]?.type === 'CONTAINER_CLOSE' && bodyTokens[k]?.kind === ']')) {
              const item = bodyTokens[k]
              if (item?.type === 'IDENTIFIER' || item?.type === 'STRING') {
                include.push(item.value.replace(/^["'`]|["'`]$/g, ''))
              }
              k++
            }
          } else if (key.value === 'combine' && (val.type === 'IDENTIFIER' || val.type === 'STRING')) {
            combine = val.value.replace(/^["'`]|["'`]$/g, '')
          } else if (key.value === 'grounding' && (val.type === 'IDENTIFIER' || val.type === 'STRING')) {
            grounding = val.value.replace(/^["'`]|["'`]$/g, '')
          }
        }
        this.selectorDefs.set(name, { name, include, combine, grounding, file: filePath })
      }
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
      const { tokens } = parse(text)
      const sig = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      for (let i = 0; i < sig.length; i++) {
        // ^projection[name]{
        const tok = sig[i]
        if (tok.type !== 'OPERATOR' || tok.kind !== '^') continue
        const label = sig[i + 1]
        if (label?.type !== 'IDENTIFIER' || label.value !== 'projection') continue
        const open = sig[i + 2]
        const nameTok = sig[i + 3]
        const close = sig[i + 4]
        const brace = sig[i + 5]
        if (
          open?.type === 'CONTAINER_OPEN' && open.kind === '[' &&
          (nameTok?.type === 'IDENTIFIER' || nameTok?.type === 'STRING') &&
          close?.type === 'CONTAINER_CLOSE' && close.kind === ']' &&
          brace?.type === 'CONTAINER_OPEN' && brace.kind === '{'
        ) {
          const name = nameTok.value.replace(/^["'`]|["'`]$/g, '')
          i += 5
          let depth = 1
          const bodyTokens: Token[] = []
          while (++i < sig.length && depth > 0) {
            const bt = sig[i]
            if (bt.type === 'CONTAINER_OPEN' && bt.kind === '{') depth++
            else if (bt.type === 'CONTAINER_CLOSE' && bt.kind === '}') { depth--; if (depth === 0) break }
            bodyTokens.push(bt)
          }
          // Extract key: "value" or key: value fields
          const fields: Record<string, string> = {}
          for (let j = 0; j < bodyTokens.length; j++) {
            const key = bodyTokens[j]
            if (key?.type !== 'IDENTIFIER') continue
            const colon = bodyTokens[j + 1]
            if (colon?.type !== 'COLON') continue
            const val = bodyTokens[j + 2]
            if (!val) continue
            if (val.type === 'STRING') {
              fields[key.value] = val.value.replace(/^["'`]|["'`]$/g, '')
            } else if (val.type === 'IDENTIFIER') {
              fields[key.value] = val.value
            }
          }
          this.projections.push({
            name,
            root: fields.root ?? '',
            source: fields.source ?? '',
            specOwner: fields.spec_owner ?? '',
            generatorOwner: fields.generator_owner ?? '',
            status: fields.status ?? '',
          })
        }
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
    return this.formatRange(text, { ensureFinalNewline: true })
  }

  formatRange(text: string, options: { ensureFinalNewline?: boolean } = {}): string {
    return canonicalize(text, {
      ...DEFAULT_FORMAT_OPTIONS,
      ...options,
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

// ── Token-stream analysis ────────────────────────────────────────
//
// Replaces regex-based extraction. Token stream from seed parser is already
// string-aware, comment-aware, and position-precise (1-indexed → 0-indexed).

interface ScopeContext {
  braids: string[]
  frameName: string | null
}

function annotationKindFromTokens(
  tokens: Token[],
  hashIdx: number,
): { kind: AnnotationKind; name: string; advance: number } | null {
  // tokens is the non-whitespace subsequence; hashIdx points to OPERATOR('#')
  const next = tokens[hashIdx + 1]
  if (!next) return null

  // ##>name — prompt root anchor
  if (next.type === 'OPERATOR' && next.kind === '#') {
    const after = tokens[hashIdx + 2]
    const name = tokens[hashIdx + 3]
    if (after?.type === 'CAPSULE_CLOSE' && name?.type === 'IDENTIFIER') {
      return { kind: 'prompt_root', name: name.value, advance: 3 }
    }
  }

  // #>anchor
  if (next.type === 'CAPSULE_CLOSE' && next.kind === '>') {
    const name = tokens[hashIdx + 2]
    if (name?.type === 'IDENTIFIER') {
      return { kind: 'anchor', name: name.value, advance: 2 }
    }
  }

  // #!intent
  if (next.type === 'OPERATOR' && next.kind === '!') {
    const name = tokens[hashIdx + 2]
    if (name?.type === 'IDENTIFIER') {
      return { kind: 'intent', name: name.value, advance: 2 }
    }
  }

  // #:lens
  if (next.type === 'COLON') {
    const name = tokens[hashIdx + 2]
    if (name?.type === 'IDENTIFIER') {
      return { kind: 'lens', name: name.value, advance: 2 }
    }
  }

  // #topic
  if (next.type === 'IDENTIFIER') {
    return { kind: 'topic', name: next.value, advance: 1 }
  }

  return null
}

function frameNameFromTokens(tokens: Token[]): string | null {
  // tokens is non-whitespace; look for ^["name"] or ^"name" or ^[name]
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.type !== 'OPERATOR' || tok.kind !== '^') continue

    const next = tokens[i + 1]
    if (!next) continue

    if (next.type === 'CONTAINER_OPEN' && next.kind === '[') {
      const label = tokens[i + 2]
      if (label?.type === 'STRING') {
        return label.value.replace(/^["'`]|["'`]$/g, '')
      }
      if (label?.type === 'IDENTIFIER') {
        return label.value
      }
    }

    if (next.type === 'STRING') {
      return next.value.replace(/^["'`]|["'`]$/g, '')
    }
  }
  return null
}

function analyzeDocumentContext(
  filePath: string,
  text: string,
  parseOutput?: ParseOutput | null,
): { annotations: AnnotationEntry[]; frames: FrameEntry[]; lineContexts: DocumentLineContext[] } {
  const output = parseOutput ?? parse(text)
  return analyzeFromTokens(filePath, text, output.tokens)
}

function analyzeFromTokens(
  filePath: string,
  text: string,
  tokens: Token[],
): { annotations: AnnotationEntry[]; frames: FrameEntry[]; lineContexts: DocumentLineContext[] } {
  const lineCount = text.split('\n').length
  const annotations: AnnotationEntry[] = []
  const frames: FrameEntry[] = []
  const lineContexts: DocumentLineContext[] = new Array(lineCount)

  // Group significant tokens by 0-indexed line
  type LineTokens = { sig: Token[]; opens: number; closes: number }
  const byLine = new Map<number, LineTokens>()

  for (const tok of tokens) {
    if (tok.type === 'WHITESPACE' || tok.type === 'EOF') continue
    const line = tok.span.start.line - 1 // 1-indexed → 0-indexed
    if (line < 0) continue
    let entry = byLine.get(line)
    if (!entry) {
      entry = { sig: [], opens: 0, closes: 0 }
      byLine.set(line, entry)
    }
    entry.sig.push(tok)
    if (tok.type === 'CONTAINER_OPEN' && tok.kind === '{') entry.opens++
    else if (tok.type === 'CONTAINER_CLOSE' && tok.kind === '}') entry.closes++
  }

  const scopes: ScopeContext[] = [{ braids: [], frameName: null }]

  for (let i = 0; i < lineCount; i++) {
    const entry = byLine.get(i)
    const sig = entry?.sig ?? []

    const frameName = frameNameFromTokens(sig)
    const activeFramePath = scopes.flatMap(s => s.frameName ? [s.frameName] : [])
    const framePath = frameName ? [...activeFramePath, frameName] : activeFramePath
    const ambientBraids = scopes.flatMap(s => s.braids)
    const localBraids: string[] = []

    if (frameName) {
      frames.push({ file: filePath, line: i, name: frameName, framePath })
    }

    // Extract annotations from this line's tokens
    for (let j = 0; j < sig.length; j++) {
      const tok = sig[j]
      // ~#name — produced as ANNOTATION token (value = '~#identifier')
      if (tok.type === 'ANNOTATION') {
        const name = tok.value.startsWith('~#') ? tok.value.slice(2) : tok.value
        localBraids.push(`#${name}`)
        annotations.push({
          file: filePath,
          line: i,
          kind: 'topic',
          name,
          sectionLabel: framePath[framePath.length - 1],
          framePath,
        })
        continue
      }
      if (tok.type !== 'OPERATOR' || tok.kind !== '#') continue
      const result = annotationKindFromTokens(sig, j)
      if (!result) continue
      const prefix = { topic: '#', lens: '#:', intent: '#!', anchor: '#>', prompt_root: '##>' }[result.kind]
      localBraids.push(`${prefix}${result.name}`)
      annotations.push({
        file: filePath,
        line: i,
        kind: result.kind,
        name: result.name,
        sectionLabel: framePath[framePath.length - 1],
        framePath,
      })
      j += result.advance
    }

    lineContexts[i] = {
      framePath,
      ambientBraids,
      localBraids: [...localBraids],
      enteredFrame: frameName,
      deltaBraids: [...localBraids],
    }

    const opens = entry?.opens ?? 0
    const closes = entry?.closes ?? 0

    if (opens > 0) {
      for (let j = 0; j < opens; j++) {
        scopes.push({ braids: j === 0 ? [...localBraids] : [], frameName: j === 0 ? frameName : null })
      }
    } else if (localBraids.length > 0) {
      scopes[scopes.length - 1].braids.push(...localBraids)
    }
    for (let j = 0; j < closes; j++) {
      if (scopes.length > 1) scopes.pop()
    }
  }

  return { annotations, frames, lineContexts }
}

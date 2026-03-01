#!/usr/bin/env tsx
/**
 * Spw LSP Server — stdio transport
 *
 * Full-featured language server for .spw files.
 * Capabilities: definition, documentLink, hover, documentSymbol,
 * workspaceSymbol, completion, codeLens, formatting, diagnostics.
 *
 * Uses ServerIndex for cached parse results, annotation index,
 * concept clusters, and projection graph.
 */

import { promises as fs } from 'node:fs'
import type { Dirent } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { findPathRefAtPosition, selectPathRefs, type SpwSelectorHit } from './spw-selector'
import {
  ServerIndex,
  SIGIL_SEMANTICS,
} from './server-index'

// ── LSP Types ───────────────────────────────────────────────────

interface LspPosition { line: number; character: number }
interface LspRange { start: LspPosition; end: LspPosition }
interface LspLocation { uri: string; range: LspRange }

interface LspDiagnostic {
  range: LspRange
  severity: number // 1=Error 2=Warning 3=Info 4=Hint
  source: string
  message: string
}

interface LspSymbolInfo {
  name: string
  kind: number
  location: LspLocation
  containerName?: string
}

interface LspDocumentSymbol {
  name: string
  detail: string
  kind: number
  range: LspRange
  selectionRange: LspRange
  children?: LspDocumentSymbol[]
}

interface LspCompletionItem {
  label: string
  kind: number
  detail?: string
  insertText?: string
  sortText?: string
}

interface LspCodeLens {
  range: LspRange
  command?: { title: string; command: string; arguments?: any[] }
}

interface LspHover {
  contents: { kind: 'markdown'; value: string }
  range?: LspRange
}

interface LspTextEdit {
  range: LspRange
  newText: string
}

interface LspInlayHint {
  position: LspPosition
  label: string
  kind?: 1 | 2
  tooltip?: string
  paddingLeft?: boolean
  paddingRight?: boolean
}

interface SpwConfig {
  inlayHints?: {
    paths?: boolean
    annotations?: boolean
    frames?: boolean
  }
  diagnostics?: {
    unresolvedRefs?: 'error' | 'warning' | 'hint' | 'off'
    staleProjections?: boolean
  }
  roots?: Record<string, string>
  workspace?: {
    exclude?: string[]
  }
  formatOnSave?: boolean
}

const DEFAULT_CONFIG: Required<SpwConfig> = {
  inlayHints: { paths: true, annotations: true, frames: true },
  diagnostics: { unresolvedRefs: 'warning', staleProjections: true },
  roots: {},
  workspace: { exclude: ['node_modules', '.git', '.claude'] },
  formatOnSave: false,
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: number | string
  method: string
  params?: any
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string | null
  result?: any
  error?: { code: number; message: string; data?: any }
}

type RootMap = Record<string, string>

// ── SymbolKind constants ────────────────────────────────────────

const SK = {
  Module: 2,
  Property: 7,
  Event: 24,
  Boolean: 17,
  Key: 20,
  Enum: 10,
  Interface: 11,
  Variable: 13,
  Struct: 23,
  Folder: 19,
  File: 1,
} as const

// ── CompletionItemKind constants ────────────────────────────────

const CK = {
  Folder: 19,
  File: 17,
  Keyword: 14,
  Reference: 18,
  Field: 5,
} as const

// ── Server state ────────────────────────────────────────────────

const REPO_ROOT = process.cwd()
let WORKSPACE_ROOT = REPO_ROOT
let SHUTDOWN = false
let incoming = Buffer.alloc(0)
let serverIndex: ServerIndex
let CONFIG: Required<SpwConfig> = { ...DEFAULT_CONFIG }

const DIAGNOSTIC_DEBOUNCE = new Map<string, ReturnType<typeof setTimeout>>()
const DIAGNOSTIC_DELAY_MS = 300
const WORKSPACE_FILES_CACHE_TTL_MS = 5_000
let workspaceFilesCache: { at: number; files: string[] } | null = null

// Observable state sidecar — loaded on save, used in $%[metric] hover
let observableState: Record<string, any> | null = null
let observableStateLoadedAt = 0

async function loadObservableState(): Promise<Record<string, any>> {
  const statePath = path.join(WORKSPACE_ROOT, '.spw', 'state', 'observable.json')
  try {
    const text = await fs.readFile(statePath, 'utf8')
    observableState = JSON.parse(text)
    observableStateLoadedAt = Date.now()
    log('observable state loaded')
  } catch {
    // File doesn't exist or is malformed — use empty state
    if (!observableState) observableState = {}
  }
  return observableState!
}

// ── Logging ─────────────────────────────────────────────────────

function log(message: string): void {
  if (!process.env.SPW_LSP_TRACE) return
  process.stderr.write(`[spw-lsp] ${message}\n`)
}

// ── JSON-RPC transport ──────────────────────────────────────────

function send(payload: JsonRpcResponse | JsonRpcRequest): void {
  const body = JSON.stringify(payload)
  const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`
  process.stdout.write(header + body)
}

function sendResult(id: number | string | null, result: any): void {
  send({ jsonrpc: '2.0', id, result })
}

function sendError(id: number | string | null, code: number, message: string, data?: any): void {
  send({ jsonrpc: '2.0', id, error: { code, message, data } })
}

function sendNotification(method: string, params: any): void {
  send({ jsonrpc: '2.0', method, params } as any)
}

// ── URI/path helpers ────────────────────────────────────────────

function pathFromUri(uri: string): string | null {
  if (!uri.startsWith('file://')) return null
  try { return fileURLToPath(uri) } catch { return null }
}

function uriFromPath(filePath: string): string {
  return pathToFileURL(filePath).toString()
}

async function fileExists(target: string): Promise<boolean> {
  try { await fs.access(target); return true } catch { return false }
}

async function statKind(target: string): Promise<'file' | 'dir' | null> {
  try {
    const stat = await fs.stat(target)
    if (stat.isDirectory()) return 'dir'
    if (stat.isFile()) return 'file'
    return null
  } catch { return null }
}

function parseWorkspaceRoot(params: any): string {
  const rootUri = params?.rootUri
  if (typeof rootUri === 'string' && rootUri.startsWith('file://')) {
    try { return fileURLToPath(rootUri) || WORKSPACE_ROOT } catch { return WORKSPACE_ROOT }
  }
  const folders = Array.isArray(params?.workspaceFolders) ? params.workspaceFolders : []
  const first = folders[0]?.uri
  if (typeof first === 'string' && first.startsWith('file://')) {
    try { return fileURLToPath(first) || WORKSPACE_ROOT } catch { return WORKSPACE_ROOT }
  }
  return WORKSPACE_ROOT
}

// ── Config loading ──────────────────────────────────────────────

async function loadConfig(root: string, initOptions?: any): Promise<Required<SpwConfig>> {
  const base = { ...DEFAULT_CONFIG }

  // 1. Try .spw/config.json
  const configPath = path.join(root, '.spw', 'config.json')
  try {
    const raw = await fs.readFile(configPath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<SpwConfig>
    log(`loaded config from ${configPath}`)
    mergeConfig(base, parsed)
  } catch {
    // No config file — that's fine
  }

  // 2. Overlay client initializationOptions (if any)
  if (initOptions && typeof initOptions === 'object') {
    mergeConfig(base, initOptions as Partial<SpwConfig>)
  }

  return base
}

function mergeConfig(target: Required<SpwConfig>, source: Partial<SpwConfig>): void {
  if (source.inlayHints) {
    target.inlayHints = { ...target.inlayHints, ...source.inlayHints }
  }
  if (source.diagnostics) {
    target.diagnostics = { ...target.diagnostics, ...source.diagnostics }
  }
  if (source.roots) {
    target.roots = { ...target.roots, ...source.roots }
  }
  if (source.workspace) {
    target.workspace = { ...target.workspace, ...source.workspace }
  }
  if (source.formatOnSave !== undefined) {
    target.formatOnSave = source.formatOnSave
  }
}

// ── Root resolution ─────────────────────────────────────────────

function defaultRoots(fileDir: string): RootMap {
  // Static fallback roots (used before workspace scan or when shelves.spw is absent)
  const hardcoded: RootMap = {
    docs: path.join(WORKSPACE_ROOT, 'docs'),
    src: path.join(WORKSPACE_ROOT, 'src'),
    spec: path.join(WORKSPACE_ROOT, 'lib', 'spw-v0.2.0-alpha'),
    lib: path.join(WORKSPACE_ROOT, 'lib'),
    scripts: path.join(WORKSPACE_ROOT, 'scripts'),
    spw: path.join(WORKSPACE_ROOT, '.spw'),
    biome: path.join(WORKSPACE_ROOT, '.spw', 'biome', 'ocean'),
    harness: path.join(WORKSPACE_ROOT, '.spw', 'harness'),
    gen: path.join(WORKSPACE_ROOT, '.spw', 'gen'),
    hot: path.join(WORKSPACE_ROOT, '.spw', 'hot.spw'),
    agents: path.join(WORKSPACE_ROOT, '.agents'),
    plans: path.join(WORKSPACE_ROOT, '.agents', 'plans'),
    state: path.join(WORKSPACE_ROOT, '.agents', 'state'),
    skills: path.join(WORKSPACE_ROOT, '.agents', 'skills'),
    here: fileDir,
    repo: WORKSPACE_ROOT,
  }
  // Overlay with shelf roots parsed from shelves.spw (dynamic, self-describing)
  const shelves = serverIndex.getShelfRoots()
  for (const [name, absPath] of shelves) {
    hardcoded[name] = absPath
  }
  return hardcoded
}

function parseRoots(source: string, fileDir: string): RootMap {
  const roots: RootMap = {}
  const re = /@([A-Za-z0-9_-]+):\s*~"([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) { roots[m[1]] = path.resolve(fileDir, m[2]) }
  return roots
}

function mergeRoots(source: string, fileDir: string): RootMap {
  return { ...defaultRoots(fileDir), ...CONFIG.roots, ...parseRoots(source, fileDir) }
}

async function resolveCandidate(target: string): Promise<string | null> {
  const kind = await statKind(target)
  if (kind === 'file') return target
  if (!path.extname(target) && kind !== 'dir') {
    for (const ext of ['.spw', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.md']) {
      if (await fileExists(`${target}${ext}`)) return `${target}${ext}`
    }
  }
  for (const file of ['index.spw', 'index.ts', 'README.md']) {
    const inDir = path.join(target, file)
    if (await fileExists(inDir)) return inDir
  }
  return null
}

async function resolveReferencePath(
  hit: SpwSelectorHit,
  source: string,
  docPath: string,
  options?: { allowDirectory?: boolean },
): Promise<string | null> {
  const docDir = path.dirname(docPath)
  const roots = mergeRoots(source, docDir)
  const allowDirectory = options?.allowDirectory === true

  if (hit.kind === 'pathRef') {
    if (hit.target.includes('*')) return null

    let cleanTarget = hit.target
    let hash = ''
    const hashIdx = cleanTarget.indexOf('#')
    if (hashIdx >= 0) {
      hash = cleanTarget.slice(hashIdx)
      cleanTarget = cleanTarget.slice(0, hashIdx)
    }

    const target = cleanTarget ? path.resolve(docDir, cleanTarget) : docPath
    const resolved = await resolveCandidate(target)
    if (resolved) return resolved + hash
    if (allowDirectory && await statKind(target) === 'dir') return target + hash
    return null
  }

  const rootName = hit.root ?? ''
  const defaults = defaultRoots(docDir)
  let rootBase = roots[rootName]
  if (rootBase && !await fileExists(rootBase) && defaults[rootName]) {
    rootBase = defaults[rootName]
  }
  if (!rootBase) {
    const direct = path.join(WORKSPACE_ROOT, rootName)
    if (await fileExists(direct)) rootBase = direct
    else {
      const src = path.join(WORKSPACE_ROOT, 'src', rootName)
      rootBase = (await fileExists(src)) ? src : direct
    }
  }
  if (!rootBase || hit.target.includes('*')) return null

  let cleanTarget = hit.target
  let hash = ''
  const hashIdx = cleanTarget.indexOf('#')
  if (hashIdx >= 0) {
    hash = cleanTarget.slice(hashIdx)
    cleanTarget = cleanTarget.slice(0, hashIdx)
  }

  const target = cleanTarget ? path.resolve(rootBase, cleanTarget) : docPath
  const resolved = await resolveCandidate(target)
  if (resolved) return resolved + hash
  if (allowDirectory && await statKind(target) === 'dir') return target + hash
  return null
}

async function collectWorkspaceSpwFiles(dir: string, out: string[]): Promise<void> {
  let entries: Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }

  const excluded = new Set(CONFIG.workspace.exclude ?? [])
  excluded.delete('.spw')

  for (const entry of entries) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (excluded.has(entry.name)) continue
      await collectWorkspaceSpwFiles(target, out)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.spw')) out.push(target)
  }
}

async function getWorkspaceSpwFiles(): Promise<string[]> {
  const now = Date.now()
  if (workspaceFilesCache && now - workspaceFilesCache.at < WORKSPACE_FILES_CACHE_TTL_MS) {
    return workspaceFilesCache.files
  }
  const files: string[] = []
  await collectWorkspaceSpwFiles(WORKSPACE_ROOT, files)
  workspaceFilesCache = { at: now, files }
  return files
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor
      cursor += 1
      if (i >= items.length) return
      out[i] = await mapper(items[i])
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => worker())
  await Promise.all(workers)
  return out
}

function stripAnchor(target: string): string {
  const hashIdx = target.indexOf('#')
  return hashIdx >= 0 ? target.slice(0, hashIdx) : target
}

function normalizeRelPath(value: string): string {
  const rel = value.replace(/\\/g, '/')
  if (!rel) return './'
  if (rel.startsWith('.')) return rel
  return `./${rel}`
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const rows = a.length + 1
  const cols = b.length + 1
  const dp: number[] = new Array(rows * cols).fill(0)
  const at = (r: number, c: number) => r * cols + c

  for (let r = 0; r < rows; r += 1) dp[at(r, 0)] = r
  for (let c = 0; c < cols; c += 1) dp[at(0, c)] = c

  for (let r = 1; r < rows; r += 1) {
    for (let c = 1; c < cols; c += 1) {
      const cost = a[r - 1] === b[c - 1] ? 0 : 1
      dp[at(r, c)] = Math.min(
        dp[at(r - 1, c)] + 1,
        dp[at(r, c - 1)] + 1,
        dp[at(r - 1, c - 1)] + cost,
      )
    }
  }

  return dp[at(rows - 1, cols - 1)]
}

function scoreCandidateName(inputName: string, candidateName: string): number {
  const input = inputName.toLowerCase()
  const candidate = candidateName.toLowerCase()
  const inputStem = input.replace(/\.[^.]+$/, '')
  const candidateStem = candidate.replace(/\.[^.]+$/, '')

  let score = 0
  if (input === candidate) score += 100
  if (inputStem === candidateStem) score += 80
  if (candidate.startsWith(input) || input.startsWith(candidate)) score += 45
  if (candidate.includes(input) || input.includes(candidate)) score += 25
  if (input.includes('spw-v') && candidate.includes('spw-v')) score += 20

  const dist = levenshteinDistance(inputStem, candidateStem)
  const maxLen = Math.max(inputStem.length, candidateStem.length, 1)
  const distScore = Math.max(0, 40 - Math.round((dist / maxLen) * 40))
  score += distScore

  return score
}

async function suggestNearbyReference(
  hit: SpwSelectorHit,
  source: string,
  docPath: string,
): Promise<string | null> {
  if (hit.target.includes('*')) return null

  const docDir = path.dirname(docPath)
  const cleanTarget = stripAnchor(hit.target)
  const roots = mergeRoots(source, docDir)

  let searchBase: string
  let toRefText: (absolute: string) => string

  if (hit.kind === 'pathRef') {
    searchBase = cleanTarget ? path.resolve(docDir, cleanTarget) : docPath
    toRefText = (absolute) => normalizeRelPath(path.relative(docDir, absolute))
  } else {
    const rootName = hit.root ?? ''
    const defaults = defaultRoots(docDir)
    let rootBase = roots[rootName]
    if (rootBase && !await fileExists(rootBase) && defaults[rootName]) {
      rootBase = defaults[rootName]
    }
    if (!rootBase) {
      const direct = path.join(WORKSPACE_ROOT, rootName)
      if (await fileExists(direct)) rootBase = direct
      else {
        const src = path.join(WORKSPACE_ROOT, 'src', rootName)
        rootBase = (await fileExists(src)) ? src : direct
      }
    }
    if (!rootBase) return null
    searchBase = cleanTarget ? path.resolve(rootBase, cleanTarget) : docPath
    toRefText = (absolute) => {
      const rel = path.relative(rootBase, absolute).replace(/\\/g, '/')
      return rel ? `@${rootName}/${rel}` : `@${rootName}/`
    }
  }

  const parent = path.dirname(searchBase)
  const missingName = path.basename(searchBase)
  let entries: Dirent[]
  try {
    entries = await fs.readdir(parent, { withFileTypes: true })
  } catch {
    return null
  }

  if (entries.length === 0) return null

  const versionCandidates = entries.filter((entry) => /^spw-v\d+\.\d+\.\d+-alpha$/i.test(entry.name))
  if (/^spw-v\d+\.\d+\.\d+-alpha$/i.test(missingName) && versionCandidates.length > 0) {
    const sorted = versionCandidates
      .map((entry) => {
        const m = /^spw-v(\d+)\.(\d+)\.(\d+)-alpha$/i.exec(entry.name)
        return { entry, major: Number(m?.[1] ?? 0), minor: Number(m?.[2] ?? 0), patch: Number(m?.[3] ?? 0) }
      })
      .sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch)
    const best = sorted[0]?.entry
    if (best) {
      const absolute = path.join(parent, best.name)
      return toRefText(absolute)
    }
  }

  const scored = entries
    .map((entry) => {
      const score = scoreCandidateName(missingName, entry.name)
      return { entry, score }
    })
    .sort((a, b) => b.score - a.score)

  const top = scored[0]
  if (!top || top.score < 45) return null

  return toRefText(path.join(parent, top.entry.name))
}

// ── Document text helper ────────────────────────────────────────

async function getDocumentText(uri: string): Promise<string | null> {
  const doc = serverIndex.getDocument(uri)
  if (doc) return doc.text
  const filePath = pathFromUri(uri)
  return serverIndex.getDocumentText(uri, filePath)
}

// ── Diagnostics ─────────────────────────────────────────────────

async function publishDiagnostics(uri: string): Promise<void> {
  const doc = serverIndex.getDocument(uri)
  if (!doc) return

  const diagnostics: LspDiagnostic[] = []

  // 1. Parse errors
  const pr = doc.parseResult
  if (pr && !pr.success) {
    for (const err of pr.errors) {
      const line = Math.max(0, err.position.line - 1) // 1-indexed → 0-indexed
      const col = Math.max(0, err.position.column - 1)
      diagnostics.push({
        range: { start: { line, character: col }, end: { line, character: col + 1 } },
        severity: 1,
        source: 'spw',
        message: err.rule ? `${err.rule}: parse error` : 'parse error',
      })
    }

    if (pr.error) {
      const msg = pr.error.message || 'unexpected parse failure'
      const expected = pr.error.expected?.length ? ` (expected: ${pr.error.expected.join(', ')})` : ''
      const found = pr.error.found ? ` (found: ${pr.error.found})` : ''
      // Attach to first error line or line 0
      const line = pr.errors[0] ? Math.max(0, pr.errors[0].position.line - 1) : 0
      diagnostics.push({
        range: { start: { line, character: 0 }, end: { line, character: 1 } },
        severity: 1,
        source: 'spw',
        message: `${msg}${expected}${found}`,
      })
    }
  }

  // 2. Broken refs
  const refSeverity = CONFIG.diagnostics.unresolvedRefs
  if (refSeverity !== 'off') {
    const severityMap: Record<string, number> = { error: 1, warning: 2, hint: 4 }
    const severity = severityMap[refSeverity ?? 'warning'] ?? 2
    const docPath = doc.filePath
    const source = doc.text
    for (const hit of doc.selectorHits) {
      const resolved = await resolveReferencePath(hit, source, docPath, { allowDirectory: true })
      if (resolved) continue

      const target = hit.kind === 'pathRef' ? hit.target : `@${hit.root}/${hit.target}`
      diagnostics.push({
        range: {
          start: { line: hit.span.startLine, character: hit.span.startCharacter },
          end: { line: hit.span.endLine, character: hit.span.endCharacter },
        },
        severity,
        source: 'spw',
        message: `unresolved reference: ${target}`,
      })
    }
  }

  // 3. Stale projections
  if (CONFIG.diagnostics.staleProjections) {
    const docPath2 = doc.filePath
    const projections = serverIndex.getProjectionsFromSpecOwner(docPath2)
    for (const proj of projections) {
      const genPath = path.resolve(WORKSPACE_ROOT, proj.root.replace(/^\.\//, '').replace(/\/$/, ''))
      try {
        const specStat = await fs.stat(docPath2)
        const genStat = await fs.stat(genPath)
        if (specStat.mtimeMs > genStat.mtimeMs) {
          diagnostics.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            severity: 3,
            source: 'spw',
            message: `projection "${proj.name}" may be stale (spec changed since last generation)`,
          })
        }
      } catch {
        // generated file doesn't exist — that's ok
      }
    }
  }

  // 4. Brace physics — depth budget
  {
    const lines = doc.text.split('\n')
    let depth = 0
    let maxDepthLine = -1
    let maxDepth = 0
    for (let i = 0; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') depth++
        else if (ch === '}') depth = Math.max(0, depth - 1)
      }
      if (depth > maxDepth) {
        maxDepth = depth
        maxDepthLine = i
      }
    }
    if (maxDepth >= 5 && maxDepthLine >= 0) {
      diagnostics.push({
        range: { start: { line: maxDepthLine, character: 0 }, end: { line: maxDepthLine, character: 1 } },
        severity: 4, // Hint
        source: 'spw-physics',
        message: `Nesting depth ${maxDepth} exceeds budget (4). Consider extracting a named sub-frame.`,
      })
    }
  }

  // 5. Brace physics — valence composition
  {
    const text = doc.text
    const frameRe = /\^(?:\["([^"]+)"\]|"([^"]+)"|'([^']+)')\s*\{/g
    let frameMatch: RegExpExecArray | null
    while ((frameMatch = frameRe.exec(text)) !== null) {
      const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3]
      const braceStart = text.indexOf('{', frameMatch.index + frameMatch[0].length - 1)
      if (braceStart < 0) continue

      // Find the matching close brace
      let depth = 1
      let blockEnd = braceStart + 1
      for (; blockEnd < text.length && depth > 0; blockEnd++) {
        if (text[blockEnd] === '{') depth++
        else if (text[blockEnd] === '}') depth--
      }

      const block = text.slice(braceStart, blockEnd)
      const hasBoon = /!boon\b/.test(block)
      const hasBane = /!bane\b/.test(block)

      if (hasBoon && hasBane) {
        // Find the line number of the frame declaration
        const lineNo = text.slice(0, frameMatch.index).split('\n').length - 1
        diagnostics.push({
          range: { start: { line: lineNo, character: 0 }, end: { line: lineNo, character: frameMatch[0].length } },
          severity: 4, // Hint
          source: 'spw-physics',
          message: `Frame "${frameName}" holds mixed valence (!boon + !bane) — intentional tension?`,
        })
      }
    }
  }

  sendNotification('textDocument/publishDiagnostics', { uri, diagnostics })
}

function debounceDiagnostics(uri: string): void {
  const existing = DIAGNOSTIC_DEBOUNCE.get(uri)
  if (existing) clearTimeout(existing)
  DIAGNOSTIC_DEBOUNCE.set(uri, setTimeout(() => {
    DIAGNOSTIC_DEBOUNCE.delete(uri)
    void publishDiagnostics(uri)
  }, DIAGNOSTIC_DELAY_MS))
}

// ── Hover ───────────────────────────────────────────────────────

async function hover(params: any): Promise<LspHover | null> {
  const uri = params?.textDocument?.uri
  const pos = params?.position as LspPosition | undefined
  if (!uri || !pos) return null

  const source = await getDocumentText(uri)
  if (source === null) return null

  const line = source.split('\n')[pos.line] ?? ''
  const charAtPos = line[pos.character]

  // 1. Annotation hover: #word, #:word, #!word, #>word
  const annotRe = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g
  let annotMatch: RegExpExecArray | null
  while ((annotMatch = annotRe.exec(line)) !== null) {
    const start = annotMatch.index
    const end = start + annotMatch[0].length
    if (pos.character < start || pos.character >= end) continue

    const prefix = annotMatch[1] || ''
    const name = annotMatch[2]
    const kindLabel: Record<string, string> = { '': 'topic', ':': 'lens', '!': 'intent', '>': 'anchor' }
    const kind = kindLabel[prefix] || 'topic'
    const entries = serverIndex.lookupAnnotation(name)
    const fileCount = new Set(entries.map(e => e.file)).size
    const coOccurs = serverIndex.topCoOccurrences(name, 5)

    let md = `**#${prefix}${name}** \u2014 *${kind}*\n\n`
    md += `**${fileCount}** file(s), **${entries.length}** occurrence(s)\n\n`

    if (coOccurs.length > 0) {
      md += `Co-occurs with: ${coOccurs.map(c => `\`#${c.name}\` (${c.count}\u00d7)`).join(', ')}\n\n`
    }

    const seen = new Set<string>()
    for (const entry of entries) {
      const rel = path.relative(WORKSPACE_ROOT, entry.file)
      if (seen.has(rel) || seen.size >= 5) continue
      seen.add(rel)
      md += `- \`${rel}\`:${entry.line + 1}${entry.sectionLabel ? ` (${entry.sectionLabel})` : ''}\n`
    }
    if (fileCount > 5) md += `- *...and ${fileCount - 5} more*\n`

    return {
      contents: { kind: 'markdown', value: md },
      range: { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } },
    }
  }

  // 2. Frame hover: ^["name"] or ^"name" or ^[name]
  const frameRe = /\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/
  const frameMatch = line.match(frameRe)
  if (frameMatch) {
    const frameStart = line.indexOf(frameMatch[0])
    const frameEnd = frameStart + frameMatch[0].length
    if (pos.character >= frameStart && pos.character < frameEnd) {
      const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3]
      const docPath = pathFromUri(uri)
      const fileAnnotations = docPath ? serverIndex.annotationsForFile(docPath) : []
      const inSection = fileAnnotations.filter(e => e.sectionLabel === frameName)

      // Count operators in this frame's block
      let opCounts = ''
      const blockStart = source.indexOf('{', source.indexOf(frameMatch[0]))
      if (blockStart >= 0) {
        const ops: Record<string, number> = {}
        let depth = 1
        for (let i = blockStart + 1; i < source.length && depth > 0; i += 1) {
          if (source[i] === '{') depth += 1
          else if (source[i] === '}') depth -= 1
          else if (depth === 1 && SIGIL_SEMANTICS[source[i]]) {
            ops[source[i]] = (ops[source[i]] ?? 0) + 1
          }
        }
        const sorted = Object.entries(ops).sort((a, b) => b[1] - a[1]).slice(0, 6)
        if (sorted.length > 0) {
          opCounts = sorted.map(([op, n]) => `\`${op}\` (${n}\u00d7)`).join(', ')
        }
      }

      const cacheTier = docPath ? serverIndex.getCacheTierForFile(docPath) : 'warm'
      const projections = docPath ? serverIndex.getProjectionsFromSpecOwner(docPath) : []

      let md = `**^["${frameName}"]** \u2014 *frame*\n\n`
      if (inSection.length > 0) {
        const prefixByKind: Record<string, string> = { topic: '#', lens: '#:', intent: '#!', anchor: '#>' }
        md += 'Annotations: ' + inSection.map(e => `\`${prefixByKind[e.kind]}${e.name}\``).join(', ') + '\n\n'
      }
      if (opCounts) md += `Operators: ${opCounts}\n\n`
      md += `Cache tier: ${cacheTier}\n`
      if (projections.length > 0) {
        md += `\nProjects to: ${projections.map(p => `\`${p.root}\``).join(', ')}\n`
      }

      return {
        contents: { kind: 'markdown', value: md },
        range: { start: { line: pos.line, character: frameStart }, end: { line: pos.line, character: frameEnd } },
      }
    }
  }

  // 3. Selector name hover (e.g. refs_navigable, probes_active)
  const selectorRe = /\b([a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+)\b/g
  let selMatch: RegExpExecArray | null
  while ((selMatch = selectorRe.exec(line)) !== null) {
    const start = selMatch.index
    const end = start + selMatch[0].length
    if (pos.character < start || pos.character >= end) continue

    const selectorDef = serverIndex.getSelectorDef(selMatch[1])
    if (!selectorDef) continue

    let md = `**${selectorDef.name}** \u2014 *selector*\n\n`
    md += `| | |\n|:--|:--|\n`
    md += `| **Include** | ${selectorDef.include.join(', ')} |\n`
    md += `| **Combine** | ${selectorDef.combine} |\n`
    md += `| **Grounding** | ${selectorDef.grounding} |\n`
    md += `| **Defined in** | \`${path.relative(WORKSPACE_ROOT, selectorDef.file)}\` |\n`

    return {
      contents: { kind: 'markdown', value: md },
      range: { start: { line: pos.line, character: start }, end: { line: pos.line, character: end } },
    }
  }

  // 4. Wonder block hover: ?["..."] shows full wonder with depth axis + probe
  const wonderRe = /\?\["([^"]+)"\]/
  const wonderMatch = line.match(wonderRe)
  if (wonderMatch) {
    const wStart = line.indexOf(wonderMatch[0])
    const wEnd = wStart + wonderMatch[0].length
    if (pos.character >= wStart && pos.character < wEnd) {
      const questionText = wonderMatch[1]
      // Collect the wonder block body (lines following this one that are indented or braced)
      const allLines = source.split('\n')
      const bodyLines: string[] = []
      let braceDepth = 0
      const openBrace = line.includes('{')
      if (openBrace) braceDepth = 1
      for (let j = pos.line + 1; j < allLines.length && j < pos.line + 12; j++) {
        const bl = allLines[j]
        if (openBrace) {
          for (const ch of bl) {
            if (ch === '{') braceDepth++
            else if (ch === '}') braceDepth--
          }
          bodyLines.push(bl)
          if (braceDepth <= 0) break
        } else {
          if (bl.startsWith('  ') || bl.trim() === '') bodyLines.push(bl)
          else break
        }
      }

      // Extract depth axis and lens from body
      const depthLine = bodyLines.find(l => l.includes('#:depth'))
      const depthMatch = depthLine?.match(/#!([a-z]+)/)
      const lensMatch = depthLine?.match(/\/\/\s*lens:\s*(.+)/)
      const probeLine = bodyLines.find(l => l.includes('!probe{'))
      const probeMatch = probeLine?.match(/!probe\{\s*"([^"]+)"\s*\}/)
      const metricLine = bodyLines.find(l => l.includes('$%['))
      const metricMatch = metricLine?.match(/\$%\[([^\]]+)\]/)

      let md = `**\u2753 Wonder**\n\n`
      md += `> ${questionText}\n\n`
      if (depthMatch) md += `**Depth axis:** ${depthMatch[1]}`
      if (lensMatch) md += ` · **Lens:** ${lensMatch[1].trim()}`
      if (depthMatch || lensMatch) md += '\n\n'
      if (metricMatch) md += `**Metrics:** \`$%[${metricMatch[1]}]\`\n\n`
      if (probeMatch) md += `**Probe:** ${probeMatch[1]}\n`

      return {
        contents: { kind: 'markdown', value: md },
        range: { start: { line: pos.line, character: wStart }, end: { line: pos.line, character: wEnd } },
      }
    }
  }

  // 5. Layer hover: #:layer #!grammar shows layer description
  const layerRe = /#:layer\s+#!([a-z]+)/
  const layerMatch = line.match(layerRe)
  if (layerMatch) {
    const lStart = line.indexOf(layerMatch[0])
    const lEnd = lStart + layerMatch[0].length
    if (pos.character >= lStart && pos.character < lEnd) {
      const layerName = layerMatch[1]
      const layerDesc: Record<string, string> = {
        grammar: 'Defines parse-time rules, token shapes, and structural invariants. Files in this layer are the language\'s skeleton.',
        semantics: 'Maps structure to meaning — claims, theories, proofs. Files in this layer carry falsifiable propositions.',
        pragmatics: 'Shapes developer workflow, conventions, tooling. Files in this layer orient attention and reduce friction.',
      }
      // Count files in this layer across workspace
      const allAnnotations = serverIndex.allAnnotations()
      const layerCount = new Set(
        allAnnotations.filter(a => a.name === layerName && a.kind === 'intent').map(a => a.file)
      ).size

      let md = `**#:layer #!${layerName}** — *kernel layer*\n\n`
      md += `${layerDesc[layerName] || 'Custom layer.'}\n\n`
      md += `**${layerCount}** file(s) in this layer across the workspace.\n`

      return {
        contents: { kind: 'markdown', value: md },
        range: { start: { line: pos.line, character: lStart }, end: { line: pos.line, character: lEnd } },
      }
    }
  }

  // 6. Metric hover: $%[metric] shows description
  const metricHoverRe = /\$%\[([^\]]+)\]/
  const metricHoverMatch = line.match(metricHoverRe)
  if (metricHoverMatch) {
    const mStart = line.indexOf(metricHoverMatch[0])
    const mEnd = mStart + metricHoverMatch[0].length
    if (pos.character >= mStart && pos.character < mEnd) {
      const metrics = metricHoverMatch[1].split(',').map(m => m.trim())
      const metricDescs: Record<string, string> = {
        'file.frame_count': 'Number of ^-frames in this file',
        'file.annotation_density': 'Annotations per line (higher = more semantic richness)',
        'file.brace_depth_max': 'Maximum nesting depth of braces',
        'cache.tier': 'Cache temperature tier (hot/warm/cold)',
        'cache.hit_ms': 'Average cache hit latency in milliseconds',
        'cache.hit_ratio': 'Ratio of cache hits to total lookups',
        'registry.entry_count': 'Number of entries in this registry',
        'registry.referrer_count': 'Files that reference this registry',
        'harness.run_count': 'Total probe/eval runs executed',
        'harness.pass_rate': 'Ratio of passing probes to total',
        'runtime.stage': 'Current runtime pipeline stage',
        'runtime.latency_ms': 'End-to-end pipeline latency',
        'lsp.request_count': 'LSP requests served since start',
        'lsp.avg_response_ms': 'Average response time in ms',
        'phase.index': 'Current spirit phase (0-5)',
        'phase.duration_ms': 'Time spent in current phase',
      }

      let md = `**\`$%[${metricHoverMatch[1]}]\`** — *measurement point*\n\n`

      // Try to show live values from observable.json
      const state = observableState || {}
      let hasLive = false

      for (const m of metrics) {
        const desc = metricDescs[m] || `Runtime-bindable metric: ${m}`
        const liveValue = state[m]
        if (liveValue !== undefined && liveValue !== null) {
          md += `- **${m}**: \`${liveValue}\` — ${desc}\n`
          hasLive = true
        } else {
          md += `- **${m}**: ${desc}\n`
        }
      }

      if (hasLive) {
        md += `\n*Live values from \`.spw/state/observable.json\` (refreshed on save).*\n`
      } else {
        md += `\n*No live values — populate \`.spw/state/observable.json\` to bind.*\n`
      }

      return {
        contents: { kind: 'markdown', value: md },
        range: { start: { line: pos.line, character: mStart }, end: { line: pos.line, character: mEnd } },
      }
    }
  }

  // 7. Sigil hover with spirit sequence context
  if (charAtPos && SIGIL_SEMANTICS[charAtPos]) {
    const sem = SIGIL_SEMANTICS[charAtPos]

    let md = `**\`${charAtPos}\`** \u2014 *${sem.role}*\n\n`
    md += `Physics: ${sem.physics}\n\n`
    md += `Phase: ${sem.phase}\n\n`
    md += `Tuning: ${sem.tuning}\n`
    if (sem.phaseIndex >= 0) {
      md += `\nSpirit sequence: ${serverIndex.getSpiritSequence()}\n`
      md += `Active phase: ${sem.phaseIndex + 1}\n`
    }

    return {
      contents: { kind: 'markdown', value: md },
      range: { start: { line: pos.line, character: pos.character }, end: { line: pos.line, character: pos.character + 1 } },
    }
  }

  // 5. Symmetry hover
  const symRe = /(?:\{sym:(D4|Z4)\}|#\[(D4|Z4)\])/
  const symMatch = line.match(symRe)
  if (symMatch) {
    const symStart = line.indexOf(symMatch[0])
    const symEnd = symStart + symMatch[0].length
    if (pos.character >= symStart && pos.character < symEnd) {
      const group = symMatch[1] || symMatch[2]
      let md = `**${group} Symmetry** \u2014 *geometry*\n\n`
      if (group === 'D4') {
        md += `Dihedral group of order 8. Applies 8 geometric transformations (4 rotations, 4 reflections).\n\n`
        md += `- **Mirrors** \`.left\` \u2194 \`.right\`\n`
        md += `- **Register updates** reflect automatically.\n`
      } else if (group === 'Z4') {
        md += `Cyclic group of order 4. Applies 4 rotational states (0\u21921\u21922\u21923\u21920).\n\n`
        md += `- **Cycles** through clock-like evolution.\n`
      }
      return {
        contents: { kind: 'markdown', value: md },
        range: { start: { line: pos.line, character: symStart }, end: { line: pos.line, character: symEnd } }
      }
    }
  }

  // 6. @root hover
  const rootRe = /@([A-Za-z_][A-Za-z0-9_]*)/g
  let rootMatch: RegExpExecArray | null
  while ((rootMatch = rootRe.exec(line)) !== null) {
    const rootStart = rootMatch.index
    const rootEnd = rootStart + rootMatch[0].length
    if (pos.character < rootStart || pos.character > rootEnd) continue

    const rootName = rootMatch[1]
    const docPath = pathFromUri(uri)
    const roots = mergeRoots(source, path.dirname(docPath || WORKSPACE_ROOT))
    const resolved = roots[rootName]
    if (resolved) {
      const rel = path.relative(WORKSPACE_ROOT, resolved)
      const annotationsUnder = serverIndex.allAnnotations().filter(e =>
        e.file.startsWith(resolved) || e.file.includes(`/${rootName}/`)
      )
      const uniqueFiles = new Set(annotationsUnder.map(e => e.file))
      const lenses = [...new Set(annotationsUnder.filter(e => e.kind === 'lens').map(e => e.name))]

      let md = `**\`@${rootName}\`** \u2192 \`${rel}\`\n\n`
      md += `**${uniqueFiles.size}** file(s), **${annotationsUnder.length}** annotation(s)\n\n`
      if (lenses.length > 0) {
        md += `Lenses: ${lenses.slice(0, 8).map(l => `\`#:${l}\``).join(', ')}\n`
      }

      return {
        contents: { kind: 'markdown', value: md },
        range: { start: { line: pos.line, character: rootStart }, end: { line: pos.line, character: rootEnd } },
      }
    }
  }

  // 7. Path peek
  const doc = serverIndex.getDocument(uri)
  if (doc) {
    const hit = findPathRefAtPosition(doc.selectorHits, pos.line, pos.character)
    if (hit) {
      const docPath = pathFromUri(uri)
      if (docPath) {
        const resolved = await resolveReferencePath(hit, source, docPath, { allowDirectory: true })
        if (resolved) {
          try {
            const resolvedKind = await statKind(resolved)
            const rel = path.relative(WORKSPACE_ROOT, resolved)
            if (resolvedKind === 'dir') {
              const entries = await fs.readdir(resolved, { withFileTypes: true })
              const visible = entries.filter((entry) => !entry.name.startsWith('.'))
              const preview = visible.slice(0, 8)
              const rendered = preview
                .map((entry) => `- ${entry.isDirectory() ? '[dir]' : '[file]'} \`${entry.name}${entry.isDirectory() ? '/' : ''}\``)
                .join('\n')

              let md = `→ \`${rel}/\`\n\n`
              md += `Directory reference (${visible.length} entry${visible.length === 1 ? '' : 'ies'})`
              if (rendered) md += `\n\n${rendered}`
              if (visible.length > preview.length) md += `\n- ...and ${visible.length - preview.length} more`

              return {
                contents: { kind: 'markdown', value: md },
                range: {
                  start: { line: hit.span.startLine, character: hit.span.startCharacter },
                  end: { line: hit.span.endLine, character: hit.span.endCharacter },
                },
              }
            }

            const fileText = await fs.readFile(resolved, 'utf8')
            const lines = fileText.split('\n').slice(0, 10)
            const subroot = serverIndex.getSubrootForFile(resolved) || 'workspace'
            const tier = serverIndex.getCacheTierForFile(resolved)
            const fileAnnotations = serverIndex.annotationsForFile(resolved)
            const kinds = new Map<string, number>()
            for (const a of fileAnnotations) kinds.set(a.kind, (kinds.get(a.kind) ?? 0) + 1)
            const kindSummary = [...kinds.entries()].map(([k, n]) => `${n} ${k}`).join(', ')

            const plane = serverIndex.getWorkspacePlaneForFile(resolved)
            const category = serverIndex.getCategoryForFile(resolved)
            const isGenerated = serverIndex.isGeneratedFile(resolved)

            let md = `\u2192 \`${rel}\`\n\n`
            const metaParts: string[] = [`Subroot: ${subroot}`, `Cache: ${tier}`]
            if (plane) metaParts.push(`Plane: ${plane}`)
            if (category) metaParts.push(`Category: ${category}`)
            if (isGenerated) metaParts.push('**generated**')
            md += metaParts.join(' | ')
            if (kindSummary) md += ` | Annotations: ${kindSummary}`
            md += '\n\n```spw\n' + lines.join('\n')
            if (fileText.split('\n').length > 10) md += '\n...'
            md += '\n```\n'

            return {
              contents: { kind: 'markdown', value: md },
              range: {
                start: { line: hit.span.startLine, character: hit.span.startCharacter },
                end: { line: hit.span.endLine, character: hit.span.endCharacter },
              },
            }
          } catch {
            // file unreadable
          }
        }
      }
    }
  }

  return null
}

// ── Definition ──────────────────────────────────────────────────

async function definition(params: any): Promise<LspLocation[] | null> {
  const uri = params?.textDocument?.uri
  const position = params?.position as LspPosition | undefined
  if (!uri || !position) return null

  const source = await getDocumentText(uri)
  if (source === null) return null
  const docPath = pathFromUri(uri)
  if (!docPath) return null

  const doc = serverIndex.getDocument(uri)
  const hits = doc?.selectorHits ?? selectPathRefs(source)
  const hit = findPathRefAtPosition(hits, position.line, position.character)
  if (!hit) return null

  const resolved = await resolveReferencePath(hit, source, docPath, { allowDirectory: true })
  if (!resolved) return null

  return [{
    uri: uriFromPath(resolved),
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  }]
}

// ── Document Links ──────────────────────────────────────────────

async function documentLinks(params: any): Promise<Array<{ range: LspRange; target: string }>> {
  const uri = params?.textDocument?.uri
  if (!uri) return []

  const source = await getDocumentText(uri)
  if (source === null) return []
  const docPath = pathFromUri(uri)
  if (!docPath) return []

  const doc = serverIndex.getDocument(uri)
  const hits = doc?.selectorHits ?? selectPathRefs(source)
  const links: Array<{ range: LspRange; target: string }> = []

  for (const hit of hits) {
    const resolved = await resolveReferencePath(hit, source, docPath, { allowDirectory: true })
    if (!resolved) continue
    links.push({
      range: {
        start: { line: hit.span.startLine, character: hit.span.startCharacter },
        end: { line: hit.span.endLine, character: hit.span.endCharacter },
      },
      target: uriFromPath(resolved),
    })
  }

  return links
}

// ── Document Symbols ────────────────────────────────────────────

function documentSymbols(params: any): LspDocumentSymbol[] {
  const uri = params?.textDocument?.uri
  if (!uri) return []

  const doc = serverIndex.getDocument(uri)
  if (!doc) return []
  const lines = doc.text.split('\n')

  const symbols: LspDocumentSymbol[] = []
  const stack: Array<{ indent: number; symbol: LspDocumentSymbol }> = []

  const tapRe = /^(\s*)\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/
  const injectRe = /^(\s*)!(?:boon|bone|bane|bonk|honk)?\["([^"]+)"\]/
  const probeRe = /^(\s*)\?\["([^"]+)"\]/
  const configRe = /^(\s*)=([a-zA-Z_]\w*):/
  const annotRe = /^(\s*)#(!|:|>)?([a-zA-Z_]\w*)/

  function addSymbol(sym: LspDocumentSymbol, indent: number): void {
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
    if (stack.length > 0) {
      const parent = stack[stack.length - 1].symbol
      if (!parent.children) parent.children = []
      parent.children.push(sym)
    } else {
      symbols.push(sym)
    }
    stack.push({ indent, symbol: sym })
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const lr = { start: { line: i, character: 0 }, end: { line: i, character: line.length } }

    const tap = tapRe.exec(line)
    if (tap) {
      const indent = tap[1].length
      const name = tap[2] || tap[3] || tap[4]
      const sr = { start: { line: i, character: tap.index }, end: { line: i, character: tap.index + tap[0].length } }
      addSymbol({ name, detail: 'frame', kind: SK.Module, range: lr, selectionRange: sr }, indent)
      continue
    }

    const inject = injectRe.exec(line)
    if (inject) {
      const indent = inject[1].length
      const sr = { start: { line: i, character: inject.index }, end: { line: i, character: inject.index + inject[0].length } }
      addSymbol({ name: inject[2], detail: 'facet', kind: SK.Event, range: lr, selectionRange: sr }, indent)
      continue
    }

    const probe = probeRe.exec(line)
    if (probe) {
      const indent = probe[1].length
      const sr = { start: { line: i, character: probe.index }, end: { line: i, character: probe.index + probe[0].length } }
      addSymbol({ name: `? ${probe[2]}`, detail: 'probe', kind: SK.Boolean, range: lr, selectionRange: sr }, indent)
      continue
    }

    const config = configRe.exec(line)
    if (config) {
      const indent = config[1].length
      const sr = { start: { line: i, character: config.index }, end: { line: i, character: config.index + config[0].length } }
      addSymbol({ name: `= ${config[2]}`, detail: 'config', kind: SK.Property, range: lr, selectionRange: sr }, indent)
      continue
    }

    const annot = annotRe.exec(line)
    if (annot) {
      const indent = annot[1].length
      const prefix = annot[2] || ''
      const name = annot[3]
      const kindLabel: Record<string, { kind: number; detail: string }> = {
        '': { kind: SK.Key, detail: 'topic' },
        ':': { kind: SK.Enum, detail: 'lens' },
        '!': { kind: SK.Event, detail: 'intent' },
        '>': { kind: SK.Interface, detail: 'anchor' },
      }
      const info = kindLabel[prefix] || kindLabel['']
      const sr = { start: { line: i, character: annot.index }, end: { line: i, character: annot.index + annot[0].length } }
      addSymbol({ name: `#${prefix}${name}`, detail: info.detail, kind: info.kind, range: lr, selectionRange: sr }, indent)
      continue
    }

    // Extend parent range
    if (stack.length > 0) {
      stack[stack.length - 1].symbol.range.end = lr.end
    }
  }

  return symbols
}

// ── Workspace Symbols ───────────────────────────────────────────

function workspaceSymbols(params: any): LspSymbolInfo[] {
  const query = (params?.query as string) ?? ''
  if (!query) return []

  const entries = serverIndex.searchAnnotations(query)
  const results: LspSymbolInfo[] = []

  for (const entry of entries.slice(0, 50)) {
    const kindMap: Record<string, number> = { topic: SK.Key, lens: SK.Enum, intent: SK.Event, anchor: SK.Interface }
    const prefixMap: Record<string, string> = { topic: '#', lens: '#:', intent: '#!', anchor: '#>' }
    results.push({
      name: `${prefixMap[entry.kind]}${entry.name}`,
      kind: kindMap[entry.kind] || SK.Key,
      location: {
        uri: uriFromPath(entry.file),
        range: {
          start: { line: entry.line, character: 0 },
          end: { line: entry.line, character: 0 },
        },
      },
      containerName: entry.sectionLabel,
    })
  }

  return results
}

// ── Completion ──────────────────────────────────────────────────

async function completion(params: any): Promise<LspCompletionItem[]> {
  const uri = params?.textDocument?.uri
  const pos = params?.position as LspPosition | undefined
  if (!uri || !pos) return []

  const source = await getDocumentText(uri)
  if (source === null) return []

  const line = source.split('\n')[pos.line] ?? ''
  const prefix = line.slice(0, pos.character)
  const items: LspCompletionItem[] = []

  // 1. @-root completion
  if (prefix.endsWith('@')) {
    const roots = mergeRoots(source, path.dirname(pathFromUri(uri) || WORKSPACE_ROOT))
    for (const [name, resolved] of Object.entries(roots)) {
      if (name === 'here' || name === 'repo') continue
      items.push({
        label: name,
        kind: CK.Folder,
        detail: path.relative(WORKSPACE_ROOT, resolved),
        sortText: `0-${name}`,
      })
    }
    return items
  }

  // 2. Annotation name completion after #, #:, #!, #>
  const annotPrefix = prefix.match(/#(!|:|>)?([a-zA-Z_]\w*)$/)
  if (annotPrefix) {
    const partial = annotPrefix[2].toLowerCase()
    const names = serverIndex.allAnnotationNames()
    for (const name of names) {
      if (!name.toLowerCase().startsWith(partial)) continue
      const entries = serverIndex.lookupAnnotation(name)
      const fileCount = new Set(entries.map(e => e.file)).size
      items.push({
        label: name,
        kind: CK.Reference,
        detail: `${fileCount} file(s)`,
        sortText: `0-${name}`,
      })
    }
    return items
  }

  // 3. Sigil keyword completions (at line start or after whitespace)
  const sigilPrefixMatch = /(?:^|\s)([\^!@&*?~#=%.])$/.exec(prefix)
  if (sigilPrefixMatch) {
    const sigil = sigilPrefixMatch[1]
    const sem = SIGIL_SEMANTICS[sigil]
    if (sem) {
      // Suggest the sigil's primary syntactic forms
      const sigilSnippets: Record<string, Array<{ label: string; insert: string }>> = {
        '^': [
          { label: '^["section"] {', insert: '^["${1:section}"] {\n\t$0\n}' },
          { label: '^seed[name]', insert: '^seed[${1:name}]' },
          { label: '^selector[name]', insert: '^selector[${1:name}]' },
        ],
        '!': [
          { label: '!boon["label"]', insert: '!boon["${1:label}"]' },
          { label: '!bone["label"]', insert: '!bone["${1:label}"]' },
          { label: '!bonk["label"]', insert: '!bonk["${1:label}"]' },
        ],
        '#': [
          { label: '#>anchor', insert: '#>${1:anchor}' },
          { label: '#:lens', insert: '#:${1:lens}' },
          { label: '#!intent', insert: '#!${1:intent}' },
        ],
        '@': [],  // handled by @-root completion above
        '?': [
          { label: '?["question"]', insert: '?["${1:question}"]' },
          { label: '?match', insert: '?match' },
        ],
        '~': [
          { label: '~"path/to/file"', insert: '~"${1:path}"' },
          { label: '~[N]', insert: '~[${1:N}]' },
        ],
        '&': [
          { label: '&[label]', insert: '&[${1:label}]' },
          { label: '&name', insert: '&${1:name}' },
        ],
      }
      const snippets = sigilSnippets[sigil] ?? []
      for (const s of snippets) {
        items.push({
          label: s.label,
          kind: CK.Keyword,
          detail: `${sem.role} — ${sem.physics}`,
          insertText: s.insert,
          sortText: `0-${s.label}`,
        })
      }
      if (snippets.length > 0) return items
    }
  }

  // 4. File-system completion for ~"../" and @root/
  const fsMatch = /(?:~"((?:\.\.?\/)+)|@([A-Za-z_]\w*)\/)([^"]*)$/.exec(prefix)
  if (fsMatch) {
    let searchDir: string | undefined
    if (fsMatch[1]) {
      searchDir = path.resolve(path.dirname(pathFromUri(uri) || ''), fsMatch[1])
    } else if (fsMatch[2]) {
      const roots = mergeRoots(source, path.dirname(pathFromUri(uri) || WORKSPACE_ROOT))
      searchDir = roots[fsMatch[2]]
    }

    if (searchDir) {
      const subPath = fsMatch[3] || ''
      const fullDir = subPath ? path.resolve(searchDir, subPath.replace(/[^/]*$/, '')) : searchDir

      try {
        const entries = await fs.readdir(fullDir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          const isDir = entry.isDirectory()
          items.push({
            label: entry.name,
            kind: isDir ? CK.Folder : CK.File,
            insertText: isDir ? `${entry.name}/` : entry.name,
            sortText: isDir ? `0-${entry.name}` : `1-${entry.name}`,
          })
        }
      } catch {
        // directory unreadable
      }
    }
  }

  return items
}

// ── Code Lens ───────────────────────────────────────────────────

function codeLens(params: any): LspCodeLens[] {
  const uri = params?.textDocument?.uri
  if (!uri) return []

  const doc = serverIndex.getDocument(uri)
  if (!doc) return []

  const docPath = doc.filePath
  const fileAnnotations = serverIndex.annotationsForFile(docPath)
  const lines = doc.text.split('\n')
  const lenses: LspCodeLens[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    // Frame annotation summary
    const frameMatch = line.match(/^\s*\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/)
    if (frameMatch) {
      const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3]
      const inFrame = fileAnnotations.filter(e => e.sectionLabel === frameName)
      if (inFrame.length > 0) {
        const kindCounts = new Map<string, number>()
        for (const entry of inFrame) kindCounts.set(entry.kind, (kindCounts.get(entry.kind) ?? 0) + 1)
        const summary = [...kindCounts.entries()].map(([k, n]) => `${n} ${k}`).join(', ')
        lenses.push({
          range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
          command: { title: `\u25c7 ${summary}`, command: '' },
        })
      }
    }

    // Anchor cross-file refs
    const anchorMatch = line.match(/#>([a-zA-Z_]\w*)/)
    if (anchorMatch) {
      const name = anchorMatch[1]
      const refs = serverIndex.lookupAnnotation(name)
      const otherFiles = refs.filter(e => e.file !== docPath)
      const fileCount = new Set(otherFiles.map(e => e.file)).size
      if (fileCount > 0) {
        lenses.push({
          range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
          command: { title: `\u2197 ${fileCount} file ref(s)`, command: '' },
        })
      }
    }

    // Projection spec owner lens
    const projections = serverIndex.getProjectionsFromSpecOwner(docPath)
    if (i === 0 && projections.length > 0) {
      const names = projections.map(p => p.name).join(', ')
      lenses.push({
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        command: { title: `\u2192 projects: ${names}`, command: '' },
      })
    }
  }

  // Projection target (generated file) lens
  const proj = serverIndex.getProjectionForFile(docPath)
  if (proj) {
    lenses.push({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      command: {
        title: `\u2190 generated from ${path.relative(WORKSPACE_ROOT, path.resolve(WORKSPACE_ROOT, proj.specOwner.replace(/^\.\//, '')))}`,
        command: '',
      },
    })
  }

  // File metrics banner — enriched plane + category + counts
  const plane = serverIndex.getWorkspacePlaneForFile(docPath)
  const category = serverIndex.getCategoryForFile(docPath)
  const isGenerated = serverIndex.isGeneratedFile(docPath)

  // Count file-level metrics
  const frameCount = lines.filter(l => /^\s*\^(?:\["[^"]+"\]|"[^"]+"|\[[A-Za-z_]\w*\])/.test(l)).length
  const annotCount = fileAnnotations.length
  let maxBraceDepth = 0
  { let d = 0; for (const l of lines) { for (const c of l) { if (c === '{') d++; else if (c === '}') d = Math.max(0, d - 1); } if (d > maxBraceDepth) maxBraceDepth = d; } }
  const wonderCount = lines.filter(l => /^\s*#>wonder_/.test(l)).length
  // Operator distribution for the file
  const opDist: Record<string, number> = {}
  for (const l of lines) { for (const c of l) { if ('~?!^%&*='.includes(c)) opDist[c] = (opDist[c] || 0) + 1 } }
  const opSummary = Object.entries(opDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([op, n]) => `${op}:${n}`).join(' ')

  // Layer detection
  const layerLine = lines.find(l => l.includes('#:layer'))
  const layerNameMatch = layerLine?.match(/#!([a-z]+)/)
  const layerLabel = layerNameMatch?.[1]

  if (isGenerated) {
    lenses.unshift({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      command: { title: '\u26a0 generated surface — do not hand-edit', command: '' },
    })
  } else {
    const parts: string[] = []
    if (layerLabel) parts.push(layerLabel)
    else if (plane) parts.push(plane)
    if (category) parts.push(category)
    parts.push(`${frameCount}^`)
    parts.push(`${annotCount}#`)
    parts.push(`d${maxBraceDepth}`)
    if (wonderCount > 0) parts.push(`${wonderCount}\u2753`)
    lenses.unshift({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      command: { title: `\u25c8 ${parts.join(' \u00b7 ')}`, command: '' },
    })
    // Operator distribution lens on line 0
    if (opSummary) {
      lenses.push({
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        command: { title: `\u2261 ${opSummary}`, command: '' },
      })
    }
  }

  return lenses
}

// ── Formatting ──────────────────────────────────────────────────

function formatting(params: any): LspTextEdit[] {
  const uri = params?.textDocument?.uri
  if (!uri) return []

  const doc = serverIndex.getDocument(uri)
  if (!doc) return []

  const formatted = serverIndex.formatDocument(doc.text)
  if (formatted === doc.text) return []

  const lines = doc.text.split('\n')
  return [{
    range: {
      start: { line: 0, character: 0 },
      end: { line: lines.length - 1, character: lines[lines.length - 1].length },
    },
    newText: formatted,
  }]
}

async function inlayHints(params: any): Promise<LspInlayHint[]> {
  const uri = params?.textDocument?.uri
  const range = params?.range as LspRange | undefined
  if (!uri || !range) return []

  const docPath = pathFromUri(uri)
  if (!docPath) return []

  const source = await getDocumentText(uri)
  if (source === null) return []

  const doc = serverIndex.getDocument(uri)
  if (!doc) return []

  const lines = source.split('\n')
  const hints: LspInlayHint[] = []
  const fileAnnotations = serverIndex.annotationsForFile(docPath)

  const frameKindsBySection = new Map<string, Map<string, number>>()
  for (const entry of fileAnnotations) {
    if (!entry.sectionLabel) continue
    const byKind = frameKindsBySection.get(entry.sectionLabel) ?? new Map<string, number>()
    byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1)
    frameKindsBySection.set(entry.sectionLabel, byKind)
  }

  // 1) Path status hints for ~"..." and @root/ references.
  if (CONFIG.inlayHints.paths) {
    // Show both resolved and unresolved refs so missing paths are obvious.
    for (const hit of doc.selectorHits) {
      const sl = hit.span.startLine
      if (sl < range.start.line || sl > range.end.line) continue

      const resolved = await resolveReferencePath(hit, source, docPath, { allowDirectory: true })
      const lineText = lines[hit.span.endLine] ?? ''
      const hintAt = Math.min(hit.span.endCharacter + 1, lineText.length)

      if (!resolved) continue

      const cleanResolved = resolved.replace(/#.*$/, '')
      const rel = path.relative(WORKSPACE_ROOT, cleanResolved)
      const target = hit.kind === 'pathRef' ? hit.target : `@${hit.root}/${hit.target}`
      const targetClean = target.replace(/#.*$/, '').replace(/^\.\//, '')
      if (rel === targetClean) continue

      hints.push({
        position: { line: hit.span.endLine, character: hintAt },
        label: ` => ${rel}`,
        kind: 2,
        tooltip: `Resolved target: ${cleanResolved}`,
        paddingLeft: true,
      })
    }
  } // end CONFIG.inlayHints.paths

  // 2) Line-local annotation density hints.
  const annotRe = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g
  if (CONFIG.inlayHints.annotations || CONFIG.inlayHints.frames) {
    for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo += 1) {
      const line = lines[lineNo] ?? ''

      if (CONFIG.inlayHints.frames) {
        const frameMatch = line.match(/^\s*\^(?:\["([^"]+)"\]|"([^"]+)"|\[([A-Za-z_]\w*)\])/)
        if (frameMatch) {
          const frameName = frameMatch[1] || frameMatch[2] || frameMatch[3] || ''
          const byKind = frameKindsBySection.get(frameName) ?? new Map<string, number>()
          const summary = [...byKind.entries()].map(([kind, count]) => `${count} ${kind}`).join(', ')
          if (summary) {
            hints.push({
              position: { line: lineNo, character: line.length },
              label: ` [${summary}]`,
              kind: 2,
              tooltip: 'Frame-local annotation summary.',
              paddingLeft: true,
            })
          }
        }
      }

      if (!CONFIG.inlayHints.annotations) continue

      annotRe.lastIndex = 0
      const names: string[] = []
      let match: RegExpExecArray | null
      while ((match = annotRe.exec(line)) !== null) {
        names.push(match[2])
      }

      if (names.length === 0) continue

      const unique = [...new Set(names)]
      const summary = unique
        .slice(0, 2)
        .map((name) => `${name}:${serverIndex.lookupAnnotation(name).length}`)
        .join(', ')

      hints.push({
        position: { line: lineNo, character: line.length },
        label: ` [anno ${summary}${unique.length > 2 ? ', ...' : ''}]`,
        kind: 2,
        tooltip: 'Workspace occurrence counts for annotation names on this line.',
        paddingLeft: true,
      })
    }
  }

  // 3) Brace depth + charge hints on lines that change nesting
  {
    let depth = 0
    // Count depth up to the visible range start
    for (let i = 0; i < range.start.line && i < lines.length; i++) {
      for (const c of lines[i]) {
        if (c === '{') depth++
        else if (c === '}') depth = Math.max(0, depth - 1)
      }
    }
    for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo++) {
      const line = lines[lineNo]
      const openCount = (line.match(/\{/g) || []).length
      const closeCount = (line.match(/\}/g) || []).length
      const prevDepth = depth
      for (const c of line) {
        if (c === '{') depth++
        else if (c === '}') depth = Math.max(0, depth - 1)
      }
      // Show depth hint when entering deeper nesting
      if (openCount > 0 && depth >= 2) {
        hints.push({
          position: { line: lineNo, character: line.length },
          label: ` \u2502d${depth}`,
          kind: 2,
          tooltip: `Brace depth: ${depth} (${openCount > closeCount ? '+tension' : openCount < closeCount ? '\u2212discharge' : 'balanced'})`,
          paddingLeft: true,
        })
      } else if (closeCount > 0 && prevDepth >= 3 && depth < prevDepth) {
        hints.push({
          position: { line: lineNo, character: line.length },
          label: ` \u2502d${depth}\u2212`,
          kind: 2,
          tooltip: `Discharge: depth ${prevDepth} \u2192 ${depth}`,
          paddingLeft: true,
        })
      }
    }
  }

  // 4) Operator census hint on #> anchor lines
  for (let lineNo = Math.max(0, range.start.line); lineNo <= Math.min(lines.length - 1, range.end.line); lineNo++) {
    const line = lines[lineNo]
    if (!/^\s*#>/.test(line)) continue
    // Count operators in the file (or just show on first anchor)
    const opDist: Record<string, number> = {}
    for (const l of lines) { for (const c of l) { if ('~?!^%&*='.includes(c)) opDist[c] = (opDist[c] || 0) + 1 } }
    const census = Object.entries(opDist).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([op, n]) => `${op}:${n}`).join(' ')
    if (census) {
      hints.push({
        position: { line: lineNo, character: line.length },
        label: ` [${census}]`,
        kind: 2,
        tooltip: 'File operator census: operator frequency distribution.',
        paddingLeft: true,
      })
    }
    break // only on first anchor
  }

  return hints
}

// ── References ──────────────────────────────────────────────────

async function references(params: any): Promise<LspLocation[]> {
  const uri = params?.textDocument?.uri
  const pos = params?.position as LspPosition | undefined
  if (!uri || !pos) return []

  const source = await getDocumentText(uri)
  if (source === null) return []

  const line = source.split('\n')[pos.line] ?? ''

  // 1. Path reference: ~"..." or @root/..., return all workspace hits that resolve to same target.
  const docPath = pathFromUri(uri)
  if (docPath) {
    const doc = serverIndex.getDocument(uri)
    const hits = doc?.selectorHits ?? selectPathRefs(source)
    const hit = findPathRefAtPosition(hits, pos.line, pos.character)
    if (hit) {
      const resolved = await resolveReferencePath(hit, source, docPath, { allowDirectory: true })
      if (resolved) {
        const targetPath = stripAnchor(resolved)
        const files = await getWorkspaceSpwFiles()
        const basenameNeedle = path.basename(targetPath)

        const perFile = await mapWithConcurrency(files, 16, async (filePath) => {
          const fileUri = uriFromPath(filePath)
          const fileText = await getDocumentText(fileUri)
          if (fileText === null) return [] as LspLocation[]
          if (!fileText.includes(basenameNeedle)) return [] as LspLocation[]

          const candidateHits = selectPathRefs(fileText)
          const matches: LspLocation[] = []
          for (const candidate of candidateHits) {
            const candidateResolved = await resolveReferencePath(candidate, fileText, filePath, { allowDirectory: true })
            if (!candidateResolved) continue
            if (stripAnchor(candidateResolved) !== targetPath) continue
            matches.push({
              uri: fileUri,
              range: {
                start: { line: candidate.span.startLine, character: candidate.span.startCharacter },
                end: { line: candidate.span.endLine, character: candidate.span.endCharacter },
              },
            })
          }
          return matches
        })

        return perFile.flat()
      }
    }
  }

  // 2. Annotation reference: find #name at cursor, return all workspace hits
  const annotRe = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g
  let annotMatch: RegExpExecArray | null
  while ((annotMatch = annotRe.exec(line)) !== null) {
    const start = annotMatch.index
    const end = start + annotMatch[0].length
    if (pos.character < start || pos.character >= end) continue

    const name = annotMatch[2]
    const entries = serverIndex.lookupAnnotation(name)
    return entries.map(entry => ({
      uri: uriFromPath(entry.file),
      range: {
        start: { line: entry.line, character: 0 },
        end: { line: entry.line, character: 0 },
      },
    }))
  }

  // 3. Selector name: return definition site
  const selRe = /\b([a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+)\b/g
  let selMatch: RegExpExecArray | null
  while ((selMatch = selRe.exec(line)) !== null) {
    const start = selMatch.index
    const end = start + selMatch[0].length
    if (pos.character < start || pos.character >= end) continue

    const def = serverIndex.getSelectorDef(selMatch[1])
    if (!def) continue
    return [{
      uri: uriFromPath(def.file),
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    }]
  }

  return []
}

// ── Rename ──────────────────────────────────────────────────────

interface LspPrepareRenameResult {
  range: LspRange
  placeholder: string
}

interface LspWorkspaceEdit {
  changes: Record<string, LspTextEdit[]>
}

/**
 * Identify the renameable symbol at the cursor position.
 * Returns the symbol range and current text, or null if not renameable.
 */
async function prepareRename(params: any): Promise<LspPrepareRenameResult | null> {
  const uri = params?.textDocument?.uri
  const pos = params?.position as LspPosition | undefined
  if (!uri || !pos) return null

  const source = await getDocumentText(uri)
  if (source === null) return null

  const line = source.split('\n')[pos.line] ?? ''

  // 1. Annotation: #name, #:name, #!name, #>name, ~#name
  const annotRe = /(?:~)?#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_-]*)/g
  let annotMatch: RegExpExecArray | null
  while ((annotMatch = annotRe.exec(line)) !== null) {
    // The renameable part is just the name (group 2)
    const nameStart = annotMatch.index + annotMatch[0].length - annotMatch[2].length
    const nameEnd = nameStart + annotMatch[2].length
    if (pos.character < nameStart || pos.character >= nameEnd) continue

    return {
      range: {
        start: { line: pos.line, character: nameStart },
        end: { line: pos.line, character: nameEnd },
      },
      placeholder: annotMatch[2],
    }
  }

  // 2. @root reference: @rootName or @rootName/path
  const rootRe = /@([a-zA-Z_][a-zA-Z0-9_]*)/g
  let rootMatch: RegExpExecArray | null
  while ((rootMatch = rootRe.exec(line)) !== null) {
    const nameStart = rootMatch.index + 1 // skip @
    const nameEnd = nameStart + rootMatch[1].length
    if (pos.character < rootMatch.index || pos.character >= nameEnd) continue

    return {
      range: {
        start: { line: pos.line, character: nameStart },
        end: { line: pos.line, character: nameEnd },
      },
      placeholder: rootMatch[1],
    }
  }

  // 3. Frame name: ^["name"], ^['name'], ^"name", ^'name'
  const frameRe = /\^(?:\[(["'])([^"']+)\1\]|(["'])([^"']+)\3)/g
  let frameMatch: RegExpExecArray | null
  while ((frameMatch = frameRe.exec(line)) !== null) {
    const name = frameMatch[2] || frameMatch[4]
    if (!name) continue
    const nameInLine = frameMatch[0]
    const fullStart = frameMatch.index
    const fullEnd = fullStart + nameInLine.length
    if (pos.character < fullStart || pos.character >= fullEnd) continue

    // Find the name within the match for precise rename range
    const nameOffset = nameInLine.indexOf(name)
    const nameStart = fullStart + nameOffset
    const nameEnd = nameStart + name.length

    return {
      range: {
        start: { line: pos.line, character: nameStart },
        end: { line: pos.line, character: nameEnd },
      },
      placeholder: name,
    }
  }

  return null
}

/**
 * Rename a symbol across the workspace.
 * Uses the same resolution logic as references() but produces TextEdits.
 */
async function rename(params: any): Promise<LspWorkspaceEdit | null> {
  const uri = params?.textDocument?.uri
  const pos = params?.position as LspPosition | undefined
  const newName = params?.newName as string | undefined
  if (!uri || !pos || !newName) return null

  const source = await getDocumentText(uri)
  if (source === null) return null

  const line = source.split('\n')[pos.line] ?? ''
  const changes: Record<string, LspTextEdit[]> = {}

  function addEdit(editUri: string, range: LspRange, text: string): void {
    if (!changes[editUri]) changes[editUri] = []
    changes[editUri].push({ range, newText: text })
  }

  // 1. Annotation rename: find all #name across workspace, replace name portion
  const annotRe = /(?:~)?#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_-]*)/g
  let annotMatch: RegExpExecArray | null
  while ((annotMatch = annotRe.exec(line)) !== null) {
    const nameStart = annotMatch.index + annotMatch[0].length - annotMatch[2].length
    const nameEnd = nameStart + annotMatch[2].length
    if (pos.character < nameStart || pos.character >= nameEnd) continue

    const oldName = annotMatch[2]
    const entries = serverIndex.lookupAnnotation(oldName)

    // Also scan all workspace files for raw text matches
    const files = await getWorkspaceSpwFiles()
    const annotPattern = new RegExp(`((?:~)?#(?:!|:|>)?)${escapeRegex(oldName)}\\b`, 'g')

    await mapWithConcurrency(files, 16, async (filePath) => {
      const fileUri = uriFromPath(filePath)
      const fileText = await getDocumentText(fileUri)
      if (fileText === null || !fileText.includes(oldName)) return

      const fileLines = fileText.split('\n')
      for (let lineNo = 0; lineNo < fileLines.length; lineNo++) {
        let m: RegExpExecArray | null
        annotPattern.lastIndex = 0
        while ((m = annotPattern.exec(fileLines[lineNo])) !== null) {
          const prefixLen = m[1].length
          const editStart = m.index + prefixLen
          addEdit(fileUri, {
            start: { line: lineNo, character: editStart },
            end: { line: lineNo, character: editStart + oldName.length },
          }, newName)
        }
      }
    })

    return { changes }
  }

  // 2. @root rename: find all @rootName across workspace, replace root name
  const rootRe = /@([a-zA-Z_][a-zA-Z0-9_]*)/g
  let rootMatch: RegExpExecArray | null
  while ((rootMatch = rootRe.exec(line)) !== null) {
    const nameStart = rootMatch.index + 1
    const nameEnd = nameStart + rootMatch[1].length
    if (pos.character < rootMatch.index || pos.character >= nameEnd) continue

    const oldRoot = rootMatch[1]
    const files = await getWorkspaceSpwFiles()
    const rootPattern = new RegExp(`@${escapeRegex(oldRoot)}\\b`, 'g')

    await mapWithConcurrency(files, 16, async (filePath) => {
      const fileUri = uriFromPath(filePath)
      const fileText = await getDocumentText(fileUri)
      if (fileText === null || !fileText.includes(`@${oldRoot}`)) return

      const fileLines = fileText.split('\n')
      for (let lineNo = 0; lineNo < fileLines.length; lineNo++) {
        let m: RegExpExecArray | null
        rootPattern.lastIndex = 0
        while ((m = rootPattern.exec(fileLines[lineNo])) !== null) {
          addEdit(fileUri, {
            start: { line: lineNo, character: m.index + 1 }, // skip @
            end: { line: lineNo, character: m.index + 1 + oldRoot.length },
          }, newName)
        }
      }
    })

    return { changes }
  }

  // 3. Frame name rename: find all ^["name"] / ^"name" / ^['name'] across workspace
  const frameRe = /\^(?:\[(["'])([^"']+)\1\]|(["'])([^"']+)\3)/g
  let frameMatch: RegExpExecArray | null
  while ((frameMatch = frameRe.exec(line)) !== null) {
    const name = frameMatch[2] || frameMatch[4]
    if (!name) continue
    const fullStart = frameMatch.index
    const fullEnd = fullStart + frameMatch[0].length
    if (pos.character < fullStart || pos.character >= fullEnd) continue

    const oldName = name
    const files = await getWorkspaceSpwFiles()
    // Match frame patterns containing the old name
    const framePattern = new RegExp(
      `\\^(?:\\[(["'])${escapeRegex(oldName)}\\1\\]|(["'])${escapeRegex(oldName)}\\2)`,
      'g',
    )

    await mapWithConcurrency(files, 16, async (filePath) => {
      const fileUri = uriFromPath(filePath)
      const fileText = await getDocumentText(fileUri)
      if (fileText === null || !fileText.includes(oldName)) return

      const fileLines = fileText.split('\n')
      for (let lineNo = 0; lineNo < fileLines.length; lineNo++) {
        let m: RegExpExecArray | null
        framePattern.lastIndex = 0
        while ((m = framePattern.exec(fileLines[lineNo])) !== null) {
          // Find the name within the match
          const nameOffset = m[0].indexOf(oldName)
          const editStart = m.index + nameOffset
          addEdit(fileUri, {
            start: { line: lineNo, character: editStart },
            end: { line: lineNo, character: editStart + oldName.length },
          }, newName)
        }
      }
    })

    return { changes }
  }

  return null
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Folding Ranges ───────────────────────────────────────────────

interface LspFoldingRange { startLine: number; endLine: number; kind?: string }

function foldingRanges(params: any): LspFoldingRange[] {
  const uri = params?.textDocument?.uri
  if (!uri) return []

  const doc = serverIndex.getDocument(uri)
  if (!doc) return []

  const lines = doc.text.split('\n')
  const ranges: LspFoldingRange[] = []

  // Brace-depth folding for { ... } blocks (frames, definitions)
  const stack: Array<{ startLine: number }> = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    let inString = false
    for (let j = 0; j < line.length; j += 1) {
      const ch = line[j]
      if (ch === '"' || ch === "'") { inString = !inString; continue }
      if (inString) continue
      if (line[j - 1] === '/' && ch === '/') break // line comment
      if (ch === '{') {
        stack.push({ startLine: i })
      } else if (ch === '}') {
        const top = stack.pop()
        if (top && i > top.startLine) {
          ranges.push({ startLine: top.startLine, endLine: i })
        }
      }
    }
  }

  // Block comment folding /* ... */
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trimStart().startsWith('/*')) {
      for (let j = i + 1; j < lines.length; j += 1) {
        if (lines[j].includes('*/')) {
          if (j > i) ranges.push({ startLine: i, endLine: j, kind: 'comment' })
          i = j
          break
        }
      }
    }
  }

  return ranges
}

// ── Request dispatcher ──────────────────────────────────────────

async function handleRequest(message: JsonRpcRequest): Promise<void> {
  const id = message.id ?? null
  serverIndex.tick()

  try {
    switch (message.method) {
      case 'initialize': {
        WORKSPACE_ROOT = parseWorkspaceRoot(message.params)
        CONFIG = await loadConfig(WORKSPACE_ROOT, message.params?.initializationOptions)
        serverIndex = new ServerIndex(WORKSPACE_ROOT)
        loadObservableState()  // load .spw/state/observable.json on startup
        log(`initialize workspace=${WORKSPACE_ROOT} config=${JSON.stringify(CONFIG)}`)

        sendResult(id, {
          serverInfo: { name: 'spw-lsp', version: '0.2.0-alpha.3' },
          capabilities: {
            textDocumentSync: 1,
            definitionProvider: true,
            declarationProvider: true,
            referencesProvider: true,
            renameProvider: { prepareProvider: true },
            documentLinkProvider: { resolveProvider: false },
            hoverProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            completionProvider: { triggerCharacters: ['@', '~', '/', '#'] },
            codeLensProvider: { resolveProvider: false },
            documentFormattingProvider: true,
            inlayHintProvider: true,
            foldingRangeProvider: true,
          },
        })

        // Start workspace scan in background
        void serverIndex.scanWorkspace().then(() => {
          log(`workspace scan complete: ${serverIndex.allAnnotations().length} annotations`)
        })
        return
      }

      case 'shutdown':
        SHUTDOWN = true
        sendResult(id, null)
        return

      case 'textDocument/definition':
      case 'textDocument/declaration':
        sendResult(id, await definition(message.params))
        return

      case 'textDocument/documentLink':
        sendResult(id, await documentLinks(message.params))
        return

      case 'textDocument/hover':
        sendResult(id, await hover(message.params))
        return

      case 'textDocument/documentSymbol':
        sendResult(id, documentSymbols(message.params))
        return

      case 'workspace/symbol':
        sendResult(id, workspaceSymbols(message.params))
        return

      case 'textDocument/completion':
        sendResult(id, await completion(message.params))
        return

      case 'textDocument/codeLens':
        sendResult(id, codeLens(message.params))
        return

      case 'textDocument/formatting':
        sendResult(id, formatting(message.params))
        return

      case 'textDocument/inlayHint':
        sendResult(id, await inlayHints(message.params))
        return

      case 'textDocument/references':
        sendResult(id, await references(message.params))
        return

      case 'textDocument/prepareRename':
        sendResult(id, await prepareRename(message.params))
        return

      case 'textDocument/rename':
        sendResult(id, await rename(message.params))
        return

      case 'textDocument/foldingRange':
        sendResult(id, foldingRanges(message.params))
        return

      case 'spw/select': {
        const uri = message.params?.textDocument?.uri
        const source = uri ? await getDocumentText(uri) : null
        sendResult(id, source ? selectPathRefs(source) : [])
        return
      }

      default:
        if (typeof id === 'number' || typeof id === 'string') {
          sendError(id, -32601, `Method not found: ${message.method}`)
        }
        return
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    sendError(id, -32603, 'Internal error', details)
  }
}

// ── Notification handler ────────────────────────────────────────

function handleNotification(message: JsonRpcRequest): void {
  switch (message.method) {
    case 'initialized':
      return

    case 'exit':
      process.exit(SHUTDOWN ? 0 : 1)

    case 'textDocument/didOpen': {
      const uri = message.params?.textDocument?.uri
      const text = message.params?.textDocument?.text
      const version = Number(message.params?.textDocument?.version ?? 1)
      if (!uri || typeof text !== 'string') return
      const filePath = pathFromUri(uri)
      if (!filePath) return
      serverIndex.openDocument(uri, filePath, text, version)
      debounceDiagnostics(uri)
      return
    }

    case 'textDocument/didChange': {
      const uri = message.params?.textDocument?.uri
      const version = Number(message.params?.textDocument?.version ?? 1)
      const changes = Array.isArray(message.params?.contentChanges) ? message.params.contentChanges : []
      const latest = changes[changes.length - 1]
      if (!uri || typeof latest?.text !== 'string') return
      serverIndex.updateDocument(uri, latest.text, version)
      debounceDiagnostics(uri)
      return
    }

    case 'textDocument/didSave': {
      const uri = message.params?.textDocument?.uri
      if (!uri) return
      serverIndex.saveDocument(uri)
      debounceDiagnostics(uri)
      // Reload observable state on any save (lightweight — single JSON file)
      loadObservableState()
      return
    }

    case 'textDocument/didClose': {
      const uri = message.params?.textDocument?.uri
      if (!uri) return
      serverIndex.closeDocument(uri)
      // Clear diagnostics on close
      sendNotification('textDocument/publishDiagnostics', { uri, diagnostics: [] })
      return
    }

    case 'workspace/didChangeWatchedFiles': {
      const changes = Array.isArray(message.params?.changes) ? message.params.changes : []
      for (const change of changes as Array<{ uri: string; type: number }>) {
        const filePath = pathFromUri(change.uri)
        if (!filePath || !filePath.endsWith('.spw')) continue
        // type 3 = deleted; 1 = created; 2 = changed
        void serverIndex.refreshFileAnnotations(filePath)
      }
      return
    }

    case '$/cancelRequest':
      return

    default:
      return
  }
}

// ── Transport ───────────────────────────────────────────────────

// Init with default index (re-created on initialize)
serverIndex = new ServerIndex(WORKSPACE_ROOT)

function processIncoming(): void {
  while (true) {
    const headerEnd = incoming.indexOf('\r\n\r\n')
    if (headerEnd === -1) return

    const headerRaw = incoming.subarray(0, headerEnd).toString('utf8')
    const lengthLine = headerRaw
      .split('\r\n')
      .find((line) => line.toLowerCase().startsWith('content-length:'))
    if (!lengthLine) {
      incoming = incoming.subarray(headerEnd + 4)
      continue
    }

    const contentLength = Number(lengthLine.split(':')[1]?.trim() ?? '')
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      incoming = incoming.subarray(headerEnd + 4)
      continue
    }

    const messageStart = headerEnd + 4
    const messageEnd = messageStart + contentLength
    if (incoming.length < messageEnd) return

    const body = incoming.subarray(messageStart, messageEnd).toString('utf8')
    incoming = incoming.subarray(messageEnd)

    let message: JsonRpcRequest
    try {
      message = JSON.parse(body)
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error)
      sendError(null, -32700, 'Parse error', details)
      continue
    }

    if (typeof message.id !== 'undefined') {
      void handleRequest(message)
    } else {
      handleNotification(message)
    }
  }
}

process.stdin.on('data', (chunk: Buffer) => {
  incoming = Buffer.concat([incoming, chunk])
  processIncoming()
})

process.stdin.on('error', (error) => { log(`stdin error: ${error.message}`) })
process.on('uncaughtException', (error) => { log(`uncaughtException: ${error.message}`) })
process.on('unhandledRejection', (error) => {
  const details = error instanceof Error ? error.message : String(error)
  log(`unhandledRejection: ${details}`)
})

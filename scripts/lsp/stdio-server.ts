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
  paddingLeft?: boolean
  paddingRight?: boolean
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

const DIAGNOSTIC_DEBOUNCE = new Map<string, ReturnType<typeof setTimeout>>()
const DIAGNOSTIC_DELAY_MS = 300

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

// ── Root resolution ─────────────────────────────────────────────

function defaultRoots(fileDir: string): RootMap {
  return {
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
}

function parseRoots(source: string, fileDir: string): RootMap {
  const roots: RootMap = {}
  const re = /@([A-Za-z0-9_-]+):\s*~"([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) { roots[m[1]] = path.resolve(fileDir, m[2]) }
  return roots
}

function mergeRoots(source: string, fileDir: string): RootMap {
  return { ...defaultRoots(fileDir), ...parseRoots(source, fileDir) }
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
  let rootBase = roots[rootName]
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
      severity: 2,
      source: 'spw',
      message: `unresolved reference: ${target}`,
    })
  }

  // 3. Stale projections
  const projections = serverIndex.getProjectionsFromSpecOwner(docPath)
  for (const proj of projections) {
    const genPath = path.resolve(WORKSPACE_ROOT, proj.root.replace(/^\.\//, '').replace(/\/$/, ''))
    try {
      const specStat = await fs.stat(docPath)
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

  // 4. Sigil hover with spirit sequence context
  if (charAtPos && SIGIL_SEMANTICS[charAtPos]) {
    const sem = SIGIL_SEMANTICS[charAtPos]
    const spiritPhase = serverIndex.getSpiritPhaseForSigil(charAtPos)

    let md = `**\`${charAtPos}\`** \u2014 *${sem.role}*\n\n`
    md += `| | |\n|:--|:--|\n`
    md += `| **Physics** | ${sem.physics} |\n`
    md += `| **Phase** | ${sem.phase} |\n`
    md += `| **Tuning** | ${sem.tuning} |\n`
    if (spiritPhase) {
      md += `\nSpirit sequence: \`${spiritPhase}\`\n`
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
  const rootMatch = /@([A-Za-z_][A-Za-z0-9_]*)/.exec(line)
  if (rootMatch) {
    const rootStart = rootMatch.index ?? 0
    const rootEnd = rootStart + rootMatch[0].length
    if (pos.character >= rootStart && pos.character <= rootEnd) {
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
  }

  // 6. Path peek
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

            let md = `\u2192 \`${rel}\`\n\n`
            md += `Subroot: ${subroot} | Cache: ${tier}`
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

  // 3. File-system completion for ~"../" and @root/
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

  const source = await getDocumentText(uri)
  if (source === null) return []

  const lines = source.split('\n')
  const hints: LspInlayHint[] = []

  const startLine = Math.max(0, range.start.line)
  const endLine = Math.min(lines.length - 1, range.end.line)

  for (let i = startLine; i <= endLine; i += 1) {
    const line = lines[i]
    if (line.trim().startsWith('#') && !line.includes('#!')) continue

    for (let c = 0; c < line.length; c += 1) {
      const char = line[c]
      const sem = SIGIL_SEMANTICS[char]
      // Only hint core phase operators
      if (sem && sem.phaseIndex >= 0) {
        // Heuristic: only hint if it's acting as an operator (followed by space, brace, identifier, or end of line)
        if (c + 1 === line.length || /[ \w<\[{(]/.test(line[c + 1])) {
          const registerName = sem.role.split('/')[0].trim()
          const label = registerName.charAt(0).toUpperCase() + registerName.slice(1)
          hints.push({
            position: { line: i, character: c + 1 },
            label: `[${label}]`,
            kind: 1, // Type hint
            paddingLeft: true,
          })
        }
      }
    }
  }
  return hints
}

// ── Request dispatcher ──────────────────────────────────────────

async function handleRequest(message: JsonRpcRequest): Promise<void> {
  const id = message.id ?? null
  serverIndex.tick()

  try {
    switch (message.method) {
      case 'initialize': {
        WORKSPACE_ROOT = parseWorkspaceRoot(message.params)
        serverIndex = new ServerIndex(WORKSPACE_ROOT)
        log(`initialize workspace=${WORKSPACE_ROOT}`)

        sendResult(id, {
          serverInfo: { name: 'spw-lsp', version: '0.2.0-alpha.2' },
          capabilities: {
            textDocumentSync: 1,
            definitionProvider: true,
            declarationProvider: true,
            documentLinkProvider: { resolveProvider: false },
            hoverProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            completionProvider: { triggerCharacters: ['@', '~', '/', '#'] },
            codeLensProvider: { resolveProvider: false },
            documentFormattingProvider: true,
            inlayHintProvider: true,
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

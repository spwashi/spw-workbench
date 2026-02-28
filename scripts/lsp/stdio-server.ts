#!/usr/bin/env tsx
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { findPathRefAtPosition, selectPathRefs, type SpwSelectorHit } from './spw-selector'

interface LspPosition {
  line: number
  character: number
}

interface LspRange {
  start: LspPosition
  end: LspPosition
}

interface LspLocation {
  uri: string
  range: LspRange
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
  error?: {
    code: number
    message: string
    data?: any
  }
}

interface DocumentState {
  text: string
  version: number
}

type RootMap = Record<string, string>

const OPEN_DOCS = new Map<string, DocumentState>()
const REPO_ROOT = process.cwd()
let WORKSPACE_ROOT = REPO_ROOT
let SHUTDOWN = false
let incoming = Buffer.alloc(0)

function log(message: string): void {
  if (!process.env.SPW_LSP_TRACE) return
  process.stderr.write(`[spw-lsp] ${message}\n`)
}

function send(payload: JsonRpcResponse | JsonRpcRequest): void {
  const body = JSON.stringify(payload)
  const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`
  process.stdout.write(header + body)
}

function sendResult(id: number | string | null, result: any): void {
  send({ jsonrpc: '2.0', id, result })
}

function sendError(
  id: number | string | null,
  code: number,
  message: string,
  data?: any
): void {
  send({
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  })
}

function parseWorkspaceRoot(params: any): string {
  const rootUri = params?.rootUri
  if (typeof rootUri === 'string' && rootUri.startsWith('file://')) {
    try {
      const parsed = fileURLToPath(rootUri)
      return parsed || WORKSPACE_ROOT
    } catch {
      return WORKSPACE_ROOT
    }
  }

  const workspaceFolders = Array.isArray(params?.workspaceFolders)
    ? params.workspaceFolders
    : []
  const first = workspaceFolders[0]?.uri
  if (typeof first === 'string' && first.startsWith('file://')) {
    try {
      const parsed = fileURLToPath(first)
      return parsed || WORKSPACE_ROOT
    } catch {
      return WORKSPACE_ROOT
    }
  }

  return WORKSPACE_ROOT
}

function pathFromUri(uri: string): string | null {
  if (!uri.startsWith('file://')) return null
  try {
    return fileURLToPath(uri)
  } catch {
    return null
  }
}

function uriFromPath(filePath: string): string {
  return pathToFileURL(filePath).toString()
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function statKind(target: string): Promise<'file' | 'dir' | null> {
  try {
    const stat = await fs.stat(target)
    if (stat.isDirectory()) return 'dir'
    if (stat.isFile()) return 'file'
    return null
  } catch {
    return null
  }
}

function parseRoots(source: string, fileDir: string): RootMap {
  const roots: RootMap = {}
  const rootRegex = /@([A-Za-z0-9_-]+):\s*~"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = rootRegex.exec(source))) {
    const [, root, rel] = match
    roots[root] = path.resolve(fileDir, rel)
  }
  return roots
}

function defaultRoots(fileDir: string): RootMap {
  const v020 = path.join(WORKSPACE_ROOT, 'lib', 'spw-v0.2.0-alpha')
  const v010 = path.join(WORKSPACE_ROOT, 'lib', 'spw-v0.1.0-alpha')
  return {
    docs: path.join(WORKSPACE_ROOT, 'docs'),
    src: path.join(WORKSPACE_ROOT, 'src'),
    spec: v020,
    spec_legacy: v010,
    lib: path.join(WORKSPACE_ROOT, 'lib'),
    scripts: path.join(WORKSPACE_ROOT, 'scripts'),
    examples: path.join(WORKSPACE_ROOT, 'examples'),
    bench: path.join(WORKSPACE_ROOT, 'bench'),
    spw: path.join(WORKSPACE_ROOT, '.spw'),
    biome: path.join(WORKSPACE_ROOT, '.spw', 'biome', 'ocean'),
    harness: path.join(WORKSPACE_ROOT, '.spw', 'harness'),
    gen: path.join(WORKSPACE_ROOT, '.spw', 'gen'),
    hot: path.join(WORKSPACE_ROOT, '.spw', 'hot.spw'),
    shelves: path.join(WORKSPACE_ROOT, '.spw', 'shelves.spw'),
    topology: path.join(WORKSPACE_ROOT, '.spw', 'topology.spw'),
    agents: path.join(WORKSPACE_ROOT, '.agents'),
    plans: path.join(WORKSPACE_ROOT, '.agents', 'plans'),
    state: path.join(WORKSPACE_ROOT, '.agents', 'state'),
    skills: path.join(WORKSPACE_ROOT, '.agents', 'skills'),
    library: path.join(WORKSPACE_ROOT, 'docs', 'library'),
    here: fileDir,
    repo: WORKSPACE_ROOT,
  }
}

function mergeRoots(source: string, fileDir: string): RootMap {
  const roots = defaultRoots(fileDir)
  const parsed = parseRoots(source, fileDir)

  for (const [name, resolved] of Object.entries(parsed)) {
    roots[name] = resolved
  }

  return roots
}

async function resolveCandidate(target: string): Promise<string | null> {
  const kind = await statKind(target)
  if (kind === 'file') {
    return target
  }

  const exts = ['.spw', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.md']
  if (!path.extname(target) && kind !== 'dir') {
    for (const ext of exts) {
      const withExt = `${target}${ext}`
      if (await fileExists(withExt)) return withExt
    }
  }

  const indexCandidates = ['index.spw', 'index.ts', 'README.md']
  for (const file of indexCandidates) {
    const inDir = path.join(target, file)
    if (await fileExists(inDir)) return inDir
  }

  return null
}

async function resolveReferencePath(
  hit: SpwSelectorHit,
  source: string,
  docPath: string
): Promise<string | null> {
  const docDir = path.dirname(docPath)
  const roots = mergeRoots(source, docDir)

  if (hit.kind === 'pathRef') {
    if (hit.target.includes('*')) return null
    const candidate = path.resolve(docDir, hit.target)
    return resolveCandidate(candidate)
  }

  const rootName = hit.root ?? ''
  let rootBase = roots[rootName]
  if (!rootBase) {
    const direct = path.join(WORKSPACE_ROOT, rootName)
    if (await fileExists(direct)) {
      rootBase = direct
    } else {
      const srcFallback = path.join(WORKSPACE_ROOT, 'src', rootName)
      rootBase = (await fileExists(srcFallback)) ? srcFallback : direct
    }
  }

  if (!rootBase || hit.target.includes('*')) return null
  const candidate = path.resolve(rootBase, hit.target)
  return resolveCandidate(candidate)
}

async function getDocumentText(uri: string): Promise<string | null> {
  const open = OPEN_DOCS.get(uri)
  if (open) return open.text

  const filePath = pathFromUri(uri)
  if (!filePath) return null

  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

async function definition(params: any): Promise<LspLocation[] | null> {
  const uri = params?.textDocument?.uri
  const position = params?.position as LspPosition | undefined
  if (!uri || !position) return null

  const source = await getDocumentText(uri)
  if (source === null) return null

  const docPath = pathFromUri(uri)
  if (!docPath) return null

  const hits = selectPathRefs(source)
  const hit = findPathRefAtPosition(hits, position.line, position.character)
  if (!hit) return null

  const resolved = await resolveReferencePath(hit, source, docPath)
  if (!resolved) return null

  return [
    {
      uri: uriFromPath(resolved),
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    },
  ]
}

async function documentLinks(params: any): Promise<Array<{ range: LspRange, target: string }>> {
  const uri = params?.textDocument?.uri
  if (!uri) return []

  const source = await getDocumentText(uri)
  if (source === null) return []

  const docPath = pathFromUri(uri)
  if (!docPath) return []

  const links: Array<{ range: LspRange, target: string }> = []
  const hits = selectPathRefs(source)
  for (const hit of hits) {
    const resolved = await resolveReferencePath(hit, source, docPath)
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

async function handleRequest(message: JsonRpcRequest): Promise<void> {
  const id = message.id ?? null
  try {
    switch (message.method) {
      case 'initialize': {
        WORKSPACE_ROOT = parseWorkspaceRoot(message.params)
        log(`initialize workspace=${WORKSPACE_ROOT}`)
        sendResult(id, {
          serverInfo: {
            name: 'spw-lsp',
            version: '0.2.0-alpha',
          },
          capabilities: {
            textDocumentSync: 1, // Full sync
            definitionProvider: true,
            declarationProvider: true,
            documentLinkProvider: {
              resolveProvider: false,
            },
          },
        })
        return
      }
      case 'shutdown':
        SHUTDOWN = true
        sendResult(id, null)
        return
      case 'textDocument/definition':
      case 'textDocument/declaration': {
        const result = await definition(message.params)
        sendResult(id, result)
        return
      }
      case 'textDocument/documentLink': {
        const result = await documentLinks(message.params)
        sendResult(id, result)
        return
      }
      case 'spw/select': {
        const uri = message.params?.textDocument?.uri
        const source = uri ? await getDocumentText(uri) : null
        if (!source) {
          sendResult(id, [])
          return
        }
        sendResult(id, selectPathRefs(source))
        return
      }
      default:
        sendError(id, -32601, `Method not found: ${message.method}`)
        return
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    sendError(id, -32603, 'Internal error', details)
  }
}

function handleNotification(message: JsonRpcRequest): void {
  switch (message.method) {
    case 'initialized':
      return
    case 'exit':
      process.exit(SHUTDOWN ? 0 : 1)
      return
    case 'textDocument/didOpen': {
      const uri = message.params?.textDocument?.uri
      const text = message.params?.textDocument?.text
      const version = Number(message.params?.textDocument?.version ?? 1)
      if (!uri || typeof text !== 'string') return
      OPEN_DOCS.set(uri, { text, version })
      return
    }
    case 'textDocument/didChange': {
      const uri = message.params?.textDocument?.uri
      const version = Number(message.params?.textDocument?.version ?? 1)
      const changes = Array.isArray(message.params?.contentChanges)
        ? message.params.contentChanges
        : []
      const latest = changes[changes.length - 1]
      if (!uri || typeof latest?.text !== 'string') return
      OPEN_DOCS.set(uri, { text: latest.text, version })
      return
    }
    case 'textDocument/didClose': {
      const uri = message.params?.textDocument?.uri
      if (!uri) return
      OPEN_DOCS.delete(uri)
      return
    }
    case '$/cancelRequest':
      return
    default:
      return
  }
}

function processIncoming(): void {
  while (true) {
    const headerEnd = incoming.indexOf('\r\n\r\n')
    if (headerEnd === -1) return

    const headerRaw = incoming.slice(0, headerEnd).toString('utf8')
    const lengthLine = headerRaw
      .split('\r\n')
      .find((line) => line.toLowerCase().startsWith('content-length:'))
    if (!lengthLine) {
      incoming = incoming.slice(headerEnd + 4)
      continue
    }

    const contentLength = Number(lengthLine.split(':')[1]?.trim() ?? '')
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      incoming = incoming.slice(headerEnd + 4)
      continue
    }

    const messageStart = headerEnd + 4
    const messageEnd = messageStart + contentLength
    if (incoming.length < messageEnd) return

    const body = incoming.slice(messageStart, messageEnd).toString('utf8')
    incoming = incoming.slice(messageEnd)

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

process.stdin.on('error', (error) => {
  log(`stdin error: ${error.message}`)
})

process.on('uncaughtException', (error) => {
  log(`uncaughtException: ${error.message}`)
})

process.on('unhandledRejection', (error) => {
  const details = error instanceof Error ? error.message : String(error)
  log(`unhandledRejection: ${details}`)
})

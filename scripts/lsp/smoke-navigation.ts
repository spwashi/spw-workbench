#!/usr/bin/env tsx
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { pathToFileURL } from 'node:url'

interface JsonRpcMessage {
  jsonrpc: '2.0'
  id?: number
  method?: string
  params?: any
  result?: any
  error?: { code: number, message: string, data?: any }
}

class LspClient {
  private child: ChildProcessWithoutNullStreams
  private pending = new Map<number, { resolve: (value: any) => void, reject: (error: Error) => void }>()
  private nextId = 1
  private incoming = Buffer.alloc(0)
  private notificationHandlers = new Map<string, ((params: any) => void)[]>()

  constructor(cwd: string) {
    this.child = spawn(
      process.execPath,
      ['--import', 'tsx', 'scripts/lsp/stdio-server.ts'],
      { cwd, stdio: 'pipe' }
    )

    this.child.stdout.on('data', (chunk: Buffer) => {
      this.incoming = Buffer.concat([this.incoming, chunk])
      this.processIncoming()
    })

    this.child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim()
      if (text) process.stderr.write(`[lsp-smoke][stderr] ${text}\n`)
    })

    this.child.on('exit', (code, signal) => {
      const reason = signal
        ? `exited by signal ${signal}`
        : `exited with code ${code ?? 0}`
      for (const { reject } of this.pending.values()) {
        reject(new Error(`LSP server ${reason}`))
      }
      this.pending.clear()
    })
  }

  private send(payload: JsonRpcMessage): void {
    const body = JSON.stringify(payload)
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`
    this.child.stdin.write(header + body)
  }

  private processIncoming(): void {
    while (true) {
      const headerEnd = this.incoming.indexOf('\r\n\r\n')
      if (headerEnd === -1) return

      const headerRaw = this.incoming.subarray(0, headerEnd).toString('utf8')
      const lengthLine = headerRaw
        .split('\r\n')
        .find((line) => line.toLowerCase().startsWith('content-length:'))
      if (!lengthLine) {
        this.incoming = this.incoming.subarray(headerEnd + 4)
        continue
      }

      const contentLength = Number(lengthLine.split(':')[1]?.trim() ?? '')
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        this.incoming = this.incoming.subarray(headerEnd + 4)
        continue
      }

      const bodyStart = headerEnd + 4
      const bodyEnd = bodyStart + contentLength
      if (this.incoming.length < bodyEnd) return

      const body = this.incoming.subarray(bodyStart, bodyEnd).toString('utf8')
      this.incoming = this.incoming.subarray(bodyEnd)

      const message = JSON.parse(body) as JsonRpcMessage

      // Handle responses to requests
      if (typeof message.id === 'number') {
        const pending = this.pending.get(message.id)
        if (!pending) continue
        this.pending.delete(message.id)
        if (message.error) {
          pending.reject(new Error(`${message.error.code}: ${message.error.message}`))
        } else {
          pending.resolve(message.result)
        }
      }

      // Handle server-initiated notifications
      if (message.method && typeof message.id !== 'number') {
        const handlers = this.notificationHandlers.get(message.method) ?? []
        for (const handler of handlers) {
          handler(message.params)
        }
      }
    }
  }

  request(method: string, params: any, timeoutMs: number = 5000): Promise<any> {
    const id = this.nextId++
    this.send({ jsonrpc: '2.0', id, method, params })
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`timeout waiting for ${method}`))
      }, timeoutMs)

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
    })
  }

  notify(method: string, params: any): void {
    this.send({ jsonrpc: '2.0', method, params })
  }

  /** Register a handler for server-initiated notifications */
  onNotification(method: string, handler: (params: any) => void): void {
    const handlers = this.notificationHandlers.get(method) ?? []
    handlers.push(handler)
    this.notificationHandlers.set(method, handlers)
  }

  /** Wait for a notification matching a predicate */
  waitForNotification(method: string, predicate: (params: any) => boolean, timeoutMs = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`timeout waiting for notification ${method}`))
      }, timeoutMs)

      this.onNotification(method, (params) => {
        if (predicate(params)) {
          clearTimeout(timer)
          resolve(params)
        }
      })
    })
  }

  async close(): Promise<void> {
    try {
      await this.request('shutdown', null, 2000)
    } catch {
      // ignore shutdown failures in smoke path
    }
    this.notify('exit', null)
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function findLineAndCharacter(source: string, pattern: string): { line: number, character: number } {
  const lines = source.split(/\r?\n/)
  const line = lines.findIndex((entry) => entry.includes(pattern))
  if (line < 0) {
    throw new Error(`Pattern not found in document: ${pattern}`)
  }

  const character = lines[line].indexOf(pattern)
  if (character < 0) {
    throw new Error(`Pattern index not found for: ${pattern}`)
  }

  return { line, character: character + Math.floor(pattern.length / 2) }
}

let passed = 0
let failed = 0

function ok(label: string): void {
  passed++
  process.stdout.write(`  ✓ ${label}\n`)
}

function fail(label: string, error: unknown): void {
  failed++
  const detail = error instanceof Error ? error.message : String(error)
  process.stderr.write(`  ✗ ${label}: ${detail}\n`)
}

async function main(): Promise<void> {
  const repoRoot = process.cwd()
  const client = new LspClient(repoRoot)

  try {
    // ── Initialize ────────────────────────────────────────────────

    const initResult = await client.request('initialize', {
      processId: process.pid,
      rootUri: pathToFileURL(repoRoot).toString(),
      capabilities: {},
    })
    client.notify('initialized', {})

    // Verify capabilities declared
    const cap = initResult?.capabilities ?? {}
    assert(cap.hoverProvider, 'Expected hoverProvider capability')
    assert(cap.documentSymbolProvider, 'Expected documentSymbolProvider capability')
    assert(cap.workspaceSymbolProvider, 'Expected workspaceSymbolProvider capability')
    assert(cap.completionProvider, 'Expected completionProvider capability')
    assert(cap.codeLensProvider, 'Expected codeLensProvider capability')
    assert(cap.documentFormattingProvider, 'Expected documentFormattingProvider capability')
    ok('initialize — all capabilities declared')

    // ── Open docs/index.spw ───────────────────────────────────────

    const docsIndexPath = path.join(repoRoot, 'docs', 'index.spw')
    const docsIndexUri = pathToFileURL(docsIndexPath).toString()
    const docsIndexSource = await fs.readFile(docsIndexPath, 'utf8')

    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: docsIndexUri,
        languageId: 'spw',
        version: 1,
        text: docsIndexSource,
      },
    })

    // ── Open .spw/workspace.spw (rich test target) ────────────────

    const workspacePath = path.join(repoRoot, '.spw', 'workspace.spw')
    const workspaceUri = pathToFileURL(workspacePath).toString()
    const workspaceSource = await fs.readFile(workspacePath, 'utf8')

    // Set up diagnostics listener before opening
    const diagPromise = client.waitForNotification(
      'textDocument/publishDiagnostics',
      (params: any) => params?.uri === workspaceUri,
      8000,
    )

    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: workspaceUri,
        languageId: 'spw',
        version: 1,
        text: workspaceSource,
      },
    })

    // ── Open .spw/agents.spw (directory ref target) ───────────────

    const agentsPath = path.join(repoRoot, '.spw', 'agents.spw')
    const agentsUri = pathToFileURL(agentsPath).toString()
    const agentsSource = await fs.readFile(agentsPath, 'utf8')

    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: agentsUri,
        languageId: 'spw',
        version: 1,
        text: agentsSource,
      },
    })

    // ── Open synthetic incomplete doc (fallback selector path) ─────

    const wrappedPath = path.join(repoRoot, '.spw', '__lsp-smoke-wrapped.spw')
    const wrappedUri = pathToFileURL(wrappedPath).toString()
    const wrapOps = ['&', '^', '*', '?', '~', '!', '%', '=']
    const wrappedPathLinesSource = wrapOps
      .map((op, idx) => `  mount_ref_${idx + 1}: ${op}~"./mount.spw"${op}`)
      .join('\n')
    const wrappedRootLinesSource = wrapOps
      .map((op, idx) => `  root_ref_${idx + 1}: ${op}@spw/harness${op}`)
      .join('\n')
    const wrappedSource = `^"demo"{\n${wrappedPathLinesSource}\n${wrappedRootLinesSource}\n`
    const wrappedLines = wrappedSource.split(/\r?\n/)
    const wrappedPathRefs = wrapOps.map((op) => {
      const lineIndex = wrappedLines.findIndex((line) => line.includes(`${op}~"./mount.spw"${op}`))
      assert(lineIndex >= 0, `Expected wrapped reference line for operator ${op}`)
      const line = wrappedLines[lineIndex]
      const lead = line.indexOf(op)
      const pathStart = line.indexOf('./mount.spw')
      const tail = line.lastIndexOf(op)
      assert(lead >= 0, `Expected wrapped leading operator in synthetic source for ${op}`)
      assert(pathStart >= 0, `Expected wrapped path in synthetic source for ${op}`)
      assert(tail > lead, `Expected wrapped trailing operator in synthetic source for ${op}`)
      return { op, lineIndex, lead, pathStart, tail }
    })
    const wrappedRootRefs = wrapOps.map((op) => {
      const lineIndex = wrappedLines.findIndex((line) => line.includes(`${op}@spw/harness${op}`))
      assert(lineIndex >= 0, `Expected wrapped root-ref line for operator ${op}`)
      const line = wrappedLines[lineIndex]
      const lead = line.indexOf(op)
      const rootStart = line.indexOf('@spw/harness')
      const tail = line.lastIndexOf(op)
      assert(lead >= 0, `Expected wrapped leading operator in synthetic root-ref source for ${op}`)
      assert(rootStart >= 0, `Expected wrapped root-ref in synthetic source for ${op}`)
      assert(tail > lead, `Expected wrapped trailing operator in synthetic root-ref source for ${op}`)
      return { op, lineIndex, lead, rootStart, tail }
    })

    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: wrappedUri,
        languageId: 'spw',
        version: 1,
        text: wrappedSource,
      },
    })

    // ── Open onboarding doc (stale local @src root override fallback) ──

    const onboardingPath = path.join(repoRoot, 'docs', 'features', 'spw', 'onboarding.spw')
    const onboardingUri = pathToFileURL(onboardingPath).toString()
    const onboardingSource = await fs.readFile(onboardingPath, 'utf8')

    client.notify('textDocument/didOpen', {
      textDocument: {
        uri: onboardingUri,
        languageId: 'spw',
        version: 1,
        text: onboardingSource,
      },
    })

    // ── 1. Navigation: definition + documentLink ──────────────────

    try {
      const localRefPos = findLineAndCharacter(docsIndexSource, './runtime')
      const localDef = await client.request('textDocument/definition', {
        textDocument: { uri: docsIndexUri },
        position: localRefPos,
      })
      assert(Array.isArray(localDef) && localDef.length > 0, 'Expected local-path definition result')
      const localUri = localDef[0]?.uri as string
      assert(localUri.includes('/docs/runtime/index.spw'), `Unexpected local-path definition URI: ${localUri}`)
      ok('definition — local path ref')
    } catch (e) { fail('definition — local path ref', e) }

    try {
      const architecturePath = path.join(repoRoot, 'docs', 'waypoints', 'spw', 'architecture.spw')
      const architectureUri = pathToFileURL(architecturePath).toString()
      const architectureSource = await fs.readFile(architecturePath, 'utf8')

      client.notify('textDocument/didOpen', {
        textDocument: {
          uri: architectureUri,
          languageId: 'spw',
          version: 1,
          text: architectureSource,
        },
      })

      const rootRefPos = findLineAndCharacter(architectureSource, '@src/seed/')
      const rootDef = await client.request('textDocument/definition', {
        textDocument: { uri: architectureUri },
        position: rootRefPos,
      })
      assert(Array.isArray(rootDef) && rootDef.length > 0, 'Expected root-path definition result')
      const rootUri = rootDef[0]?.uri as string
      assert(rootUri.includes('/src/seed/'), `Unexpected root-path definition URI: ${rootUri}`)
      ok('definition — @root path ref')
    } catch (e) { fail('definition — @root path ref', e) }

    try {
      const links = await client.request('textDocument/documentLink', {
        textDocument: { uri: docsIndexUri },
      })
      assert(Array.isArray(links) && links.length > 0, 'Expected at least one documentLink result')
      ok('documentLink — docs/index.spw')
    } catch (e) { fail('documentLink — docs/index.spw', e) }

    try {
      const dirRefPos = findLineAndCharacter(agentsSource, '@spw/harness')
      const dirDef = await client.request('textDocument/definition', {
        textDocument: { uri: agentsUri },
        position: dirRefPos,
      })
      assert(Array.isArray(dirDef) && dirDef.length > 0, 'Expected directory definition result')
      const dirUri = dirDef[0]?.uri as string
      assert(dirUri.includes('/.spw/harness'), `Unexpected directory definition URI: ${dirUri}`)
      ok('definition — @root directory ref')
    } catch (e) { fail('definition — @root directory ref', e) }

    try {
      const onboardingRefPos = findLineAndCharacter(onboardingSource, '@src/seed/')
      const onboardingDef = await client.request('textDocument/definition', {
        textDocument: { uri: onboardingUri },
        position: onboardingRefPos,
      })
      assert(Array.isArray(onboardingDef) && onboardingDef.length > 0, 'Expected onboarding @src fallback definition result')
      const onboardingTarget = onboardingDef[0]?.uri as string
      assert(onboardingTarget.includes('/src/seed/'), `Unexpected onboarding fallback definition URI: ${onboardingTarget}`)
      ok('definition — stale @root override falls back to workspace root')
    } catch (e) { fail('definition — stale @root override falls back to workspace root', e) }

    try {
      for (const wrappedRef of wrappedPathRefs) {
        const wrappedPositions = [wrappedRef.lead, wrappedRef.pathStart + 2, wrappedRef.tail]
        for (const character of wrappedPositions) {
          const wrappedDef = await client.request('textDocument/definition', {
            textDocument: { uri: wrappedUri },
            position: { line: wrappedRef.lineIndex, character },
          })
          assert(Array.isArray(wrappedDef) && wrappedDef.length > 0, 'Expected wrapped path definition result')
          const wrappedTarget = wrappedDef[0]?.uri as string
          assert(wrappedTarget.includes('/.spw/mount.spw'), `Unexpected wrapped definition URI: ${wrappedTarget}`)
        }
      }
      ok('definition — wrapped operator path refs (prefix/postfix)')
    } catch (e) { fail('definition — wrapped operator path refs (prefix/postfix)', e) }

    try {
      for (const wrappedRef of wrappedRootRefs) {
        const wrappedPositions = [wrappedRef.lead, wrappedRef.rootStart + 2, wrappedRef.tail]
        for (const character of wrappedPositions) {
          const wrappedDef = await client.request('textDocument/definition', {
            textDocument: { uri: wrappedUri },
            position: { line: wrappedRef.lineIndex, character },
          })
          assert(
            Array.isArray(wrappedDef) && wrappedDef.length > 0,
            `Expected wrapped root definition result for operator ${wrappedRef.op} at char ${character}`,
          )
          const wrappedTarget = wrappedDef[0]?.uri as string
          assert(wrappedTarget.includes('/.spw/harness'), `Unexpected wrapped root definition URI: ${wrappedTarget}`)
        }
      }
      ok('definition — wrapped operator root refs (prefix/postfix)')
    } catch (e) { fail('definition — wrapped operator root refs (prefix/postfix)', e) }

    try {
      const dirLinks = await client.request('textDocument/documentLink', {
        textDocument: { uri: agentsUri },
      })
      assert(Array.isArray(dirLinks) && dirLinks.length > 0, 'Expected at least one documentLink in agents.spw')
      assert(
        dirLinks.some((entry: any) => typeof entry?.target === 'string' && entry.target.includes('/.spw/harness')),
        'Expected directory documentLink target for @spw/harness',
      )
      ok('documentLink — @root directory ref')
    } catch (e) { fail('documentLink — @root directory ref', e) }

    try {
      const wrappedSelect = await client.request('spw/select', {
        textDocument: { uri: wrappedUri },
      })
      assert(Array.isArray(wrappedSelect), 'Expected selector hits array for wrapped source')
      const expectedWrappedHits = wrapOps.length * 2
      assert(wrappedSelect.length === expectedWrappedHits, `Expected ${expectedWrappedHits} wrapped selector hits`)
      const byLine = new Map<number, any>()
      for (const hit of wrappedSelect) byLine.set(hit?.span?.startLine, hit)
      const wrappedRefs = [...wrappedPathRefs, ...wrappedRootRefs]
      for (const wrappedRef of wrappedRefs) {
        const wrappedHit = byLine.get(wrappedRef.lineIndex)
        assert(!!wrappedHit, `Expected selector hit for wrapped operator ${wrappedRef.op}`)
        assert(wrappedHit.span.startCharacter <= wrappedRef.lead, `Expected span to include prefix operator ${wrappedRef.op}`)
        assert(wrappedHit.span.endCharacter >= wrappedRef.tail, `Expected span to include postfix operator ${wrappedRef.op}`)
      }
      ok('spw/select — wrapped spans include operators')
    } catch (e) { fail('spw/select — wrapped spans include operators', e) }

    // ── 2. Hover ──────────────────────────────────────────────────

    try {
      // Hover on ^"roots" frame header in workspace.spw
      const framePos = findLineAndCharacter(workspaceSource, '^"roots"')
      const hoverFrame = await client.request('textDocument/hover', {
        textDocument: { uri: workspaceUri },
        position: { line: framePos.line, character: 0 },
      })
      assert(hoverFrame && hoverFrame.contents, 'Expected hover contents for frame')
      const hoverText = typeof hoverFrame.contents === 'string'
        ? hoverFrame.contents
        : hoverFrame.contents.value ?? ''
      assert(hoverText.length > 0, 'Expected non-empty hover text for frame')
      ok('hover — frame header (^)')
    } catch (e) { fail('hover — frame header (^)', e) }

    try {
      // Hover on #:manifest annotation
      const annotPos = findLineAndCharacter(workspaceSource, '#:manifest')
      const hoverAnnot = await client.request('textDocument/hover', {
        textDocument: { uri: workspaceUri },
        position: annotPos,
      })
      assert(hoverAnnot && hoverAnnot.contents, 'Expected hover contents for annotation')
      ok('hover — annotation (#:)')
    } catch (e) { fail('hover — annotation (#:)', e) }

    try {
      // Hover on a sigil character (~ or @ or ^)
      const sigilPos = findLineAndCharacter(workspaceSource, '@repo:')
      const hoverSigil = await client.request('textDocument/hover', {
        textDocument: { uri: workspaceUri },
        position: { line: sigilPos.line, character: sigilPos.character },
      })
      // Sigil hover might be a @root hover instead — both are valid
      assert(hoverSigil && hoverSigil.contents, 'Expected hover contents for @root or sigil')
      ok('hover — @root / sigil')
    } catch (e) { fail('hover — @root / sigil', e) }

    // ── 3. Document Symbols ───────────────────────────────────────

    try {
      const symbols = await client.request('textDocument/documentSymbol', {
        textDocument: { uri: workspaceUri },
      })
      assert(Array.isArray(symbols), 'Expected document symbol array')
      assert(symbols.length > 0, 'Expected at least one document symbol')
      // Should have frame symbols like "roots", "dialect", "spirit_sequence"
      const names = symbols.map((s: any) => s.name)
      assert(names.some((n: string) => n.includes('roots')), 'Expected "roots" frame in symbols')
      ok('documentSymbol — workspace.spw')
    } catch (e) { fail('documentSymbol — workspace.spw', e) }

    // ── 4. Workspace Symbols ──────────────────────────────────────

    try {
      const wsSymbols = await client.request('workspace/symbol', {
        query: 'manifest',
      })
      assert(Array.isArray(wsSymbols), 'Expected workspace symbol array')
      // The annotation index should find #:manifest across the workspace
      ok('workspaceSymbol — query "manifest"')
    } catch (e) { fail('workspaceSymbol — query "manifest"', e) }

    // ── 5. Completion ─────────────────────────────────────────────

    try {
      // Trigger completion after @ character (root completion)
      const atPos = findLineAndCharacter(workspaceSource, '@repo:')
      const completion = await client.request('textDocument/completion', {
        textDocument: { uri: workspaceUri },
        position: { line: atPos.line, character: atPos.character + 1 },
      })
      assert(completion, 'Expected completion result')
      const items = Array.isArray(completion) ? completion : (completion.items ?? [])
      assert(Array.isArray(items), 'Expected completion items array')
      ok('completion — @root trigger')
    } catch (e) { fail('completion — @root trigger', e) }

    // ── 6. Code Lens ──────────────────────────────────────────────

    try {
      const codeLenses = await client.request('textDocument/codeLens', {
        textDocument: { uri: workspaceUri },
      })
      assert(Array.isArray(codeLenses), 'Expected code lens array')
      // workspace.spw has ^"roots" with annotations — should generate lenses
      ok('codeLens — workspace.spw')
    } catch (e) { fail('codeLens — workspace.spw', e) }

    try {
      // Also test against docs/index.spw which has #>docs anchor
      const docsLenses = await client.request('textDocument/codeLens', {
        textDocument: { uri: docsIndexUri },
      })
      assert(Array.isArray(docsLenses), 'Expected code lens array for docs')
      ok('codeLens — docs/index.spw')
    } catch (e) { fail('codeLens — docs/index.spw', e) }

    // ── 7. Formatting ─────────────────────────────────────────────

    try {
      const edits = await client.request('textDocument/formatting', {
        textDocument: { uri: workspaceUri },
        options: { tabSize: 2, insertSpaces: true },
      })
      assert(Array.isArray(edits), 'Expected formatting edits array')
      ok('formatting — workspace.spw')
    } catch (e) { fail('formatting — workspace.spw', e) }

    // ── 8. Diagnostics (async — wait for notification) ────────────

    try {
      const diagParams = await diagPromise
      assert(diagParams?.uri === workspaceUri, 'Expected diagnostics for workspace.spw')
      assert(Array.isArray(diagParams.diagnostics), 'Expected diagnostics array')
      ok(`diagnostics — workspace.spw (${diagParams.diagnostics.length} items)`)
    } catch (e) { fail('diagnostics — workspace.spw', e) }

    // ── Summary ───────────────────────────────────────────────────

    process.stdout.write(`\nLSP smoke: ${passed} passed, ${failed} failed\n`)
    if (failed > 0) process.exit(1)
  } finally {
    await client.close()
  }
}

void main().catch((error) => {
  const details = error instanceof Error ? error.message : String(error)
  process.stderr.write(`LSP smoke test failed: ${details}\n`)
  process.exit(1)
})

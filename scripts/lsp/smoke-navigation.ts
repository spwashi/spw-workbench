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

      const headerRaw = this.incoming.slice(0, headerEnd).toString('utf8')
      const lengthLine = headerRaw
        .split('\r\n')
        .find((line) => line.toLowerCase().startsWith('content-length:'))
      if (!lengthLine) {
        this.incoming = this.incoming.slice(headerEnd + 4)
        continue
      }

      const contentLength = Number(lengthLine.split(':')[1]?.trim() ?? '')
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        this.incoming = this.incoming.slice(headerEnd + 4)
        continue
      }

      const bodyStart = headerEnd + 4
      const bodyEnd = bodyStart + contentLength
      if (this.incoming.length < bodyEnd) return

      const body = this.incoming.slice(bodyStart, bodyEnd).toString('utf8')
      this.incoming = this.incoming.slice(bodyEnd)

      const message = JSON.parse(body) as JsonRpcMessage
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

async function main(): Promise<void> {
  const repoRoot = process.cwd()
  const client = new LspClient(repoRoot)

  try {
    await client.request('initialize', {
      processId: process.pid,
      rootUri: pathToFileURL(repoRoot).toString(),
      capabilities: {},
    })
    client.notify('initialized', {})

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

    const localRefPos = findLineAndCharacter(docsIndexSource, './runtime')
    const localDef = await client.request('textDocument/definition', {
      textDocument: { uri: docsIndexUri },
      position: localRefPos,
    })
    assert(Array.isArray(localDef) && localDef.length > 0, 'Expected local-path definition result')
    const localUri = localDef[0]?.uri as string
    assert(localUri.includes('/docs/runtime/index.spw'), `Unexpected local-path definition URI: ${localUri}`)

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

    const links = await client.request('textDocument/documentLink', {
      textDocument: { uri: docsIndexUri },
    })
    assert(Array.isArray(links) && links.length > 0, 'Expected at least one documentLink result')

    process.stdout.write('LSP smoke navigation passed\n')
  } finally {
    await client.close()
  }
}

void main().catch((error) => {
  const details = error instanceof Error ? error.message : String(error)
  process.stderr.write(`LSP smoke navigation failed: ${details}\n`)
  process.exit(1)
})

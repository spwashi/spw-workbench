import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { build } from 'esbuild'
import {
  parseSpwWorkspaceManifestV1,
  SPW_WORKSPACE_MANIFEST_METHOD_V1,
} from '../workspace-protocol'

interface RpcMessage {
  jsonrpc: '2.0'
  id?: number | string
  method?: string
  params?: unknown
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

class TestLspClient {
  private readonly child: ChildProcessWithoutNullStreams
  private readonly pending = new Map<number, {
    resolve(message: RpcMessage): void
    reject(error: Error): void
  }>()
  private incoming = Buffer.alloc(0)
  /** Every message the server sent, in order, including its own requests to the client. */
  readonly received: RpcMessage[] = []
  private nextId = 1
  private stderr = ''

  constructor(serverPath: string, repoRoot: string) {
    this.child = spawn(
      process.execPath,
      [serverPath],
      { cwd: repoRoot, stdio: 'pipe' },
    )
    this.child.stdout.on('data', (chunk: Buffer) => {
      this.incoming = Buffer.concat([this.incoming, chunk])
      this.readMessages()
    })
    this.child.stderr.on('data', (chunk: Buffer) => {
      this.stderr += chunk.toString('utf8')
    })
    this.child.on('exit', (code, signal) => {
      const error = new Error(
        `LSP exited code=${code ?? 'null'} signal=${signal ?? 'none'} stderr=${this.stderr.trim()}`,
      )
      for (const pending of this.pending.values()) pending.reject(error)
      this.pending.clear()
    })
  }

  request(method: string, params: unknown): Promise<RpcMessage> {
    const id = this.nextId++
    this.send({ jsonrpc: '2.0', id, method, params })
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Timed out waiting for ${method}. stderr=${this.stderr.trim()}`))
      }, 10_000)
      this.pending.set(id, {
        resolve: (message) => {
          clearTimeout(timeout)
          resolve(message)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      })
    })
  }

  notify(method: string, params: unknown): void {
    this.send({ jsonrpc: '2.0', method, params })
  }

  /** Answer a request the server sent. */
  reply(id: number | string, result: unknown): void {
    this.send({ jsonrpc: '2.0', id, result })
  }

  async close(): Promise<void> {
    if (this.child.exitCode !== null) return
    try {
      await this.request('shutdown', null)
      this.notify('exit', null)
    } finally {
      this.child.kill()
    }
  }

  private send(message: RpcMessage): void {
    const body = JSON.stringify(message)
    this.child.stdin.write(
      `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`,
    )
  }

  private readMessages(): void {
    while (true) {
      const headerEnd = this.incoming.indexOf('\r\n\r\n')
      if (headerEnd < 0) return
      const header = this.incoming.subarray(0, headerEnd).toString('utf8')
      const length = Number(header.match(/content-length:\s*(\d+)/i)?.[1])
      if (!Number.isInteger(length) || length < 0) return
      const bodyStart = headerEnd + 4
      const bodyEnd = bodyStart + length
      if (this.incoming.length < bodyEnd) return
      const message = JSON.parse(
        this.incoming.subarray(bodyStart, bodyEnd).toString('utf8'),
      ) as RpcMessage
      this.incoming = this.incoming.subarray(bodyEnd)
      this.received.push(message)
      if (typeof message.id === 'number') {
        const pending = this.pending.get(message.id)
        this.pending.delete(message.id)
        pending?.resolve(message)
      }
    }
  }
}

let activeClient: TestLspClient | null = null

afterEach(async () => {
  await activeClient?.close()
  activeClient = null
})

describe('workspace stdio integration', () => {
  it('re-anchors nested initialization and dispatches URI-first v1 evidence', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-lsp-stdio-'))
    try {
      const consumerRoot = path.join(tempRoot, 'consumer with spaces')
      const spwRoot = path.join(consumerRoot, '.spw')
      const workbenchRoot = path.join(spwRoot, '_workbench')
      const nestedStart = path.join(workbenchRoot, 'packages', 'probe')
      const manifestPath = path.join(spwRoot, 'workspace.spw')
      await fs.mkdir(path.join(workbenchRoot, '.spw'), { recursive: true })
      await fs.mkdir(nestedStart, { recursive: true })
      await fs.writeFile(path.join(spwRoot, 'mount.spw'), '^"mount"{}\n')
      await fs.writeFile(path.join(workbenchRoot, '.spw', 'mount.spw'), '^"mount"{}\n')
      await fs.writeFile(manifestPath, '^"roots"{\n @repo: ~".."\n}\n')
      await fs.writeFile(path.join(spwRoot, 'consumer.spw'), '^"consumer_marker"{}\n')
      await fs.writeFile(
        path.join(workbenchRoot, '.spw', 'infrastructure.spw'),
        '^"infrastructure_marker"{}\n',
      )

      const bundledServer = path.join(tempRoot, 'spw-lsp.mjs')
      await build({
        entryPoints: [path.join(process.cwd(), 'packages', 'spw-lsp', 'src', 'stdio-server.ts')],
        bundle: true,
        platform: 'node',
        format: 'esm',
        outfile: bundledServer,
        tsconfig: path.join(process.cwd(), 'tsconfig.base.json'),
      })

      activeClient = new TestLspClient(bundledServer, process.cwd())
      const initialized = await activeClient.request('initialize', {
        processId: process.pid,
        rootUri: pathToFileURL(process.cwd()).toString(),
        workspaceFolders: [{
          uri: pathToFileURL(nestedStart).toString(),
          name: 'nested',
        }],
        capabilities: {},
      })
      activeClient.notify('initialized', {})

      expect(initialized.error).toBeUndefined()
      expect(initialized.result).toMatchObject({
        capabilities: {
          experimental: {
            spw: {
              workspaceManifest: {
                method: SPW_WORKSPACE_MANIFEST_METHOD_V1,
                schemaVersion: 1,
                surface: 'spw.workspaceManifest',
                identity: 'uri',
              },
            },
          },
        },
      })
      expect(JSON.stringify(initialized.result)).not.toContain(tempRoot)

      const currentResponse = await activeClient.request(SPW_WORKSPACE_MANIFEST_METHOD_V1, {})
      const current = parseSpwWorkspaceManifestV1(currentResponse.result)
      expect(current.workspace).toEqual({
        mode: 'mounted-consumer',
        consumerUri: pathToFileURL(consumerRoot).toString(),
        spwUri: pathToFileURL(spwRoot).toString(),
        workbenchUri: pathToFileURL(workbenchRoot).toString(),
      })
      expect(current.roots.map(({ sigil, role }) => ({ sigil, role }))).toEqual([
        { sigil: 'repo', role: 'consumer' },
        { sigil: 'workbench', role: 'infrastructure' },
      ])

      const symbols = await waitForSymbols(activeClient, 'consumer_marker')
      expect(symbols).toHaveLength(1)
      const infrastructure = await activeClient.request('workspace/symbol', {
        query: 'infrastructure_marker',
      })
      expect(infrastructure.result).toEqual([])

      activeClient.notify('textDocument/didOpen', {
        textDocument: {
          uri: pathToFileURL(manifestPath).toString(),
          languageId: 'spw',
          version: '1',
          text: '^"roots"{\n @repo: ~".."\n @repo: ~"../other"\n}\n',
        },
      })
      const ignoredInvalidVersion = await activeClient.request(SPW_WORKSPACE_MANIFEST_METHOD_V1, {})
      expect(parseSpwWorkspaceManifestV1(ignoredInvalidVersion.result).manifest).toMatchObject({
        status: 'valid',
        readFrom: { kind: 'filesystem' },
      })

      activeClient.notify('textDocument/didOpen', {
        textDocument: {
          uri: pathToFileURL(manifestPath).toString(),
          languageId: 'spw',
          version: -1,
          text: '^"roots"{\n @repo: ~".."\n}\n',
        },
      })
      const validOpenDocument = await activeClient.request(SPW_WORKSPACE_MANIFEST_METHOD_V1, {})
      expect(parseSpwWorkspaceManifestV1(validOpenDocument.result).manifest).toMatchObject({
        status: 'valid',
        readFrom: { kind: 'open-document', version: -1 },
      })

      activeClient.notify('textDocument/didChange', {
        textDocument: {
          uri: pathToFileURL(manifestPath).toString(),
          version: 2_147_483_648,
        },
        contentChanges: [{
          text: '^"roots"{\n @repo: ~".."\n @repo: ~"../other"\n}\n',
        }],
      })
      const ignoredOutOfRangeVersion = await activeClient.request(SPW_WORKSPACE_MANIFEST_METHOD_V1, {})
      expect(parseSpwWorkspaceManifestV1(ignoredOutOfRangeVersion.result).manifest).toMatchObject({
        status: 'valid',
        readFrom: { kind: 'open-document', version: -1 },
      })

      activeClient.notify('textDocument/didChange', {
        textDocument: {
          uri: pathToFileURL(manifestPath).toString(),
          version: 0,
        },
        contentChanges: [{
          text: '^"roots"{\n @repo: ~".."\n @repo: ~"../other"\n}\n',
        }],
      })
      const blockedResponse = await activeClient.request(SPW_WORKSPACE_MANIFEST_METHOD_V1, {})
      const blocked = parseSpwWorkspaceManifestV1(blockedResponse.result)
      expect(blocked).toMatchObject({
        rootSource: 'blocked',
        manifest: {
          status: 'invalid',
          readFrom: { kind: 'open-document', version: 0 },
        },
        roots: [],
      })
    } finally {
      await activeClient?.close()
      activeClient = null
      await fs.rm(tempRoot, { recursive: true, force: true })
    }
  }, 15_000)
})

async function startServer(capabilities: unknown): Promise<{ client: TestLspClient; tempRoot: string }> {
  // The real path, so the server's root and the document uris name files alike.
  const tempRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'spw-lsp-watch-')))
  const bundledServer = path.join(tempRoot, 'spw-lsp.mjs')
  await build({
    entryPoints: [path.join(process.cwd(), 'packages', 'spw-lsp', 'src', 'stdio-server.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundledServer,
    tsconfig: path.join(process.cwd(), 'tsconfig.base.json'),
  })
  const client = new TestLspClient(bundledServer, tempRoot)
  activeClient = client
  const initialized = await client.request('initialize', { processId: process.pid, rootUri: pathToFileURL(tempRoot).toString(), capabilities })
  expect(initialized.error).toBeUndefined()
  client.notify('initialized', {})
  return { client, tempRoot }
}

describe('watched files over stdio', () => {
  it('registers .spw watchers and folder deletes for a client that takes dynamic registration, and ignores its reply', async () => {
    const { client, tempRoot } = await startServer({ workspace: { didChangeWatchedFiles: { dynamicRegistration: true } } })
    try {
      await client.request('workspace/symbol', { query: 'x' })
      const registrations = client.received.filter((message) => message.method === 'client/registerCapability')
      expect(registrations).toHaveLength(1)
      expect(registrations[0]!.params).toMatchObject({
        registrations: [{
          method: 'workspace/didChangeWatchedFiles',
          registerOptions: { watchers: [{ globPattern: '**/*.spw' }, { globPattern: '**/*', kind: 4 }] },
        }],
      })
      client.reply(registrations[0]!.id!, null)
      await client.request('workspace/symbol', { query: 'x' })
      expect(client.received.filter((message) => message.id === registrations[0]!.id && message.error)).toEqual([])
    } finally {
      await client.close()
      activeClient = null
      await fs.rm(tempRoot, { recursive: true, force: true })
    }
  }, 15_000)

  it('registers nothing for a client that does not take dynamic registration', async () => {
    const { client, tempRoot } = await startServer({})
    try {
      await client.request('workspace/symbol', { query: 'x' })
      expect(client.received.some((message) => message.method === 'client/registerCapability')).toBe(false)
    } finally {
      await client.close()
      activeClient = null
      await fs.rm(tempRoot, { recursive: true, force: true })
    }
  }, 15_000)
})

describe('code lens refresh over stdio', () => {
  async function openFamily(client: TestLspClient, tempRoot: string): Promise<string> {
    const family = path.join(tempRoot, '_family.spw')
    await fs.writeFile(family, '#>family\n')
    await fs.writeFile(path.join(tempRoot, 'a.spw'), '@family: ~"./_family.spw"\n')
    const uri = pathToFileURL(family).toString()
    client.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'spw', version: 1, text: '#>family\n' } })
    return uri
  }

  const titlesOf = (message: RpcMessage): string[] =>
    ((message.result ?? []) as Array<{ command?: { title: string } }>).map((lens) => lens.command?.title ?? '')

  async function until(check: () => Promise<boolean> | boolean): Promise<boolean> {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (await check()) return true
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    return false
  }

  it('asks a client that takes refresh to come back once citations are counted', async () => {
    const { client, tempRoot } = await startServer({ workspace: { codeLens: { refreshSupport: true } } })
    try {
      const uri = await openFamily(client, tempRoot)
      const cold = await client.request('textDocument/codeLens', { textDocument: { uri } })
      expect(titlesOf(cold).filter((title) => /cited by|no cross-file/.test(title))).toEqual([])

      const refresh = () => client.received.find((message) => message.method === 'workspace/codeLens/refresh')
      expect(await until(() => refresh() !== undefined)).toBe(true)
      client.reply(refresh()!.id!, null)

      const warm = await client.request('textDocument/codeLens', { textDocument: { uri } })
      expect(titlesOf(warm)).toContain('↙ cited by 1 file · 1 citation')
    } finally {
      await client.close()
      activeClient = null
      await fs.rm(tempRoot, { recursive: true, force: true })
    }
  }, 15_000)

  it('sends no refresh to a client that did not offer to take one', async () => {
    const { client, tempRoot } = await startServer({})
    try {
      const uri = await openFamily(client, tempRoot)
      const counted = await until(async () => {
        const lenses = await client.request('textDocument/codeLens', { textDocument: { uri } })
        return titlesOf(lenses).some((title) => title.startsWith('↙ cited by'))
      })
      expect(counted).toBe(true)
      expect(client.received.some((message) => message.method === 'workspace/codeLens/refresh')).toBe(false)
    } finally {
      await client.close()
      activeClient = null
      await fs.rm(tempRoot, { recursive: true, force: true })
    }
  }, 15_000)
})

async function waitForSymbols(
  client: TestLspClient,
  query: string,
): Promise<unknown[]> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await client.request('workspace/symbol', { query })
    if (Array.isArray(response.result) && response.result.length > 0) return response.result
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return []
}

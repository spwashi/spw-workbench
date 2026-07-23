#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

async function main() {
  const archiveArgument = process.argv[2]
  if (!archiveArgument) {
    throw new Error('Usage: smoke-vscode-extension.mjs <vscode-extension.tar.gz>')
  }

  const archivePath = path.resolve(archiveArgument)
  const extractionRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-vscode-archive-'))
  let client = null

  try {
    extractArchive(archivePath, extractionRoot)
    const manifest = JSON.parse(
      await fs.readFile(path.join(extractionRoot, 'package.json'), 'utf8'),
    )
    await verifyRuntimeFiles(manifest, extractionRoot)
    verifyCommandContributions(manifest)

    const serverRelativePath = runtimePath(manifest.spw?.server, 'spw.server')
    const serverPath = path.join(extractionRoot, serverRelativePath)
    client = new JsonRpcClient(serverPath, extractionRoot)

    const initialized = await client.request('initialize', {
      processId: process.pid,
      rootUri: pathToFileURL(extractionRoot).toString(),
      workspaceFolders: [{
        uri: pathToFileURL(extractionRoot).toString(),
        name: 'extracted-extension',
      }],
      capabilities: {},
    })
    client.notify('initialized', {})

    const advertised = initialized?.capabilities?.experimental?.spw?.workspaceManifest
    assert(advertised?.method === manifest.spw.workspaceManifestMethod,
      'Bundled server did not advertise the packaged workspace method.')
    assert(advertised?.schemaVersion === 1, 'Bundled server advertised an unexpected schema version.')

    const evidence = await client.request(advertised.method, {})
    assert(evidence?.schemaVersion === 1 && evidence?.surface === 'spw.workspaceManifest',
      'Bundled server returned invalid workspace evidence.')
    assert(evidence?.workspace?.mode === 'standalone-consumer',
      'Extracted archive smoke should initialize as a standalone consumer.')
    assert(evidence?.roots?.[0]?.role === 'consumer',
      'Standalone fallback root should retain consumer role.')
    assert(!containsForbiddenPathKey(evidence),
      'URI-first workspace evidence leaked a process-local path field.')

    await client.request('shutdown', null)
    client.notify('exit', null)
    await client.waitForExit()
    client = null
    console.log('VS Code extracted-archive smoke passed.')
  } finally {
    client?.stop()
    await fs.rm(extractionRoot, { recursive: true, force: true })
  }
}

function extractArchive(archive, destination) {
  const result = spawnSync('tar', ['-xzf', archive, '-C', destination], {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(`Unable to extract VS Code archive: ${result.stderr || result.stdout}`)
  }
}

async function verifyRuntimeFiles(manifest, root) {
  const required = new Set([
    runtimePath(manifest.main, 'main'),
    runtimePath(manifest.icon, 'icon'),
    runtimePath(manifest.spw?.server, 'spw.server'),
  ])
  for (const language of manifest.contributes?.languages ?? []) {
    if (language.configuration) required.add(runtimePath(language.configuration, 'language configuration'))
  }
  for (const grammar of manifest.contributes?.grammars ?? []) {
    required.add(runtimePath(grammar.path, 'grammar path'))
  }
  for (const snippets of manifest.contributes?.snippets ?? []) {
    required.add(runtimePath(snippets.path, 'snippet path'))
  }

  for (const relativePath of required) {
    const target = path.resolve(root, relativePath)
    const relative = path.relative(root, target)
    assert(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
      `Packaged runtime path escapes the archive: ${relativePath}`)
    await fs.access(target)
  }
}

function verifyCommandContributions(manifest) {
  assert(!Object.hasOwn(manifest, 'commands'), 'VS Code commands must live under contributes.commands.')
  const actual = (manifest.contributes?.commands ?? [])
    .map((entry) => entry.command)
    .sort()
  // Reviewed 2026-07-23: the LSP arc added the probe/geometry/form-sequence
  // command set; every entry below is registered in extension source.
  const expected = [
    'spw.clearProbeCache',
    'spw.insertFormSequence',
    'spw.inspectCache',
    'spw.inspectGeometry',
    'spw.navigate',
    'spw.restartLanguageServer',
    'spw.showFormSequence',
    'spw.showOperatorFrequency',
    'spw.showPhaseContext',
    'spw.showReferenceHubs',
    'spw.showWorkspaceTemperature',
    'spwConcepts.clearFilter',
    'spwConcepts.refresh',
    'spwConcepts.setFilter',
    'spwConcepts.setGrouping',
    'spwWorkspace.refresh',
  ].sort()
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    'Command palette contributions do not match the reviewed public surface.')
}

function runtimePath(value, field) {
  assert(typeof value === 'string' && value.length > 0, `Missing package field: ${field}`)
  return value.replace(/^\.\//, '')
}

function containsForbiddenPathKey(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenPathKey)
  if (typeof value !== 'object' || value === null) return false
  const forbidden = new Set([
    'resolvedPath',
    'absolutePath',
    'filePath',
    'consumerRoot',
    'spwRoot',
    'workbenchRoot',
    'manifestPath',
  ])
  return Object.entries(value).some(([key, nested]) =>
    forbidden.has(key) || containsForbiddenPathKey(nested),
  )
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

class JsonRpcClient {
  constructor(serverPath, cwd) {
    const environment = { ...process.env }
    delete environment.SPW_WORKBENCH_ROOT
    delete environment.NODE_OPTIONS
    this.child = spawn(process.execPath, [serverPath], {
      cwd,
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.buffer = Buffer.alloc(0)
    this.pending = new Map()
    this.nextId = 1
    this.stderr = ''
    this.child.stdout.on('data', (chunk) => this.receive(chunk))
    this.child.stderr.on('data', (chunk) => { this.stderr += chunk.toString('utf8') })
    this.child.on('exit', (code) => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer)
        reject(new Error(`Bundled server exited with ${code}: ${this.stderr}`))
      }
      this.pending.clear()
    })
  }

  request(method, params) {
    const id = this.nextId++
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Timed out waiting for ${method}: ${this.stderr}`))
      }, 10_000)
      this.pending.set(id, { resolve, reject, timer })
    })
    this.write({ jsonrpc: '2.0', id, method, params })
    return result
  }

  notify(method, params) {
    this.write({ jsonrpc: '2.0', method, params })
  }

  async waitForExit() {
    if (this.child.exitCode !== null) return
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Bundled server did not exit: ${this.stderr}`)),
        10_000,
      )
      this.child.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  stop() {
    if (this.child.exitCode === null) this.child.kill()
  }

  write(message) {
    const body = Buffer.from(JSON.stringify(message), 'utf8')
    this.child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`)
    this.child.stdin.write(body)
  }

  receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n')
      if (headerEnd < 0) return
      const header = this.buffer.subarray(0, headerEnd).toString('ascii')
      const lengthMatch = header.match(/Content-Length:\s*(\d+)/i)
      if (!lengthMatch) throw new Error(`Malformed server response header: ${header}`)
      const length = Number(lengthMatch[1])
      const bodyStart = headerEnd + 4
      const bodyEnd = bodyStart + length
      if (this.buffer.length < bodyEnd) return
      const message = JSON.parse(this.buffer.subarray(bodyStart, bodyEnd).toString('utf8'))
      this.buffer = this.buffer.subarray(bodyEnd)
      if (typeof message.id !== 'number') continue
      const pending = this.pending.get(message.id)
      if (!pending) continue
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)))
      else pending.resolve(message.result)
    }
  }
}

await main()

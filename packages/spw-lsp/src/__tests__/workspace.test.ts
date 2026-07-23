import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ServerIndex } from '../server-index'
import {
  workspaceManifest,
  workspaceManifestV1,
  workspaceTemperature,
} from '../handlers/workspace'
import {
  SPW_WORKSPACE_MANIFEST_METHOD,
  SPW_WORKSPACE_MANIFEST_METHOD_V1,
} from '../workspace-protocol'
import { discoverWorkspaceConsumerPath } from '../workspace-authority'
import type { HandlerDeps } from '../types'

function makeWorkspaceDeps(serverIndex: ServerIndex, workspaceRoot: string): HandlerDeps {
  return {
    serverIndex,
    workspaceRoot,
    uriFromPath: (filePath: string) => pathToFileURL(filePath).toString(),
    pathFromUri: (uri: string) => {
      try {
        return fileURLToPath(uri)
      } catch {
        return null
      }
    },
  } as HandlerDeps
}

async function withTempWorkspace(
  run: (workspaceRoot: string) => Promise<void>,
): Promise<void> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-lsp-workspace-'))
  try {
    await run(workspaceRoot)
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true })
  }
}

async function makeCanonicalWorkbench(workspaceRoot: string): Promise<void> {
  await fs.mkdir(path.join(workspaceRoot, '.spw'), { recursive: true })
  await fs.mkdir(path.join(workspaceRoot, 'packages', 'spw-cli'), { recursive: true })
  await fs.writeFile(
    path.join(workspaceRoot, 'package.json'),
    JSON.stringify({ name: 'spw-workbench' }),
    'utf8',
  )
  await fs.writeFile(
    path.join(workspaceRoot, 'packages', 'spw-cli', 'package.json'),
    JSON.stringify({ name: '@spwashi/spw-cli' }),
    'utf8',
  )
}

describe('workspace manifest protocol', () => {
  it('uses stable, separately versioned request method names', () => {
    expect(SPW_WORKSPACE_MANIFEST_METHOD).toBe('spw/workspaceManifest')
    expect(SPW_WORKSPACE_MANIFEST_METHOD_V1).toBe('spw/workspaceManifest/v1')
  })

  it('prefers an open valid manifest and returns only URI root identity', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      await makeCanonicalWorkbench(workspaceRoot)
      const manifestPath = path.join(workspaceRoot, '.spw', 'workspace.spw')
      const notesPath = path.join(workspaceRoot, 'research notes')
      const agentsPath = path.join(workspaceRoot, '.spw', 'agents.spw')
      await fs.mkdir(notesPath)
      await fs.writeFile(agentsPath, '# agents\n', 'utf8')
      await fs.writeFile(manifestPath, '^"roots"{\n @repo: ~".."\n}\n', 'utf8')

      const serverIndex = new ServerIndex(workspaceRoot)
      serverIndex.openDocument(
        pathToFileURL(manifestPath).toString(),
        manifestPath,
        '^"roots"{\n @notes: ~"../research notes"\n @agents: ~"./agents.spw"\n}\n',
        1,
      )

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceRoot))

      expect(result.schemaVersion).toBe(1)
      expect(result.surface).toBe('spw.workspaceManifest')
      expect(result.workspace).toEqual({
        mode: 'canonical',
        consumerUri: pathToFileURL(workspaceRoot).toString(),
        spwUri: pathToFileURL(path.join(workspaceRoot, '.spw')).toString(),
        workbenchUri: pathToFileURL(workspaceRoot).toString(),
      })
      expect(result.manifest).toEqual({
        status: 'valid',
        uri: pathToFileURL(manifestPath).toString(),
        readFrom: { kind: 'open-document', version: 1 },
        diagnostics: [],
      })
      expect(result.rootSource).toBe('manifest')
      expect(result.roots).toEqual([
        {
          sigil: 'notes',
          uri: pathToFileURL(notesPath).toString(),
          role: 'canonical',
          kind: 'directory',
        },
        {
          sigil: 'agents',
          uri: pathToFileURL(agentsPath).toString(),
          role: 'canonical',
          kind: 'file',
        },
      ])
      expect(result.roots[0]?.uri).toContain('research%20notes')
      expect(JSON.stringify(result)).not.toMatch(
        /"(?:resolvedPath|absolutePath|filePath|consumerRoot|workbenchRoot|manifestPath)"\s*:/,
      )
      expect(result).not.toHaveProperty('projections')
    })
  })

  it('uses an explicit fallback only when the manifest is absent', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      await makeCanonicalWorkbench(workspaceRoot)
      const serverIndex = new ServerIndex(workspaceRoot)
      const deps = makeWorkspaceDeps(serverIndex, workspaceRoot)

      const result = await workspaceManifestV1(deps)
      const legacy = await workspaceManifest(deps)

      expect(result.rootSource).toBe('fallback')
      expect(result.manifest).toEqual({
        status: 'absent',
        uri: pathToFileURL(path.join(workspaceRoot, '.spw', 'workspace.spw')).toString(),
        readFrom: { kind: 'filesystem' },
        diagnostics: [],
      })
      expect(result.roots).toEqual([{
        sigil: 'spw',
        uri: pathToFileURL(path.join(workspaceRoot, '.spw')).toString(),
        role: 'canonical',
        kind: 'directory',
      }])
      expect(legacy).toEqual({
        rootSource: 'inferred',
        manifestUri: null,
        roots: [{
          sigil: 'spw',
          uri: pathToFileURL(path.join(workspaceRoot, '.spw')).toString(),
          resolvedPath: path.join(workspaceRoot, '.spw'),
        }],
        projections: [],
      })
    })
  })

  it('does not fabricate mounted infrastructure for an unmarked repository', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      await fs.mkdir(path.join(workspaceRoot, '.spw'))
      const serverIndex = new ServerIndex(workspaceRoot)

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceRoot))

      expect(result.workspace).toEqual({
        mode: 'standalone-consumer',
        consumerUri: pathToFileURL(workspaceRoot).toString(),
        spwUri: pathToFileURL(path.join(workspaceRoot, '.spw')).toString(),
        workbenchUri: null,
      })
      expect(result.roots).toEqual([{
        sigil: 'spw',
        uri: pathToFileURL(path.join(workspaceRoot, '.spw')).toString(),
        role: 'consumer',
        kind: 'directory',
      }])
    })
  })

  it('blocks roots when an open manifest is invalid instead of reviving disk or shelf roots', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      await makeCanonicalWorkbench(workspaceRoot)
      const manifestPath = path.join(workspaceRoot, '.spw', 'workspace.spw')
      await fs.writeFile(manifestPath, '^"roots"{\n @repo: ~".."\n}\n', 'utf8')

      const serverIndex = new ServerIndex(workspaceRoot)
      serverIndex.openDocument(
        pathToFileURL(manifestPath).toString(),
        manifestPath,
        '^"roots"{\n @repo: ~".."\n @repo: ~"../other"\n}\n',
        2,
      )

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceRoot))

      expect(result.rootSource).toBe('blocked')
      expect(result.roots).toEqual([])
      expect(result.manifest.status).toBe('invalid')
      expect(result.manifest).toMatchObject({
        readFrom: { kind: 'open-document', version: 2 },
      })
      expect(result.manifest.diagnostics).toContainEqual({
        source: 'parser',
        code: 'duplicate_root_sigil',
        message: 'Workspace root @repo is declared more than once.',
        sigil: 'repo',
      })
      expect(JSON.stringify(result.manifest.diagnostics)).not.toContain(workspaceRoot)
      await expect(workspaceManifest(makeWorkspaceDeps(serverIndex, workspaceRoot))).rejects.toMatchObject({
        code: 'SPW_WORKSPACE_AUTHORITY_BLOCKED',
        status: 'invalid',
      })
    })
  })

  it('treats an empty open document as invalid present evidence', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      await makeCanonicalWorkbench(workspaceRoot)
      const manifestPath = path.join(workspaceRoot, '.spw', 'workspace.spw')
      const serverIndex = new ServerIndex(workspaceRoot)
      serverIndex.openDocument(pathToFileURL(manifestPath).toString(), manifestPath, '', 3)

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceRoot))

      expect(result).toMatchObject({
        rootSource: 'blocked',
        manifest: {
          status: 'invalid',
          readFrom: { kind: 'open-document', version: 3 },
        },
        roots: [],
      })
      expect(result.manifest.diagnostics).toContainEqual(expect.objectContaining({
        code: 'missing_roots_frame',
      }))
    })
  })

  it('distinguishes an unreadable manifest entry from an absent manifest', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      await makeCanonicalWorkbench(workspaceRoot)
      const manifestPath = path.join(workspaceRoot, '.spw', 'workspace.spw')
      await fs.symlink(path.join(workspaceRoot, 'missing-manifest.spw'), manifestPath)
      const serverIndex = new ServerIndex(workspaceRoot)

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceRoot))

      expect(result.rootSource).toBe('blocked')
      expect(result.roots).toEqual([])
      expect(result.manifest).toEqual({
        status: 'unreadable',
        uri: pathToFileURL(manifestPath).toString(),
        readFrom: { kind: 'filesystem' },
        diagnostics: [{
          source: 'filesystem',
          code: 'manifest_unreadable',
          message: 'Workspace manifest exists but could not be read.',
        }],
      })
    })
  })

  it('treats a non-directory .spw parent as unreadable instead of absent', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      await fs.mkdir(path.join(workspaceRoot, 'packages', 'spw-cli'), { recursive: true })
      await fs.writeFile(
        path.join(workspaceRoot, 'package.json'),
        JSON.stringify({ name: 'spw-workbench' }),
        'utf8',
      )
      await fs.writeFile(
        path.join(workspaceRoot, 'packages', 'spw-cli', 'package.json'),
        '{}',
        'utf8',
      )
      await fs.writeFile(path.join(workspaceRoot, '.spw'), 'not a directory', 'utf8')
      const serverIndex = new ServerIndex(workspaceRoot)

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceRoot))

      expect(result).toMatchObject({
        rootSource: 'blocked',
        manifest: {
          status: 'unreadable',
          readFrom: { kind: 'filesystem' },
        },
        roots: [],
      })
    })
  })

  it('finds an open manifest through an equivalent symlinked file URI', async () => {
    await withTempWorkspace(async (tempRoot) => {
      const workspaceRoot = path.join(tempRoot, 'canonical')
      const workspaceAlias = path.join(tempRoot, 'alias')
      await fs.mkdir(workspaceRoot)
      await makeCanonicalWorkbench(workspaceRoot)
      await fs.symlink(workspaceRoot, workspaceAlias)
      const manifestPath = path.join(workspaceRoot, '.spw', 'workspace.spw')
      const serverIndex = new ServerIndex(workspaceAlias)
      serverIndex.openDocument(
        pathToFileURL(manifestPath).toString(),
        manifestPath,
        '^"roots"{\n @repo: ~".."\n}\n',
        9,
      )

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceAlias))

      expect(result.manifest).toMatchObject({
        status: 'valid',
        readFrom: { kind: 'open-document', version: 9 },
      })
    })
  })

  it('keeps the outer consumer authoritative for a server started inside its mounted workbench', async () => {
    await withTempWorkspace(async (tempRoot) => {
      const consumerRoot = path.join(tempRoot, 'consumer')
      const spwRoot = path.join(consumerRoot, '.spw')
      const workbenchRoot = path.join(spwRoot, '_workbench')
      const nestedStart = path.join(workbenchRoot, 'packages', 'probe')
      const externalRoot = path.join(tempRoot, 'external')
      await fs.mkdir(path.join(workbenchRoot, '.spw'), { recursive: true })
      await fs.mkdir(nestedStart, { recursive: true })
      await fs.mkdir(externalRoot)
      await fs.writeFile(path.join(spwRoot, 'mount.spw'), '^"mount"{}\n', 'utf8')
      await fs.writeFile(path.join(workbenchRoot, '.spw', 'mount.spw'), '^"mount"{}\n', 'utf8')
      await fs.writeFile(
        path.join(spwRoot, 'workspace.spw'),
        [
          '^"roots"{',
          ' @repo: ~".."',
          ' @workbench: ~"./_workbench"',
          ' @external: ~"../../external"',
          '}',
          '',
        ].join('\n'),
        'utf8',
      )

      const serverIndex = new ServerIndex(nestedStart)
      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, nestedStart))
      const initializedRoot = await discoverWorkspaceConsumerPath(nestedStart)
      const initializedIndex = new ServerIndex(initializedRoot)

      expect(result.workspace).toEqual({
        mode: 'mounted-consumer',
        consumerUri: pathToFileURL(consumerRoot).toString(),
        spwUri: pathToFileURL(spwRoot).toString(),
        workbenchUri: pathToFileURL(workbenchRoot).toString(),
      })
      expect(initializedRoot).toBe(consumerRoot)
      expect(initializedIndex.getWorkspaceRoot()).toBe(consumerRoot)
      expect(result.manifest).toMatchObject({
        status: 'valid',
        readFrom: { kind: 'filesystem' },
      })
      expect(result.roots).toEqual([
        {
          sigil: 'repo',
          uri: pathToFileURL(consumerRoot).toString(),
          role: 'consumer',
          kind: 'directory',
        },
        {
          sigil: 'workbench',
          uri: pathToFileURL(workbenchRoot).toString(),
          role: 'infrastructure',
          kind: 'directory',
        },
        {
          sigil: 'external',
          uri: pathToFileURL(externalRoot).toString(),
          role: 'external',
          kind: 'directory',
        },
      ])
    })
  })

  it('treats an externally stored workbench mounted by symlink as infrastructure', async () => {
    await withTempWorkspace(async (tempRoot) => {
      const consumerRoot = path.join(tempRoot, 'consumer')
      const spwRoot = path.join(consumerRoot, '.spw')
      const externalWorkbench = path.join(tempRoot, 'external-workbench')
      const mountedWorkbench = path.join(spwRoot, '_workbench')
      const nestedStart = path.join(mountedWorkbench, 'packages', 'probe')
      await fs.mkdir(path.join(externalWorkbench, '.spw'), { recursive: true })
      await fs.mkdir(path.join(externalWorkbench, 'packages', 'probe'), { recursive: true })
      await fs.mkdir(spwRoot, { recursive: true })
      await fs.symlink(externalWorkbench, mountedWorkbench)
      await fs.writeFile(path.join(spwRoot, 'mount.spw'), '^"mount"{}\n')
      await fs.writeFile(path.join(externalWorkbench, '.spw', 'mount.spw'), '^"mount"{}\n')
      await fs.writeFile(
        path.join(spwRoot, 'workspace.spw'),
        '^"roots"{\n @workbench: ~"./_workbench"\n}\n',
      )
      const serverIndex = new ServerIndex(nestedStart)

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, nestedStart))
      const externalAlias = path.join(tempRoot, 'probe-alias')
      await fs.symlink(path.join(externalWorkbench, 'packages', 'probe'), externalAlias)
      const aliasIndex = new ServerIndex(externalAlias)
      const aliasResult = await workspaceManifestV1(makeWorkspaceDeps(aliasIndex, externalAlias))

      expect(result.workspace.consumerUri).toBe(pathToFileURL(consumerRoot).toString())
      expect(result.roots).toEqual([{
        sigil: 'workbench',
        uri: pathToFileURL(mountedWorkbench).toString(),
        role: 'infrastructure',
        kind: 'directory',
      }])
      expect(aliasResult.workspace).toEqual({
        mode: 'standalone-consumer',
        consumerUri: pathToFileURL(externalAlias).toString(),
        spwUri: pathToFileURL(path.join(externalAlias, '.spw')).toString(),
        workbenchUri: null,
      })
      expect(aliasResult.roots).toEqual([{
        sigil: 'spw',
        uri: pathToFileURL(path.join(externalAlias, '.spw')).toString(),
        role: 'consumer',
        kind: 'missing',
      }])
    })
  })

  it('rejects a mounted-consumer @workbench binding that changes authority', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      const spwRoot = path.join(workspaceRoot, '.spw')
      await fs.mkdir(path.join(spwRoot, '_workbench'), { recursive: true })
      await fs.writeFile(
        path.join(spwRoot, 'workspace.spw'),
        '^"roots"{\n @workbench: ~"../elsewhere"\n}\n',
        'utf8',
      )
      const serverIndex = new ServerIndex(workspaceRoot)

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceRoot))

      expect(result.rootSource).toBe('blocked')
      expect(result.roots).toEqual([])
      expect(result.manifest.diagnostics).toContainEqual({
        source: 'authority',
        code: 'invalid_workbench_root',
        message: 'Mounted consumers must bind @workbench to .spw/_workbench.',
        sigil: 'workbench',
      })
    })
  })

  it('classifies symlinked roots by target containment without changing their declared URI', async () => {
    await withTempWorkspace(async (tempRoot) => {
      const workspaceRoot = path.join(tempRoot, 'workbench')
      const externalRoot = path.join(tempRoot, 'shared')
      const aliasPath = path.join(workspaceRoot, 'shared-alias')
      await fs.mkdir(workspaceRoot)
      await fs.mkdir(externalRoot)
      await makeCanonicalWorkbench(workspaceRoot)
      await fs.symlink(externalRoot, aliasPath)
      await fs.writeFile(
        path.join(workspaceRoot, '.spw', 'workspace.spw'),
        '^"roots"{\n @shared: ~"../shared-alias"\n}\n',
        'utf8',
      )
      const serverIndex = new ServerIndex(workspaceRoot)

      const result = await workspaceManifestV1(makeWorkspaceDeps(serverIndex, workspaceRoot))

      expect(result.roots).toEqual([{
        sigil: 'shared',
        uri: pathToFileURL(aliasPath).toString(),
        role: 'external',
        kind: 'directory',
      }])
    })
  })

  it('quarantines resolvedPath to the deprecated compatibility response', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      await makeCanonicalWorkbench(workspaceRoot)
      await fs.writeFile(
        path.join(workspaceRoot, '.spw', 'workspace.spw'),
        '^"roots"{\n @repo: ~".."\n}\n',
        'utf8',
      )
      const serverIndex = new ServerIndex(workspaceRoot)
      const deps = makeWorkspaceDeps(serverIndex, workspaceRoot)

      const legacy = await workspaceManifest(deps)
      const current = await workspaceManifestV1(deps)

      expect(legacy).toMatchObject({
        rootSource: 'manifest',
        roots: [{
          sigil: 'repo',
          resolvedPath: workspaceRoot,
          uri: pathToFileURL(workspaceRoot).toString(),
        }],
      })
      expect(JSON.stringify(current)).not.toContain('resolvedPath')
    })
  })
})

describe('workspace temperature', () => {
  it('sorts by beat age and retains write counts', () => {
    const workspaceRoot = path.resolve('/workspace')
    const serverIndex = new ServerIndex(workspaceRoot)
    const coldPath = path.join(workspaceRoot, 'cold.spw')
    const hotPath = path.join(workspaceRoot, 'hot.spw')
    serverIndex.openDocument(pathToFileURL(coldPath).toString(), coldPath, '# cold', 1)
    serverIndex.tick()
    serverIndex.tick()
    serverIndex.openDocument(pathToFileURL(hotPath).toString(), hotPath, '# hot', 1)
    serverIndex.updateDocument(pathToFileURL(hotPath).toString(), '# hotter', 2)

    const result = workspaceTemperature(makeWorkspaceDeps(serverIndex, workspaceRoot))

    expect(result).toEqual([
      {
        uri: pathToFileURL(hotPath).toString(),
        tier: 'hot',
        beatAge: 0,
        writeCount: 1,
        volatility: 'durable',
        aspectShare: 0,
      },
      {
        uri: pathToFileURL(coldPath).toString(),
        tier: 'hot',
        beatAge: 2,
        writeCount: 0,
        volatility: 'durable',
        aspectShare: 0,
      },
    ])
  })

  it('reports volatility independently of how recently a surface was read', () => {
    const workspaceRoot = path.resolve('/workspace')
    const serverIndex = new ServerIndex(workspaceRoot)
    const planPath = path.join(workspaceRoot, 'plan.spw')
    const canonPath = path.join(workspaceRoot, 'canon.spw')

    // Both are equally hot; only their material differs.
    serverIndex.openDocument(
      pathToFileURL(planPath).toString(),
      planPath,
      '^["cache"]{\n ~#status: "open"\n ~#next: "4"\n ~#age: "1"\n}',
      1,
    )
    serverIndex.openDocument(
      pathToFileURL(canonPath).toString(),
      canonPath,
      '#>canon_anchor\n#:layer #!canon',
      1,
    )

    const byUri = new Map(
      workspaceTemperature(makeWorkspaceDeps(serverIndex, workspaceRoot)).map((e) => [e.uri, e]),
    )

    expect(byUri.get(pathToFileURL(planPath).toString())).toMatchObject({
      tier: 'hot',
      volatility: 'volatile',
    })
    expect(byUri.get(pathToFileURL(canonPath).toString())).toMatchObject({
      tier: 'hot',
      volatility: 'durable',
    })
  })

  it('preserves the document URI instead of reconstructing a local file URI', () => {
    const workspaceRoot = path.resolve('/workspace')
    const serverIndex = new ServerIndex(workspaceRoot)
    const remoteUri = 'vscode-remote://ssh-remote+lab/workspace/research.spw'
    serverIndex.openDocument(remoteUri, path.join(workspaceRoot, 'research.spw'), '# research', 1)

    const result = workspaceTemperature(makeWorkspaceDeps(serverIndex, workspaceRoot))

    expect(result[0]?.uri).toBe(remoteUri)
  })
})

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ServerIndex } from '../server-index'
import { workspaceManifest, workspaceTemperature } from '../handlers/workspace'
import type { HandlerDeps } from '../types'

function makeWorkspaceDeps(serverIndex: ServerIndex): HandlerDeps {
  return {
    serverIndex,
    uriFromPath: (filePath: string) => `file://${filePath}`,
  } as HandlerDeps
}

async function withTempWorkspace(
  run: (workspaceRoot: string) => Promise<void>,
): Promise<void> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-workspace-'))
  try {
    await run(workspaceRoot)
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true })
  }
}

describe('workspace handlers', () => {
  it('reads roots from the open workspace manifest and reports manifest source', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      const manifestPath = path.join(workspaceRoot, '.spw', 'workspace.spw')
      await fs.mkdir(path.dirname(manifestPath), { recursive: true })
      await fs.writeFile(manifestPath, '^"roots"{\n @repo: ~".."\n}\n', 'utf8')

      const serverIndex = new ServerIndex(workspaceRoot)
      serverIndex.openDocument(
        `file://${manifestPath}`,
        manifestPath,
        '^"roots"{\n @docs: ~"../docs"\n @agents: ~"./agents.spw"\n}\n',
        1,
      )

      const result = await workspaceManifest(makeWorkspaceDeps(serverIndex))

      expect(result.rootSource).toBe('manifest')
      expect(result.manifestUri).toBe(`file://${manifestPath}`)
      expect(result.roots).toEqual([
        {
          sigil: 'docs',
          resolvedPath: path.resolve(workspaceRoot, 'docs'),
          uri: `file://${path.resolve(workspaceRoot, 'docs')}`,
        },
        {
          sigil: 'agents',
          resolvedPath: path.resolve(workspaceRoot, '.spw', 'agents.spw'),
          uri: `file://${path.resolve(workspaceRoot, '.spw', 'agents.spw')}`,
        },
      ])
    })
  })

  it('falls back to inferred shelf roots when the workspace manifest is absent', async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      const shelvesPath = path.join(workspaceRoot, '.spw', 'shelves.spw')
      await fs.mkdir(path.dirname(shelvesPath), { recursive: true })
      await fs.writeFile(shelvesPath, '@repo: ~".."\n@docs: ~"../docs"\n', 'utf8')

      const serverIndex = new ServerIndex(workspaceRoot)
      await serverIndex.scanWorkspace()

      const result = await workspaceManifest(makeWorkspaceDeps(serverIndex))

      expect(result.rootSource).toBe('inferred')
      expect(result.manifestUri).toBeNull()
      expect(result.roots).toEqual([
        {
          sigil: 'repo',
          resolvedPath: workspaceRoot,
          uri: `file://${workspaceRoot}`,
        },
        {
          sigil: 'docs',
          resolvedPath: path.resolve(workspaceRoot, 'docs'),
          uri: `file://${path.resolve(workspaceRoot, 'docs')}`,
        },
      ])
    })
  })

  it('reports workspace temperature sorted by beat age with write counts', () => {
    const serverIndex = new ServerIndex('/workspace')
    serverIndex.openDocument('file:///workspace/cold.spw', '/workspace/cold.spw', '# cold', 1)
    serverIndex.tick()
    serverIndex.tick()
    serverIndex.openDocument('file:///workspace/hot.spw', '/workspace/hot.spw', '# hot', 1)
    serverIndex.updateDocument('file:///workspace/hot.spw', '# hotter', 2)

    const result = workspaceTemperature(makeWorkspaceDeps(serverIndex))

    expect(result).toEqual([
      {
        uri: 'file:///workspace/hot.spw',
        tier: 'hot',
        beatAge: 0,
        writeCount: 1,
      },
      {
        uri: 'file:///workspace/cold.spw',
        tier: 'hot',
        beatAge: 2,
        writeCount: 0,
      },
    ])
  })
})

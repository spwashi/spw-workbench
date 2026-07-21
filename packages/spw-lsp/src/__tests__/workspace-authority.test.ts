import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  discoverWorkspaceConsumerPath,
  resolveWorkspaceAuthority,
} from '../workspace-authority'

async function withTempDirectory(run: (root: string) => Promise<void>): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-lsp-authority-'))
  try {
    await run(root)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

function nodeError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code })
}

describe('workspace authority failures', () => {
  it('does not reinterpret inaccessible discovery paths as missing', async () => {
    await withTempDirectory(async (root) => {
      await expect(discoverWorkspaceConsumerPath(root, {
        stat: async () => { throw nodeError('EACCES') },
      })).rejects.toMatchObject({ code: 'EACCES' })
    })
  })

  it('does not guess standalone mode when package identity is unreadable', async () => {
    await withTempDirectory(async (root) => {
      await fs.mkdir(path.join(root, '.spw'))
      await expect(resolveWorkspaceAuthority({
        startPath: root,
        uriFromPath: (filePath) => pathToFileURL(filePath).toString(),
        fileSystem: {
          readText: async () => { throw nodeError('EACCES') },
        },
      })).rejects.toMatchObject({ code: 'EACCES' })
    })
  })

  it('does not fabricate a lexical role when realpath identity fails', async () => {
    await withTempDirectory(async (root) => {
      await fs.mkdir(path.join(root, '.spw'))
      await fs.mkdir(path.join(root, 'packages', 'spw-cli'), { recursive: true })
      await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'spw-workbench' }))
      await fs.writeFile(path.join(root, 'packages', 'spw-cli', 'package.json'), '{}')
      await fs.writeFile(
        path.join(root, '.spw', 'workspace.spw'),
        '^"roots"{\n @repo: ~".."\n}\n',
      )

      await expect(resolveWorkspaceAuthority({
        startPath: root,
        uriFromPath: (filePath) => pathToFileURL(filePath).toString(),
        fileSystem: {
          realpath: async () => { throw nodeError('ELOOP') },
        },
      })).rejects.toMatchObject({ code: 'ELOOP' })
    })
  })
})

describe('workspace authority scope', () => {
  it('does not widen an ordinary nested workspace folder to an ancestor consumer', async () => {
    await withTempDirectory(async (root) => {
      const outerConsumer = path.join(root, 'outer')
      const nestedFolder = path.join(outerConsumer, 'research', 'notes')
      await fs.mkdir(path.join(outerConsumer, '.spw', '_workbench'), { recursive: true })
      await fs.mkdir(nestedFolder, { recursive: true })
      await fs.writeFile(path.join(outerConsumer, '.spw', 'mount.spw'), '^"mount"{}\n')

      await expect(discoverWorkspaceConsumerPath(nestedFolder)).resolves.toBe(nestedFolder)
    })
  })
})

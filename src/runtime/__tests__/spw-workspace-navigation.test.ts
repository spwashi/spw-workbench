import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildSpwTree, discoverSpwWorkspace, resolveWorkspacePath } from '@spwashi/spw-cli'

const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

async function createConsumer(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-consumer-'))
  tempRoots.push(root)
  await fs.mkdir(path.join(root, '.spw', '_workbench', '.spw'), { recursive: true })
  await fs.mkdir(path.join(root, 'docs', 'guides'), { recursive: true })
  await fs.writeFile(path.join(root, '.spw', 'mount.spw'), '^[workbench]{ @root: ~"./_workbench" }\n')
  await fs.writeFile(path.join(root, '.spw', 'index.spw'), '^"roots"{ @workspace: ~"./workspace.spw" }\n')
  await fs.writeFile(path.join(root, '.spw', 'workspace.spw'), `
    ^["roots"]{
      @index: ~"./index.spw"
      @spw: ~"."
      @docs: ~"../docs"
    }
  `)
  await fs.writeFile(path.join(root, '.spw', '_workbench', '.spw', 'internal.spw'), '# internal\n')
  await fs.writeFile(path.join(root, 'docs', 'guides', 'start.spw'), '# start\n')
  await fs.writeFile(path.join(root, 'docs', 'notes.txt'), 'not spw\n')
  return root
}

describe('mounted workspace navigation', () => {
  it('discovers consumer authority while invoked inside the mounted workbench', async () => {
    const root = await createConsumer()
    const workspace = await discoverSpwWorkspace(path.join(root, '.spw', '_workbench'))

    expect(workspace.consumerRoot).toBe(root)
    expect(workspace.rootSource).toBe('manifest')
    expect(workspace.roots.map(({ sigil, relativePath, role }) => ({ sigil, relativePath, role }))).toEqual([
      { sigil: 'index', relativePath: '.spw/index.spw', role: 'consumer' },
      { sigil: 'spw', relativePath: '.spw', role: 'consumer' },
      { sigil: 'docs', relativePath: 'docs', role: 'consumer' },
      { sigil: 'workbench', relativePath: '.spw/_workbench', role: 'infrastructure' },
    ])
    expect(resolveWorkspacePath(workspace, '.spw/index.spw')).toBe(path.join(root, '.spw', 'index.spw'))
    expect(resolveWorkspacePath(workspace, '@docs')).toBe(path.join(root, 'docs'))
    expect(() => resolveWorkspacePath(workspace, '../outside.spw')).toThrow('outside the consumer root')
  })

  it('renders selected .spw trees and excludes mounted infrastructure by default', async () => {
    const root = await createConsumer()
    const workspace = await discoverSpwWorkspace(root)

    await expect(buildSpwTree(workspace, '@workbench')).rejects.toThrow('mounted infrastructure')
    expect(await buildSpwTree(workspace, '@docs')).toEqual({
      kind: 'directory',
      name: 'docs',
      path: 'docs',
      children: [{
        kind: 'directory',
        name: 'guides',
        path: path.join('docs', 'guides'),
        children: [{
          kind: 'file',
          name: 'start.spw',
          path: path.join('docs', 'guides', 'start.spw'),
        }],
      }],
    })

    const spwTree = await buildSpwTree(workspace, '@spw')
    expect(JSON.stringify(spwTree)).not.toContain('_workbench')
  })
})

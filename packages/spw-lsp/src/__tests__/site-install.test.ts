import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../helpers'

const tempRoots: string[] = []

async function makeTempDir(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spw-site-install-'))
  tempRoots.push(root)
  return root
}

async function seedSite(root: string): Promise<void> {
  await mkdir(path.join(root, '.spw', '_workbench', 'packages', 'spw-cli'), { recursive: true })
  await mkdir(path.join(root, '.spw', '_workbench', 'packages', 'spw-lsp'), { recursive: true })
  await mkdir(path.join(root, '.spw', '_workbench', 'lib', 'spw-v0.3.0'), { recursive: true })
  await writeFile(
    path.join(root, '.spw', 'mount.spw'),
    [
      '# Mount',
      '',
      '^[workbench]{',
      '  @root: ~"./_workbench"',
      '  version: "0.3.0"',
      '  @spec: ~"./_workbench/lib/spw-v0.3.0/"',
      '  @cli: ~"./_workbench/packages/spw-cli/"',
      '  @lsp: ~"./_workbench/packages/spw-lsp/"',
      '}',
      '',
      '^[engage]{',
      '  surfaces: ["seed", "runtime", "cli", "lsp"]',
      '}',
      '',
      '^[resolve]{',
      '  paths: [~"./_workbench/lib/spw-v0.3.0/", ~"./_workbench/packages/spw-cli/", ~"./_workbench/packages/spw-lsp/"]',
      '}',
      '',
    ].join('\n'),
  )
}

describe('spw site install mount resolution', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true }))))
  })

  it('feeds mount roots into lsp config and excludes mounted infrastructure from workspace scans', async () => {
    const root = await makeTempDir()
    await seedSite(root)

    const config = await loadConfig(root)
    expect(config.roots.workbench).toBe(path.join(root, '.spw', '_workbench'))
    expect(config.roots.spec).toBe(path.join(root, '.spw', '_workbench', 'lib', 'spw-v0.3.0'))
    expect(config.roots.cli).toBe(path.join(root, '.spw', '_workbench', 'packages', 'spw-cli'))
    expect(config.roots.lsp).toBe(path.join(root, '.spw', '_workbench', 'packages', 'spw-lsp'))
    expect(config.workspace.exclude).toContain('_workbench')
  })
})

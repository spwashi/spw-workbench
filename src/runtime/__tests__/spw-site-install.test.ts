import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { deriveMountRoots, discoverSpwMountResolution, findSpwSiteRoot, loadSpwMountResolution } from '../../../packages/spw-runtime/src/site-install'
import { loadConfig } from '../../../packages/spw-lsp/src/helpers'

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

  it('discovers the site root from inside the mounted workbench', async () => {
    const root = await makeTempDir()
    await seedSite(root)

    const insideWorkbench = path.join(root, '.spw', '_workbench', 'packages', 'spw-lsp')
    await expect(findSpwSiteRoot(insideWorkbench)).resolves.toBe(root)
    await expect(discoverSpwMountResolution(insideWorkbench)).resolves.toMatchObject({
      siteRoot: root,
      workbenchRoot: path.join(root, '.spw', '_workbench'),
    })
  })

  it('loads tracked version, engaged surfaces, and resolution paths from mount.spw', async () => {
    const root = await makeTempDir()
    await seedSite(root)

    const mount = await loadSpwMountResolution(root)
    expect(mount).not.toBeNull()
    expect(mount?.trackedVersion).toBe('0.3.0')
    expect(mount?.engagedSurfaces).toEqual(['seed', 'runtime', 'cli', 'lsp'])
    expect(mount?.resolutionPaths).toEqual([
      path.join(root, '.spw', '_workbench', 'lib', 'spw-v0.3.0'),
      path.join(root, '.spw', '_workbench', 'packages', 'spw-cli'),
      path.join(root, '.spw', '_workbench', 'packages', 'spw-lsp'),
    ])
    expect(mount ? deriveMountRoots(mount) : {}).toEqual({
      workbench: path.join(root, '.spw', '_workbench'),
      spec: path.join(root, '.spw', '_workbench', 'lib', 'spw-v0.3.0'),
      cli: path.join(root, '.spw', '_workbench', 'packages', 'spw-cli'),
      lsp: path.join(root, '.spw', '_workbench', 'packages', 'spw-lsp'),
    })
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

import { access, mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { inspectDoctorTarget } from '../../../packages/spw-cli/src/doctor'
import { applyDoctorFixes } from '../../../packages/spw-cli/src/init'

const tempRoots: string[] = []

async function makeTempDir(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spw-site-doctor-'))
  tempRoots.push(root)
  return root
}

describe('spw doctor', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true }))))
  })

  it('reports the missing workbench attach flow for a fresh site root', async () => {
    const root = await makeTempDir()
    await mkdir(path.join(root, '.git'))
    await mkdir(path.join(root, '.spw'))

    const report = await inspectDoctorTarget(root)

    expect(report.status).toBe('fail')
    expect(report.checks.find((check) => check.id === 'workbench-root')?.status).toBe('fail')
    expect(report.next).toContain('git submodule add https://github.com/spwashi/spw-workbench .spw/_workbench')
  })

  it('accepts a minimal consumer scaffold with an installed embedded workbench', async () => {
    const root = await makeTempDir()
    await mkdir(path.join(root, '.git'))
    await mkdir(path.join(root, '.spw', '_workbench', 'node_modules'), { recursive: true })
    await writeFile(path.join(root, '.spw', 'README.md'), '# Spw Workspace\n')
    await writeFile(path.join(root, '.spw', 'index.spw'), '# Index\n')
    await writeFile(path.join(root, '.spw', 'workspace.spw'), '# Workspace\n')
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
      ].join('\n'),
    )
    await writeFile(path.join(root, '.spw', '_workbench', 'package.json'), '{"name":"spw-workbench"}\n')

    const report = await inspectDoctorTarget(root)

    expect(report.status).toBe('ok')
    expect(report.next).toEqual([])
  })

  it('doctor --fix seeds the portable scaffold and refreshes the commit gate', async () => {
    const root = await makeTempDir()
    await mkdir(path.join(root, '.git', 'hooks'), { recursive: true })
    await mkdir(path.join(root, '.spw', '_workbench', 'node_modules'), { recursive: true })
    await writeFile(path.join(root, '.spw', '_workbench', 'package.json'), '{"name":"spw-workbench"}\n')

    await applyDoctorFixes(root)

    await expect(access(path.join(root, '.spw', 'index.spw'))).resolves.toBeUndefined()
    await expect(access(path.join(root, '.spw', 'README.md'))).resolves.toBeUndefined()
    await expect(access(path.join(root, '.spw', 'workspace.spw'))).resolves.toBeUndefined()
    await expect(access(path.join(root, '.spw', 'mount.spw'))).resolves.toBeUndefined()
    await expect(access(path.join(root, '.git', 'hooks', 'pre-commit'))).resolves.toBeUndefined()

    const report = await inspectDoctorTarget(root)
    expect(report.status).toBe('ok')
  })
})

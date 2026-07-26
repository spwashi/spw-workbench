import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildSpwTree,
  discoverSpwWorkspace,
  resolveWorkspacePath,
  runSpwCli,
  tryDiscoverSpwWorkspace,
} from '@spwashi/spw-cli'

const originalCwd = process.cwd()
const tempRoots: string[] = []

afterEach(async () => {
  process.chdir(originalCwd)
  process.exitCode = 0
  vi.restoreAllMocks()
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
})

async function createConsumer(workspaceSource: string | null = defaultWorkspaceSource()): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-consumer-'))
  tempRoots.push(root)
  const workbenchRoot = path.join(root, '.spw', '_workbench')

  await fs.mkdir(path.join(workbenchRoot, '.spw'), { recursive: true })
  await fs.mkdir(path.join(workbenchRoot, 'packages', 'spw-cli'), { recursive: true })
  await fs.mkdir(path.join(root, 'docs', 'guides'), { recursive: true })
  await fs.writeFile(path.join(root, '.spw', 'mount.spw'), '^[workbench]{ @root: ~"./_workbench" }\n')
  await fs.writeFile(path.join(root, '.spw', 'index.spw'), '^"roots"{ @workspace: ~"./workspace.spw" }\n')
  if (workspaceSource !== null) {
    await fs.writeFile(path.join(root, '.spw', 'workspace.spw'), workspaceSource)
  }

  // A real mounted workbench is also a canonical workspace with its own mount.
  await fs.writeFile(path.join(workbenchRoot, '.spw', 'mount.spw'), '# nested workbench mount\n')
  await fs.writeFile(
    path.join(workbenchRoot, '.spw', 'workspace.spw'),
    '^["roots"]{ @repo: ~"../.." }\n',
  )
  await fs.writeFile(path.join(workbenchRoot, '.spw', 'internal.spw'), '@infrastructure\n')
  await fs.writeFile(path.join(workbenchRoot, 'packages', 'spw-cli', 'package.json'), '{}\n')
  await fs.writeFile(path.join(root, 'docs', 'guides', 'start.spw'), '@guide\n')
  await fs.writeFile(path.join(root, 'docs', 'notes.txt'), 'not spw\n')
  return root
}

function defaultWorkspaceSource(extraDeclarations: string[] = []): string {
  return [
    '^["roots"]{',
    '  @index: ~"./index.spw"',
    '  @spw: ~"."',
    '  @docs: ~"../docs"',
    ...extraDeclarations.map((declaration) => `  ${declaration}`),
    '}',
    '',
  ].join('\n')
}

async function createExternalRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-external-'))
  tempRoots.push(root)
  await fs.writeFile(path.join(root, 'shared.spw'), '@shared_topic\n')
  return root
}

async function createCanonicalWorkspace(
  workspaceSource: string = defaultWorkspaceSource(),
): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-canonical-'))
  tempRoots.push(root)
  await fs.mkdir(path.join(root, '.spw'), { recursive: true })
  await fs.mkdir(path.join(root, 'packages', 'spw-cli'), { recursive: true })
  await fs.writeFile(path.join(root, 'package.json'), '{"name":"spw-workbench"}\n')
  await fs.writeFile(path.join(root, 'packages', 'spw-cli', 'package.json'), '{}\n')
  await fs.writeFile(path.join(root, '.spw', 'mount.spw'), '# canonical mount\n')
  await fs.writeFile(path.join(root, '.spw', 'workspace.spw'), workspaceSource)
  return root
}

function captureConsoleLog() {
  const lines: string[] = []
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(' '))
  })
  return lines
}

describe('mounted workspace navigation', () => {
  it('preserves consumer authority inside a realistic mounted canonical workbench', async () => {
    const root = await createConsumer()
    const workbenchPackage = path.join(root, '.spw', '_workbench', 'packages', 'spw-cli')
    const workspace = await discoverSpwWorkspace(workbenchPackage)

    expect(workspace.consumerRoot).toBe(root)
    expect(workspace.mode).toBe('mounted-consumer')
    expect(workspace.rootSource).toBe('manifest')
    expect(workspace.roots.map(({ sigil, relativePath, role }) => ({ sigil, relativePath, role }))).toEqual([
      { sigil: 'index', relativePath: '.spw/index.spw', role: 'consumer' },
      { sigil: 'spw', relativePath: '.spw', role: 'consumer' },
      { sigil: 'docs', relativePath: 'docs', role: 'consumer' },
      { sigil: 'workbench', relativePath: '.spw/_workbench', role: 'infrastructure' },
    ])
    await expect(resolveWorkspacePath(workspace, '.spw/index.spw')).resolves.toBe(
      path.join(root, '.spw', 'index.spw'),
    )
    await expect(resolveWorkspacePath(workspace, '@docs/guides/start.spw')).resolves.toBe(
      path.join(root, 'docs', 'guides', 'start.spw'),
    )
    await expect(resolveWorkspacePath(workspace, '@unknown')).rejects.toThrow('Unknown workspace root @unknown')
    await expect(resolveWorkspacePath(workspace, '../outside.spw')).rejects.toThrow('outside the consumer root')
  })

  it('keeps an externally stored mounted workbench classified as infrastructure', async () => {
    const root = await createConsumer()
    const externalWorkbench = await createCanonicalWorkspace()
    const mountedWorkbench = path.join(root, '.spw', '_workbench')
    await fs.rm(mountedWorkbench, { recursive: true })
    await fs.symlink(externalWorkbench, mountedWorkbench, 'junction')

    const workspace = await discoverSpwWorkspace(
      path.join(mountedWorkbench, 'packages', 'spw-cli'),
    )

    expect(workspace.consumerRoot).toBe(root)
    expect(workspace.roots.find(({ sigil }) => sigil === 'workbench')?.role)
      .toBe('infrastructure')
  })

  it('falls back only when workspace.spw is absent', async () => {
    const root = await createConsumer(null)
    const workspace = await discoverSpwWorkspace(path.join(root, '.spw', '_workbench'))

    expect(workspace.rootSource).toBe('fallback')
    expect(workspace.roots.map(({ sigil, role }) => ({ sigil, role }))).toEqual([
      { sigil: 'spw', role: 'consumer' },
      { sigil: 'workbench', role: 'infrastructure' },
    ])
  })

  it('propagates invalid, duplicate, and unreadable manifest authority', async () => {
    const root = await createConsumer()
    const manifestPath = path.join(root, '.spw', 'workspace.spw')
    const invalidManifests = [
      { source: '^["settings"]{}\n', code: 'missing_roots_frame' },
      { source: '^["roots"]{}\n', code: 'empty_roots_frame' },
      { source: '^["roots"]{ @docs: "../docs" }\n', code: 'invalid_root_declaration' },
      {
        source: '^["roots"]{ @docs: ~"../docs"\n',
        code: 'unterminated_roots_frame',
      },
      {
        source: '^["roots"]{ @docs: ~"../docs" @docs: ~"../other" }\n',
        code: 'duplicate_root_sigil',
      },
    ]

    for (const example of invalidManifests) {
      await fs.writeFile(manifestPath, example.source)
      await expect(tryDiscoverSpwWorkspace(root)).rejects.toThrow(example.code)
    }

    await fs.rm(manifestPath)
    await fs.mkdir(manifestPath)
    await expect(tryDiscoverSpwWorkspace(root)).rejects.toThrow('Unable to read workspace manifest')

    await fs.rm(manifestPath, { recursive: true })
    await fs.symlink(path.join(root, 'missing-workspace.spw'), manifestPath)
    await expect(tryDiscoverSpwWorkspace(root)).rejects.toThrow('Unable to read workspace manifest')
  })

  it('does not mistake a consumer monorepo package path for canonical authority', async () => {
    const root = await createConsumer()
    const externalRoot = await createExternalRoot()
    await fs.mkdir(path.join(root, 'packages', 'spw-cli'), { recursive: true })
    await fs.writeFile(path.join(root, 'packages', 'spw-cli', 'package.json'), '{}\n')
    const declarationPath = path.relative(path.join(root, '.spw'), externalRoot)
    await fs.writeFile(
      path.join(root, '.spw', 'workspace.spw'),
      defaultWorkspaceSource([`@shared: ~${JSON.stringify(declarationPath)}`]),
    )
    const workspace = await discoverSpwWorkspace(root)

    expect(workspace.mode).toBe('mounted-consumer')
    expect(workspace.roots.find(({ sigil }) => sigil === 'workbench')?.role).toBe('infrastructure')
    expect(workspace.roots.find(({ sigil }) => sigil === 'shared')?.role).toBe('external')
  })

  it('allows canonical declared external roots only through bounded @sigil authority', async () => {
    const externalRoot = await createExternalRoot()
    const root = await createCanonicalWorkspace()
    const actualDeclarationPath = path.relative(path.join(root, '.spw'), externalRoot)
    await fs.writeFile(
      path.join(root, '.spw', 'workspace.spw'),
      defaultWorkspaceSource([`@shared: ~${JSON.stringify(actualDeclarationPath)}`]),
    )
    const workspace = await discoverSpwWorkspace(root)

    expect(workspace.mode).toBe('canonical')
    expect(workspace.roots.find(({ sigil }) => sigil === 'shared')?.role).toBe('external')
    await expect(resolveWorkspacePath(workspace, '@shared/shared.spw')).resolves.toBe(
      path.join(externalRoot, 'shared.spw'),
    )
    await expect(resolveWorkspacePath(workspace, externalRoot)).rejects.toThrow('outside the consumer root')
    await expect(resolveWorkspacePath(workspace, '@shared/../escape.spw')).rejects.toThrow(
      'outside workspace root @shared',
    )

    const tree = await buildSpwTree(workspace, '@shared')
    expect(tree).toMatchObject({
      kind: 'directory',
      children: [{ kind: 'file', name: 'shared.spw' }],
    })
  })

  it('rejects consumer-relative symlinks that escape their authority', async () => {
    const root = await createConsumer()
    const externalRoot = await createExternalRoot()
    await fs.symlink(externalRoot, path.join(root, 'docs', 'escape'), 'junction')
    const workspace = await discoverSpwWorkspace(root)

    await expect(resolveWorkspacePath(workspace, 'docs/escape/shared.spw')).rejects.toThrow(
      'resolves outside the consumer root',
    )
    await expect(resolveWorkspacePath(workspace, '@docs/escape/shared.spw')).rejects.toThrow(
      'resolves outside @docs',
    )
    await expect(resolveWorkspacePath(workspace, 'docs/escape/not-created.spw')).rejects.toThrow(
      'resolves outside the consumer root',
    )
  })

  it('renders selected .spw trees and excludes mounted infrastructure by default', async () => {
    const root = await createConsumer()
    const workspace = await discoverSpwWorkspace(root)
    const workbenchAlias = path.join(root, '.spw', 'workbench-alias')
    await fs.symlink(path.join(root, '.spw', '_workbench'), workbenchAlias, 'junction')

    await expect(buildSpwTree(workspace, '@workbench')).rejects.toThrow('mounted infrastructure')
    await expect(buildSpwTree(workspace, '.spw/workbench-alias')).rejects.toThrow('mounted infrastructure')
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

  it('routes roots and tree commands through the public CLI entrypoint', async () => {
    const root = await createConsumer()
    const lines = captureConsoleLog()

    await runSpwCli(['node', 'spw', 'roots', root, '--json'])
    const roots = JSON.parse(lines.at(-1) ?? '{}') as { mode?: string; roots?: Array<{ sigil: string }> }
    expect(roots.mode).toBe('mounted-consumer')
    expect(roots.roots?.map(({ sigil }) => sigil)).toContain('docs')

    lines.length = 0
    await runSpwCli(['node', 'spw', 'tree', '@docs', '--from', root, '--json'])
    const tree = JSON.parse(lines.at(-1) ?? '{}') as { selector?: string; tree?: { path?: string } }
    expect(tree).toMatchObject({ selector: '@docs', tree: { path: 'docs' } })
  })

  it('anchors query and select reads to consumer and declared-root authority', async () => {
    const root = await createConsumer()
    const externalRoot = await createExternalRoot()
    const declarationPath = path.relative(path.join(root, '.spw'), externalRoot)
    await fs.writeFile(
      path.join(root, '.spw', 'workspace.spw'),
      defaultWorkspaceSource([`@shared: ~${JSON.stringify(declarationPath)}`]),
    )
    process.chdir(path.join(root, '.spw', '_workbench', 'packages', 'spw-cli'))
    const lines = captureConsoleLog()

    await runSpwCli(['node', 'spw', 'query', '--from', '.spw', '--format=json', '--select=file'])
    const query = JSON.parse(lines.at(-1) ?? '{}') as {
      scanned?: number
      rows?: Array<{ file?: string }>
    }
    expect(query.scanned).toBeGreaterThan(0)
    expect(query.rows?.every(({ file }) => file?.startsWith('.spw/'))).toBe(true)
    expect(query.rows?.some(({ file }) => file?.includes('_workbench'))).toBe(false)

    lines.length = 0
    await runSpwCli(['node', 'spw', 'query', '--from', '@shared', '--format=json', '--select=file'])
    const externalQuery = JSON.parse(lines.at(-1) ?? '{}') as {
      scanned?: number
      rows?: Array<{ file?: string }>
    }
    expect(externalQuery.scanned).toBe(1)
    expect(externalQuery.rows?.[0]?.file).toContain('spw-external-')

    lines.length = 0
    await runSpwCli(['node', 'spw', 'select', '@shared/shared.spw', '--format=json'])
    const selection = JSON.parse(lines.at(-1) ?? '{}') as { matches?: unknown[] }
    expect(selection.matches?.length).toBeGreaterThan(0)
  })
})

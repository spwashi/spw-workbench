import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach } from 'vitest'
import { describe, expect, it } from 'vitest'
import { renderCommitHookContent, resolveInitRuntimeContext, seedConsumerScaffold } from '../../../packages/spw-cli/src/init'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const tempRoots: string[] = []

async function makeTempDir(name = 'spw-init-portability-'): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), name))
  tempRoots.push(root)
  return root
}

describe('spw init portability', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  it('detects the source runtime context from this checkout', async () => {
    const sourceInitUrl = pathToFileURL(path.resolve(testDir, '../../../packages/spw-cli/src/init.ts')).href
    const runtime = await resolveInitRuntimeContext(sourceInitUrl)

    expect(runtime.mode).toBe('source')
    expect(runtime.packageRoot).toBe(path.resolve(testDir, '../../..'))
    expect(runtime.templateRoot).toBe(path.resolve(testDir, '../../../packages/spw-cli/templates/init'))
    expect(runtime.toolRoot).toBe(runtime.packageRoot)
  })

  it('ships a minimal consumer scaffold that includes mount metadata', async () => {
    const sourceInitUrl = pathToFileURL(path.resolve(testDir, '../../../packages/spw-cli/src/init.ts')).href
    const runtime = await resolveInitRuntimeContext(sourceInitUrl)
    const mountPath = path.join(runtime.templateRoot, 'base/.spw/mount.spw')

    await expect(access(path.join(runtime.templateRoot, 'base/.spw/index.spw'))).resolves.toBeUndefined()
    await expect(access(path.join(runtime.templateRoot, 'base/.spw/README.md'))).resolves.toBeUndefined()
    await expect(access(path.join(runtime.templateRoot, 'base/.spw/workspace.spw'))).resolves.toBeUndefined()
    await expect(access(mountPath)).resolves.toBeUndefined()

    const mount = await readFile(mountPath, 'utf8')
    expect(mount).toContain('version: "0.3.0"')
    expect(mount).toContain('@cli: ~"./_workbench/packages/spw-cli/"')
    expect(mount).toContain('@lsp: ~"./_workbench/packages/spw-lsp/"')
    expect(mount).toContain('paths: [~"./_workbench/lib/spw-v0.3.0/", ~"./_workbench/packages/spw-cli/", ~"./_workbench/packages/spw-lsp/"]')
  })

  it('renders a pre-commit hook that can delegate to interoperable workbench roots', () => {
    const hook = renderCommitHookContent('/tmp/spw dist root')

    expect(hook).toContain('.spw/_workbench')
    expect(hook).toContain('node_modules/spw-workbench')
    expect(hook).toContain('SPW_WORKBENCH_ROOT')
    expect(hook).toContain('SPW_REPO_ROOT_OVERRIDE="$REPO_ROOT"')
    expect(hook).toContain('SPW_TOOL_ROOT_OVERRIDE="$tool_root"')
    expect(hook).toContain('/tmp/spw dist root')
  })

  it('applies installable-book workspace defaults and consumer directories', async () => {
    const sourceInitUrl = pathToFileURL(path.resolve(testDir, '../../../packages/spw-cli/src/init.ts')).href
    const runtime = await resolveInitRuntimeContext(sourceInitUrl)
    const parent = await makeTempDir()
    const target = path.join(parent, 'book-project')

    const result = await seedConsumerScaffold(target, runtime, { preset: 'installable-book' })
    const workspace = await readFile(path.join(target, '.spw', 'workspace.spw'), 'utf8')

    expect(result.preset).toBe('installable-book')
    expect(workspace).toContain('@content: ~"../content"')
    expect(workspace).toContain('@public: ~"../public"')
    expect(workspace).toContain('@assets: ~"../public/assets"')
    expect(workspace).toContain('@chapters: ~"../public/chapters"')
    expect(workspace).toContain('@http: ~"../public/http"')
    expect(workspace).toContain('@manifest: ~"../public/manifest.webmanifest"')
    expect(workspace).toContain('@llms: ~"../public/llms.txt"')
    expect(workspace).toContain('~#site_kind: "installable-book"')
    expect(workspace).toMatch(/~#preset:\s+"installable-book"/)
    await expect(access(path.join(target, 'content'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'index.html'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'chapters', 'index.html'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'offline.html'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'manifest.webmanifest'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'sw.js'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'llms.txt'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'http', 'get', 'chapters.json'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'http', 'get', 'site.json'))).resolves.toBeUndefined()
    await expect(access(path.join(target, 'public', 'http', 'get', 'book.json'))).resolves.toBeUndefined()
  })
})

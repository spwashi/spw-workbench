import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderCommitHookContent, resolveInitRuntimeContext } from '../../../packages/spw-cli/src/init'

const testDir = path.dirname(fileURLToPath(import.meta.url))

describe('spw init portability', () => {
  it('detects the source runtime context from this checkout', async () => {
    const sourceInitUrl = pathToFileURL(path.resolve(testDir, '../../../packages/spw-cli/src/init.ts')).href
    const runtime = await resolveInitRuntimeContext(sourceInitUrl)

    expect(runtime.mode).toBe('source')
    expect(runtime.packageRoot).toBe(path.resolve(testDir, '../../..'))
    expect(runtime.templateRoot).toBe(path.resolve(testDir, '../../../packages/spw-cli/templates/init'))
    expect(runtime.toolRoot).toBe(runtime.packageRoot)
  })

  it('ships a minimal site scaffold that includes mount metadata', async () => {
    const sourceInitUrl = pathToFileURL(path.resolve(testDir, '../../../packages/spw-cli/src/init.ts')).href
    const runtime = await resolveInitRuntimeContext(sourceInitUrl)
    const mountPath = path.join(runtime.templateRoot, 'base/.spw/mount.spw')

    await expect(access(path.join(runtime.templateRoot, 'base/.spw/index.spw'))).resolves.toBeUndefined()
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
})

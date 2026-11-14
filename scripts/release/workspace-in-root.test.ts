/**
 * workspace-in-root: workspace names resolve inside the build root, and a build
 * that reached outside it is named. Run with the release contract:
 * npm run test:parser-release.
 */

import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { Metafile } from 'esbuild'
import { outsideRoot, readWorkspacePackages, resolveWorkspaceImport } from './workspace-in-root'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('workspace-in-root', () => {
  it('resolves a workspace name and its subpaths through the package exports, under the root given', async () => {
    const packages = await readWorkspacePackages(rootDir)
    assert.ok(packages.has('@spwashi/spw-seed') && packages.has('@spwashi/spw-runtime'))
    const elsewhere = '/somewhere/else'
    assert.deepEqual(resolveWorkspaceImport('@spwashi/spw-seed', elsewhere, packages), { path: '/somewhere/else/packages/spw-seed/src/index.ts' })
    assert.deepEqual(resolveWorkspaceImport('@spwashi/spw-seed/parser', elsewhere, packages), { path: '/somewhere/else/packages/spw-seed/src/parser.ts' })
    assert.deepEqual(resolveWorkspaceImport('@spwashi/spw-runtime/node', elsewhere, packages), { path: '/somewhere/else/packages/spw-runtime/src/node.ts' })
  })

  it('takes an exact override first, names a subpath no package exports, and leaves other names alone', async () => {
    const packages = await readWorkspacePackages(rootDir)
    const overrides = { '@spwashi/spw-seed': './packages/spw-seed/src/reader.ts' }
    assert.deepEqual(resolveWorkspaceImport('@spwashi/spw-seed', '/r', packages, overrides), { path: '/r/packages/spw-seed/src/reader.ts' })
    // The override is for the bare name; a subpath still reads the exports map.
    assert.deepEqual(resolveWorkspaceImport('@spwashi/spw-seed/lite', '/r', packages, overrides), { path: '/r/packages/spw-seed/src/lite.ts' })
    assert.deepEqual(resolveWorkspaceImport('@spwashi/spw-seed/nowhere', '/r', packages), { error: '@spwashi/spw-seed/nowhere: @spwashi/spw-seed exports no ./nowhere' })
    assert.equal(resolveWorkspaceImport('@spwashi/not-a-package', '/r', packages), null)
    assert.equal(resolveWorkspaceImport('esbuild', '/r', packages), null)
  })

  it('names the sources a build took from outside its root, and allows installed dependencies', () => {
    const input = { bytes: 1, imports: [] }
    const metafile = {
      inputs: {
        'packages/spw-seed/src/index.ts': input,
        '../../../packages/spw-seed/src/types/brand.ts': input,
        '../../node_modules/some-dependency/index.js': input,
        '<stdin>': input,
      },
      outputs: {},
    } as unknown as Metafile
    assert.deepEqual(outsideRoot(metafile), ['../../../packages/spw-seed/src/types/brand.ts'])
  })
})

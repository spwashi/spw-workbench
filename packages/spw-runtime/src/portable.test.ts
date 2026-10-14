/**
 * The runtime root stays portable: the interpreter, the pipeline, and the hot
 * session bundle for a browser. Mount resolution and composition evaluation
 * read the filesystem, so they live at @spwashi/spw-runtime/node; a node
 * built-in reaching the root fails here, before a release is cut.
 */

import path from 'node:path'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(__dirname, '../../..')

async function browserBundle(entry: string): Promise<string> {
  const result = await build({
    entryPoints: [path.join(rootDir, entry)],
    absWorkingDir: rootDir,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    write: false,
    logLevel: 'silent',
  })
  return result.outputFiles[0]!.text
}

describe('runtime in a browser', () => {
  it.each(['index', 'pipeline', 'substrate', 'resonance'])('bundles the %s entry with no node built-in', async (entry) => {
    const code = await browserBundle(`packages/spw-runtime/src/${entry}.ts`)
    expect(code).not.toMatch(/from\s*["']node:/)
  })

  it('keeps the node-only surface out of the root', async () => {
    const root = await import('./index')
    const node = await import('./node')
    for (const name of ['loadSpwMountResolution', 'discoverSpwMountResolution', 'evaluateCompositionSource']) {
      expect(name in root, `${name} leaves the root`).toBe(false)
      expect(name in node, `${name} lives in ./node`).toBe(true)
    }
  })
})

import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseWorkspaceRoot, resolveReferencePath } from '../helpers'
import { ServerIndex } from '../server-index'
import { selectPathRefs } from '../spw-selector'
import { DEFAULT_CONFIG } from '../types'

describe('path citation resolution', () => {
  it('reads a leading slash as the workspace root, and keeps an absolute path that exists', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-resolve-'))
    try {
      await fs.mkdir(path.join(root, 'about', 'a.land'), { recursive: true })
      await fs.mkdir(path.join(root, 'gen', 'routes'), { recursive: true })
      await fs.writeFile(path.join(root, 'about', 'a.land', 'index.html'), '<p></p>\n')
      const doc = path.join(root, 'gen', 'routes', 'a.land.spw')
      const absolute = path.join(root, 'about', 'a.land', 'index.html')
      const source = `@page: ~"/about/a.land/index.html"\n@abs: ~"${absolute}"\n`
      const index = new ServerIndex(root)
      const resolved = await Promise.all(selectPathRefs(source).map((hit) =>
        resolveReferencePath(hit, source, doc, root, DEFAULT_CONFIG, index)))
      expect(resolved).toEqual([absolute, absolute])
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})

describe('workspace initialization paths', () => {
  it('prefers the first workspace folder over deprecated rootUri', () => {
    const folderPath = path.resolve('/workspace/folder with spaces')
    const deprecatedPath = path.resolve('/workspace/deprecated')

    const result = parseWorkspaceRoot({
      rootUri: pathToFileURL(deprecatedPath).toString(),
      workspaceFolders: [{
        uri: pathToFileURL(folderPath).toString(),
        name: 'active',
      }],
    }, path.resolve('/fallback'))

    expect(result).toBe(folderPath)
  })

  it('falls back when the client supplies no local workspace URI', () => {
    const fallback = path.resolve('/fallback')
    expect(parseWorkspaceRoot({
      workspaceFolders: [{ uri: 'vscode-remote://host/workspace', name: 'remote' }],
    }, fallback)).toBe(fallback)
  })
})

import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseWorkspaceRoot } from '../helpers'

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

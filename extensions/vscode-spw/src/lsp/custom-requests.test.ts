import { describe, expect, it } from 'vitest'
import {
  createSpwCustomRequestClient,
  type SpwRequestTransport,
} from './custom-requests'

function workspacePayload(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    surface: 'spw.workspaceManifest',
    workspace: {
      mode: 'standalone-consumer',
      consumerUri: 'vscode-remote://ssh-remote+lab/workspace',
      spwUri: 'vscode-remote://ssh-remote+lab/workspace/.spw',
      workbenchUri: null,
    },
    manifest: {
      status: 'absent',
      uri: 'vscode-remote://ssh-remote+lab/workspace/.spw/workspace.spw',
      readFrom: { kind: 'filesystem' },
      diagnostics: [],
    },
    rootSource: 'fallback',
    roots: [{
      sigil: 'spw',
      uri: 'vscode-remote://ssh-remote+lab/workspace/.spw',
      role: 'consumer',
      kind: 'directory',
    }],
  }
}

describe('VS Code workspace request client', () => {
  it('requests and decodes the URI-first v1 workspace surface', async () => {
    const calls: Array<{ method: string, params: unknown }> = []
    const payload = workspacePayload()
    const transport: SpwRequestTransport = {
      async sendRequest<R>(method: string, params: unknown): Promise<R> {
        calls.push({ method, params })
        return payload as R
      },
    }
    const client = createSpwCustomRequestClient(transport)

    await expect(client.workspaceManifest()).resolves.toBe(payload)
    expect(calls).toEqual([{ method: 'spw/workspaceManifest/v1', params: {} }])
  })

  it('accepts apposition records with their reading and skips kinds it does not know', async () => {
    const annotation = (kind: string, extra: Record<string, unknown> = {}) => ({
      uri: 'file:///workspace/a.spw',
      line: 2,
      kind,
      name: 'lens',
      framePath: ['wonders'],
      ...extra,
    })
    const transport: SpwRequestTransport = {
      async sendRequest<R>(): Promise<R> {
        return [
          annotation('lens'),
          annotation('apposition', { body: 'bandwidth symmetry', sectionLabel: 'wonders' }),
          annotation('aspect-from-the-future'),
        ] as R
      },
    }

    const records = await createSpwCustomRequestClient(transport).annotations()
    expect(records.map((record) => record.kind)).toEqual(['lens', 'apposition'])
    expect(records[1]).toMatchObject({ kind: 'apposition', name: 'lens', body: 'bandwidth symmetry' })
  })

  it('still rejects a malformed annotation record', async () => {
    const transport: SpwRequestTransport = {
      async sendRequest<R>(): Promise<R> {
        return [{ uri: 'file:///workspace/a.spw', line: 2, kind: 'apposition', name: 'lens', body: 7, framePath: [] }] as R
      },
    }

    await expect(createSpwCustomRequestClient(transport).annotations())
      .rejects.toThrow('spw/annotations returned an invalid annotation entry')
  })

  it('rejects the path-bearing legacy response instead of adapting it locally', async () => {
    const transport: SpwRequestTransport = {
      async sendRequest<R>(): Promise<R> {
        return {
          rootSource: 'manifest',
          manifestUri: 'file:///workspace/.spw/workspace.spw',
          roots: [{
            sigil: 'spw',
            resolvedPath: '/workspace/.spw',
            uri: 'file:///workspace/.spw',
          }],
          projections: [],
        } as R
      },
    }

    await expect(createSpwCustomRequestClient(transport).workspaceManifest())
      .rejects.toThrow('Invalid spw.workspaceManifest v1 payload.')
  })
})

describe('VS Code cache reflection', () => {
  function clientFor(payload: unknown) {
    const transport: SpwRequestTransport = {
      async sendRequest<R>(): Promise<R> { return payload as R },
    }
    return createSpwCustomRequestClient(transport)
  }

  it('keeps the plane and the layer cards, so the cache card can show the LSP plane present', async () => {
    const layer = { surface: 'cache.layer/1', plane: 'lsp_session_reflection', present: true, source: 'spw-lsp', stats: { tracked: 3 } }
    const reflection = await clientFor({
      plane: 'lsp_session_reflection',
      layers: [layer, { plane: 'unknown_plane', present: true, source: 'x' }, 'not a card'],
      beat: 4,
      tracked: 3,
      concentration: 0.5,
      notes: [],
      families: [],
    }).cacheReflection()
    expect(reflection?.plane).toBe('lsp_session_reflection')
    expect(reflection?.layers).toEqual([layer])
  })

  it('leaves plane and layers out when the server sends none', async () => {
    const reflection = await clientFor({ beat: 1, tracked: 0, concentration: 0, notes: [], families: [] }).cacheReflection()
    expect(reflection).not.toHaveProperty('plane')
    expect(reflection).not.toHaveProperty('layers')
  })
})

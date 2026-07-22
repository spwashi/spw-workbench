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

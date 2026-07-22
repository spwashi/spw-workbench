import { describe, expect, it } from 'vitest'
import {
  isSpwWorkspaceManifestV1,
  parseSpwWorkspaceManifestV1,
} from '../workspace-protocol'

function validPayload(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    surface: 'spw.workspaceManifest',
    workspace: {
      mode: 'canonical',
      consumerUri: 'vscode-remote://ssh-remote+lab/workspace',
      spwUri: 'vscode-remote://ssh-remote+lab/workspace/.spw',
      workbenchUri: 'vscode-remote://ssh-remote+lab/workspace',
    },
    manifest: {
      status: 'valid',
      uri: 'vscode-remote://ssh-remote+lab/workspace/.spw/workspace.spw',
      readFrom: { kind: 'open-document', version: 7 },
      diagnostics: [],
    },
    rootSource: 'manifest',
    roots: [{
      sigil: 'spw',
      uri: 'vscode-remote://ssh-remote+lab/workspace/.spw',
      role: 'canonical',
      kind: 'directory',
    }],
  }
}

describe('workspace manifest v1 decoder', () => {
  it('accepts URI schemes without converting them to filesystem paths', () => {
    const payload = validPayload()
    expect(parseSpwWorkspaceManifestV1(payload)).toBe(payload)
  })

  it('accepts signed LSP document versions', () => {
    const payload = validPayload()
    payload.manifest = {
      status: 'valid',
      uri: 'file:///workspace/.spw/workspace.spw',
      readFrom: { kind: 'open-document', version: -1 },
      diagnostics: [],
    }
    expect(isSpwWorkspaceManifestV1(payload)).toBe(true)
  })

  it('rejects unsupported schema versions', () => {
    const payload = { ...validPayload(), schemaVersion: 2 }
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
    expect(() => parseSpwWorkspaceManifestV1(payload)).toThrow(
      'Invalid spw.workspaceManifest v1 payload.',
    )
  })

  it('rejects strings that are not URI identities', () => {
    const payload = validPayload()
    payload.workspace = {
      mode: 'canonical',
      consumerUri: '/workspace',
      spwUri: 'file:///workspace/.spw',
      workbenchUri: 'file:///workspace',
    }
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('requires standalone consumers to omit workbench identity', () => {
    const payload = validPayload()
    payload.workspace = {
      mode: 'standalone-consumer',
      consumerUri: 'file:///workspace',
      spwUri: 'file:///workspace/.spw',
      workbenchUri: 'file:///workspace/.spw/_workbench',
    }
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('rejects a blocked state that carries roots', () => {
    const payload = validPayload()
    payload.manifest = {
      status: 'invalid',
      uri: 'file:///workspace/.spw/workspace.spw',
      readFrom: { kind: 'filesystem' },
      diagnostics: [{
        source: 'parser',
        code: 'missing_roots_frame',
        message: 'Workspace manifest has no roots frame.',
      }],
    }
    payload.rootSource = 'blocked'

    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('rejects invalid evidence without a diagnostic', () => {
    const payload = validPayload()
    payload.manifest = {
      status: 'invalid',
      uri: 'file:///workspace/.spw/workspace.spw',
      readFrom: { kind: 'filesystem' },
      diagnostics: [],
    }
    payload.rootSource = 'blocked'
    payload.roots = []

    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('rejects diagnostic kinds that contradict manifest status', () => {
    const payload = validPayload()
    payload.manifest = {
      status: 'unreadable',
      uri: 'file:///workspace/.spw/workspace.spw',
      readFrom: { kind: 'filesystem' },
      diagnostics: [{
        source: 'parser',
        code: 'missing_roots_frame',
        message: 'Workspace manifest has no roots frame.',
      }],
    }
    payload.rootSource = 'blocked'
    payload.roots = []

    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('rejects root sigils that Seed cannot identify', () => {
    const payload = validPayload()
    payload.roots = [{
      sigil: '',
      uri: 'file:///workspace/.spw',
      role: 'canonical',
      kind: 'directory',
    }]
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('rejects duplicate root identities', () => {
    const payload = validPayload()
    payload.roots = [
      {
        sigil: 'spw',
        uri: 'file:///workspace/.spw',
        role: 'canonical',
        kind: 'directory',
      },
      {
        sigil: 'spw',
        uri: 'file:///workspace/other',
        role: 'canonical',
        kind: 'directory',
      },
    ]
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('requires canonical workbench and consumer identity to agree', () => {
    const payload = validPayload()
    payload.workspace = {
      mode: 'canonical',
      consumerUri: 'file:///workspace',
      spwUri: 'file:///workspace/.spw',
      workbenchUri: 'file:///other-workbench',
    }
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('requires mounted usable evidence to carry its infrastructure root', () => {
    const payload = validPayload()
    payload.workspace = {
      mode: 'mounted-consumer',
      consumerUri: 'file:///workspace',
      spwUri: 'file:///workspace/.spw',
      workbenchUri: 'file:///workspace/.spw/_workbench',
    }
    payload.roots = [{
      sigil: 'spw',
      uri: 'file:///workspace/.spw',
      role: 'consumer',
      kind: 'directory',
    }]
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('requires mounted workbench identity and infrastructure role to agree', () => {
    const payload = validPayload()
    payload.workspace = {
      mode: 'mounted-consumer',
      consumerUri: 'file:///workspace',
      spwUri: 'file:///workspace/.spw',
      workbenchUri: 'file:///workspace/.spw/_workbench',
    }
    payload.roots = [{
      sigil: 'workbench',
      uri: 'file:///other-workbench',
      role: 'consumer',
      kind: 'directory',
    }]
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('rejects root roles that contradict workspace mode', () => {
    const payload = validPayload()
    payload.roots = [{
      sigil: 'spw',
      uri: 'vscode-remote://ssh-remote+lab/workspace/.spw',
      role: 'consumer',
      kind: 'directory',
    }]
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('rejects process-local path fields even when URI identity is present', () => {
    const payload = validPayload()
    payload.roots = [{
      sigil: 'spw',
      uri: 'file:///workspace/.spw',
      resolvedPath: '/workspace/.spw',
      role: 'canonical',
      kind: 'directory',
    }]
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })

  it('rejects every undeclared field rather than relying on a path-key denylist', () => {
    const payload = validPayload()
    payload.workspace = {
      ...(payload.workspace as Record<string, unknown>),
      cwd: '/workspace',
    }
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)

    const nestedPayload = validPayload()
    nestedPayload.manifest = {
      ...(nestedPayload.manifest as Record<string, unknown>),
      metadata: { workspacePath: '/workspace' },
    }
    expect(isSpwWorkspaceManifestV1(nestedPayload)).toBe(false)
  })

  it('requires absent fallback roots to match workspace identity', () => {
    const payload = validPayload()
    payload.manifest = {
      status: 'absent',
      uri: 'file:///workspace/.spw/workspace.spw',
      readFrom: { kind: 'filesystem' },
      diagnostics: [],
    }
    payload.rootSource = 'fallback'
    payload.roots = [{
      sigil: 'shared',
      uri: 'file:///external/shared',
      role: 'external',
      kind: 'directory',
    }]
    expect(isSpwWorkspaceManifestV1(payload)).toBe(false)
  })
})

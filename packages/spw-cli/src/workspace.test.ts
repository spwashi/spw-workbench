import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  discoverSpwWorkspace,
  findWorkspaceRoot,
  isWithin,
  resolveWorkspacePath,
  SpwWorkspaceNotFoundError,
  tryDiscoverSpwWorkspace,
} from './workspace'

describe('isWithin', () => {
  it('accepts the parent itself', () => {
    expect(isWithin('/a/b', '/a/b')).toBe(true)
  })

  it('accepts a nested descendant', () => {
    expect(isWithin('/a/b', '/a/b/c/d')).toBe(true)
  })

  it('rejects a sibling directory that shares a name prefix', () => {
    // '/a/b-other' is NOT inside '/a/b' even though the string starts with it.
    expect(isWithin('/a/b', '/a/b-other')).toBe(false)
  })

  it('rejects a parent or unrelated path', () => {
    expect(isWithin('/a/b', '/a')).toBe(false)
    expect(isWithin('/a/b', '/x/y')).toBe(false)
  })

  it('rejects traversal back out via ..', () => {
    expect(isWithin('/a/b', '/a/b/../../etc')).toBe(false)
  })
})

describe('workspace discovery + path resolution (fallback, no manifest)', () => {
  let root: string

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-workspace-test-'))
    await fs.mkdir(path.join(root, '.spw'), { recursive: true })
    await fs.writeFile(path.join(root, '.spw', 'mount.spw'), '', 'utf8')
    await fs.mkdir(path.join(root, 'prompts'), { recursive: true })
    await fs.writeFile(path.join(root, 'prompts', 'index.spw'), '@root: []\n', 'utf8')
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('discovers the workspace by walking up to .spw/mount.spw', async () => {
    const nested = path.join(root, 'prompts')
    const workspace = await discoverSpwWorkspace(nested)
    expect(path.resolve(workspace.consumerRoot)).toBe(path.resolve(root))
    expect(workspace.rootSource).toBe('fallback')
  })

  it('tryDiscoverSpwWorkspace returns null outside any workspace', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-no-workspace-'))
    try {
      const workspace = await tryDiscoverSpwWorkspace(outside)
      expect(workspace).toBeNull()
    } finally {
      await fs.rm(outside, { recursive: true, force: true })
    }
  })

  it('discoverSpwWorkspace throws SpwWorkspaceNotFoundError outside any workspace', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-no-workspace-'))
    try {
      await expect(discoverSpwWorkspace(outside)).rejects.toBeInstanceOf(SpwWorkspaceNotFoundError)
    } finally {
      await fs.rm(outside, { recursive: true, force: true })
    }
  })

  it('resolves a relative path inside the consumer root', async () => {
    const workspace = await discoverSpwWorkspace(root)
    const resolved = await resolveWorkspacePath(workspace, 'prompts/index.spw')
    expect(resolved).toBe(path.resolve(root, 'prompts/index.spw'))
  })

  it('rejects a relative path that escapes the consumer root', async () => {
    const workspace = await discoverSpwWorkspace(root)
    await expect(resolveWorkspacePath(workspace, '../../etc/passwd')).rejects.toThrow(
      /outside/,
    )
  })

  it('rejects an absolute path outside the consumer root', async () => {
    const workspace = await discoverSpwWorkspace(root)
    const elsewhere = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-elsewhere-'))
    try {
      await expect(resolveWorkspacePath(workspace, elsewhere)).rejects.toThrow(/outside/)
    } finally {
      await fs.rm(elsewhere, { recursive: true, force: true })
    }
  })

  it('findWorkspaceRoot resolves the fallback @spw root and rejects unknown sigils', async () => {
    const workspace = await discoverSpwWorkspace(root)
    const spwRoot = findWorkspaceRoot(workspace, '@spw')
    expect(spwRoot?.absolutePath).toBe(path.resolve(root, '.spw'))
    expect(findWorkspaceRoot(workspace, '@nonexistent')).toBeNull()
    expect(findWorkspaceRoot(workspace, 'not-a-root-selector')).toBeNull()
  })
})

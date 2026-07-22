import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { collectSpwFiles, DEFAULT_IGNORED_DIRS } from './fs-walk'

describe('collectSpwFiles', () => {
  let root: string

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-fs-walk-test-'))
    await fs.mkdir(path.join(root, 'nested', 'deeper'), { recursive: true })
    await fs.mkdir(path.join(root, 'node_modules', 'pkg'), { recursive: true })
    await fs.mkdir(path.join(root, '.git'), { recursive: true })
    await fs.mkdir(path.join(root, '.hidden'), { recursive: true })

    await fs.writeFile(path.join(root, 'top.spw'), '', 'utf8')
    await fs.writeFile(path.join(root, 'ignore-me.md'), '', 'utf8')
    await fs.writeFile(path.join(root, 'nested', 'mid.spw'), '', 'utf8')
    await fs.writeFile(path.join(root, 'nested', 'deeper', 'deep.spw'), '', 'utf8')
    await fs.writeFile(path.join(root, 'node_modules', 'pkg', 'vendored.spw'), '', 'utf8')
    await fs.writeFile(path.join(root, '.git', 'gitfile.spw'), '', 'utf8')
    await fs.writeFile(path.join(root, '.hidden', 'hidden.spw'), '', 'utf8')
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('finds .spw files recursively, sorted, excluding non-.spw files', async () => {
    const files = await collectSpwFiles(root)
    const rel = files.map(f => path.relative(root, f)).sort()
    expect(rel).toEqual(['nested/deeper/deep.spw', 'nested/mid.spw', 'top.spw'])
  })

  it('excludes node_modules and .git by default', async () => {
    const files = await collectSpwFiles(root)
    expect(files.some(f => f.includes('node_modules'))).toBe(false)
    expect(files.some(f => f.includes('.git'))).toBe(false)
  })

  it('excludes other dotfile directories (not just DEFAULT_IGNORED_DIRS)', async () => {
    const files = await collectSpwFiles(root)
    expect(files.some(f => f.includes('.hidden'))).toBe(false)
  })

  it('honors a custom ignore set (replaces, rather than merges with, the default)', async () => {
    const files = await collectSpwFiles(root, { ignore: new Set(['nested']) })
    const rel = files.map(f => path.relative(root, f)).sort()
    // 'nested' is excluded via the custom set; node_modules/.git are NOT
    // excluded here since the custom set replaces DEFAULT_IGNORED_DIRS.
    expect(rel).toEqual(['node_modules/pkg/vendored.spw', 'top.spw'])
  })

  it('returns a single file when the root itself is a .spw file', async () => {
    const files = await collectSpwFiles(path.join(root, 'top.spw'))
    expect(files).toEqual([path.resolve(root, 'top.spw')])
  })

  it('returns empty for a non-.spw file root', async () => {
    const files = await collectSpwFiles(path.join(root, 'ignore-me.md'))
    expect(files).toEqual([])
  })

  it('returns empty for a missing root', async () => {
    const files = await collectSpwFiles(path.join(root, 'does-not-exist'))
    expect(files).toEqual([])
  })

  it('DEFAULT_IGNORED_DIRS contains the expected hygiene set', () => {
    expect([...DEFAULT_IGNORED_DIRS].sort()).toEqual(['.git', 'dist', 'node_modules', 'release'])
  })
})

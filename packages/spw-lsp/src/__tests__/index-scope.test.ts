/**
 * The workspace annotation index holds the files the workspace walk would
 * hold, and nothing it would skip.
 *
 * Editors counted incoming refs from `.tmp/` and `release/wt-*` copies that no
 * longer existed: a watched create or a save indexed any path, and a deleted
 * folder pruned nothing, since its event carries no `.spw` suffix. Every path
 * into the index now asks the same scope question, and a folder delete drops
 * what was under it.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { uriFromPath } from '../helpers'
import { ServerIndex } from '../server-index'

let root: string

function write(relative: string, text: string): string {
  const target = path.join(root, relative)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, text)
  return target
}

function filesNaming(index: ServerIndex, name: string): string[] {
  return [...new Set(index.lookupAnnotation(name).map((entry) => path.relative(root, entry.file)))].sort()
}

beforeAll(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'spw-index-scope-'))
  write('a.spw', '#>alpha\n')
  write('.tmp/headplans/a.spw', '#>alpha\n')
  write('release/wt-pre/a.spw', '#>alpha\n')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('index scope', () => {
  it('the workspace walk skips .tmp and release copies', async () => {
    const index = new ServerIndex(root)
    await index.scanWorkspace()
    expect(filesNaming(index, 'alpha')).toEqual(['a.spw'])
  })

  it('a watched create under an ignored directory stays out of the index', async () => {
    const index = new ServerIndex(root)
    await index.scanWorkspace()
    await index.refreshFileAnnotations(path.join(root, '.tmp/headplans/a.spw'))
    await index.refreshFileAnnotations(path.join(root, 'release/wt-pre/a.spw'))
    expect(filesNaming(index, 'alpha')).toEqual(['a.spw'])
  })

  it('saving a file under an ignored directory stays out of the index', async () => {
    const index = new ServerIndex(root)
    await index.scanWorkspace()
    const copy = path.join(root, '.tmp/headplans/a.spw')
    const uri = uriFromPath(copy)
    index.openDocument(uri, copy, '#>alpha\n', 1)
    index.saveDocument(uri)
    expect(filesNaming(index, 'alpha')).toEqual(['a.spw'])
  })

  it('a deleted folder drops every indexed file it held', async () => {
    const scratch = write('scratch/notes/b.spw', '#>alpha\n')
    const index = new ServerIndex(root)
    await index.scanWorkspace()
    expect(filesNaming(index, 'alpha')).toEqual(['a.spw', 'scratch/notes/b.spw'])

    rmSync(path.dirname(path.dirname(scratch)), { recursive: true, force: true })
    expect(index.forgetFilesUnder(path.join(root, 'scratch'))).toBe(1)
    expect(filesNaming(index, 'alpha')).toEqual(['a.spw'])
  })

  it('a file outside the workspace root is still indexed when refreshed', async () => {
    const elsewhere = mkdtempSync(path.join(os.tmpdir(), 'spw-index-scope-outside-'))
    try {
      const outside = path.join(elsewhere, 'c.spw')
      writeFileSync(outside, '#>alpha\n')
      const index = new ServerIndex(root)
      await index.scanWorkspace()
      await index.refreshFileAnnotations(outside)
      expect(index.lookupAnnotation('alpha').some((entry) => entry.file === outside)).toBe(true)
    } finally {
      rmSync(elsewhere, { recursive: true, force: true })
    }
  })
})

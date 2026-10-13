/**
 * workspace/willRenameFiles — Tests
 *
 * The handler answers with the same plan `spw refactor --rename path:` makes:
 * citations the parser finds, re-aimed in their own form, as a WorkspaceEdit.
 */

import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyEdits } from '@spwashi/spw-seed'
import { willRenameFiles } from '../handlers/rename-files'
import { pathFromUri, uriFromPath } from '../helpers'
import type { HandlerDeps, LspTextEdit } from '../types'

const FIXTURE: Record<string, string> = {
  'index.spw': '^["roots"]{\n @old: ~"docs/old.spw#start"\n @notes: ~"./notes/"\n}\n',
  'docs/old.spw': '#>start\n',
  'docs/other.spw': "see: ~'./old.spw'\n",
  'notes/a.spw': 'up: ~"../index.spw"\nsib: ~"./b.spw"\n',
  'notes/b.spw': '#>b\n',
}

async function workspace(): Promise<{ root: string; deps: HandlerDeps; open: Map<string, string> }> {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'spw-lsp-rename-')))
  for (const [rel, text] of Object.entries(FIXTURE)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true })
    await writeFile(path.join(root, rel), text, 'utf8')
  }
  const open = new Map<string, string>()
  const deps = {
    workspaceRoot: root,
    pathFromUri,
    uriFromPath,
    getDocumentText: async (uri: string) => open.get(uri) ?? FIXTURE[path.relative(root, pathFromUri(uri) ?? '')] ?? null,
    getWorkspaceSpwFiles: async () => Object.keys(FIXTURE).map(rel => path.join(root, rel)),
    mapWithConcurrency: async (items: any[], _c: number, fn: any) => Promise.all(items.map(fn)),
    log: () => {},
  } as unknown as HandlerDeps
  return { root, deps, open }
}

/** Apply LSP edits to a text, the way the client would. */
function apply(text: string, edits: LspTextEdit[]): string {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1)
  const offset = (p: { line: number; character: number }) => starts[p.line]! + p.character
  return applyEdits(text, edits.map(edit => ({
    start: offset(edit.range.start),
    end: offset(edit.range.end),
    newText: edit.newText,
    ruleId: 'lsp',
    stratum: 'reference' as const,
  })))
}

const uriOf = (root: string, rel: string) => uriFromPath(path.join(root, rel))

describe('willRenameFiles', () => {
  it('re-aims citations to a moved .spw file, keeping fragment and quotes', async () => {
    const { root, deps } = await workspace()
    const result = await willRenameFiles({
      files: [{ oldUri: uriOf(root, 'docs/old.spw'), newUri: uriOf(root, 'guide/new.spw') }],
    }, deps)

    expect(result).not.toBeNull()
    const changes = result!.changes
    expect(Object.keys(changes).sort()).toEqual([uriOf(root, 'docs/other.spw'), uriOf(root, 'index.spw')].sort())
    expect(apply(FIXTURE['index.spw']!, changes[uriOf(root, 'index.spw')]!)).toContain('@old: ~"guide/new.spw#start"')
    expect(apply(FIXTURE['docs/other.spw']!, changes[uriOf(root, 'docs/other.spw')]!)).toBe("see: ~'../guide/new.spw'\n")
  })

  it('moves a folder: citations into it follow and its outward links rebase', async () => {
    const { root, deps } = await workspace()
    const result = await willRenameFiles({
      files: [{ oldUri: uriOf(root, 'notes'), newUri: uriOf(root, 'archive/notes') }],
    }, deps)

    const changes = result!.changes
    expect(apply(FIXTURE['index.spw']!, changes[uriOf(root, 'index.spw')]!)).toContain('@notes: ~"./archive/notes/"')
    expect(apply(FIXTURE['notes/a.spw']!, changes[uriOf(root, 'notes/a.spw')]!)).toBe('up: ~"../../index.spw"\nsib: ~"./b.spw"\n')
    expect(changes[uriOf(root, 'notes/b.spw')]).toBeUndefined()
  })

  it('plans against the open buffer, not the disk', async () => {
    const { root, deps, open } = await workspace()
    const buffer = '# unsaved line first\nsee: ~"./old.spw"\n'
    open.set(uriOf(root, 'docs/other.spw'), buffer)
    const result = await willRenameFiles({
      files: [{ oldUri: uriOf(root, 'docs/old.spw'), newUri: uriOf(root, 'docs/renamed.spw') }],
    }, deps)

    const edits = result!.changes[uriOf(root, 'docs/other.spw')]!
    expect(edits[0]!.range.start.line).toBe(1)
    expect(apply(buffer, edits)).toBe('# unsaved line first\nsee: ~"./renamed.spw"\n')
  })

  it('returns null when nothing cites the moved path or the rename is not ours', async () => {
    const { root, deps } = await workspace()
    expect(await willRenameFiles({
      files: [{ oldUri: uriOf(root, 'docs/other.spw'), newUri: uriOf(root, 'docs/other-2.spw') }],
    }, deps)).toBeNull()
    expect(await willRenameFiles({
      files: [{ oldUri: uriOf(root, 'README.md'), newUri: uriOf(root, 'GUIDE.md') }],
    }, deps)).toBeNull()
    expect(await willRenameFiles(undefined, deps)).toBeNull()
  })
})

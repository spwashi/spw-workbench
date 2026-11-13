import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStartFrame, renderStartPage, startPage } from './start'
import { runSpwCli } from './run'

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'spw-start-'))
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    writeFileSync(path.join(root, rel), text)
  }
  return root
}

const BASE = {
  '.spw/mount.spw': '#>m\n^"mount"{ }\n',
  '.spw/workspace.spw': '#>w\n^"roots"{\n @spw: ~"."\n @index: ~"./index.spw"\n @notes: ~"./notes"\n}\n',
  '.spw/index.spw': '#>i\n^"index"{ a: 1 }\n',
  '.spw/notes/a.spw': 'a\n',
  '.spw/notes/b.spw': 'b\n',
}

describe('the start page bare spw prints', () => {
  afterEach(() => vi.restoreAllMocks())

  it('offers to make a workspace where there is none', async () => {
    const page = await startPage(mkdtempSync(path.join(tmpdir(), 'spw-none-')))
    expect(page.mode).toBe('none')
    expect(page.start[0]!.command).toBe('spw init')
    expect(page.recent).toEqual([])
  })

  it('suggests a walk through the roots the workspace declares', async () => {
    const page = await startPage(workspace(BASE))
    expect(page.source).toBe('derived')
    expect(page.start.map((l) => l.command)).toEqual(['spw quest', 'spw doctor', 'spw tree @notes --depth 2', 'spw outline @index'])
  })

  it('lists what changed most recently, newest first, and leaves out what tools write', async () => {
    const root = workspace({ ...BASE, '.agents/state/run.state.spw': 's\n', '.spw/gen/out.spw': 'g\n' })
    const at = (rel: string, minutesAgo: number) => {
      const t = new Date(Date.now() - minutesAgo * 60000)
      utimesSync(path.join(root, rel), t, t)
    }
    for (const [rel, m] of [['.spw/mount.spw', 90], ['.spw/workspace.spw', 80], ['.spw/index.spw', 70], ['.spw/notes/a.spw', 30], ['.spw/notes/b.spw', 5], ['.agents/state/run.state.spw', 0], ['.spw/gen/out.spw', 0]] as const) at(rel, m)
    const page = await startPage(root)
    expect(page.recent.map((r) => r.path)).toEqual([path.join('.spw', 'notes', 'b.spw'), path.join('.spw', 'notes', 'a.spw'), path.join('.spw', 'index.spw')])
    expect(page.cost.files).toBeGreaterThanOrEqual(5)
  })

  it('takes its lines and its walk from a ^"start" frame the workspace writes', async () => {
    const manifest = `${BASE['.spw/workspace.spw']}\n^"start"{\n read_first: "spw outline @index"\n the_notes: "spw tree @notes"\n recent: 0\n}\n`
    const page = await startPage(workspace({ ...BASE, '.spw/workspace.spw': manifest }))
    expect(page.source).toBe('workspace')
    expect(page.start).toEqual([{ command: 'spw outline @index', says: 'read first' }, { command: 'spw tree @notes', says: 'the notes' }])
    expect(page.recent).toEqual([])
    expect(page.cost.files).toBe(2)
  })

  it('reads a start frame and ignores a quoted value that is not an spw command', () => {
    expect(readStartFrame('^"start"{\n a: "spw tree"\n b: "rm -rf"\n recent: 5\n}')).toEqual({ lines: [{ command: 'spw tree', says: 'a' }], recent: 5 })
    expect(readStartFrame('^"roots"{ }')).toBeNull()
  })

  it('says what reading the tree cost, and how to lower it', async () => {
    const text = renderStartPage(await startPage(workspace(BASE)))
    expect(text).toMatch(/Read:\n {2}\d+ files in \d+ ms \(to skip the walk, write recent: 0/)
    expect(text.split('\n').length).toBeLessThan(30)
  })

  it('is what bare spw prints, and spw help still prints every command', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await runSpwCli(['node', 'spw'])
    expect(String(log.mock.calls[0]?.[0])).toContain('Start here')
    log.mockClear()
    await runSpwCli(['node', 'spw', 'help'])
    expect(String(log.mock.calls[0]?.[0])).toContain('Compatibility routes')
  })
})

import { mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runSpwRefactorCli } from './refactor'

/** A small consumer tree: an index, a docs file with a fragment, a notes directory, and a README. */
const FIXTURE: Record<string, string> = {
  'index.spw': [
    '^["roots"]{',
    ' @old: ~"docs/old.spw"',
    ' @frag: ~"./docs/old.spw#start"',
    ' @route: ~"/docs/old.spw"',
    ' @notes: ~"notes/"',
    ' @note: ~"notes/a.spw#top"',
    '}',
    '.. docs/old.spw named in prose is not a citation',
    '',
  ].join('\n'),
  'docs/old.spw': '#>start\nhome: ~"../index.spw"\n',
  'docs/other.spw': "see: ~'./old.spw#start'\n",
  'notes/a.spw': '#>top\nsib: ~"./b.spw"\nup: ~"../docs/old.spw#start"\n',
  'notes/b.spw': '#>b\n',
  'README.md': '# readme\n\nSee [old](docs/old.spw#start) and `docs/old.spw`.\nUnrelated [other](docs/other.spw)\n',
  'site/page.html': '<a href="../notes/a.spw">notes</a>\n',
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spw-refactor-path-'))
  for (const [rel, text] of Object.entries(FIXTURE)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true })
    await writeFile(path.join(root, rel), text, 'utf8')
  }
  process.chdir(root)
  return root
}

async function refactor(...args: string[]): Promise<any> {
  const chunks: string[] = []
  const log = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => { chunks.push(String(value ?? '')) })
  const error = vi.spyOn(console, 'error').mockImplementation((value?: unknown) => { chunks.push(String(value ?? '')) })
  try {
    await runSpwRefactorCli(['node', 'spw', 'refactor', '.', ...args, '--json'])
  } finally {
    log.mockRestore()
    error.mockRestore()
  }
  const raw = chunks.join('\n')
  return JSON.parse(raw.slice(raw.indexOf('{'))).data
}

const read = (root: string, rel: string) => readFile(path.join(root, rel), 'utf8')

describe('spw refactor --rename path:from=to', () => {
  const cwd = process.cwd()
  afterEach(() => {
    process.chdir(cwd)
    process.exitCode = undefined
  })

  it('plans a file move without writing, keeping each form, fragment and quote', async () => {
    const root = await fixture()
    const plan = await refactor('--rename', 'path:docs/old.spw=guide/new.spw')

    expect(plan.mode).toBe('plan')
    const reasons = plan.report.flatMap((entry: any) => entry.edits.map((edit: any) => `${entry.file} ${edit.reason}`))
    expect(reasons).toEqual([
      "docs/other.spw ~'./old.spw#start' → ~'../guide/new.spw#start'",
      'index.spw ~"docs/old.spw" → ~"guide/new.spw"',
      'index.spw ~"./docs/old.spw#start" → ~"./guide/new.spw#start"',
      'index.spw ~"/docs/old.spw" → ~"/guide/new.spw"',
      'notes/a.spw ~"../docs/old.spw#start" → ~"../guide/new.spw#start"',
    ])
    expect(plan.totalEdits).toBe(5)
    // docs/old.spw moves to the same depth, so its own ../index.spw still holds
    // plan-only: nothing on disk changed, and the move is offered, not made
    expect(await read(root, 'index.spw')).toBe(FIXTURE['index.spw'])
    expect(plan.moves).toEqual([expect.objectContaining({
      from: 'docs/old.spw', to: 'guide/new.spw', kind: 'file', state: 'pending',
      command: 'mkdir -p guide && mv docs/old.spw guide/new.spw',
    })])
    expect(plan.next).toContain('mkdir -p guide && mv docs/old.spw guide/new.spw')
  })

  it('writes, then plans nothing on a second run, before or after the move', async () => {
    const root = await fixture()
    const first = await refactor('--rename', 'path:docs/old.spw=guide/new.spw', '--write')
    expect(first.mode).toBe('write')
    expect(first.totalEdits).toBeGreaterThan(0)

    expect(await read(root, 'index.spw')).toContain('@frag: ~"./guide/new.spw#start"')
    expect(await read(root, 'docs/other.spw')).toBe("see: ~'../guide/new.spw#start'\n")
    expect(await read(root, 'notes/a.spw')).toContain('up: ~"../guide/new.spw#start"')
    expect(await read(root, 'index.spw')).toContain('.. docs/old.spw named in prose is not a citation')

    const again = await refactor('--rename', 'path:docs/old.spw=guide/new.spw')
    expect(again.totalEdits).toBe(0)

    await mkdir(path.join(root, 'guide'))
    await rename(path.join(root, 'docs/old.spw'), path.join(root, 'guide/new.spw'))
    const afterMove = await refactor('--rename', 'path:docs/old.spw=guide/new.spw')
    expect(afterMove.totalEdits).toBe(0)
    expect(afterMove.moves[0].state).toBe('moved')
    expect(afterMove.next).toEqual([])
  })

  it('moves a directory: citations into it follow and its outward ../ links rebase', async () => {
    const root = await fixture()
    await refactor('--rename', 'path:notes=archive/2026/notes', '--write')

    const index = await read(root, 'index.spw')
    expect(index).toContain('@notes: ~"archive/2026/notes/"')
    expect(index).toContain('@note: ~"archive/2026/notes/a.spw#top"')
    // the sibling link moves with its directory; the climb out goes two deeper
    expect(await read(root, 'notes/a.spw')).toBe('#>top\nsib: ~"./b.spw"\nup: ~"../../../docs/old.spw#start"\n')

    const again = await refactor('--rename', 'path:notes=archive/2026/notes')
    expect(again.totalEdits).toBe(0)
  })

  it('lists Markdown and HTML links it cannot own, without editing them', async () => {
    const root = await fixture()
    const plan = await refactor('--rename', 'path:docs/old.spw=guide/new.spw', '--write')

    expect(plan.unowned).toEqual([
      { file: 'README.md', line: 3, text: 'See [old](docs/old.spw#start) and `docs/old.spw`.' },
    ])
    expect(await read(root, 'README.md')).toBe(FIXTURE['README.md'])

    const dirPlan = await refactor('--rename', 'path:notes=archive/notes')
    expect(dirPlan.unowned).toEqual([
      { file: 'site/page.html', line: 1, text: '<a href="../notes/a.spw">notes</a>' },
    ])
  })

  it('refuses a move it cannot describe', async () => {
    await fixture()
    const errors: string[] = []
    vi.spyOn(console, 'error').mockImplementation((value?: unknown) => { errors.push(String(value ?? '')) })
    await runSpwRefactorCli(['node', 'spw', 'refactor', '.', '--rename', 'path:missing.spw=elsewhere.spw'])
    await runSpwRefactorCli(['node', 'spw', 'refactor', '.', '--rename', 'path:docs/old.spw=docs/other.spw'])
    expect(errors[0]).toContain('nothing at missing.spw')
    expect(errors[1]).toContain('already exists')
    expect(process.exitCode).toBe(1)
  })
})

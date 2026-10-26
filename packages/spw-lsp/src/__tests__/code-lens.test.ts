/**
 * Code lenses that count and act: citations of a file and of its keys, the
 * runtime trial kept off anchor lines, and a generated surface's source and
 * rebuild. Built against real files, through the real resolver, since what a
 * citation count means is that Ctrl+Click on each cited path lands here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { codeLens, hover } from '../handlers/display'
import { resetReferenceGraph } from '../handlers/reference-graph'
import { SHOW_LOCATIONS_COMMAND } from '../handlers/citation-lenses'
import { OPEN_URI_COMMAND, REBUILD_GENERATED_COMMAND } from '../handlers/generated-lenses'
import { ServerContext } from '../context'
import { ServerIndex } from '../server-index'
import { resolveReferencePath } from '../helpers'
import { DEFAULT_CONFIG, type HandlerDeps, type LspCodeLens } from '../types'

let root: string

async function write(relativePath: string, text: string): Promise<string> {
  const full = path.join(root, relativePath)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, text, 'utf8')
  return full
}

async function collect(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await collect(full))
    else if (entry.name.endsWith('.spw')) out.push(full)
  }
  return out
}

interface Workspace {
  deps: HandlerDeps
  serverIndex: ServerIndex
  refreshes: () => number
  /** Resolves on the next lens refresh the server asks for. */
  nextRefresh: () => Promise<void>
}

/** A workspace over the temp root, with the document under test open. */
async function openWorkspace(file: string, overrides: Partial<HandlerDeps> = {}): Promise<Workspace> {
  const serverIndex = new ServerIndex(root)
  await serverIndex.scanWorkspace()
  serverIndex.openDocument(`file://${file}`, file, await fs.readFile(file, 'utf8'), 1)
  let count = 0
  let waiting: Array<() => void> = []
  const deps = {
    serverIndex,
    config: DEFAULT_CONFIG,
    workspaceRoot: root,
    pathFromUri: (uri: string) => uri.replace('file://', ''),
    uriFromPath: (filePath: string) => `file://${filePath}`,
    resolveReferencePath: (hit: any, source: string, docPath: string, options?: { allowDirectory?: boolean }) =>
      resolveReferencePath(hit, source, docPath, root, DEFAULT_CONFIG, serverIndex, options),
    getWorkspaceSpwFiles: () => collect(root),
    mapWithConcurrency: async (items: any[], _c: number, fn: any) => Promise.all(items.map(fn)),
    sendNotification: () => {},
    refreshCodeLenses: () => {
      count += 1
      const resolve = waiting
      waiting = []
      for (const done of resolve) done()
    },
    log: () => {},
    trialRunSpw: () => null,
    ...overrides,
  } as unknown as HandlerDeps
  return {
    deps,
    serverIndex,
    refreshes: () => count,
    nextRefresh: () => new Promise<void>((resolve) => { waiting.push(resolve) }),
  }
}

const titles = (lenses: LspCodeLens[], line?: number): string[] =>
  lenses.filter((lens) => line === undefined || lens.range.start.line === line).map((lens) => lens.command?.title ?? '')

beforeEach(async () => {
  resetReferenceGraph()
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-codelens-'))
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('citation lenses — who cites this file, and which key', () => {
  async function writeFamily(): Promise<string> {
    const family = await write('routes/_family.spw', '# family\n#>family_routes\n#>shape_1\nshape_2 = .{}\n')
    await write('routes/a.spw', '#>route_a\n@family: ~"./_family.spw"\nfollows = ~"./_family.spw#shape_1"\n')
    await write('routes/b.spw', '#>route_b\n@family: ~"./_family.spw"\nfollows = ~"./_family.spw#shape_1"\n')
    await write('routes/c.spw', '#>route_c\n@family: ~"./_family.spw"\nfollows = ~"./_family.spw#shape_2"\n')
    // Repeats an anchor's name as a #tag: kin by vocabulary, not a citation.
    await write('notes.spw', '#>notes\n#shape_1 #family_routes\n')
    return family
  }

  it('says nothing while the index is cold, then asks for a refresh and counts', async () => {
    const family = await writeFamily()
    const { deps, nextRefresh, refreshes } = await openWorkspace(family)
    const landed = nextRefresh()

    const cold = titles(await codeLens({ textDocument: { uri: `file://${family}` } }, deps))
    expect(cold.filter((t) => /cited by|no cross-file|no refs/.test(t))).toEqual([])

    await landed
    expect(refreshes()).toBe(1)
    const lenses = await codeLens({ textDocument: { uri: `file://${family}` } }, deps)

    expect(titles(lenses, 0)).toContain('↙ cited by 3 files · 6 citations')
    expect(titles(lenses, 2)).toContain('↙ #shape_1 cited by 2 files · 2 citations')
    expect(titles(lenses, 2)).toContain('↗ 1 file repeats this name')
    // shape_2 is a binding key, not a #> anchor: fragment lookup lands on anchors only.
    expect(titles(lenses, 3)).toEqual([])
    // A warm index with nothing to say about an anchor says nothing.
    expect(titles(lenses, 1).filter((t) => /cited/.test(t))).toEqual([])

    const fileLens = lenses.find((lens) => lens.command?.title.startsWith('↙ cited by'))!
    expect(fileLens.command?.command).toBe(SHOW_LOCATIONS_COMMAND)
    const [uri, at, locations] = fileLens.command!.arguments as [string, unknown, Array<{ uri: string }>]
    expect(uri).toBe(`file://${family}`)
    expect(at).toEqual({ line: 0, character: 0 })
    expect(locations.map((l) => path.basename(l.uri)).sort()).toEqual(['a.spw', 'a.spw', 'b.spw', 'b.spw', 'c.spw', 'c.spw'])
  })

  it('counts the second kind apart: files that repeat an anchor name are not citations', async () => {
    const family = await writeFamily()
    const { deps, nextRefresh } = await openWorkspace(family)
    const landed = nextRefresh()
    await codeLens({ textDocument: { uri: `file://${family}` } }, deps)
    await landed

    const lenses = await codeLens({ textDocument: { uri: `file://${family}` } }, deps)
    const repeat = lenses.find((lens) => lens.range.start.line === 1 && /repeats? this name/.test(lens.command?.title ?? ''))
    expect(repeat?.command?.title).toBe('↗ 1 file repeats this name')
    expect(repeat?.command?.command).toBe(SHOW_LOCATIONS_COMMAND)
    expect((repeat?.command?.arguments?.[2] as Array<{ uri: string }>).map((l) => path.basename(l.uri))).toEqual(['notes.spw'])
  })
})

describe('anchor lenses run no runtime trial', () => {
  it('no anchor line carries a register count, and codeLens never runs a trial', async () => {
    const file = await write('anchors.spw', '#>one\n=x{ 1 }\n#>two\n&y{ 2 }\n#>three\n')
    const trialRunSpw = vi.fn(() => ({ success: true, runtime: { registers: { entries: { x: { meta: {} } } } } }))
    const { deps } = await openWorkspace(file, { trialRunSpw } as Partial<HandlerDeps>)

    const lenses = await codeLens({ textDocument: { uri: `file://${file}` } }, deps)
    expect(trialRunSpw).not.toHaveBeenCalled()
    expect(titles(lenses).filter((t) => /\breg\b|register|phase:/.test(t))).toEqual([])
  })

  it('the sigil hover names the register bank as runtime registers, not reg', async () => {
    const file = await write('sigil.spw', 'a = 1\n')
    const entries = { x: { meta: { descriptor: { name: 'set =' }, provenance: [], phases: { current: 'parse' }, writes: 1 } } }
    const { deps } = await openWorkspace(file, {
      trialRunSpw: () => ({ success: true, runtime: { registers: { entries } } }),
      getDocumentText: async () => 'a = 1\n',
    } as Partial<HandlerDeps>)

    const result = await hover({ textDocument: { uri: `file://${file}` }, position: { line: 0, character: 2 } }, deps)
    expect(result?.contents.value).toContain('1 runtime register, written by')
    expect(result?.contents.value).not.toMatch(/\breg\b/)
  })

  it('the trial cache reruns when the text changes and never for the same text', () => {
    const ctx = new ServerContext(os.tmpdir())
    const first = ctx.trialRunSpw('=x{ 1 }\n', 'file:///t.spw')
    expect(ctx.trialRunSpw('=x{ 1 }\n', 'file:///t.spw')).toBe(first)

    const edited = ctx.trialRunSpw('=x{ 1 }\n=y{ 2 }\n', 'file:///t.spw')
    expect(edited).not.toBe(first)
    expect(edited.source).toBe('=x{ 1 }\n=y{ 2 }\n')
  })
})

describe('generated surfaces — open the source, rebuild, and say so', () => {
  async function writeProjection(status: string): Promise<string> {
    await write('.spw/gen/index.spw', [
      '^projection[routes]{',
      '  root: ".spw/gen/routes"',
      '  source: "every route index.html that carries a <spw-page> block"',
      '  spec_owner: ".spw/surfaces.spw"',
      '  generator_owner: "scripts/spw-routes.mjs"',
      `  status: "${status}"`,
      '}',
      '',
    ].join('\n'))
    await write('.spw/surfaces.spw', '#>surfaces\n')
    await write('scripts/spw-routes.mjs', 'export {}\n')
    await write('about/a.land/index.html', '<spw-page></spw-page>\n')
    return write('.spw/gen/routes/about/a.land.spw', [
      '# /about/a.land/ — generated',
      '#>route_about_a_land',
      '@page: ~"/about/a.land/index.html"',
      '',
    ].join('\n'))
  }

  it('the banner offers Open source (the @page) and Rebuild (the generator), each with a command', async () => {
    const tree = await writeProjection('rebuilt by npm run spw:routes -- --write')
    const { deps } = await openWorkspace(tree)
    const lenses = await codeLens({ textDocument: { uri: `file://${tree}` } }, deps)
    const line0 = lenses.filter((lens) => lens.range.start.line === 0)

    expect(line0[0]?.command?.title).toBe('⚠ generated surface — do not hand-edit')
    const source = line0.find((lens) => lens.command?.title === '← open source: a.land/index.html')
    expect(source?.command).toMatchObject({
      command: OPEN_URI_COMMAND,
      arguments: [`file://${path.join(root, 'about/a.land/index.html')}`],
    })

    const rebuild = line0.find((lens) => lens.command?.title === '↻ rebuild: spw-routes.mjs')
    expect(rebuild?.command?.command).toBe(REBUILD_GENERATED_COMMAND)
    expect(rebuild?.command?.arguments?.[0]).toEqual({
      generator: 'scripts/spw-routes.mjs',
      generatorUri: `file://${path.join(root, 'scripts/spw-routes.mjs')}`,
      command: 'npm run spw:routes -- --write',
      cwd: root,
      sourceUri: `file://${path.join(root, 'about/a.land/index.html')}`,
      sourceLabel: 'a.land/index.html',
    })
    // Arguments are plain JSON, so any host can carry them.
    expect(JSON.parse(JSON.stringify(rebuild?.command?.arguments))).toEqual(rebuild?.command?.arguments)

    const spec = line0.find((lens) => lens.command?.title === '← spec: .spw/surfaces.spw')
    expect(spec?.command?.command).toBe(OPEN_URI_COMMAND)
    expect(titles(line0).some((t) => /^← generated from/.test(t))).toBe(false)
  })

  it('names no command it cannot read from the registry, and keeps the generator to open', async () => {
    const tree = await writeProjection('hand-run')
    const { deps } = await openWorkspace(tree)
    const lenses = await codeLens({ textDocument: { uri: `file://${tree}` } }, deps)
    const rebuild = lenses.find((lens) => lens.command?.command === REBUILD_GENERATED_COMMAND)
    expect(rebuild?.command?.arguments?.[0]).toMatchObject({ command: null, generator: 'scripts/spw-routes.mjs' })
  })
})

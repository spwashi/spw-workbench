import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CorpusFileSignals, TopographyReport } from '@spwashi/spw-seed'
import {
  buildInventory,
  externalRefTotal,
  filterInventory,
  inventoryStats,
  normalizeRel,
  scanCorpus,
  sortInventory,
  unquote,
  type InventoryRow,
} from './corpus-scan'

function signal(overrides: Partial<CorpusFileSignals> & { file: string }): CorpusFileSignals {
  return {
    sigils: {},
    pathRefCount: 0,
    rootRefCount: 0,
    frameCount: 0,
    annotationHints: 0,
    lineCount: 0,
    ...overrides,
  }
}

function topo(overrides: Partial<TopographyReport> = {}): TopographyReport {
  return {
    files: 0,
    links: 0,
    graph: { nodes: [], edges: [] },
    cyclic: false,
    layers: [],
    hubs: [],
    orphans: [],
    brokenTargets: [],
    strands: [],
    sigilHistogram: {},
    ...overrides,
  }
}

describe('unquote', () => {
  it('strips matching double, single, and backtick quotes', () => {
    expect(unquote('"a/b"')).toBe('a/b')
    expect(unquote("'a/b'")).toBe('a/b')
    expect(unquote('`a/b`')).toBe('a/b')
  })

  it('leaves unquoted or mismatched-quote strings alone', () => {
    expect(unquote('a/b')).toBe('a/b')
    expect(unquote('"a/b\'')).toBe('"a/b\'')
  })
})

describe('normalizeRel', () => {
  it('converts platform separators to posix forward slashes', () => {
    expect(normalizeRel(['a', 'b', 'c'].join(path.sep))).toBe('a/b/c')
  })
})

describe('buildInventory + roleOf', () => {
  it('classifies hub, orphan, leaf, source, and node roles', () => {
    const signals = [
      signal({ file: 'hub.spw' }),
      signal({ file: 'orphan.spw' }),
      signal({ file: 'leaf.spw' }),
      signal({ file: 'source.spw' }),
      signal({ file: 'node.spw' }),
    ]
    const report = topo({
      hubs: [{ id: 'hub.spw', inDegree: 5, outDegree: 5, total: 10 }],
      orphans: ['orphan.spw'],
      graph: {
        nodes: ['hub.spw', 'orphan.spw', 'leaf.spw', 'source.spw', 'node.spw'],
        edges: [
          { from: 'source.spw', to: 'leaf.spw' },
          { from: 'node.spw', to: 'node.spw' },
          { from: 'other.spw', to: 'node.spw' },
        ],
      },
    })

    const rows = buildInventory(signals, report)
    const byFile = Object.fromEntries(rows.map(r => [r.file, r]))

    expect(byFile['hub.spw']!.role).toBe('hub')
    expect(byFile['orphan.spw']!.role).toBe('orphan')
    expect(byFile['leaf.spw']!.role).toBe('leaf')
    expect(byFile['source.spw']!.role).toBe('source')
    expect(byFile['node.spw']!.role).toBe('node')
  })

  it('sorts rows alphabetically by file', () => {
    const signals = [signal({ file: 'b.spw' }), signal({ file: 'a.spw' })]
    const rows = buildInventory(signals, topo())
    expect(rows.map(r => r.file)).toEqual(['a.spw', 'b.spw'])
  })
})

describe('sortInventory / filterInventory / inventoryStats', () => {
  const rows: InventoryRow[] = [
    {
      file: 'a.spw', lines: 10, pathRefs: 1, rootRefs: 0, frames: 2,
      annotations: 0, sigilTop: '@1', role: 'hub', inDegree: 3, outDegree: 1,
    },
    {
      file: 'b.spw', lines: 30, pathRefs: 2, rootRefs: 2, frames: 1,
      annotations: 1, sigilTop: '~2 @1', role: 'leaf', inDegree: 1, outDegree: 0,
    },
  ]

  it('sorts by lines, refs, frames, and degree descending (file asc as tiebreak)', () => {
    expect(sortInventory(rows, 'lines').map(r => r.file)).toEqual(['b.spw', 'a.spw'])
    expect(sortInventory(rows, 'refs').map(r => r.file)).toEqual(['b.spw', 'a.spw'])
    expect(sortInventory(rows, 'frames').map(r => r.file)).toEqual(['a.spw', 'b.spw'])
    expect(sortInventory(rows, 'degree').map(r => r.file)).toEqual(['a.spw', 'b.spw'])
  })

  it('does not mutate the input array', () => {
    const copy = [...rows]
    sortInventory(rows, 'lines')
    expect(rows).toEqual(copy)
  })

  it('filters by role, passing through on "all" or undefined', () => {
    expect(filterInventory(rows, 'hub').map(r => r.file)).toEqual(['a.spw'])
    expect(filterInventory(rows, 'all')).toHaveLength(2)
    expect(filterInventory(rows, undefined)).toHaveLength(2)
  })

  it('aggregates totals and role counts', () => {
    const stats = inventoryStats(rows)
    expect(stats.files).toBe(2)
    expect(stats.lines).toBe(40)
    expect(stats.pathRefs).toBe(3)
    expect(stats.rootRefs).toBe(2)
    expect(stats.frames).toBe(3)
    expect(stats.byRole).toEqual({ hub: 1, leaf: 1 })
  })
})

describe('scanCorpus (end-to-end against real .spw files)', () => {
  let root: string

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-corpus-scan-test-'))
    await fs.mkdir(path.join(root, '.spw'), { recursive: true })
    await fs.writeFile(path.join(root, '.spw', 'mount.spw'), '', 'utf8')
    await fs.mkdir(path.join(root, 'prompts'), { recursive: true })
    await fs.writeFile(
      path.join(root, 'prompts', 'hub.spw'),
      '^[frame]{\n  ~"./leaf.spw"\n}\n',
      'utf8',
    )
    await fs.writeFile(path.join(root, 'prompts', 'leaf.spw'), '^[frame]{\n  "just text"\n}\n', 'utf8')
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('only flags path targets that are truly missing from disk', async () => {
    await fs.writeFile(path.join(root, 'notes.md'), '# notes\n', 'utf8')
    await fs.mkdir(path.join(root, 'assets'), { recursive: true })
    await fs.mkdir(path.join(root, 'lens'), { recursive: true })
    await fs.writeFile(
      path.join(root, 'lens', 'probe.spw'),
      '^[frame]{\n  ~"../notes.md"\n  ~"../assets"\n  ~"./missing.spw"\n}\n',
      'utf8',
    )

    const cwd = process.cwd()
    process.chdir(root)
    try {
      const result = await scanCorpus({ roots: ['lens'] })
      expect(result.topography.brokenTargets).toEqual(['lens/missing.spw'])
    } finally {
      process.chdir(cwd)
    }
  })

  it('scans, links, and inventories a small corpus without re-reading files twice', async () => {
    const cwd = process.cwd()
    process.chdir(root)
    try {
      const result = await scanCorpus({ roots: ['prompts'] })
      expect(result.filesAbs).toHaveLength(2)
      expect([...result.sources.keys()].sort()).toEqual(['prompts/hub.spw', 'prompts/leaf.spw'])
      expect(result.links.some(l => l.from === 'prompts/hub.spw' && l.to === 'prompts/leaf.spw')).toBe(true)
      expect(result.inventory.map(r => r.file).sort()).toEqual(['prompts/hub.spw', 'prompts/leaf.spw'])
    } finally {
      process.chdir(cwd)
    }
  })
})

describe('scanCorpus link resolution (file is the node)', () => {
  let root: string
  let previousCwd: string

  async function write(rel: string, body: string): Promise<void> {
    await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true })
    await fs.writeFile(path.join(root, rel), body, 'utf8')
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-corpus-links-test-'))
    await write('.spw/mount.spw', '')
    await write('canon/target.spw', '#>claim\n^"claim"{\n  "held"\n}\n')
    previousCwd = process.cwd()
    process.chdir(root)
  })

  afterEach(async () => {
    process.chdir(previousCwd)
    await fs.rm(root, { recursive: true, force: true })
  })

  it('splits the fragment off, tries the citing file then the consumer root, and still breaks a wrong file', async () => {
    await write(
      'notes/deep/cite.spw',
      [
        '^"refs"{',
        '  ~"../../canon/target.spw#claim"',
        '  ~"canon/target.spw#claim"',
        '  ~"canon/nope.spw#claim"',
        '  ~"#local"',
        '  ~"https://example.com/x"',
        '}',
        '',
      ].join('\n'),
    )

    const result = await scanCorpus({ roots: ['notes', 'canon'], noMemo: true })
    const fromCite = result.links.filter(l => l.from === 'notes/deep/cite.spw')

    expect(fromCite.map(l => [l.to, l.anchor])).toEqual([
      ['canon/target.spw', 'claim'],
      ['canon/target.spw', 'claim'],
      ['notes/deep/canon/nope.spw', 'claim'],
    ])
    expect(fromCite.map(l => l.label)).toContain('canon/target.spw#claim')
    expect(result.topography.graph.nodes.filter(n => n.includes('#'))).toEqual([])
    expect(result.topography.brokenTargets).toEqual(['notes/deep/canon/nope.spw'])
    expect(result.signals.find(s => s.file === 'notes/deep/cite.spw')?.pathRefCount).toBe(5)
    expect(result.inventory.find(r => r.file === 'canon/target.spw')?.inDegree).toBe(2)
  })

  it('prefers the file-relative target when both bases exist', async () => {
    await write('notes/shadow/canon/target.spw', '^"shadow"{\n  "local"\n}\n')
    await write('notes/shadow/cite.spw', '^"refs"{\n  ~"canon/target.spw#claim"\n}\n')

    const result = await scanCorpus({ roots: ['notes'], noMemo: true })
    const link = result.links.find(l => l.from === 'notes/shadow/cite.spw')

    expect(link?.to).toBe('notes/shadow/canon/target.spw')
    expect(result.topography.brokenTargets).toEqual([])
  })

  it('follows roots the file declares, breaks a declared root on a missing file once, and makes no node for declarations or undeclared aliases', async () => {
    await write('hub/leaf.spw', '^"leaf"{\n  "text"\n}\n')
    await write(
      'hub/index.spw',
      [
        '^"roots"{',
        '  @leaf: ~"./leaf.spw"',
        '  @canon: ~"../canon"',
        '  @ghost: ~"../ghost/dir"',
        '}',
        '^"dispatch"{',
        '  leaf: @leaf',
        '  target: @canon/target.spw',
        '  gone: @canon/gone.spw',
        '  far: @elsewhere/x.spw',
        '  ghostly: @ghost/a.spw',
        '}',
        '',
      ].join('\n'),
    )

    const result = await scanCorpus({ roots: ['hub', 'canon'], noMemo: true })
    const fromHub = result.links.filter(l => l.from === 'hub/index.spw')

    expect(fromHub.filter(l => l.kind === 'root').map(l => [l.to, l.label])).toEqual([
      ['hub/leaf.spw', '@leaf'],
      ['canon/target.spw', '@canon/target.spw'],
      ['canon/gone.spw', '@canon/gone.spw'],
    ])
    expect(fromHub.filter(l => l.kind === 'path').map(l => l.to)).toEqual(['hub/leaf.spw', 'canon', 'ghost/dir'])
    for (const pseudo of ['leaf', 'hub/canon/gone.spw', 'elsewhere', 'elsewhere/x.spw', 'ghost/dir/a.spw']) {
      expect(result.topography.graph.nodes).not.toContain(pseudo)
    }
    expect(result.topography.hubs.map(h => h.id)).not.toContain('leaf')
    // The file declares @canon, so a missing file under it is a break like any path.
    // @ghost's own path is missing: that break is reported once, by its declaration,
    // not again for every ref made through it.
    expect(result.topography.brokenTargets).toEqual(['canon/gone.spw', 'ghost/dir'])
    expect(result.signals.find(s => s.file === 'hub/index.spw')?.rootRefCount).toBe(8)
    // Shelf usage counts every non-declaration root ref, resolved or not.
    const shelves = result.topography.strands.find(s => s.id === 'root_shelves')?.detail ?? ''
    expect(shelves).toContain('@canon×2')
    expect(shelves).toContain('@leaf×1')
    expect(shelves).toContain('@elsewhere×1')
    expect(shelves).toContain('@ghost×1')
  })

  it('reads /route against the consumer root only, and dir/ targets as directory nodes', async () => {
    // A file-relative twin exists; a route must still land on the root.
    await write('notes/deep/canon/target.spw', '^"twin"{\n  "local"\n}\n')
    await write(
      'notes/deep/r.spw',
      [
        '^"refs"{',
        '  ~"/canon/target.spw#claim"',
        '  ~"/canon/missing.spw"',
        '  ~"../../canon/"',
        '  ~"../../canon/sub/"',
        '}',
        '',
      ].join('\n'),
    )

    const result = await scanCorpus({ roots: ['notes', 'canon'], noMemo: true })
    const fromR = result.links.filter(l => l.from === 'notes/deep/r.spw')

    expect(fromR.map(l => [l.to, l.anchor ?? null])).toEqual([
      ['canon/target.spw', 'claim'],
      ['canon/missing.spw', null],
      ['canon', null],
      ['canon/sub', null],
    ])
    expect(result.topography.brokenTargets).toEqual(['canon/missing.spw', 'canon/sub'])
    expect(result.inventory.find(r => r.file === 'notes/deep/canon/target.spw')?.inDegree).toBe(0)
  })

  it('makes no root of a non-path declaration, and takes the first path of a multi-term declaration', async () => {
    await write('hub/leaf.spw', '^"leaf"{\n  "text"\n}\n')
    await write('hub/other.spw', '^"other"{\n  "text"\n}\n')
    await write(
      'hub/index.spw',
      [
        '^"lock_policy"{',
        '  @lock: "advisory construct"',
        '}',
        '^"roots"{',
        '  @legacy: old -> ~"./leaf.spw"',
        '  @pair: ~"./leaf.spw" -> ~"./other.spw"',
        '}',
        '^"use"{',
        '  a: @lock',
        '  b: @lock/y.spw',
        '  c: @legacy',
        '  d: @pair',
        '}',
        '',
      ].join('\n'),
    )

    const result = await scanCorpus({ roots: ['hub'], noMemo: true })
    const fromHub = result.links.filter(l => l.from === 'hub/index.spw')

    expect(fromHub.filter(l => l.kind === 'root').map(l => [l.to, l.label])).toEqual([
      ['hub/leaf.spw', '@legacy'],
      ['hub/leaf.spw', '@pair'],
    ])
    for (const pseudo of ['lock', 'lock/y.spw', 'hub/lock/y.spw']) {
      expect(result.topography.graph.nodes).not.toContain(pseudo)
    }
    expect(result.topography.brokenTargets).toEqual([])
    expect(result.signals.find(s => s.file === 'hub/index.spw')?.rootRefCount).toBe(7)
    const shelves = result.topography.strands.find(s => s.id === 'root_shelves')?.detail ?? ''
    expect(shelves).toContain('@lock×2')
    expect(shelves).toContain('@legacy×1')
  })

  it('falls back to the workspace registry, so a file citing only through it is no orphan', async () => {
    await write('.spw/workspace.spw', '^"roots"{\n  @spw: ~"."\n  @canon: ~"../canon"\n}\n')
    await write('.spw/shelves.spw', '^"roots"{\n  @shelf: ~"../shelf"\n}\n')
    await write('shelf/item.spw', '^"item"{\n  "text"\n}\n')
    await write(
      'notes/registry.spw',
      [
        '^"refs"{',
        '  target: @canon/target.spw',
        '  item: @shelf/item.spw',
        '  gone: @canon/missing.spw',
        '  concept: @shelf/trace',
        '  shelf: @shelf',
        '}',
        '',
      ].join('\n'),
    )
    await write('notes/deixis.spw', '^"wonder"{\n  $^["_"]@here => &[@workspace]\n}\n')

    // hubTop 0: in a corpus this small every linked file would rank as a hub.
    const result = await scanCorpus({ roots: ['notes', 'canon', 'shelf'], hubTop: 0, noMemo: true })
    const role = (file: string) => result.inventory.find(r => r.file === file)?.role

    expect(result.links.filter(l => l.from === 'notes/registry.spw').map(l => [l.to, l.label])).toEqual([
      ['canon/target.spw', '@canon/target.spw'],
      ['shelf/item.spw', '@shelf/item.spw'],
    ])
    // The registry only adds edges to files on disk: a miss is not a break.
    expect(result.topography.brokenTargets).toEqual([])
    expect(role('notes/registry.spw')).toBe('source')
    expect(role('canon/target.spw')).toBe('leaf')
    expect(role('shelf/item.spw')).toBe('leaf')
    // Deixis names no file: the file is a true orphan, and no pseudo-hub appears.
    expect(role('notes/deixis.spw')).toBe('orphan')
    expect(result.topography.orphans).toEqual(['notes/deixis.spw'])
    // A bare shelf names its directory, which would only rank as a pseudo-hub.
    for (const pseudo of ['here', 'workspace', 'shelf', 'shelf/trace', 'canon/missing.spw']) {
      expect(result.topography.graph.nodes).not.toContain(pseudo)
    }
    const shelves = result.topography.strands.find(s => s.id === 'root_shelves')?.detail ?? ''
    expect(shelves).toContain('@canon×2')
    expect(shelves).toContain('@shelf×3')
    expect(shelves).toContain('@here×1')
  })

  it('rescans when the root registry changes, though no scanned file did', async () => {
    await write('.spw/shelves.spw', '^"roots"{\n  @shelf: ~"../canon"\n}\n')
    await write('notes/cite.spw', '^"refs"{\n  t: @shelf/target.spw\n}\n')

    const first = await scanCorpus({ roots: ['notes'], persistMemo: false })
    const again = await scanCorpus({ roots: ['notes'], persistMemo: false })
    expect(first.links.map(l => l.to)).toEqual(['canon/target.spw'])
    expect(again.memoPlane).toBe('memory')

    await write('.spw/shelves.spw', '^"roots"{\n  @shelf: ~"../elsewhere"\n}\n')
    const after = await scanCorpus({ roots: ['notes'], persistMemo: false })
    expect(after.memoPlane).toBe('fresh')
    expect(after.links).toEqual([])
  })

  it('counts prose written as a path, which classifies external, instead of dropping it', async () => {
    await write('notes/prose.spw', '^"refs"{\n  ~"Note: see the ledger"\n  ~"https://example.com"\n}\n')

    const result = await scanCorpus({ roots: ['notes'], noMemo: true })

    expect(result.links.filter(l => l.from === 'notes/prose.spw')).toEqual([])
    expect(result.signals.find(s => s.file === 'notes/prose.spw')?.externalRefCount).toBe(2)
    expect(externalRefTotal(result.signals)).toBe(2)
  })

  it('keeps the fragment off the node even when paths are left unresolved', async () => {
    await write('notes/cite.spw', '^"refs"{\n  ~"../canon/target.spw#claim"\n}\n')

    const result = await scanCorpus({ roots: ['notes'], resolvePaths: false, noMemo: true })
    const link = result.links.find(l => l.from === 'notes/cite.spw')

    expect(link?.to).toBe('../canon/target.spw')
    expect(link?.anchor).toBe('claim')
    expect(link?.label).toBe('../canon/target.spw#claim')
  })
})

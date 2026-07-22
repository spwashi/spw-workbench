import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CorpusFileSignals, TopographyReport } from '@spwashi/spw-seed'
import {
  buildInventory,
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

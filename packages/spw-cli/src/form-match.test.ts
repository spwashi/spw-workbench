import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { columnsToJson, parseColumns } from '@spwashi/spw-seed'
import { ColumnsCache, clearColumnsMemory, parserFingerprint } from './columns-cache'
import { paradigm, printFormMatch } from './form-match'

const SOURCES = [
  { uri: 'a.spw', text: '~garden[care]{seed, water}\n~garden[rest]{seed}\n' },
  { uri: 'b.spw', text: '~garden[care]{bulb, water, light}\n~meadow[care]{seed}\n' },
]

describe('the columns cache', () => {
  beforeEach(() => clearColumnsMemory())

  it('parses once, keeps the columns, and reads them back from disk in a new process', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'spw-columns-'))
    const first = new ColumnsCache({ dir })
    for (const s of SOURCES) await first.get(s.text)
    expect(first.stats).toMatchObject({ parsed: 2, written: 2, disk: 0 })
    expect(readdirSync(path.join(dir, parserFingerprint()!))).toHaveLength(2)

    clearColumnsMemory() // as a new process would start
    const second = new ColumnsCache({ dir })
    const got = await second.get(SOURCES[0]!.text)
    expect(got.tier).toBe('disk')
    expect(columnsToJson(got.tree!)).toEqual(columnsToJson(parseColumns(SOURCES[0]!.text)!))
    expect((await second.get(SOURCES[0]!.text)).tier).toBe('memory')
    expect(second.describe()).toMatch(/^columns: 1 from disk, 1 from memory, 0 parsed in \d+ ms$/)
  })

  it('keys the disk tier by the parser\'s own source, so a parser change is a miss', () => {
    expect(parserFingerprint()).toMatch(/^[0-9a-f]{16}$/)
  })

  it('reads without writing under read, and parses everything under off, saying why', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'spw-columns-'))
    const read = new ColumnsCache({ dir, mode: 'read' })
    await read.get(SOURCES[0]!.text)
    expect(read.stats.written).toBe(0)
    expect(existsSync(path.join(dir, parserFingerprint()!))).toBe(false)
    clearColumnsMemory()
    const off = new ColumnsCache({ dir, mode: 'off' })
    await off.get(SOURCES[0]!.text)
    expect(off.stats.parsed).toBe(1)
    expect(off.describe()).toContain('disk tier off: asked off')
    expect(new ColumnsCache({ dir: null }).describe()).toContain('no workspace to keep it in')
  })
})

describe('spw form --match', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => clearColumnsMemory())

  it('prints each hit with its fillers and the paradigm of each hole', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const code = await printFormMatch(SOURCES, { example: '~garden[_]{_, ...}', json: false, limit: 40, nested: false, cacheDir: null, cacheMode: 'on' })
    const text = log.mock.calls.map((c) => String(c[0])).join('\n')
    expect(code).toBe(0)
    expect(text).toContain('a.spw:1:1  ~garden[care]{seed, water}')
    expect(text).toContain('_1 care   _2 seed   _3 water')
    expect(text).toContain('b.spw:1:1')
    expect(text).not.toContain('meadow')
    expect(text).toMatch(/_1 {2}care ×2 · rest ×1/)
  })

  it('gives every hit and the columns\' tiers as JSON', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await printFormMatch(SOURCES, { example: '~garden[_]{_, ...}', json: true, limit: 1, nested: false, cacheDir: null, cacheMode: 'on' })
    const json = JSON.parse(String(log.mock.calls[0]?.[0]))
    expect(json.data.hits).toHaveLength(3)
    expect(json.summary.columns.parsed).toBe(2)
  })

  it('refuses an example that would match everything, and says why', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(await printFormMatch(SOURCES, { example: '_', json: false, limit: 40, nested: false, cacheDir: null, cacheMode: 'off' })).toBe(2)
    expect(String(error.mock.calls[0]?.[0])).toContain('only holes')
  })

  it('counts what fills each hole, most frequent first', () => {
    const hits = [{ fillers: ['a', 'x'] }, { fillers: ['a', 'y'] }, { fillers: ['b'] }] as never
    expect(paradigm(hits)).toEqual([[{ filler: 'a', count: 2 }, { filler: 'b', count: 1 }], [{ filler: '', count: 1 }, { filler: 'x', count: 1 }, { filler: 'y', count: 1 }]])
  })
})

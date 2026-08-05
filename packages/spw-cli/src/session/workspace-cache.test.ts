import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildChangeReport, buildPatch } from '@spwashi/spw-seed'
import {
  cacheDeltaReport,
  cachePatchProduct,
  clearCliCache,
  getCliCacheEntry,
  listCliCache,
  resetCliCacheMemory,
} from './workspace-cache'

describe('workspace session cache', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'spw-cli-cache-'))
    resetCliCacheMemory()
  })

  afterEach(() => {
    clearCliCache(cwd)
    resetCliCacheMemory()
    rmSync(cwd, { recursive: true, force: true })
  })

  it('stores delta report and lists it', () => {
    const report = buildChangeReport('a\n', 'b\n')
    const entry = cacheDeltaReport(report, {
      cwd,
      beforePath: 'a.spw',
      afterPath: 'b.spw',
    })
    expect(entry.kind).toBe('delta')
    expect(entry.id).toHaveLength(12)
    const list = listCliCache(cwd)
    expect(list.some(e => e.id === entry.id)).toBe(true)
    const again = getCliCacheEntry(entry.id, cwd)
    expect(again?.report?.beforeHash).toBe(report.beforeHash)
    expect(again?.dualReadSpw).toContain('^["delta"]{')
    expect(again?.dualReadSpw).toContain('^["identity"]{')
  })

  it('stores patch product with dual-read nested groups', () => {
    const before = 'x\n'
    const after = 'y\n'
    const report = buildChangeReport(before, after)
    const patch = buildPatch(before, after, { uri: 'x.spw' })
    const entry = cachePatchProduct(patch, {
      cwd,
      beforePath: 'x.spw',
      afterPath: 'y.spw',
      report,
    })
    expect(entry.kind).toBe('patch')
    expect(entry.dualReadSpw).toContain('^["patch"]{')
    expect(entry.dualReadSpw).toContain('^["product"]{')
    expect(getCliCacheEntry(entry.id, cwd)?.patch?.ref.kind).toBe('patch')
  })

  it('writes Spw index surface', () => {
    const { existsSync, readFileSync } = require('node:fs') as typeof import('node:fs')
    const { join } = require('node:path') as typeof import('node:path')
    cacheDeltaReport(buildChangeReport('p', 'q'), { cwd })
    const indexSpw = join(cwd, '.spw', 'gen', 'session', 'cli-cache', 'index.spw')
    expect(existsSync(indexSpw)).toBe(true)
    const text = readFileSync(indexSpw, 'utf8')
    expect(text).toContain('^["cache_index"]{')
    expect(text).toContain('^["entry"]{')
  })

  it('clears session cache', () => {
    const report = buildChangeReport('1', '2')
    cacheDeltaReport(report, { cwd })
    expect(listCliCache(cwd).length).toBeGreaterThan(0)
    const n = clearCliCache(cwd)
    expect(n).toBeGreaterThan(0)
    expect(listCliCache(cwd)).toHaveLength(0)
  })
})

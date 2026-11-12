import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { READINGS_SCHEMA } from '@spwashi/spw-seed'
import { runSpwFingerprintCli } from './fingerprint'
import { surfaceKey } from './fingerprint-readings'

const fingerprint = (...args: string[]) => runSpwFingerprintCli(['fingerprint', ...args])

describe('spw fingerprint --readings', () => {
  const home = process.cwd()
  let dir: string
  let log: ReturnType<typeof vi.spyOn>
  let err: ReturnType<typeof vi.spyOn>
  const printed = () => log.mock.calls.map((call: unknown[]) => String(call[0])).join('\n')

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'spw-readings-'))
    process.chdir(dir)
    mkdirSync(path.join(dir, 'corpus'))
    writeFileSync(path.join(dir, 'corpus', 'a.spw'), '^card{\n  phase: #seed\n  next: "one move"\n}\n')
    writeFileSync(path.join(dir, 'corpus', 'b.spw'), '#[a, b, c]\n')
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    process.exitCode = undefined
  })

  afterEach(() => {
    process.chdir(home)
    log.mockRestore()
    err.mockRestore()
    rmSync(dir, { recursive: true, force: true })
    process.exitCode = undefined
  })

  it('keeps fingerprints and text hashes, never text or an absolute path', async () => {
    await fingerprint('--readings', 'corpus', '--write', 'snap.json', '--label', 'before')
    const raw = readFileSync(path.join(dir, 'snap.json'), 'utf8')
    const snap = JSON.parse(raw)
    expect(snap.schema).toBe(READINGS_SCHEMA)
    expect(snap.parser).toBe('before')
    expect(Object.keys(snap.surfaces).sort()).toEqual(['corpus/a.spw', 'corpus/b.spw'])
    expect(Object.keys(snap.surfaces['corpus/a.spw'].lines)).toEqual(['1', '2', '3'])
    expect(raw).not.toContain('one move')
    expect(raw).not.toContain(dir)
  })

  it('finds no drift when nothing changed, and exits 0', async () => {
    await fingerprint('--readings', 'corpus', '--write', 'snap.json')
    log.mockClear()
    await fingerprint('--readings', 'corpus', '--check', 'snap.json')
    expect(process.exitCode).toBe(0)
    expect(printed()).toContain('no line reads differently')
  })

  it('lists a line whose reading moved with its text, and exits 1', async () => {
    await fingerprint('--readings', 'corpus', '--write', 'snap.json')
    const snap = JSON.parse(readFileSync(path.join(dir, 'snap.json'), 'utf8'))
    // Stands in for a parser build that reads line 2 differently.
    snap.surfaces['corpus/a.spw'].lines['2'] = '00000000'
    writeFileSync(path.join(dir, 'snap.json'), JSON.stringify(snap))
    log.mockClear()
    await fingerprint('--readings', 'corpus', '--check', 'snap.json')
    expect(process.exitCode).toBe(1)
    expect(printed()).toContain('corpus/a.spw:2  phase: #seed')
  })

  it('says a surface whose text changed was not compared', async () => {
    await fingerprint('--readings', 'corpus', '--write', 'snap.json')
    writeFileSync(path.join(dir, 'corpus', 'b.spw'), '#[a, b, d]\n')
    log.mockClear()
    await fingerprint('--readings', 'corpus', '--check', 'snap.json')
    expect(process.exitCode).toBe(0)
    expect(printed()).toContain('changed text since the snapshot')
  })

  it('refuses --write and --check together', async () => {
    await fingerprint('--readings', 'corpus', '--write', 'a.json', '--check', 'b.json')
    expect(process.exitCode).toBe(2)
  })

  it('refuses two corpora whose surfaces would share a key', async () => {
    mkdirSync(path.join(dir, 'one', 'corpus'), { recursive: true })
    writeFileSync(path.join(dir, 'one', 'corpus', 'a.spw'), 'x\n')
    process.chdir(path.join(dir, 'one'))
    await fingerprint('--readings', path.join(dir, 'one', 'corpus'), path.join(dir, 'corpus'))
    process.chdir(dir)
    expect(process.exitCode).toBe(2)
  })

  it('keys a surface outside the working directory by the path it was named by', () => {
    expect(surfaceKey('/elsewhere/site/.spw/x.spw', '/elsewhere/site/.spw', '/here')).toBe('.spw/x.spw')
    expect(surfaceKey('/here/docs/x.spw', 'docs', '/here')).toBe('docs/x.spw')
  })
})

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { spokenLine } from '@spwashi/spw-seed'
import { offsetAt } from './pairs'
import { runSpwCli } from './run'

const printed = async (...args: string[]): Promise<string> => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  await runSpwCli(['node', 'spw', ...args])
  const text = log.mock.calls.map((c) => String(c[0])).join('\n')
  log.mockRestore()
  return text
}

const file = (text: string): string => {
  const p = path.join(mkdtempSync(path.join(tmpdir(), 'spw-reader-')), 'a.spw')
  writeFileSync(p, text)
  return p
}

const SURFACE = '#>a\n^kept[thursday]{_thursday *kept_place{ ~warm[4] } yadsruht_}\n\n{_A x {_B y }_A z }_B\n( open\n'

describe('spw say', () => {
  afterEach(() => vi.restoreAllMocks())

  it('says one line as seed says it', async () => {
    expect(await printed('say', '--line', '~garden[care]{seed, water}')).toBe('potential garden, mode care, definition, list of 2: seed, water')
  })

  it('says a file a line at a time, skipping blank lines, as spokenLine says each', async () => {
    const out = (await printed('say', file(SURFACE))).split('\n').filter((l) => !l.startsWith('#'))
    const expected = SURFACE.split('\n').map((l, i) => [i + 1, l] as const).filter(([, l]) => l.trim()).map(([n, l]) => `${n}  ${spokenLine(l).text}`)
    expect(out).toEqual(expected)
  })

  it('gives clauses with spans as JSON', async () => {
    const json = JSON.parse(await printed('say', '--line', 'home{a}', '--json'))
    expect(json.data[0].said).toBe('home, definition, a')
    expect(json.data[0].clauses.map((c: { role: string }) => c.role)).toEqual(['word', 'slot', 'word'])
  })
})

describe('spw pairs', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists labeled pairs, crossings and braces with no partner', async () => {
    const out = await printed('pairs', file(SURFACE))
    const json = JSON.parse(await printed('pairs', file(SURFACE), '--json'))
    expect(json.data.pairs.filter((p: { label?: string }) => p.label)).toHaveLength(3)
    expect(json.data.crossings).toHaveLength(1)
    expect(json.data.whole).toBe(false)
    expect(out).toContain('_thursday  mirrored')
    expect(out).toContain('_A (line 4) crosses _B (line 4)')
    expect(out).toContain('line 5  open (')
  })

  it('lists the pairs around a place, outermost first', async () => {
    const out = (await printed('pairs', file(SURFACE), '--at', '4:12')).split('\n')
    expect(out.map((l) => l.match(/_(\w+)/)?.[1])).toEqual(['A', 'B'])
  })

  it('reads a line:column as an offset, and refuses one outside the text', () => {
    expect(offsetAt('ab\ncd', '2:2')).toBe(4)
    expect(offsetAt('ab\ncd', '3:1')).toBeNull()
    expect(offsetAt('ab', 'x')).toBeNull()
  })
})

describe('spw hear', () => {
  afterEach(() => vi.restoreAllMocks())

  it('writes a WAV file under an ear line, and reports a word the line does not know', async () => {
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'spw-hear-')), 'c.wav')
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const text = await printed('hear', '--line', '{_A x }_A', '--out', out, '--ear', '^ear{ =voice[modal] =wap[pillow] }')
    expect(text).toMatch(/2 clicks, 1 pairs, 0 without a partner, voice modal/)
    expect(String(error.mock.calls[0]?.[0])).toContain('wap: unknown_word')
    expect(readFileSync(out).subarray(0, 4).toString()).toBe('RIFF')
  })

  it('refuses to run without somewhere to write', async () => {
    await expect(runSpwCli(['node', 'spw', 'hear', '--line', '{ }'])).rejects.toThrow('--out')
  })
})

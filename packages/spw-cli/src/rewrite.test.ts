import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fillTemplate, runSpwRewriteCli } from './rewrite'

function tree(): { dir: string; file: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'spw-rewrite-'))
  mkdirSync(path.join(dir, 'w'))
  const file = path.join(dir, 'w', 'a.spw')
  writeFileSync(file, '~garden[care]{seed, water}\nnote{ ~garden[x]{a, b} }\n')
  return { dir, file }
}

const run = async (...args: string[]) => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await runSpwRewriteCli(args)
  return { out: log.mock.calls.map((c) => String(c[0])).join('\n'), err: error.mock.calls.map((c) => String(c[0])).join('\n') }
}

describe('fillTemplate', () => {
  it('puts each filler at its number, the whole match at _0, and leaves a number with no hole', () => {
    expect(fillTemplate('_1 ~> _2 (_0)', { fillers: ['a', 'b'] }, 'X')).toEqual({ text: 'a ~> b (X)', missing: [] })
    expect(fillTemplate('_3 and _x1 and kept_1', { fillers: ['a'] }, 'X')).toEqual({ text: '_3 and _x1 and kept_1', missing: [3] })
  })
})

describe('spw rewrite', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows each change and writes nothing without --write', async () => {
    const { file } = tree()
    const { out } = await run(path.dirname(file), '--match', '~garden[_]{_, ...}', '--into', '~garden[_1]{_2 ~> _3}')
    expect(out).toContain('  - ~garden[care]{seed, water}\n  + ~garden[care]{seed ~> water}')
    expect(readFileSync(file, 'utf8')).toBe('~garden[care]{seed, water}\nnote{ ~garden[x]{a, b} }\n')
  })

  it('writes every match with --write, latest first so earlier offsets stay true', async () => {
    const { file } = tree()
    await run(path.dirname(file), '--match', '~garden[_]{_, ...}', '--into', '~garden[_1]{_2 ~> _3}', '--write')
    expect(readFileSync(file, 'utf8')).toBe('~garden[care]{seed ~> water}\nnote{ ~garden[x]{a ~> b} }\n')
  })

  it('refuses to write a file the rewrite would leave reading worse, unless --force', async () => {
    const { file } = tree()
    const { out } = await run(path.dirname(file), '--match', '~garden[_]{_, ...}', '--into', '~garden[_1]{_2', '--write')
    expect(out).toContain('refused')
    expect(readFileSync(file, 'utf8')).toBe('~garden[care]{seed, water}\nnote{ ~garden[x]{a, b} }\n')
    await run(path.dirname(file), '--match', '~garden[_]{_, ...}', '--into', '~garden[_1]{_2', '--write', '--force')
    expect(readFileSync(file, 'utf8')).not.toContain('seed, water')
  })

  it('says when the template names a hole the example does not have', async () => {
    const { file } = tree()
    const { err } = await run(path.dirname(file), '--match', '~garden[_]{_, ...}', '--into', '_4')
    expect(err).toContain('_4')
  })
})

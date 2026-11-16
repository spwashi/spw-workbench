import { afterEach, describe, expect, it, vi } from 'vitest'
import { runSpwPivotCli } from './pivot'

const json = async (...args: string[]) => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await runSpwPivotCli([...args, '--json'])
  return JSON.parse(String(log.mock.calls[0]?.[0])).data
}

describe('spw pivot', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists the fragments, the open bond and the pivots of =foo@(<bar>), with how each reader reads them back', async () => {
    const data = await json('=foo@(<bar>)')
    expect(data.fragments.map((f: { name: string }) => f.name)).toEqual(['foo', 'bar'])
    expect(data.bonds[0].attaches).toEqual(['after_left', 'before_right'])
    expect(data.pivots.find((p: { kind: string }) => p.kind === 'side').line).toBe('foo=@(<bar>)')
    expect(data.counts.side).toEqual({ total: 1, line: 1, parser: 0, spoken: 0 })
  })

  it('turns marks along a given order, as a run of marks or comma-separated', async () => {
    const run = await json('~foo', '--order', '~#^')
    const comma = await json('~foo', '--order', '~, #, ^')
    const marks = (d: { pivots: Array<{ kind: string; line: string }> }) => d.pivots.filter((p) => p.kind === 'mark').map((p) => p.line).sort()
    expect(marks(run)).toEqual(['#foo', '^foo'])
    expect(marks(comma)).toEqual(marks(run))
  })
})

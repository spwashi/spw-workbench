import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runSpwSheetCli, sheetBlocks } from './sheet'

const SURFACE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/theory/spw/dimensional-analysis.spw')

const json = async (...args: string[]) => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await runSpwSheetCli([...args, '--json'])
  return JSON.parse(String(log.mock.calls[0]?.[0])).data
}

describe('spw sheet', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reads the theory surface on the SI constants with no problem, and its values are the known ones', async () => {
    const data = await json(SURFACE, '--si', '--in', 'm', '--pi')
    expect(data.problems).toEqual([])
    const row = (name: string) => data.rows.find((r: { name: string }) => r.name === name)
    expect(row('r_s').in / 2953.34).toBeCloseTo(1, 4)
    expect(row('a_0').in / 5.29177e-11).toBeCloseTo(1, 4)
    expect(row('lambda_C').in / 2.42631e-12).toBeCloseTo(1, 4)
    expect(row('M_sun').in).toBeNull()
    // The pendulum's one group is T^2 g / L, and a measured period makes it 4π².
    expect(data.groups).toHaveLength(1)
    expect(data.groups[0].value / (4 * Math.PI ** 2)).toBeCloseTo(1, 3)
  })

  it('reads natural units with chosen constants set to one', async () => {
    const data = await json('--si', '--line', '^hep{ %proton[@m_p*@c^2] }', '--natural', 'c,hbar', '--unit', 'GeV')
    expect(data.rows.find((r: { name: string }) => r.name === 'proton').natural.value).toBeCloseTo(0.93827, 4)
  })

  it('refuses natural units named by constants no sheet defines', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await expect(runSpwSheetCli(['--line', '^x{ %a[1 m] }', '--natural', 'c'])).rejects.toThrow('--si')
  })

  it('finds each sheet in a file by its braces, leaving a block without terms out', () => {
    expect(sheetBlocks('^a{ %x[1 m] }\n^"model"{ k = `v` }\n^b{ %y[@x*2] { nested } }')).toEqual(['^a{ %x[1 m] }', '^b{ %y[@x*2] { nested } }'])
  })
})

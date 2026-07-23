import { describe, it, expect } from 'vitest'
import { parse, particleMix } from '@spwashi/spw-seed'
import { volatilityOf } from '../handlers/workspace'

function readStance(source: string) {
  return volatilityOf(particleMix(parse(source).ast ?? null, source))
}

describe('volatilityOf — cache stance read from the material', () => {
  it('calls a surface of deferred state volatile', () => {
    // The shape of a working plan: everything is `~#` cache and status.
    const source = [
      '^["cache"]{',
      ' ~#status: "planning"',
      ' ~#next_commit: "4"',
      ' ~#open_count: "2"',
      ' ~#last_stream: "now"',
      '}',
    ].join('\n')

    expect(readStance(source).volatility).toBe('volatile')
  })

  it('calls a surface of canon marks durable', () => {
    // The shape of a registry: anchors and classifications, no deferred state.
    const source = ['#>spw_registry', '#:layer #!canon', '^["intent"]{', '}'].join('\n')

    const stance = readStance(source)
    expect(stance.volatility).toBe('durable')
    expect(stance.aspectShare).toBe(0)
  })

  it('calls a mixed surface settled', () => {
    // Two canon marks, one deferred: under revision but not churning.
    const source = ['#>anchor', '#:layer', '~#status: "open"'].join('\n')
    expect(readStance(source).volatility).toBe('settled')
  })

  it('treats a surface with no marks as durable — nothing can go stale', () => {
    expect(readStance('^["plain"]{\n  x: 1\n}').volatility).toBe('durable')
  })

  it('reports the aspect share that produced the reading', () => {
    // One aspect mark of four total.
    const stance = readStance('#>a\n#:b\n#!c\n~#d: "1"')
    expect(stance.aspectShare).toBeCloseTo(0.25, 5)
  })
})

describe('volatilityOf — the axis is independent of recency', () => {
  it('separates working surfaces from canon in this repository', async () => {
    const { readFile } = await import('node:fs/promises')
    const read = async (file: string) => readStance(await readFile(file, 'utf8')).volatility

    // A live plan churns; the canon routing table does not.
    expect(await read('.agents/plans/directive-lattice/wip.spw')).toBe('volatile')
    expect(await read('.spw/index.spw')).toBe('durable')
  })
})

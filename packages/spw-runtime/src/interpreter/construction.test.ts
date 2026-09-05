import { describe, expect, it } from 'vitest'
import { parse } from '@spwashi/spw-seed'
import { interpretSeed } from './interpreter'

function run(source: string) {
  const parsed = parse(source)
  expect(parsed.success).toBe(true)
  expect(parsed.errors).toHaveLength(0)
  return interpretSeed(parsed.ast!)
}

describe('construction value projection at the interpreter boundary', () => {
  it.each(['x[a]', 'x{b}', 'x[a]{b}', 'x[=changed{1}]{=other{2}}'])('preserves the old head-only value and effects: %s', source => {
    const bare = run('x')
    const result = run(source)
    expect(result.value).toEqual(bare.value)
    expect(result.traceCounts).toEqual(bare.traceCounts)
    expect(Object.keys(result.registers.entries)).toEqual(Object.keys(bare.registers.entries))
    expect(result.registers.entries[result.registers.focusKey]!.meta.writes).toBe(0)
    expect(result.onf.frames.reg).toBe('construction')
    expect(result.valueProjection?.omissions).toHaveLength(1)
    expect(bare.valueProjection).toBeUndefined()
  })

  it('preserves the fuller noun value while keeping all attachments inspectable', () => {
    const result = run('surfaces[route]{path.role.archetype}(hold)<publish>')
    expect(result.value).toBe('surfaces')
    expect(result.onf.args).toHaveLength(5)
    expect(result.valueProjection?.omissions[0]!.attachments.map(a => a.kind)).toEqual(['frame', 'body', 'scope', 'capsule'])
  })

  it('preserves existing negative-control results without a loss receipt', () => {
    const newline = run('x\n[a]')
    expect(newline.value).toEqual(['x', 'a'])
    expect(newline.valueProjection).toBeUndefined()
    const operation = run('!go[x]{y}')
    expect(operation.value).toBe('y')
    expect(operation.valueProjection).toBeUndefined()
    const medial = run('bagel<scent>coffee')
    expect(medial.value).toMatchObject({ sigil: '<', args: ['bagel', 'coffee'], frames: { placement: 'medial', tag: 'scent' } })
    expect(medial.valueProjection).toBeUndefined()
  })
})

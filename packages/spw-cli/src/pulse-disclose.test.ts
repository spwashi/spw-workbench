import { describe, expect, it } from 'vitest'
import { parse } from '@spwashi/spw-seed'
import { pulseDeltaCard } from './pulse-disclose'

describe('pulse-disclose', () => {
  it('emits a parseable Spw ChangeReport card for a planned rewrite', () => {
    const before = '^["x"]{ ~#a: "1" }\n'
    const after = '^["x"]{ ~#a: "2" }\n'
    const card = pulseDeltaCard(before, after, { uri: 'probe.spw' })
    expect(card).toContain('^["delta"]')
    expect(card).toContain('~#layoutOnly:')
    expect(parse(card).success).toBe(true)
  })

  it('marks identity when source is unchanged', () => {
    const src = '^["same"]{}\n'
    const card = pulseDeltaCard(src, src)
    expect(card).toContain('~#identity:')
    expect(card).toMatch(/~#identity:\s*#yes/)
  })
})

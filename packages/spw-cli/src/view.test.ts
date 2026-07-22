import { describe, it, expect } from 'vitest'
import {
  editDistance,
  suggestClosest,
  skimOutline,
  truncate,
  formatTable,
} from './view'

describe('view helpers', () => {
  it('truncates with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…')
    expect(truncate('short', 10)).toBe('short')
  })

  it('suggests closest selector names', () => {
    const s = suggestClosest('pathref', ['pathRefs', 'rootRefs', 'navigable', 'all'])
    expect(s[0]?.toLowerCase()).toContain('path')
  })

  it('edit distance is zero for equal', () => {
    expect(editDistance('ops:frame', 'ops:frame')).toBe(0)
  })

  it('formats a small table', () => {
    const t = formatTable(['a', 'b'], [
      ['1', 'two'],
      ['3', 'four'],
    ])
    expect(t).toContain('a')
    expect(t).toContain('two')
  })

  it('skims frames and roots from sample', () => {
    const src = `
# comment
^"intent"{
 ~#goal: "x"
}
^"roots"{
 @tone: ~"./tone.spw"
 @compose: ~"./compose.spw"
}
`
    const items = skimOutline(src)
    expect(items.some(i => i.kind === 'frame' && i.label === 'intent')).toBe(true)
    expect(items.some(i => i.kind === 'root' && i.label === '@tone')).toBe(true)
    expect(items.some(i => i.kind === 'intent')).toBe(true)
  })
})

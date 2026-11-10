import { describe, expect, it } from 'vitest'
import { censusOf, renderCensus } from './spw-register-census'

const SURFACES = [
  { file: 'a.spw', source: '^"a"{ k: #[x, y][reg=set] }[reg=facet]\n.{ n: 1 }[reg=measured]' },
  { file: 'b.spw', source: '.{ n: 1 }[reg=measured]\n#[p, q][reg=list]' },
  { file: 'c.spw', source: 'home[mode]{a}' },
]

describe('register census', () => {
  it('counts restating and informing stamps over surfaces', () => {
    const census = censusOf(SURFACES)

    expect(census).toMatchObject({ files: 3, stampedFiles: 2, total: 5, restating: 2, informing: 3 })
    expect(census.restatingCharacters).toBe('[reg=set]'.length + '[reg=facet]'.length)
  })

  it('ranks the registers that inform and names the surfaces that carry them', () => {
    const census = censusOf(SURFACES)

    expect(census.informingNames).toEqual([
      { name: 'measured', count: 2, files: 2 },
      { name: 'list', count: 1, files: 1 },
    ])
    expect(census.informingFiles).toEqual([
      { file: 'b.spw', count: 2, names: ['list', 'measured'] },
      { file: 'a.spw', count: 1, names: ['measured'] },
    ])
  })

  it('renders a corpus with no stamps without dividing by zero', () => {
    expect(renderCensus(censusOf([{ file: 'c.spw', source: 'home[mode]{a}' }]))).toContain('0 stamps: 0 restate their bracket (0%')
  })

  it('renders the share that restates and the informing registers', () => {
    const text = renderCensus(censusOf(SURFACES))

    expect(text).toContain('5 stamps: 2 restate their bracket (40%')
    expect(text).toContain('measured')
  })
})

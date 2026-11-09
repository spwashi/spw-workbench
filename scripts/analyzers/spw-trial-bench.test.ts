import { describe, expect, it } from 'vitest'
import { TRIAL_BENCH_CONTRACT, benchCards, benchForm, readTrialCards, renderReport } from './spw-trial-bench'

const CARDS = `
#>wonder_trial_dot
?["Is a dot one name with a seam, or two nodes bonded?"]{
 #:depth #!semantics ~#lens(comparison)
 ~#readings: ["one name", "bond"]
 ~#forms: ["garden{seed.water}", "garden{.water}", "say \\"hi\\""]
 ~#judgment: _
 $%[one_name, bond]
}

#>not_a_card
^["method"]{ moves: ["write the forms"] }

#>wonder_trial_gap
?["Is a gap a join?"]{
 ~#forms: ["*wonders{ @a $b #c }"]
}
`

describe('trial bench', () => {
  it('reads cards through the parser: an anchor, a question, its forms', () => {
    const cards = readTrialCards(CARDS)

    expect(cards.map(card => card.name)).toEqual(['wonder_trial_dot', 'wonder_trial_gap'])
    expect(cards[0]?.question).toBe('Is a dot one name with a seam, or two nodes bonded?')
    expect(cards[0]?.forms).toEqual(['garden{seed.water}', 'garden{.water}', 'say "hi"'])
  })

  it('reports no parting where the two readers agree', () => {
    const reading = benchForm('garden{seed, water}')

    expect(reading.parser).toMatchObject({ lines: 1, parts: 2 })
    expect(reading.line).toMatchObject({ lines: 1, parts: 2, separator: ',', whole: true })
    expect(reading.parted).toEqual([])
  })

  it('compares marks part by part when the part counts agree', () => {
    const reading = benchForm('garden{.water, ~soup}')

    expect(reading.parser.marks).toEqual(['.', '~'])
    expect(reading.line.marks).toEqual(['.', '~'])
    expect(reading.parted).toEqual([])
  })

  // The three partings below are open trials (wonder_trial_dot, wonder_trial_gap) and
  // syntax-hardware-alignment p15 and p16. When a reader changes, these expectations
  // change with it, on purpose.
  it('names a parting on parts: a dotted name is one part to the parser and two to the line reader', () => {
    const reading = benchForm('garden{seed.water}')

    expect(reading.parser.parts).toBe(1)
    expect(reading.line.parts).toBe(2)
    expect(reading.parted).toEqual(['parts'])
  })

  it('names a parting on marks: a lone part that opens with a dot keeps its mark only in the parser', () => {
    const reading = benchForm('garden{.water}')

    expect(reading.parser.marks).toEqual(['.'])
    expect(reading.line.marks).toEqual([''])
    expect(reading.parted).toEqual(['marks'])
  })

  it('shows what the line reader left unread inside a part', () => {
    const reading = benchForm('*wonders{ @a $b #c }')

    expect(reading.parser.parts).toBe(3)
    expect(reading.line.parts).toBe(1)
    expect(reading.line.rest).toBe('$b #c')
    expect(reading.parted).toEqual(['parts'])
  })

  it('counts joined lines on both sides and flags a form the readers split differently', () => {
    const reading = benchForm('<atlas>home')

    expect(reading.parser.lines).toBe(2)
    expect(reading.line.lines).toBe(1)
    expect(reading.parted).toContain('lines')
  })

  it('totals partings by kind and renders only parted forms on request', () => {
    const report = benchCards(readTrialCards(CARDS))

    expect(report.contract).toBe(TRIAL_BENCH_CONTRACT)
    expect(report.totals).toMatchObject({ cards: 2, forms: 4 })
    expect(report.totals.by.parts).toBe(2)
    expect(report.totals.by.marks).toBe(1)

    const pair = benchCards([{ name: 'card', question: 'q', forms: ['garden{seed, water}', 'garden{.water}'] }])
    const parted = renderReport(pair, { partedOnly: true })
    expect(parted).toContain('garden{.water}')
    expect(parted).toContain('part on marks')
    expect(parted).not.toContain('garden{seed, water}')
    expect(renderReport(pair)).toContain('garden{seed, water}')
  })

  it('never throws on text that is not Spw', () => {
    for (const form of ['', '}{', '"unclosed', 'Pin to Spirit', '((((']) {
      expect(() => benchForm(form)).not.toThrow()
    }
  })
})

import { describe, expect, it } from 'vitest'
import { LINE_FIXTURES } from '../line/fixtures'
import { parseColumns } from './parse-columns'
import { scanPairLabels } from './pair-labels'
import { applyTextEdits, pairLabelEdits, selectionSpans } from './structural-edit'

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

describe('selectionSpans', () => {
  const line = '^kept[thursday]{_thursday *kept_place{ ~warm[4] } }_thursday'

  it('walks out from the word the caret is in, through every node that holds it', () => {
    const spans = selectionSpans(line, line.indexOf('warm') + 1).map((s) => line.slice(s.start, s.end))
    expect(spans.slice(0, 4)).toEqual(['warm', '~warm[4]', '{ ~warm[4] }', '*kept_place{ ~warm[4] }'])
    expect(spans[spans.length - 1]).toBe(line)
  })

  it('gives spans each strictly holding the last, never starting or ending on a gap, at every caret of every fixture', () => {
    const rand = seeded(11)
    for (const { line: text } of LINE_FIXTURES) {
      for (let k = 0; k < 6; k++) {
        const offset = Math.floor(rand() * (text.length + 1))
        const spans = selectionSpans(text, offset)
        expect(spans.length, text).toBeGreaterThan(0)
        spans.forEach((s, i) => {
          expect(s.start <= offset && offset <= s.end, `${text} @${offset}`).toBe(true)
          if (i > 0) {
            const last = spans[i - 1]!
            expect(s.start <= last.start && s.end >= last.end && (s.start < last.start || s.end > last.end), text).toBe(true)
          }
          if (i < spans.length - 1) expect(/\s/.test(text[s.start] ?? '') || /\s/.test(text[s.end - 1] ?? ''), text).toBe(false)
        })
      }
    }
  })
})

describe('selectionSpans where the parser hangs a node outside its parent', () => {
  it('skips a parent span that does not hold the span before it, so the chain still nests', () => {
    const text = 'home{ seed[x] }'
    const tree = parseColumns(text)!
    // Cut the row holding seed[x] short of its frame's close, so it holds the caret and not its whole child,
    // as a scope written after an operation's frame can leave it.
    const seed = Array.from({ length: tree.nodes }, (_, i) => i).find((i) => text.slice(tree.wordStart[i]!, tree.wordEnd[i]!) === 'seed')!
    const holder = tree.parent[seed]!
    tree.end[holder] = text.indexOf('x') + 1
    const spans = selectionSpans(text, text.indexOf('x'), tree)
    for (let i = 1; i < spans.length; i++) expect(spans[i]!.start <= spans[i - 1]!.start && spans[i]!.end >= spans[i - 1]!.end).toBe(true)
  })
})

describe('pairLabelEdits', () => {
  it('links the label on an open and its repeated close, and on nothing else', () => {
    const text = '{_A x {_B y }_A z }_B'
    const edits = pairLabelEdits(text, 2)
    expect(edits.linked.map((s) => text.slice(s.start, s.end))).toEqual(['A', 'A'])
    expect(pairLabelEdits('{_kept a peek_}', 2).linked).toEqual([])
    expect(pairLabelEdits('{ a }', 2).pair).toBeNull()
  })

  it('mirrors a repeated close and repeats a mirrored one, and the two are inverses', () => {
    const repeated = '^kept[thursday]{_thursday x }_thursday'
    const mirror = pairLabelEdits(repeated, 18).actions.find((a) => a.title.startsWith('Mirror'))!
    const mirrored = applyTextEdits(repeated, mirror.edits)
    expect(mirrored).toBe('^kept[thursday]{_thursday x yadsruht_}')
    const repeat = pairLabelEdits(mirrored, 18).actions.find((a) => a.title.startsWith('Repeat'))!
    expect(applyTextEdits(mirrored, repeat.edits)).toBe(repeated)
    for (const text of [repeated, mirrored]) expect(scanPairLabels(text).pairs.find((p) => p.label)?.label).toBe('thursday')
  })

  it('gives a labeled open its label on a bare close, either way, and the pair then reads whole', () => {
    const text = '{_axes a b }'
    const actions = pairLabelEdits(text, 3).actions
    for (const action of actions) {
      const out = applyTextEdits(text, action.edits)
      expect(scanPairLabels(out).whole, out).toBe(true)
      expect(scanPairLabels(out).pairs[0]!.label, out).toBe('axes')
    }
    expect(actions.map((a) => applyTextEdits(text, a.edits))).toEqual(['{_axes a b }_axes', '{_axes a b sexa_}'])
  })

  it('offers no mirror for a label the lexer would not keep whole mirrored', () => {
    expect(pairLabelEdits('{_v2 a }_v2', 2).actions).toEqual([])
  })
})

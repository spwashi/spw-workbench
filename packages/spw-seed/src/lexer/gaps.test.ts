import { describe, expect, it } from 'vitest'
import { lex } from './lex'

function anchors(source: string) {
  return lex(source, { eventPolicy: 'none' }).tokens.filter(token =>
    token.type !== 'WHITESPACE' && token.type !== 'COMMENT' && token.type !== 'EOF',
  )
}

describe('lexical gap products', () => {
  it('keeps a tight dotted identifier whole and exposes its segments', () => {
    const result = lex('a.b.c', { eventPolicy: 'none' })
    expect(anchors('a.b.c').map(token => [token.type, token.value])).toEqual([
      ['IDENTIFIER', 'a.b.c'],
    ])
    expect(result.tokens[0]?.identifier).toEqual({
      segments: ['a', 'b', 'c'],
      qualified: true,
    })
    expect(result.gaps).toEqual([])
  })

  it('leaves trailing and repeated dots for operator matchers', () => {
    expect(anchors('a. b').map(token => [token.type, token.value])).toEqual([
      ['IDENTIFIER', 'a'],
      ['OPERATOR', '.'],
      ['IDENTIFIER', 'b'],
    ])
    expect(anchors('a..b').map(token => [token.type, token.value])).toEqual([
      ['IDENTIFIER', 'a'],
      ['CONNECTOR', '..'],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('distinguishes open and tight affinity around dot operators', () => {
    expect(lex('a . b . c', { eventPolicy: 'none' }).gaps.map(gap => gap.class)).toEqual([
      'open', 'open', 'open', 'open',
    ])
    expect(lex('a. b', { eventPolicy: 'none' }).gaps.map(gap => gap.class)).toEqual([
      'tight', 'open',
    ])
    expect(lex('a .b', { eventPolicy: 'none' }).gaps.map(gap => gap.class)).toEqual([
      'open', 'tight',
    ])
  })

  it('keeps leading dot and dot-container silhouettes explicit', () => {
    expect(anchors('.name').map(token => [token.type, token.value])).toEqual([
      ['OPERATOR', '.'],
      ['IDENTIFIER', 'name'],
    ])
    expect(anchors('.{ a }').map(token => [token.type, token.value])).toEqual([
      ['OPERATOR', '.'],
      ['CONTAINER_OPEN', '{'],
      ['IDENTIFIER', 'a'],
      ['CONTAINER_CLOSE', '}'],
    ])
  })

  it('classifies one-line, line, and blank-line intervals', () => {
    const result = lex('a b\nc\n\nd', { eventPolicy: 'none' })
    expect(result.gaps.map(gap => gap.class)).toEqual(['open', 'cadence', 'episode'])
    expect(result.gaps.map(gap => gap.lineBreaks)).toEqual([0, 1, 2])
    for (const gap of result.gaps) {
      expect('a b\nc\n\nd'.slice(gap.span.start.offset, gap.span.end.offset)).toBe(gap.raw)
    }
  })

  it('preserves comments as trivia inside a cadence gap', () => {
    const result = lex('a // note\n b', { eventPolicy: 'none' })
    expect(result.gaps).toHaveLength(1)
    expect(result.gaps[0]).toMatchObject({
      class: 'cadence',
      raw: ' // note\n ',
      lineBreaks: 1,
    })
    expect(result.gaps[0]?.triviaTokenIndices.length).toBeGreaterThanOrEqual(2)
  })
})

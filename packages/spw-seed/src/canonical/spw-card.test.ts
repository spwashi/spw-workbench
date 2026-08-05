import { describe, expect, it } from 'vitest'
import { facet, formatSpwCard, formatSpwCards } from './spw-card'

describe('formatSpwCard', () => {
  it('emits nested frames for groups', () => {
    const card = formatSpwCard('delta', [
      facet.group('identity', [
        facet.atom('before', 'abc'),
        facet.flag('layoutOnly', false),
      ]),
      facet.group('lex', [facet.atom('ops', 1)]),
    ])
    expect(card).toBe(
      [
        '^["delta"]{',
        '  ^["identity"]{',
        '    ~#before: abc',
        '    ~#layoutOnly: #no',
        '  }',
        '  ^["lex"]{',
        '    ~#ops: 1',
        '  }',
        '}',
      ].join('\n'),
    )
  })

  it('composes cards with blank line', () => {
    const a = formatSpwCard('a', [facet.atom('x', 1)])
    const b = formatSpwCard('b', [facet.atom('y', 2)])
    expect(formatSpwCards([a, b])).toContain('\n\n')
  })
})

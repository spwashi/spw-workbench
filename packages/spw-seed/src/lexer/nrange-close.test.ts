/**
 * )) closes an n-range only while one is open. Before, the lexer read every ))
 * as an n-range close, so x(a(b)) ended on a close nothing had opened and read
 * as incomplete, and the slot reader dropped a bracket holding (a/(b)).
 */
import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import { lex } from './lex'
import { readLine } from '../line/read'
import { scan } from '../lite/scan'

const closes = (text: string) => lex(text, { eventPolicy: 'none' }).tokens.filter((t) => t.type === 'CONTAINER_CLOSE' || t.type === 'NRANGE_CLOSE').map((t) => t.value)

describe('a double close', () => {
  it('is two scope closes when no n-range is open', () => {
    expect(closes('x(a(b))')).toEqual([')', ')'])
    expect(parse('x(a(b))').completeness?.complete).toBe(true)
    expect(parse('p[(a/(b))]').completeness?.complete).toBe(true)
  })

  it('still closes an n-range that is open, and an n-range inside a scope', () => {
    expect(closes('f((a))')).toEqual(['))'])
    expect(closes('x( ((a)) )')).toEqual(['))', ')'])
    expect(parse('f((a))').completeness?.complete).toBe(true)
  })

  it('reads the same way in the slot reader and its scanner', () => {
    expect(readLine('p[(a(b))]')).toMatchObject({ whole: true, slots: { mode: { text: '(a(b))' } } })
    expect(scan('x(a(b))').filter((t) => t.kind === 'close').map((t) => t.bound)).toEqual(['scope', 'scope'])
    expect(scan('f((a))').filter((t) => t.kind === 'close').map((t) => t.bound)).toEqual(['nrange'])
  })
})

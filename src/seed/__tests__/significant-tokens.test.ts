import { describe, it, expect } from 'vitest'
import { parse, isSignificantToken, significantTokens, type Token } from '@spwashi/spw-seed'

function typeOf(t: Token): string {
  return t.type
}

describe('isSignificantToken — the token filter a scan almost always wants', () => {
  it('drops whitespace and end-of-file padding, keeps the rest', () => {
    const { tokens } = parse('^["x"]{\n  a: 1\n}')
    const kept = significantTokens(tokens).map(typeOf)

    expect(kept).not.toContain('WHITESPACE')
    expect(kept).not.toContain('EOF')
    // The structural tokens survive.
    expect(kept).toContain('OPERATOR')
    expect(kept).toContain('CONTAINER_OPEN')
  })

  it('agrees with the predicate it wraps', () => {
    const { tokens } = parse('#>anchor\n~#status: "x"')
    expect(significantTokens(tokens)).toEqual(tokens.filter(isSignificantToken))
  })

  it('is a no-op on an already-significant stream', () => {
    const significant = significantTokens(parse('a: 1').tokens)
    expect(significantTokens(significant)).toEqual(significant)
  })
})

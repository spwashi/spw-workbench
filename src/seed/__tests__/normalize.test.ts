import { describe, it, expect } from 'vitest'
import { desugar, normalizeToONF } from '../normalize'

describe('desugar', () => {
  it('expands label sugar A{} to labeled body', () => {
    expect(desugar('A{}')).toBe('{_A }_A')
  })

  it('expands intrinsic sugar ?_query', () => {
    expect(desugar('?_foo')).toBe('?(foo)')
  })

  it('normalizes guillemets «...» to backticks `...`', () => {
    expect(desugar('«hello»')).toBe('`hello`')
  })

  it('normalizes multiple guillemets in one string', () => {
    expect(desugar('«a» and «b»')).toBe('`a` and `b`')
  })

  it('does not expand <>_ as intrinsic sugar (no <> operator)', () => {
    // <> is reserved for containers, not operators
    expect(desugar('<>_foo')).toBe('<>_foo')
  })
})

describe('normalizeToONF', () => {
  it('normalizes basic AST structures to ONF', () => {
    // Just a sanity check that it returns ONFNode
    const result = normalizeToONF({ type: 'Wildcard', span: {} as any })
    expect(result).toEqual({ sigil: '_', args: [], frames: { reg: 'hole' } })
  })
})

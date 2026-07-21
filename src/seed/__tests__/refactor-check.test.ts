import { describe, expect, it } from 'vitest'
import { compareSourceProjections } from '../../../scripts/analyzers/spw-refactor-check'

describe('Spw structural-projection verifier', () => {
  it('accepts spacing changes when the complete AST projection is unchanged', () => {
    const result = compareSourceProjections('{x}', '{ x }')
    expect(result.equivalent).toBe(true)
    expect(result.projection).toBe('ast-without-source-spans@1')
  })

  it('detects a boundary-kind change', () => {
    const result = compareSourceProjections('{x}', '[x]')
    expect(result.equivalent).toBe(false)
    expect(result.diffs[0]).toContain('mismatch')
  })

  it('refuses to certify two equally recovered inputs', () => {
    const result = compareSourceProjections('{', '{')
    expect(result.equivalent).toBe(false)
    expect(result.diffs).toContain('source A is not a complete structured parse (0 errors)')
    expect(result.diffs).toContain('source B is not a complete structured parse (0 errors)')
  })
})

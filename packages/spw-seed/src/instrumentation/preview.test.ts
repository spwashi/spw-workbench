import { describe, it, expect } from 'vitest'
import { parse, previewAST } from '../index'

describe('previewAST', () => {
  it('returns a summary for a simple expression', () => {
    const result = parse('!["hi"] .. @out')
    const preview = previewAST(result.ast)
    expect(preview).toContain('!["hi"]')
    expect(preview).toContain('@')
  })

  it('handles missing AST gracefully', () => {
    expect(previewAST(null)).toBe('No AST')
  })
})

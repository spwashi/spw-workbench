import { describe, it, expect } from 'vitest'
import { canonicalize, hashString } from '../canonical'

describe('canonicalize', () => {
  it('normalizes line endings and trims trailing whitespace', () => {
    const result = canonicalize('line1  \r\nline2\t\r\n')
    expect(result.source).toBe('line1\nline2\n')
  })

  it('adds a final newline when missing', () => {
    const result = canonicalize('line1')
    expect(result.source.endsWith('\n')).toBe(true)
  })

  it('collapses blank lines when requested', () => {
    const result = canonicalize('a\n\n\nb', { collapseBlankLines: true })
    expect(result.source).toBe('a\n\nb\n')
  })

  it('produces stable hashes for equivalent text', () => {
    const a = canonicalize('a\nb', { ensureFinalNewline: true })
    const b = canonicalize('a\r\nb\n', { ensureFinalNewline: true })
    expect(a.hash).toBe(b.hash)
    expect(hashString(a.source)).toBe(a.hash)
  })
})

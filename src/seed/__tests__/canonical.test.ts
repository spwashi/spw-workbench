import { describe, it, expect } from 'vitest'
import {
  canonicalize,
  hashString,
  reflowProseBlocks,
  wrapWords,
  isProseCommentLine,
  isSlashLineComment,
  resolveFormatProfile,
} from '../canonical'

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

describe('indentBraces', () => {
  const opts = { indentBraces: true, indentSize: 2 }

  it('indents nested braces', () => {
    const input = '^["frame"] {\ncontent\nnested {\ndeep\n}\n}'
    const result = canonicalize(input, opts)
    expect(result.source).toBe(
      '^["frame"] {\n  content\n  nested {\n    deep\n  }\n}\n'
    )
  })

  it('handles closing brace on own line', () => {
    const input = '^["a"] {\nvalue\n}'
    const result = canonicalize(input, opts)
    expect(result.source).toBe('^["a"] {\n  value\n}\n')
  })

  it('handles multiple }} on one line', () => {
    const input = '^["a"] {\ninner {\nval\n}}'
    const result = canonicalize(input, opts)
    // }} closes both levels: depth goes from 2 to 0
    expect(result.source).toBe('^["a"] {\n  inner {\n    val\n}}\n')
  })

  it('does not indent braces inside strings', () => {
    const input = 'key: "{ not a brace }"\nnext: true'
    const result = canonicalize(input, opts)
    expect(result.source).toBe('key: "{ not a brace }"\nnext: true\n')
  })

  it('preserves top-level # comments at depth 0', () => {
    const input = '# Title\n#\n^["frame"] {\ncontent\n}'
    const result = canonicalize(input, opts)
    expect(result.source).toBe('# Title\n#\n^["frame"] {\n  content\n}\n')
  })
})

describe('indentBraces — bracket continuation', () => {
  const opts = { indentBraces: true, indentSize: 2 }

  it('indents continuation lines inside unclosed brackets', () => {
    const input = 'items: [\n"a",\n"b",\n]'
    const result = canonicalize(input, opts)
    expect(result.source).toBe('items: [\n  "a",\n  "b",\n]\n')
  })

  it('handles brackets nested inside braces', () => {
    const input = '^["frame"] {\nlist: [\n"x",\n]\n}'
    const result = canonicalize(input, opts)
    expect(result.source).toBe('^["frame"] {\n  list: [\n    "x",\n  ]\n}\n')
  })
})

describe('alignComments', () => {
  const opts = { alignComments: true, commentColumn: 20 }

  it('aligns trailing # comments to consistent column', () => {
    const input = 'short # comment\nlonger_key # comment'
    const result = canonicalize(input, opts)
    const lines = result.source.split('\n')
    const col1 = lines[0].indexOf('#')
    const col2 = lines[1].indexOf('#')
    expect(col1).toBe(col2)
    expect(col1).toBeGreaterThanOrEqual(20)
  })

  it('does not treat annotation sigils as trailing comments', () => {
    const input = '#>anchor\n#:lens #!intent'
    const result = canonicalize(input, opts)
    expect(result.source).toBe('#>anchor\n#:lens #!intent\n')
  })

  it('groups are separated by uncommented lines', () => {
    const input = 'a # 1\nb # 2\nc\nd # 3'
    const result = canonicalize(input, opts)
    const lines = result.source.split('\n')
    // a and b aligned together
    expect(lines[0].indexOf('#')).toBe(lines[1].indexOf('#'))
    // d is in its own group
    expect(lines[3].includes('#')).toBe(true)
  })
})

describe('blankLineBetweenFrames', () => {
  const opts = { blankLineBetweenFrames: true }

  it('inserts blank line between consecutive frames', () => {
    const input = '^["a"] {\nval\n}\n^["b"] {\nval\n}'
    const result = canonicalize(input, opts)
    expect(result.source).toBe('^["a"] {\nval\n}\n\n^["b"] {\nval\n}\n')
  })

  it('does not insert leading blank for first frame', () => {
    const input = '^["first"] {\nval\n}'
    const result = canonicalize(input, opts)
    expect(result.source.startsWith('^["first"]')).toBe(true)
  })

  it('does not produce double blank lines', () => {
    const input = '^["a"] {\nval\n}\n\n\n^["b"] {\nval\n}'
    const result = canonicalize(input, opts)
    expect(result.source).not.toContain('\n\n\n')
  })

  it('inserts blank after top-level frame close before non-frame content', () => {
    const input = '^["a"] {\nval\n}\n# comment'
    const result = canonicalize(input, opts)
    expect(result.source).toBe('^["a"] {\nval\n}\n\n# comment\n')
  })
})

describe('reflowProse', () => {
  it('detects prose vs directive comments', () => {
    expect(isProseCommentLine('# hello')).toBe(true)
    expect(isProseCommentLine('// note')).toBe(false)
    expect(isSlashLineComment('// note')).toBe(true)
    expect(isProseCommentLine('#:layer')).toBe(false)
    expect(isProseCommentLine('#>anchor')).toBe(false)
    expect(isProseCommentLine('#!intent')).toBe(false)
  })

  it('wraps long words to width', () => {
    const lines = wrapWords('one two three four five', 10)
    expect(lines.every(l => l.length <= 10 || !l.includes(' '))).toBe(true)
    expect(lines.join(' ')).toContain('one')
    expect(lines.join(' ')).toContain('five')
  })

  it('reflows consecutive # prose lines', () => {
    const input = [
      '# This is a very long prose comment that should wrap when the print width is small enough to force multiple lines of text.',
      '# Second sentence continues the paragraph without a blank separator.',
      '',
      '#:layer #!keep',
    ].join('\n')
    const out = reflowProseBlocks(input, 40)
    const proseLines = out.split('\n').filter(l => l.startsWith('# ') || l === '#')
    expect(proseLines.length).toBeGreaterThan(1)
    expect(out).toContain('#:layer #!keep')
    expect(proseLines.every(l => l.length <= 42)).toBe(true)
  })

  it('canonicalize pretty profile indents and reflows', () => {
    const input = [
      '# Long header prose about the module that explains intent in many words for wrapping.',
      '^["frame"]{',
      'key: value',
      '}',
    ].join('\n')
    const pretty = resolveFormatProfile('pretty', { printWidth: 48 })
    const result = canonicalize(input, pretty)
    expect(result.source).toContain('  key: value')
    expect(result.source.split('\n').some(l => l.startsWith('# '))).toBe(true)
  })

  it('preserves blank prose paragraph breaks', () => {
    const input = '# para one wordy enough\n#\n# para two continues'
    const out = reflowProseBlocks(input, 80)
    expect(out).toMatch(/# para one[\s\S]*\n#\n# para two/)
  })
})

/**
 * Comment Containment Tests
 *
 * Spw has no block comments. `/` carries no meaning in the operator lattice
 * yet, so `/*` must not open anything — while it did, a stray one inside a `#`
 * header line silently swallowed every declaration below it and the surface
 * still reported as parsed.
 */

import { describe, expect, it } from 'vitest'
import { lex } from '../lexer'
import { parse, spwq } from '../index'

const FRAME = '^"f"{\n ~#taste: "held"\n}\n'

function annotationCount(source: string): number {
  const output = parse(source)
  if (!output.ast) return 0
  return spwq(output.ast, { nodeType: 'Annotation' } as never).length
}

function commentTokens(source: string) {
  return lex(source).tokens.filter((token) => token.type === 'COMMENT')
}

describe('comment containment', () => {
  it('does not treat /* as opening a comment', () => {
    const source = `/* not a comment\n${FRAME}`

    expect(commentTokens(source)).toHaveLength(0)
    expect(annotationCount(source)).toBe(1)
  })

  it('keeps declarations below a # header line that contains /*', () => {
    const source = `# outputs under gen/* are ignored\n${FRAME}`

    expect(annotationCount(source)).toBe(1)
  })

  it('leaves */ as ordinary content rather than a terminator', () => {
    // `# ` + space is hash-prose (one COMMENT); `*/` must not close anything.
    const source = `# a glob like src/*/docs/ reads as text\n${FRAME}`
    const comments = commentTokens(source)

    expect(comments).toHaveLength(1)
    expect(comments[0]!.value).toContain('*/')
    expect(annotationCount(source)).toBe(1)
  })

  it('still recognizes // line comments through end of line only', () => {
    const source = `// a note\n${FRAME}`
    const comments = commentTokens(source)

    expect(comments).toHaveLength(1)
    expect(comments[0].value).toBe('// a note')
    expect(annotationCount(source)).toBe(1)
  })
})

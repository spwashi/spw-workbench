/**
 * Gloss Tests
 *
 * `~#(nearest neighbor)` and `~#lens(living system)` — a reading laid alongside
 * the thing it reads. The point of the form is that an instrument can count it,
 * which a comment never allowed, so these pin both that it parses and that a
 * selector finds it.
 */

import { describe, expect, it } from 'vitest'
import { parse, spwq } from '../index'
import { lex } from '../lexer'
import { glossParts } from '@spwashi/spw-seed'

interface GlossyAnnotation {
  name?: { value?: string }
  gloss?: { body: string; anonymous: boolean }
}

function glosses(source: string) {
  const output = parse(source)
  if (!output.ast) return []
  return spwq(output.ast, { nodeType: 'Annotation' } as never)
    .map((match) => match.node as unknown as GlossyAnnotation)
    .filter((node) => node.gloss)
}

function tokenTypes(source: string) {
  return lex(source).tokens
    .filter((token) => token.type !== 'WHITESPACE' && token.type !== 'EOF')
    .map((token) => token.type)
}

describe('gloss lexing', () => {
  it('takes an anonymous gloss as one token', () => {
    expect(tokenTypes('~#(nearest neighbor)')).toEqual(['GLOSS'])
  })

  it('takes a named gloss as one token and marks it named', () => {
    const [token] = lex('~#lens(living system)').tokens
    expect(token.type).toBe('GLOSS')
    expect(token.kind).toBe('named')
  })

  /**
   * The body is prose. Lexing it as tokens would make an apostrophe or a
   * percent sign a syntax error, which is what pushed these readings into
   * comments in the first place.
   */
  it('keeps punctuation and unicode in the body whole', () => {
    for (const body of ["it's the root map, 50% done", 'local → global projection', 'a/b ratio']) {
      const source = `~#(${body})`
      expect(tokenTypes(source)).toEqual(['GLOSS'])
      expect(glossParts(source).body).toBe(body)
    }
  })

  it('leaves the datum forms to the annotation matcher', () => {
    expect(tokenTypes('~#taste: "held"')).toEqual(['ANNOTATION', 'COLON', 'STRING'])
    expect(tokenTypes('~#goal ~"./path"')).toEqual(['ANNOTATION', 'OPERATOR', 'STRING'])
  })

  it('reports an unterminated gloss rather than swallowing the line', () => {
    const errors = lex('~#(unclosed\n^"f"{\n}\n').events.filter((event) => event.type === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0].rule).toBe('gloss')
  })
})

describe('gloss parsing', () => {
  it('reaches the AST as an Annotation a selector already finds', () => {
    const found = glosses('^"f"{\n ~#(nearest neighbor)\n}\n')

    expect(found).toHaveLength(1)
    expect(found[0].gloss).toEqual({ body: 'nearest neighbor', anonymous: true })
  })

  it('carries a name when one is declared, so recurring readings stay queryable', () => {
    const found = glosses('^"f"{\n ~#neighbor(nearest)\n ~#lens(living system)\n}\n')

    expect(found.map((node) => node.name?.value)).toEqual(['neighbor', 'lens'])
    expect(found.map((node) => node.gloss?.anonymous)).toEqual([false, false])
    expect(found.map((node) => node.gloss?.body)).toEqual(['nearest', 'living system'])
  })

  it('sits beside datum marks without displacing them', () => {
    const output = parse('^"f"{\n ~#lens(living system)\n ~#taste: "held"\n}\n')
    const all = spwq(output.ast!, { nodeType: 'Annotation' } as never)
      .map((match) => match.node as unknown as GlossyAnnotation)

    expect(all).toHaveLength(2)
    expect(all.filter((node) => node.gloss)).toHaveLength(1)
    expect(all.find((node) => !node.gloss)?.name?.value).toBe('taste')
  })

  it('is accepted in the leading seed position', () => {
    expect(glosses('~#(a reading of the whole surface)\n^"f"{\n}\n')).toHaveLength(1)
  })
})

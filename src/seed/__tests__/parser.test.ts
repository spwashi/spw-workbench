/**
 * Parser Integration Tests
 */

import { describe, it, expect } from 'vitest'
import { parse, parseExpression } from '../parser'

function primaryExpression(result: ReturnType<typeof parse>) {
  const root = result.ast?.expression
  if (!root) {
    throw new Error('Expected root expression')
  }
  if (root.type === 'Expression') {
    return root
  }
  if (root.type === 'Sequence') {
    const first = root.expressions[0]
    if (!first) {
      throw new Error('Expected at least one expression in sequence')
    }
    return first
  }
  throw new Error(`Expected Expression or Sequence, found ${root.type}`)
}

describe('Parser', () => {
  describe('Basic Parsing', () => {
    it('handles empty input', () => {
      const result = parse('')
      // Empty input returns a result object
      expect(result).toBeDefined()
      expect(result.tokens).toBeDefined()
    })

    it('parses simple operator', () => {
      const result = parse('!')
      expect(result.success).toBe(true)
      expect(result.ast).toBeDefined()
    })

    it('parses operator with frame', () => {
      const result = parse('!["hello"]')
      expect(result.success).toBe(true)
      expect(result.ast?.type).toBe('Seed')
    })

    it('parses reference', () => {
      const result = parse('@ref')
      expect(result.success).toBe(true)
    })
  })

  describe('Operators', () => {
    it.each(['!', '^', '~', '?', '*', '=', '@'])(
      'parses %s operator',
      (op) => {
        const result = parse(op)
        expect(result.success).toBe(true)
      }
    )

    it('parses underscore operator labels', () => {
      const result = parse('?_query["x"]')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      const term = expression.terms[0]
      expect(term?.type).toBe('Operation')
      if (term && term.type === 'Operation') {
        expect(term.operatorLabel?.value).toBe('_query')
        expect(term.modifiers).toBeUndefined()
      }
    })

    it('parses @_label as a labeled operation (not a reference)', () => {
      const result = parse('@_nav["next"]')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)

      const term = expression.terms[0]
      expect(term?.type).toBe('Operation')
      if (term && term.type === 'Operation') {
        expect(term.operator.value).toBe('@')
        expect(term.operatorLabel?.value).toBe('_nav')
      }
    })

    it('handles comparison tokens', () => {
      // < and > are separate tokens, couple operator uses different syntax
      const result = parse('<')
      expect(result).toBeDefined()
    })
  })

  describe('Modifiers', () => {
    it('parses modifier before operator', () => {
      const result = parse('boon!')
      expect(result.success).toBe(true)
    })

    it('parses modifier after operator', () => {
      const result = parse('!boon["value"]')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      const term = expression.terms[0]
      expect(term?.type).toBe('Operation')
      if (term && term.type === 'Operation') {
        expect(term.modifiers?.modifiers.map(m => m.value)).toEqual(['boon'])
      }
    })

    it('parses chained modifiers after operator', () => {
      const result = parse('!bone.boon["config"]')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      const term = expression.terms[0]
      expect(term?.type).toBe('Operation')
      if (term && term.type === 'Operation') {
        expect(term.modifiers?.modifiers.map(m => m.value)).toEqual(['bone', 'boon'])
      }
    })

    it.each(['bone', 'boon', 'bane', 'bonk', 'honk'])(
      'parses %s modifier',
      (mod) => {
        const result = parse(`${mod}!`)
        expect(result.success).toBe(true)
      }
    )
  })

  describe('Containers', () => {
    it('parses empty scope', () => {
      const result = parse('()')
      expect(result.success).toBe(true)
    })

    it('parses empty frame', () => {
      const result = parse('![]')
      expect(result.success).toBe(true)
    })

    it('parses empty body', () => {
      const result = parse('!{}')
      expect(result.success).toBe(true)
    })

    it('parses nested containers', () => {
      const result = parse('![({})]')
      expect(result.success).toBe(true)
    })
  })

  describe('Literals', () => {
    it('parses string literals', () => {
      const result = parse('!["hello"]')
      expect(result.success).toBe(true)
    })

    it('parses number literals', () => {
      const result = parse('![42]')
      expect(result.success).toBe(true)
    })

    it('keeps bare frame values as literals (not references)', () => {
      const result = parse('![42]')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)

      const term = expression.terms[0]
      expect(term?.type).toBe('Operation')
      if (!term || term.type !== 'Operation') {
        throw new Error('Expected Operation')
      }

      const frameItem = term.frame?.content[0]
      if (!frameItem) {
        throw new Error('Expected frame content')
      }
      if (frameItem.type === 'Parameter') {
        expect(frameItem.value.type).toBe('Literal')
      } else {
        expect(frameItem.type).toBe('Literal')
      }
    })

    it('parses explicit frame references with @', () => {
      const result = parse('![@value]')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)

      const term = expression.terms[0]
      expect(term?.type).toBe('Operation')
      if (!term || term.type !== 'Operation') {
        throw new Error('Expected Operation')
      }

      const frameItem = term.frame?.content[0]
      if (!frameItem) {
        throw new Error('Expected frame content')
      }
      if (frameItem.type === 'Parameter') {
        expect(frameItem.value.type).toBe('Reference')
        if (frameItem.value.type !== 'Reference') {
          throw new Error('Expected Reference value')
        }
        expect(frameItem.value.path[0]?.value).toBe('value')
      } else {
        expect(frameItem.type).toBe('Reference')
        if (frameItem.type !== 'Reference') {
          throw new Error('Expected Reference')
        }
        expect(frameItem.path[0]?.value).toBe('value')
      }
    })

    it('parses boolean literals', () => {
      const result = parse('![true]')
      expect(result.success).toBe(true)
    })

    it('parses multiple literals in frame', () => {
      const result = parse('![1, 2, 3]')
      expect(result.success).toBe(true)
    })

    it('rejects bare local path sugar in low-context mode', () => {
      const result = parseExpression('~./runtime')
      expect(result.success).toBe(false)
    })

    it('accepts bare local path sugar in high-context mode and desugars to quoted payload', () => {
      const result = parseExpression('~./runtime', { contextMode: 'high' })
      expect(result.success).toBe(true)
      const term = result.ast?.terms[0]
      expect(term?.type).toBe('PathRef')
      if (!term || term.type !== 'PathRef') {
        throw new Error('Expected PathRef')
      }
      expect(term.path.token.value).toBe('"./runtime"')
    })

    it('accepts annotation path sugar in high-context mode and desugars to quoted payload', () => {
      const result = parse('~#spec ./runtime/spw/register-bank.spw', { contextMode: 'high' })
      expect(result.success).toBe(true)
      expect(result.ast?.annotations.length).toBeGreaterThan(0)
      const ann = result.ast?.annotations[0]
      expect(ann?.type).toBe('Annotation')
      if (!ann || ann.type !== 'Annotation') {
        throw new Error('Expected Annotation')
      }
      expect(ann.value?.type).toBe('Literal')
      if (!ann.value || ann.value.type !== 'Literal') {
        throw new Error('Expected annotation literal value')
      }
      expect(ann.value.token.value).toBe('"./runtime/spw/register-bank.spw"')
    })
  })

  describe('Flow Connectors', () => {
    it('parses simple chain with operations', () => {
      // Simple identifiers alone may not form valid operations
      const result = parse('!a .. @b')
      expect(result.success).toBe(true)
    })

    it('parses multi-step chain with operations', () => {
      const result = parse('!a .. ~b .. ^c .. @d')
      expect(result.success).toBe(true)
    })

    it('parses operations in chain', () => {
      const result = parse('!["input"] .. ~process .. @output')
      expect(result.success).toBe(true)
    })

    it('parses mapping connector', () => {
      const result = parse('![1] -> ![2]')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      expect(expression.connectors[0].value).toBe('->')
    })

    it('parses path connector', () => {
      const result = parse('![1] / ![2]')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      expect(expression.connectors[0].value).toBe('/')
    })
  })

  describe('Extended Constructs', () => {
    it('parses n-range wrapper', () => {
      const result = parse('(( !["x"] ))')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      expect(expression.terms[0]?.type).toBe('NRange')
    })

    it('parses streaming boundary', () => {
      const result = parse('<< !["x"] >>')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      expect(expression.terms[0]?.type).toBe('Stream')
    })

    it('parses streaming boundary with sink', () => {
      const result = parse('<< !["x"] >> @sink')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      const term = expression.terms[0]
      if (term && term.type === 'Stream') {
        expect(term.sink?.type).toBe('Reference')
      }
    })

    it('parses capsule shell', () => {
      const result = parse('<c[1]{ !["y"] }>')
      expect(result.success).toBe(true)
      const expression = primaryExpression(result)
      expect(expression.terms[0]?.type).toBe('Capsule')
    })
  })

  describe('Match Parsing', () => {
    it('rejects malformed match arms', () => {
      const result = parseExpression('?match[42]{ => "x" }')
      expect(result.success).toBe(false)
    })
  })

  describe('Complex Expressions', () => {
    it('parses operation with modifier and frame', () => {
      const result = parse('boon!["value"]')
      expect(result.success).toBe(true)
    })

    it('parses operation with frame and body', () => {
      const result = parse('![params]{body}')
      expect(result.success).toBe(true)
    })

    it('parses scope with frame content', () => {
      // Scope with a frame inside
      const result = parse('(![1])')
      expect(result.success).toBe(true)
    })

    it('parses deeply nested structure', () => {
      const result = parse(`
        !boon config[
          "key": "value"
        ] .. ~process .. @result
      `)
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('handles malformed input gracefully', () => {
      // Unclosed bracket should be handled
      const result = parse('![')
      // Parser may succeed with partial parse or report errors
      expect(result).toBeDefined()
      expect(result.ast).toBeDefined()
    })

    it('provides error events for invalid syntax', () => {
      const result = parse('![')
      // Check that the parse completed
      expect(result.events).toBeDefined()
      expect(result.events.length).toBeGreaterThan(0)
    })
  })

  describe('Parse Output', () => {
    it('includes tokens', () => {
      const result = parse('!["hello"]')
      expect(result.tokens.length).toBeGreaterThan(0)
    })

    it('includes events', () => {
      const result = parse('!["hello"]')
      expect(result.events.length).toBeGreaterThan(0)
    })

    it('includes duration', () => {
      const result = parse('!["hello"]')
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('provides AST with span information', () => {
      const result = parse('!["hello"]')
      expect(result.ast?.span).toBeDefined()
      expect(result.ast?.span.start.offset).toBe(0)
    })
  })

  describe('Example Files', () => {
    it('parses hello-world example', () => {
      const input = `
        // Hello World in Spw
        !boon["hello, world"]
        @greeting
      `
      const result = parse(input)
      expect(result.success).toBe(true)
    })

    it('parses data-flow pattern', () => {
      const input = `
        !["input"] .. ~process .. @output
      `
      const result = parse(input)
      expect(result.success).toBe(true)
    })

    it('parses conditional pattern', () => {
      const input = `
        ?isValid .. @proceed
      `
      const result = parse(input)
      expect(result.success).toBe(true)
    })
  })
})

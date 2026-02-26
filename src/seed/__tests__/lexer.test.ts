/**
 * Lexer Unit Tests
 */

import { describe, it, expect } from 'vitest'
import { lex } from '../lexer'

describe('Lexer', () => {
  describe('Operators', () => {
    it.each([
      ['!', 'OPERATOR'],
      ['^', 'OPERATOR'],
      ['~', 'OPERATOR'],
      ['?', 'OPERATOR'],
      ['*', 'OPERATOR'],
      ['@', 'OPERATOR'],
      ['#', 'OPERATOR'],
      ['&', 'OPERATOR'],
      ['$', 'OPERATOR'],
      ['%', 'OPERATOR'],
    ])('tokenizes %s as OPERATOR', (input) => {
      const { tokens } = lex(input)
      const nonWhitespace = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(nonWhitespace.length).toBeGreaterThan(0)
      expect(nonWhitespace[0].type).toBe('OPERATOR')
      expect(nonWhitespace[0].value).toBe(input)
    })

    it('does not tokenize = when followed by = (comparison)', () => {
      const { tokens } = lex('==')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('COMPARISON')
    })
  })

  describe('Modifiers', () => {
    it.each([
      ['bone', 'MODIFIER'],
      ['boon', 'MODIFIER'],
      ['bane', 'MODIFIER'],
      ['bonk', 'MODIFIER'],
      ['honk', 'MODIFIER'],
    ])('tokenizes %s as %s', (input, expectedType) => {
      const { tokens } = lex(input)
      const nonWhitespace = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(nonWhitespace[0].type).toBe(expectedType)
      expect(nonWhitespace[0].value).toBe(input)
    })
  })

  describe('Containers', () => {
    it('tokenizes parentheses', () => {
      const { tokens } = lex('()')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('CONTAINER_OPEN')
      expect(filtered[0].value).toBe('(')
      expect(filtered[1].type).toBe('CONTAINER_CLOSE')
      expect(filtered[1].value).toBe(')')
    })

    it('tokenizes brackets', () => {
      const { tokens } = lex('[]')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('CONTAINER_OPEN')
      expect(filtered[0].value).toBe('[')
      expect(filtered[1].type).toBe('CONTAINER_CLOSE')
      expect(filtered[1].value).toBe(']')
    })

    it('tokenizes braces', () => {
      const { tokens } = lex('{}')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('CONTAINER_OPEN')
      expect(filtered[0].value).toBe('{')
      expect(filtered[1].type).toBe('CONTAINER_CLOSE')
      expect(filtered[1].value).toBe('}')
    })
  })

  describe('Literals', () => {
    it('tokenizes double-quoted strings', () => {
      const { tokens } = lex('"hello"')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('STRING')
      expect(filtered[0].value).toBe('"hello"')
    })

    it('tokenizes single-quoted strings', () => {
      const { tokens } = lex("'world'")
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('STRING')
      expect(filtered[0].value).toBe("'world'")
    })

    it('tokenizes integers', () => {
      const { tokens } = lex('42')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('NUMBER')
      expect(filtered[0].value).toBe('42')
    })

    it('tokenizes floats', () => {
      const { tokens } = lex('3.14')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('NUMBER')
      expect(filtered[0].value).toBe('3.14')
    })

    it('tokenizes negative numbers as operator + number', () => {
      const { tokens } = lex('-100')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      // Lexer may treat - as separate from the number
      expect(filtered.length).toBeGreaterThanOrEqual(1)
      // The number part should be present
      const numbers = filtered.filter(t => t.type === 'NUMBER')
      expect(numbers.length).toBe(1)
    })

    it('tokenizes booleans', () => {
      const { tokens: trueTokens } = lex('true')
      const { tokens: falseTokens } = lex('false')

      const trueFiltered = trueTokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      const falseFiltered = falseTokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      expect(trueFiltered[0].type).toBe('BOOLEAN')
      expect(trueFiltered[0].value).toBe('true')
      expect(falseFiltered[0].type).toBe('BOOLEAN')
      expect(falseFiltered[0].value).toBe('false')
    })
  })

  describe('Identifiers', () => {
    it('tokenizes simple identifiers', () => {
      const { tokens } = lex('myVar')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('IDENTIFIER')
      expect(filtered[0].value).toBe('myVar')
    })

    it('tokenizes identifiers with numbers', () => {
      const { tokens } = lex('var123')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('IDENTIFIER')
      expect(filtered[0].value).toBe('var123')
    })

    it('tokenizes snake_case identifiers', () => {
      const { tokens } = lex('my_var')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('IDENTIFIER')
      expect(filtered[0].value).toBe('my_var')
    })
  })

  describe('Connectors', () => {
    it('tokenizes flow connector', () => {
      const { tokens } = lex('..')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('CONNECTOR')
      expect(filtered[0].value).toBe('..')
    })

    it('tokenizes mapping connector', () => {
      const { tokens } = lex('->')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('CONNECTOR')
      expect(filtered[0].value).toBe('->')
    })

    it('tokenizes path connector', () => {
      const { tokens } = lex('/')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('CONNECTOR')
      expect(filtered[0].value).toBe('/')
    })
  })

  describe('Extended containers', () => {
    it('tokenizes n-range delimiters', () => {
      const { tokens } = lex('((x))')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('NRANGE_OPEN')
      expect(filtered[filtered.length - 1].type).toBe('NRANGE_CLOSE')
    })

    it('tokenizes streaming delimiters', () => {
      const { tokens } = lex('<< ![] >>')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('STREAM_OPEN')
      expect(filtered[filtered.length - 1].type).toBe('STREAM_CLOSE')
    })

    it('tokenizes capsule shell', () => {
      const { tokens } = lex('<c[]{ }>')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('CAPSULE_OPEN')
      expect(filtered[filtered.length - 1].type).toBe('CAPSULE_CLOSE')
    })
  })

  describe('Punctuation', () => {
    it('tokenizes colon', () => {
      const { tokens } = lex(':')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('COLON')
    })

    it('tokenizes comma', () => {
      const { tokens } = lex(',')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('COMMA')
    })
  })

  describe('Comments', () => {
    it('tokenizes single-line comments', () => {
      const { tokens } = lex('// this is a comment')
      const comments = tokens.filter(t => t.type === 'COMMENT')
      expect(comments.length).toBe(1)
    })
  })

  describe('Whitespace', () => {
    it('tokenizes spaces', () => {
      const { tokens } = lex('   ')
      const whitespace = tokens.filter(t => t.type === 'WHITESPACE')
      expect(whitespace.length).toBeGreaterThan(0)
    })

    it('tokenizes newlines', () => {
      const { tokens } = lex('\n\n')
      const whitespace = tokens.filter(t => t.type === 'WHITESPACE')
      expect(whitespace.length).toBeGreaterThan(0)
    })
  })

  describe('Position Tracking', () => {
    it('tracks line and column correctly', () => {
      const { tokens } = lex('first\nsecond')
      const identifiers = tokens.filter(t => t.type === 'IDENTIFIER')

      expect(identifiers[0].span.start.line).toBe(1)
      expect(identifiers[0].span.start.column).toBe(1)

      expect(identifiers[1].span.start.line).toBe(2)
      expect(identifiers[1].span.start.column).toBe(1)
    })

    it('tracks offset correctly', () => {
      const { tokens } = lex('ab cd')
      const identifiers = tokens.filter(t => t.type === 'IDENTIFIER')

      expect(identifiers[0].span.start.offset).toBe(0)
      expect(identifiers[0].span.end.offset).toBe(2)

      expect(identifiers[1].span.start.offset).toBe(3)
      expect(identifiers[1].span.end.offset).toBe(5)
    })
  })

  describe('Complex Inputs', () => {
    it('tokenizes operator with modifier', () => {
      const { tokens } = lex('boon!')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      expect(filtered[0].type).toBe('MODIFIER')
      expect(filtered[0].value).toBe('boon')
      expect(filtered[1].type).toBe('OPERATOR')
      expect(filtered[1].value).toBe('!')
    })

    it('tokenizes complete expression', () => {
      const { tokens } = lex('!boon["hello"]')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      expect(filtered.map(t => t.type)).toEqual([
        'OPERATOR',
        'MODIFIER',
        'CONTAINER_OPEN',
        'STRING',
        'CONTAINER_CLOSE',
      ])
    })

    it('tokenizes modifier chains with ground operator', () => {
      // Note: '.' is now the Ground operator (quantum nomenclature), not a DOT punctuation token
      const { tokens } = lex('bone.boon!')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      expect(filtered.map(t => t.type)).toEqual([
        'MODIFIER',
        'OPERATOR', // Ground operator (.)
        'MODIFIER',
        'OPERATOR', // Action operator (!)
      ])
      expect(filtered[1].value).toBe('.')
    })

    it('tokenizes flow chain', () => {
      const { tokens } = lex('a .. b .. c')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')

      expect(filtered.map(t => t.type)).toEqual([
        'IDENTIFIER',
        'CONNECTOR',
        'IDENTIFIER',
        'CONNECTOR',
        'IDENTIFIER',
      ])
    })
  })

  describe('Phrases', () => {
    it('tokenizes backtick phrase as PHRASE', () => {
      const { tokens } = lex('`hello world`')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('PHRASE')
      expect(filtered[0].value).toBe('`hello world`')
    })

    it('tokenizes empty backtick phrase', () => {
      const { tokens } = lex('``')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('PHRASE')
      expect(filtered[0].value).toBe('``')
    })

    it('tokenizes phrase adjacent to operator', () => {
      const { tokens } = lex('!`do this`')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('OPERATOR')
      expect(filtered[0].value).toBe('!')
      expect(filtered[1].type).toBe('PHRASE')
    })
  })

  describe('Holes', () => {
    it('tokenizes standalone _ as HOLE', () => {
      const { tokens } = lex('_')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('HOLE')
      expect(filtered[0].value).toBe('_')
    })

    it('tokenizes _ in expression context', () => {
      const { tokens } = lex('f(_, x)')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      const holes = filtered.filter(t => t.type === 'HOLE')
      expect(holes.length).toBe(1)
      expect(holes[0].value).toBe('_')
    })

    it('does not tokenize _foo as HOLE (identifier)', () => {
      const { tokens } = lex('_foo')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('IDENTIFIER')
      expect(filtered[0].value).toBe('_foo')
    })
  })

  describe('Dot-Facet', () => {
    it('tokenizes .{ as DOT operator (facet constructor)', () => {
      const { tokens } = lex('.{}')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      expect(filtered[0].type).toBe('OPERATOR')
      expect(filtered[0].value).toBe('.')
      expect(filtered[1].type).toBe('CONTAINER_OPEN')
      expect(filtered[1].value).toBe('{')
    })

    it('does not treat .x as dot operator (dot inside identifier)', () => {
      const { tokens } = lex('foo.bar')
      const filtered = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'EOF')
      // foo.bar should be a single identifier (dot is part of identifier syntax)
      expect(filtered[0].type).toBe('IDENTIFIER')
      expect(filtered[0].value).toBe('foo.bar')
    })
  })
})

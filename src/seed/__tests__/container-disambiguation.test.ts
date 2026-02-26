/**
 * Phase 4: Couple vs Capsule Disambiguation Tests
 *
 * Validates that the lexer/parser correctly distinguishes between:
 * - <> as the couple operator
 * - <tag[...]...> as capsule container syntax
 */

import { describe, it, expect } from 'vitest'
import { lex } from '../lexer'
import { parse } from '../parser'

describe('Container Disambiguation (Phase 4)', () => {
  it('treats <> as couple operator when adjacent', () => {
    const { tokens } = lex('<>')

    // Should produce a single OPERATOR token for <>
    const operatorToken = tokens.find(t => t.type === 'OPERATOR')
    expect(operatorToken).toBeDefined()
    expect(operatorToken?.value).toBe('<>')
  })

  it('couple operator parses correctly in expressions', () => {
    const { ast, errors } = parse('<>["Hero", "Villain"]')

    expect(errors).toHaveLength(0)
    expect(ast).toBeDefined()

    // Parser wraps in Seed - find the Operation node inside
    function findOperation(node: unknown): unknown | null {
      if (!node || typeof node !== 'object') return null
      const obj = node as Record<string, unknown>

      if (obj.type === 'Operation') return node

      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            const found = findOperation(item)
            if (found) return found
          }
        } else if (value && typeof value === 'object') {
          const found = findOperation(value)
          if (found) return found
        }
      }
      return null
    }

    const operation = findOperation(ast)
    expect(operation).toBeDefined()

    // Check for operator property
    const opData = operation as unknown as Record<string, { value: string }>
    expect(opData.operator?.value).toBe('<>')
  })

  it('treats <tag[...]> as capsule shell tokens', () => {
    const { tokens } = lex('<component[...]>')

    // Should produce CAPSULE_OPEN, content tokens, and CAPSULE_CLOSE
    const capsuleOpen = tokens.find(t => t.type === 'CAPSULE_OPEN')
    const capsuleClose = tokens.find(t => t.type === 'CAPSULE_CLOSE')

    expect(capsuleOpen).toBeDefined()
    expect(capsuleClose).toBeDefined()
  })

  it('handles ambiguous spacing consistently', () => {
    // Spaced angle brackets should not crash or produce invalid tokens
    const { tokens: spacedTokens } = lex('< >')

    // Should NOT be recognized as a single couple operator
    const coupleToken = spacedTokens.find(t => t.type === 'OPERATOR' && t.value === '<>')
    expect(coupleToken).toBeUndefined()

    // Adjacent <> should still work
    const { tokens: adjacentTokens } = lex('<>')
    const coupleOpToken = adjacentTokens.find(t => t.type === 'OPERATOR' && t.value === '<>')
    expect(coupleOpToken).toBeDefined()
  })

  it('distinguishes couple from comparison operators', () => {
    // < and > as separate tokens should work for comparisons
    const { tokens: ltTokens } = lex('a < b')
    const ltToken = ltTokens.find(t => t.value === '<')
    expect(ltToken).toBeDefined()

    const { tokens: gtTokens } = lex('a > b')
    const gtToken = gtTokens.find(t => t.value === '>')
    expect(gtToken).toBeDefined()
  })
})

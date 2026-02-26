/**
 * Phase 4: Parser Determinism Tests
 *
 * Validates that the parser produces identical outputs across repeated runs
 * and that hashes remain stable for canonicalized outputs.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser'

describe('Parser Determinism (Phase 4)', () => {
  const TEST_INPUTS = [
    '!boon["hello"]',
    '!bone.boon["test"]',
    '^name["value"]',
    '?[@ready]{ | }',
    '~[@items]{ }',
    '#bone^trace',
    '!["a"] .. @out',
    '<>["Hero", "Villain"]',
  ]

  it('produces identical outputs across repeated runs', () => {
    for (const input of TEST_INPUTS) {
      const results: string[] = []

      // Parse the same input 10 times
      for (let i = 0; i < 10; i++) {
        const { ast } = parse(input)
        results.push(JSON.stringify(ast))
      }

      // All results should be identical
      const first = results[0]
      for (const result of results) {
        expect(result).toBe(first)
      }
    }
  })

  it('hashes are stable for canonicalized outputs', () => {
    // Simple hash function for testing
    const hashString = (str: string): number => {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      return hash
    }

    for (const input of TEST_INPUTS) {
      const hashes: number[] = []

      // Generate hashes multiple times
      for (let i = 0; i < 10; i++) {
        const { ast } = parse(input)
        const canonical = JSON.stringify(ast)
        hashes.push(hashString(canonical))
      }

      // All hashes should be identical
      const first = hashes[0]
      for (const hash of hashes) {
        expect(hash).toBe(first)
      }
    }
  })

  it('node IDs are deterministic across parses', () => {
    const input = '!boon["hello"] .. @out'

    const ids1 = collectNodeIds(parse(input).ast)
    const ids2 = collectNodeIds(parse(input).ast)

    expect(ids1).toEqual(ids2)
  })
})

function collectNodeIds(node: unknown): string[] {
  const ids: string[] = []

  function walk(n: unknown): void {
    if (!n || typeof n !== 'object') return

    const obj = n as Record<string, unknown>

    if ('id' in obj && typeof obj.id === 'string') {
      ids.push(obj.id)
    }

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        value.forEach(walk)
      } else if (value && typeof value === 'object') {
        walk(value)
      }
    }
  }

  walk(node)
  return ids
}

/**
 * The caret lookup reaches every node the parser wrote.
 *
 * findNodePathAtOffset walks a fixed list of child properties. A property the parser gained
 * later is skipped without a word: a caret inside @(topic) found the expression and stopped,
 * because a postfix scope hangs on `scope`. The law below walks every key instead, so a node
 * the list cannot reach fails here.
 */
import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import type { ASTNode } from '../types'
import { findNodeAtOffset, findNodePathAtOffset } from './geometry-inspect-position'

const LINES = [
  '@(topic)',
  '$(topic)',
  'home(atlas)',
  'home<person>',
  'home[care]{seed, water}(garden)',
  '~garden[care]{ seed ~> water }',
  'bone.boon home[x]',
  '^"emit"{ ~#title: "Plates" continuity: "pinned" }',
  '#>anchor\n?["What is asked?"]{ ~#readings: ["a", "b"] $%[a, b] }',
  '.{ surfaces: 1368, braces: 148819 }',
  '@plan: ~"./PLAN.md"',
  '!probe{ "git grep" }',
]

const isNode = (v: unknown): v is ASTNode =>
  Boolean(v && typeof v === 'object' && 'type' in (v as object) && 'span' in (v as object))

function everyNode(root: ASTNode): ASTNode[] {
  const out: ASTNode[] = []
  const seen = new Set<unknown>()
  const walk = (v: unknown): void => {
    if (!v || typeof v !== 'object' || seen.has(v)) return
    seen.add(v)
    if (isNode(v)) out.push(v)
    for (const [key, child] of Object.entries(v as Record<string, unknown>)) {
      if (key === 'span') continue
      if (Array.isArray(child)) child.forEach(walk)
      else walk(child)
    }
  }
  walk(root)
  return out
}

describe('findNodePathAtOffset', () => {
  it('finds the word inside a scope written against an operator', () => {
    const ast = parse('@(topic)').ast as ASTNode
    const path = findNodePathAtOffset(ast, 3).map((n) => n.type)
    expect(path).toContain('Scope')
    expect(path).toContain('Identifier')
  })

  it('finds the word inside a postfix scope and a postfix capsule on a noun', () => {
    for (const [line, at, kind] of [['home(atlas)', 6, 'Scope'], ['home<person>', 6, 'Capsule']] as const) {
      const path = findNodePathAtOffset(parse(line).ast as ASTNode, at).map((n) => n.type)
      expect(path, line).toContain(kind)
    }
  })

  it('reaches a node at least as narrow as any node that starts at the caret', () => {
    for (const line of LINES) {
      const ast = parse(line).ast as ASTNode | undefined
      expect(ast, line).toBeTruthy()
      for (const node of everyNode(ast!)) {
        const start = node.span.start.offset
        const end = node.span.end.offset
        // Tokens the tree keeps beside its nodes (a separator, a connector) are not places a caret reads.
        if (end <= start || /^[A-Z_]+$/.test(node.type)) continue
        const found = findNodeAtOffset(ast!, start)
        expect(found, `${line} @${start} ${node.type}`).toBeTruthy()
        const width = found!.span.end.offset - found!.span.start.offset
        expect(width, `${line} @${start}: ${node.type} is narrower than ${found!.type}`).toBeLessThanOrEqual(end - start)
      }
    }
  })
})

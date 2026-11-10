import { describe, expect, it } from 'vitest'
import { lex } from '../lexer/lex'
import { parse } from '../parser'
import type { BindingNode, ExpressionNode, IdentifierNode, OperationNode, SequenceNode } from '../types'

/**
 * A valence word (bone, boon, bane, bonk, honk) is a charge sign in two places:
 * leading a noun (`boon home[x]`) and after an operator (`*boon{…}`). Anywhere
 * else it is a word like any other: a key before a colon, or part of a
 * hyphenated name. plan-stream-parse-health modifier_keys and modifier_fragments.
 */

const WORDS = ['bone', 'boon', 'bane', 'bonk', 'honk'] as const

function topExpressions(source: string): ExpressionNode[] {
  const result = parse(source)
  expect(result.completeness?.proseFallback ?? false).toBe(false)
  expect(result.errors).toEqual([])
  const root = result.ast?.expression
  if (root?.type === 'Sequence') return (root as SequenceNode).expressions
  expect(root?.type).toBe('Expression')
  return [root as ExpressionNode]
}

function bindingOf(expression: ExpressionNode | undefined): BindingNode {
  const term = expression?.terms[0] as unknown as BindingNode | undefined
  expect(term?.type).toBe('Binding')
  return term as BindingNode
}

function keyName(binding: BindingNode): string {
  expect(binding.key.type).toBe('Identifier')
  return (binding.key as IdentifierNode).token.value
}

describe('a valence word in key position is a key', () => {
  it.each(WORDS)('%s: reads as a binding at the top level', word => {
    const [expression] = topExpressions(`${word}: "preloader"`)
    const binding = bindingOf(expression)

    expect(keyName(binding)).toBe(word)
    expect(expression?.modifiers).toBeUndefined()
  })

  it.each(WORDS)('%s: reads as a key inside a facet', word => {
    const [expression] = topExpressions(`.{ ${word}: "preloader" }`)
    const facet = expression?.terms[0] as OperationNode
    const inner = facet.body?.sequence.expressions ?? []

    expect(inner).toHaveLength(1)
    expect(keyName(bindingOf(inner[0]))).toBe(word)
  })

  it('reads valence keys beside ordinary keys, one binding each', () => {
    const [expression] = topExpressions('^"lifecycle"{ boon: "preloader" bane: "error" stage: "idle" honk: "resolution" }')
    const frame = expression?.terms[0] as OperationNode
    const keys = (frame.body?.sequence.expressions ?? []).map(inner => keyName(bindingOf(inner)))

    expect(keys).toEqual(['boon', 'bane', 'stage', 'honk'])
  })

  it('reads a dotted pair of valence words before a colon as one dotted key', () => {
    const [expression] = topExpressions('boon.honk: 1')
    const key = bindingOf(expression).key as IdentifierNode

    expect(key.token.value).toBe('boon.honk')
    expect(key.token.identifier?.segments).toEqual(['boon', 'honk'])
  })

  it('keeps the value of a valence key', () => {
    const [expression] = topExpressions('bonk: "a bell-note"')
    const value = bindingOf(expression).value

    expect(value.type).toBe('Expression')
  })
})

describe('a valence word still charges where a charge can stand', () => {
  it('leads a noun as its charge', () => {
    const [expression] = topExpressions('boon home[x]')

    expect(expression?.modifiers?.modifiers.map(modifier => modifier.value)).toEqual(['boon'])
    expect((expression?.terms[0] as IdentifierNode).token.value).toBe('home')
  })

  it('follows an operator as its modifier', () => {
    const [expression] = topExpressions('*boon{"hello"}')
    const operation = expression?.terms[0] as OperationNode

    expect(operation.modifiers?.modifiers.map(modifier => modifier.value)).toEqual(['boon'])
  })

  it('stands alone inside a frame as a charge', () => {
    const [expression] = topExpressions('!voice[honk]')
    const operation = expression?.terms[0] as OperationNode

    expect(operation.frame).toBeDefined()
  })

  it('charges the value of an ordinary key', () => {
    const [expression] = topExpressions('mood: boon home')
    const value = bindingOf(expression).value

    expect(value.modifiers?.modifiers.map(modifier => modifier.value)).toEqual(['boon'])
  })
})

describe('a valence word inside a hyphenated name is part of the name', () => {
  it.each(['bane-frame', 'boon-crossings', 'bone-role', 'honk-x', 'bonk-1'])('%s lexes as one identifier', name => {
    const tokens = lex(name).tokens.filter(token => token.type !== 'EOF')

    expect(tokens.map(token => `${token.type}:${token.value}`)).toEqual([`IDENTIFIER:${name}`])
  })

  it('reads a fragment that begins with a valence word', () => {
    topExpressions('@page#bane-frame')
    topExpressions('#boon-crossings')
  })

  it('still lexes a valence word followed by a spaced minus as a charge sign', () => {
    const tokens = lex('boon - 1').tokens.filter(token => token.type !== 'EOF' && token.type !== 'WHITESPACE')

    expect(tokens[0]).toMatchObject({ type: 'MODIFIER', value: 'boon' })
  })

  it('does not join a valence word to a longer word', () => {
    const tokens = lex('boonberry').tokens.filter(token => token.type !== 'EOF')

    expect(tokens.map(token => `${token.type}:${token.value}`)).toEqual(['IDENTIFIER:boonberry'])
  })
})

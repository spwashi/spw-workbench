import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import { parseExpression } from '../parser/parse-expression'
import { normalizeToONF } from '../normalize'
import type {
  ExpressionNode,
  IdentifierNode,
  ModifierChainNode,
  OperationNode,
  ParameterNode,
  SequenceNode,
} from '../types'

function proseCodes(result: { warnings: Array<{ data?: { code?: string } }> }): string[] {
  return result.warnings
    .map(warning => warning.data?.code)
    .filter((code): code is string => typeof code === 'string')
}

function asExpression(node: { type: string } | undefined): ExpressionNode {
  expect(node?.type).toBe('Expression')
  return node as ExpressionNode
}

function chargeOf(node: { modifiers?: ModifierChainNode } | undefined): string[] {
  return node?.modifiers?.modifiers.map(modifier => modifier.value) ?? []
}

function subjectOf(expr: ExpressionNode): string | undefined {
  const head = expr.terms[0]
  if (!head || head.type !== 'Identifier') return undefined
  return (head as IdentifierNode).token.value
}

function modeOf(expr: ExpressionNode): string[] {
  const parameter = expr.frame?.content[0]
  if (!parameter || parameter.type !== 'Parameter') return []
  const value = (parameter as ParameterNode).value
  if (!value || typeof value !== 'object') return []
  if (value.type === 'Expression') return chargeOf(value as ExpressionNode)
  if (value.type === 'Identifier') return [(value as IdentifierNode).token.value]
  return []
}

function bodyHead(expr: ExpressionNode): string | undefined {
  const inner = expr.body?.sequence.expressions[0]
  return inner ? subjectOf(inner) : undefined
}

describe('expression charge-sign', () => {
  it('keeps boon.honk on the noun expression', () => {
    const result = parseExpression('boon.honk home[hook]{orient}')
    const expr = asExpression(result.ast)

    expect(result.success).toBe(true)
    expect(result.completeness.complete).toBe(true)
    expect(proseCodes(result)).not.toContain('prose-degradation')
    expect(chargeOf(expr)).toEqual(['boon', 'honk'])
    expect(subjectOf(expr)).toBe('home')
    expect(modeOf(expr)).toEqual([])
    expect(expr.frame?.content[0]?.type).toBe('Parameter')
    expect(bodyHead(expr)).toBe('orient')
    expect(normalizeToONF(expr).frames.valence).toEqual(['boon', 'honk'])
  })

  it('parses a valence word in the subject seat as charge, not as the subject', () => {
    const result = parse('honk[signal]{resonance}')
    expect(result.success).toBe(true)
    expect(proseCodes(result)).not.toContain('prose-degradation')

    const sequence = result.ast?.expression as SequenceNode
    const expr = asExpression(sequence.expressions[0])
    expect(chargeOf(expr)).toEqual(['honk'])
    expect(expr.terms).toEqual([])
    expect(subjectOf(expr)).toBeUndefined()
    expect(bodyHead(expr)).toBe('resonance')
    const mode = expr.frame?.content[0] as ParameterNode
    const modeExpr = asExpression(mode.value as ExpressionNode)
    expect(subjectOf(modeExpr)).toBe('signal')
  })

  it('parses the five pair cards without dropping them to prose', () => {
    const cards = [
      ['boon[honk]{invite}', 'boon', 'honk', 'invite'],
      ['bane[bone]{limit}', 'bane', 'bone', 'limit'],
      ['bone[bonk]{hit}', 'bone', 'bonk', 'hit'],
      ['boon[bane]{cost}', 'boon', 'bane', 'cost'],
      ['honk[bonk]{signal}', 'honk', 'bonk', 'signal'],
    ] as const

    for (const [source, charge, mode, body] of cards) {
      const result = parseExpression(source)
      const expr = asExpression(result.ast)
      expect(result.success, source).toBe(true)
      expect(proseCodes(result), source).not.toContain('prose-degradation')
      expect(chargeOf(expr), source).toEqual([charge])
      expect(expr.terms, source).toEqual([])
      expect(modeOf(expr), source).toEqual([mode])
      expect(bodyHead(expr), source).toBe(body)
    }
  })

  it('keeps a charge-sign written in the body', () => {
    const result = parseExpression('home[hook]{boon.honk}')
    const expr = asExpression(result.ast)
    const inner = expr.body?.sequence.expressions[0]

    expect(result.success).toBe(true)
    expect(proseCodes(result)).not.toContain('prose-degradation')
    expect(subjectOf(expr)).toBe('home')
    expect(chargeOf(expr)).toEqual([])
    expect(chargeOf(inner)).toEqual(['boon', 'honk'])
    expect(inner?.terms).toEqual([])
  })

  it('still binds scope and capsule beside a charge-sign', () => {
    const result = parseExpression('boon.honk cycle[b]{receipt}(progress)<live>')
    const expr = asExpression(result.ast)

    expect(result.success).toBe(true)
    expect(proseCodes(result)).not.toContain('prose-degradation')
    expect(chargeOf(expr)).toEqual(['boon', 'honk'])
    expect(subjectOf(expr)).toBe('cycle')
    expect(expr.scope?.type).toBe('Scope')
    expect(expr.capsule?.type).toBe('Capsule')
    expect(expr.capsule?.tag?.value ?? (expr.capsule?.channel as IdentifierNode | undefined)?.token.value)
      .toBe('live')
  })

  it('does not pull the next line into the charge', () => {
    const result = parse('boon.honk\nhome[hook]{orient}')
    expect(result.success).toBe(true)
    expect(proseCodes(result)).not.toContain('prose-degradation')

    const sequence = result.ast?.expression as SequenceNode
    expect(sequence.expressions).toHaveLength(2)
    expect(chargeOf(sequence.expressions[0])).toEqual(['boon', 'honk'])
    expect(sequence.expressions[0]?.terms).toEqual([])
    expect(chargeOf(sequence.expressions[1])).toEqual([])
    expect(subjectOf(sequence.expressions[1]!)).toBe('home')
  })

  it('leaves operation prefixes and dotted property labels alone', () => {
    const legacy = parseExpression('boon!["x"]')
    const legacyOp = asExpression(legacy.ast).terms[0] as OperationNode
    expect(legacy.success).toBe(true)
    expect(legacyOp.type).toBe('Operation')
    expect(legacyOp.operator.value).toBe('!')
    expect(chargeOf(legacyOp)).toEqual(['boon'])

    const property = parseExpression('boon.home')
    const propertyOp = asExpression(property.ast).terms[0] as OperationNode
    expect(property.success).toBe(true)
    expect(propertyOp.operator.value).toBe('.')
    expect(propertyOp.operatorLabel?.value).toBe('home')
    expect(chargeOf(propertyOp)).toEqual(['boon'])

    const pairedAct = parseExpression('boon.honk!go')
    const pairedOp = asExpression(pairedAct.ast).terms[0] as OperationNode
    expect(pairedAct.success).toBe(true)
    expect(pairedOp.operator.value).toBe('!')
    expect(chargeOf(pairedOp)).toEqual(['boon', 'honk'])
    expect(pairedOp.operatorLabel?.value).toBe('go')
  })

  it('keeps a glued word an identifier and an interval out of this pass', () => {
    const glued = parseExpression('boonhonk')
    expect(glued.success).toBe(true)
    expect(subjectOf(asExpression(glued.ast))).toBe('boonhonk')
    expect(chargeOf(asExpression(glued.ast))).toEqual([])

    const interval = parseExpression('boon..honk')
    expect(interval.success).toBe(false)
    expect(proseCodes(interval)).toContain('prose-degradation')
    expect(interval.ast?.type).toBe('Prose')
  })

  it('normalizes a bare charge-sign without inventing a noun', () => {
    const expr = asExpression(parseExpression('boon.honk').ast)
    const onf = normalizeToONF(expr)
    expect(expr.terms).toEqual([])
    expect(onf.sigil).toBe('_')
    expect(onf.frames.reg).toBe('charge')
    expect(onf.frames.valence).toEqual(['boon', 'honk'])
    expect(onf.args).toEqual([])
  })
})

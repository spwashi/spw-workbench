import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import { parseExpression } from '../parser/parse-expression'
import type {
  CapsuleNode,
  ExpressionNode,
  IdentifierNode,
  OperationNode,
  SequenceNode,
} from '../types'

const SPECIMEN = 'surfaces[route]{path.role.archetype}<publish>'
const WITH_SCOPE = 'surfaces[route]{path.role.archetype}(hold)<publish>'

function asExpression(node: { type: string } | undefined): ExpressionNode {
  expect(node?.type).toBe('Expression')
  return node as ExpressionNode
}

function identifierValue(expr: ExpressionNode): string {
  expect(expr.terms).toHaveLength(1)
  expect(expr.terms[0]?.type).toBe('Identifier')
  return (expr.terms[0] as IdentifierNode).token.value
}

function seedSequence(source: string): SequenceNode {
  const result = parse(source)
  expect(result.success).toBe(true)
  expect(result.ast?.expression.type).toBe('Sequence')
  return result.ast!.expression as SequenceNode
}

describe('noun postfix containers', () => {
  it('binds frame, body, and shell capsule onto one identifier-led expression', () => {
    const result = parseExpression(SPECIMEN)
    const expr = asExpression(result.ast)

    expect(result.success).toBe(true)
    expect(result.completeness.complete).toBe(true)
    expect(result.completeness.remaining.text).toBe('')
    expect(identifierValue(expr)).toBe('surfaces')
    expect(expr.frame?.type).toBe('Frame')
    expect(expr.body?.type).toBe('Body')
    expect(expr.scope).toBeUndefined()
    expect(expr.capsule?.type).toBe('Capsule')
    expect(expr.capsule?.tag?.value ?? (expr.capsule?.channel as IdentifierNode | undefined)?.token.value)
      .toBe('publish')
  })

  it('binds a same-line scope among the other postfix containers', () => {
    const result = parseExpression(WITH_SCOPE)
    const expr = asExpression(result.ast)

    expect(result.success).toBe(true)
    expect(result.completeness.complete).toBe(true)
    expect(identifierValue(expr)).toBe('surfaces')
    expect(expr.frame?.type).toBe('Frame')
    expect(expr.body?.type).toBe('Body')
    expect(expr.scope?.type).toBe('Scope')
    expect(expr.capsule?.type).toBe('Capsule')
  })

  it('binds a scope-only postfix without inventing frame or body', () => {
    const result = parseExpression('surfaces(hold)')
    const expr = asExpression(result.ast)

    expect(result.success).toBe(true)
    expect(result.completeness.complete).toBe(true)
    expect(identifierValue(expr)).toBe('surfaces')
    expect(expr.frame).toBeUndefined()
    expect(expr.body).toBeUndefined()
    expect(expr.scope?.type).toBe('Scope')
    expect(expr.capsule).toBeUndefined()
  })

  it('keeps a newline frame as a sibling sequence step', () => {
    const seq = seedSequence('surfaces\n[route]')
    expect(seq.expressions).toHaveLength(2)
    expect(seq.expressions[0]?.frame).toBeUndefined()
    expect(seq.expressions[1]?.terms[0]?.type).toBe('Frame')
  })

  it('keeps a newline scope as a sibling sequence step', () => {
    const seq = seedSequence('surfaces\n(hold)')
    expect(seq.expressions).toHaveLength(2)
    expect(seq.expressions[0]?.scope).toBeUndefined()
    expect(seq.expressions[1]?.terms[0]?.type).toBe('Scope')
  })

  it('keeps juxtaposition and two-arm medial capsules unchanged', () => {
    expect(seedSequence('a b').expressions).toHaveLength(2)

    const medial = parseExpression('bagel<scent>coffee')
    const expr = asExpression(medial.ast)
    expect(expr.frame).toBeUndefined()
    expect(expr.scope).toBeUndefined()
    expect(expr.terms[0]?.type).toBe('Capsule')
    expect((expr.terms[0] as CapsuleNode).placement).toBe('medial')
  })

  it('leaves operator-owned frame and body on the operation', () => {
    const result = parseExpression('!go[x]{y}')
    const expr = asExpression(result.ast)
    expect(expr.frame).toBeUndefined()
    expect(expr.body).toBeUndefined()
    expect(expr.terms[0]?.type).toBe('Operation')
    const operation = expr.terms[0] as OperationNode
    expect(operation.frame?.type).toBe('Frame')
    expect(operation.body?.type).toBe('Body')
  })

  it('parses the specimen as one seed sequence step', () => {
    const seq = seedSequence(SPECIMEN)
    expect(seq.expressions).toHaveLength(1)
    expect(seq.expressions[0]?.frame?.type).toBe('Frame')
    expect(seq.expressions[0]?.body?.type).toBe('Body')
    expect(seq.expressions[0]?.capsule?.type).toBe('Capsule')
  })
})

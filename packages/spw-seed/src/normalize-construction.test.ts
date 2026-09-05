import { describe, expect, it } from 'vitest'
import { normalizeToONF } from './normalize'
import { projectONFForValue } from './normalize-construction'
import { parse } from './parser'
import { parseExpression } from './parser/parse-expression'
import type { ExpressionNode } from './types/ast'

const FULL = 'surfaces[route]{path.role.archetype}(hold)<publish>'
const ID = (value: string) => ({ sigil: '_', args: [], frames: { reg: 'id', value } })
function expression(source: string): ExpressionNode {
  const parsed = parseExpression(source)
  expect(parsed.success).toBe(true)
  expect(parsed.completeness.complete).toBe(true)
  expect(parsed.ast?.type).toBe('Expression')
  return parsed.ast as ExpressionNode
}
function normalize(source: string) {
  return normalizeToONF(expression(source))
}

describe('structural construction normalization', () => {
  it('keeps bare x in its original identifier form', () => {
    expect(normalize('x')).toEqual(ID('x'))
  })

  it('distinguishes heads with each requested attachment combination', () => {
    const sources = ['x', 'x[a]', 'x{b}', 'x[a]{b}', FULL]
    const forms = sources.map(normalize)
    expect(new Set(forms.map(form => JSON.stringify(form))).size).toBe(sources.length)
    expect(forms.slice(1).map(form => form.frames.reg)).toEqual(Array(4).fill('construction'))
    expect(forms.slice(1).map(form => form.args[0])).toEqual([ID('x'), ID('x'), ID('x'), ID('surfaces')])
    // Distinction is carried by attachments themselves, not just differing source spans.
    expect(forms.slice(1).map(form => form.args.slice(1).map(arg => (arg.frames.coupling as { kind: string }).kind)))
      .toEqual([['frame'], ['body'], ['frame', 'body'], ['frame', 'body', 'scope', 'capsule']])
  })

  it.each(['x[a]{b}', 'x{b}[a]', 'x(hold){b}[a]'])('uses source order rather than slot order: %s', source => {
    const ast = expression(source)
    const onf = normalizeToONF(ast)
    const attachments = onf.frames.construction!.attachments
    expect(attachments.map(a => source.slice(a.source.start.offset, a.source.end.offset)).join('')).toBe(source.slice(1))
    expect(onf.args.slice(1)).toEqual(attachments.map(a => normalizeToONF(ast[a.kind]!)))
  })

  it('retains provenance for the expression, head, and all four attachments', () => {
    const ast = expression(FULL)
    const onf = normalizeToONF(ast)
    const construction = onf.frames.construction!
    expect(construction.version).toBe('spw.onf.construction/1')
    expect(construction.source).toEqual(ast.span)
    expect(FULL.slice(construction.head.start.offset, construction.head.end.offset)).toBe('surfaces')
    expect(construction.attachments.map(a => FULL.slice(a.source.start.offset, a.source.end.offset)))
      .toEqual(['[route]', '{path.role.archetype}', '(hold)', '<publish>'])
    ast.frame!.span.start.offset = -1
    expect(construction.attachments[0]!.source.start.offset).toBe(8)
    expect(onf.args[4]!.frames).toMatchObject({ reg: 'capsule', tag: 'publish' })
  })

  it('retains nested construction structure and path references', () => {
    const onf = normalize('x{child[route]{~"./leaf.spw"}}')
    const child = onf.args[1]!.args[0]!
    expect(child.frames.reg).toBe('construction')
    expect(child.args[0]).toEqual(ID('child'))
    expect(child.args[2]!.args[0]!.frames.reg).toBe('pathref')
    expect(child.args[2]!.args[0]!.args[0]!.frames.value).toBe('"./leaf.spw"')
  })

  it.each(['x\n[a]', 'x\n{b}', 'x\n(hold)'])('keeps newline juxtaposition as sibling steps: %s', source => {
    const parsed = parse(source)
    expect(parsed.success).toBe(true)
    const onf = normalizeToONF(parsed.ast!)
    expect(onf.frames).toEqual({ reg: 'sequence' })
    expect(onf.args).toHaveLength(2)
    expect(onf.args[0]).toEqual(ID('x'))
    expect(onf.frames.construction).toBeUndefined()
  })

  it('keeps operator-owned attachments on the old operation path', () => {
    const onf = normalize('!go[x]{y}')
    expect(onf).toMatchObject({ sigil: '!', frames: { reg: 'hydrate', value: 'x', label: 'go' } })
    expect(onf.args[0]!.args).toEqual([ID('y')])
    expect(onf.frames.construction).toBeUndefined()
  })

  it('keeps the two-arm medial capsule distinct from a postfix construction', () => {
    const onf = normalize('bagel<scent>coffee')
    expect(onf).toMatchObject({ sigil: '<', args: [ID('bagel'), ID('coffee')], frames: { reg: 'composite', placement: 'medial', tag: 'scent' } })
    expect(onf.frames.construction).toBeUndefined()
  })
})

describe('explicit value projection', () => {
  it('discloses omitted subtrees without mutating structural ONF', () => {
    const onf = normalize('x[a]{=changed{1}}')
    const before = JSON.stringify(onf)
    const result = projectONFForValue(onf)
    expect(result.node).toEqual(ID('x'))
    expect(result.receipt).toMatchObject({ profile: 'spw.onf.value/1', omissions: [{ path: [], reason: 'postfix-attachments-not-evaluated' }] })
    expect(result.receipt.omissions[0]!.attachments).toEqual(onf.frames.construction!.attachments)
    expect(JSON.stringify(onf)).toBe(before)
    expect(projectONFForValue(result.node).receipt.omissions).toEqual([])
  })

  it('reports the original argument path for a nested construction', () => {
    const result = projectONFForValue(normalize('!go{x[a]{b}}'))
    expect(result.receipt.omissions.map(o => o.path)).toEqual([[0, 0]])
    expect(result.node.args[0]!.args).toEqual([ID('x')])
  })

  it('leaves existing ONF unchanged when no construction is present', () => {
    const onf = normalize('!go[x]{y}')
    const result = projectONFForValue(onf)
    expect(result.node).toBe(onf)
    expect(result.receipt.omissions).toEqual([])
  })
})

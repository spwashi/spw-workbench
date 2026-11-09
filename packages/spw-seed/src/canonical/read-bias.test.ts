import { describe, it, expect } from 'vitest'
import { parse, readBias, type ASTNode, type BiasEdge } from '@spwashi/spw-seed'

/** Find the first Operation node in a parse tree. */
function firstOp(source: string): ASTNode | null {
  const result = parse(source)
  const stack: ASTNode[] = result.ast ? [result.ast] : []
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.type === 'Operation') return node
    for (const key of Object.keys(node)) {
      if (key === 'span') continue
      const value = (node as unknown as Record<string, unknown>)[key]
      if (Array.isArray(value)) stack.push(...(value.filter((v) => v && typeof v === 'object') as ASTNode[]))
      else if (value && typeof value === 'object') stack.push(value as ASTNode)
    }
  }
  return null
}

function bias(source: string): BiasEdge | null {
  const op = firstOp(source)
  return op ? readBias(op) : null
}

describe('readBias', () => {
  it('reads a reflexive path edge (anchor elided → enclosing node)', () => {
    const edge = bias('={ ~"a/b.spw" }')
    expect(edge).not.toBeNull()
    expect(edge!.anchor).toBeUndefined()
    expect(edge!.axis).toBeUndefined()
    expect(edge!.targets).toEqual([{ value: 'a/b.spw', kind: 'path' }])
    expect(edge!.sign).toBe('forward')
  })

  it('binds an anchor from an operator-led subject (=@node / =~"path")', () => {
    const ref = bias('=@node{ ~"x" }')
    expect(ref!.anchor).toEqual({ value: 'node', kind: 'ref' })
    const path = bias('=~"a/b.spw"{ ~"c/d.spw" }')
    expect(path!.anchor).toEqual({ value: 'a/b.spw', kind: 'path' })
    expect(path!.targets).toEqual([{ value: 'c/d.spw', kind: 'path' }])
  })

  it('leaves a bare identifier as the operator label, not an anchor', () => {
    // `=ref`, `=workbench` etc. in canon must keep parsing as labeled edges.
    expect(bias('=ref{ ~"x" }')!.anchor).toBeUndefined()
  })

  it('reads the axis from a bare frame identifier', () => {
    const edge = bias('=[depth]{ deep }')
    expect(edge!.axis).toBe('depth')
    expect(edge!.targets).toEqual([{ value: 'deep', kind: 'name' }])
  })

  it('ranks a body sequence first-strongest', () => {
    const edge = bias('=[depth]{ deep shallow }')
    expect(edge!.targets.map((t) => t.value)).toEqual(['deep', 'shallow'])
  })

  it('signs direction by valence: bane → inverse', () => {
    const edge = bias('=bane{ ~"legacy" }')
    expect(edge!.sign).toBe('inverse')
    expect(edge!.valence).toContain('bane')
  })

  it('defaults sign to forward for boon and bare edges', () => {
    expect(bias('=boon{ x }')!.sign).toBe('forward')
    expect(bias('={ x }')!.sign).toBe('forward')
  })

  it('returns null for non-bias nodes', () => {
    expect(bias('.{ k: 1 }')).toBeNull()
    expect(bias('#[a b]')).toBeNull()
  })
})

/**
 * Medial / inline capsules: composite concepts and quantitative channels.
 *
 *   bagel<scent>coffee   qualitative relation
 *   foo<5>bar            quantitative channel
 *   <scent> / <5>        shell capsules
 *   ?(_lens @main)       probe over structured scope
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser'
import { normalizeToONF } from '../normalize'
import { previewAST } from '../instrumentation/preview'

function findCapsule(node: unknown): any | null {
  if (!node || typeof node !== 'object') return null
  const obj = node as Record<string, unknown>
  if (obj.type === 'Capsule') return node
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findCapsule(item)
        if (found) return found
      }
    } else if (value && typeof value === 'object') {
      const found = findCapsule(value)
      if (found) return found
    }
  }
  return null
}

describe('medial capsules', () => {
  it('parses qualitative bagel<scent>coffee as one medial capsule', () => {
    const { ast, errors } = parse('bagel<scent>coffee')
    expect(errors).toHaveLength(0)
    const cap = findCapsule(ast)
    expect(cap).toBeTruthy()
    expect(cap.placement).toBe('medial')
    expect(cap.tag?.value ?? cap.channel?.token?.value).toBe('scent')
    expect(cap.left?.type).toBe('Identifier')
    expect(cap.left?.token?.value).toBe('bagel')
    expect(cap.right?.type).toBe('Identifier')
    expect(cap.right?.token?.value).toBe('coffee')

    const onf = normalizeToONF(ast)
    // Walk to composite
    const json = JSON.stringify(onf)
    expect(json).toContain('scent')
    expect(json).toMatch(/composite|medial/)
  })

  it('parses quantitative foo<5>bar with number channel', () => {
    const { ast, errors } = parse('foo<5>bar')
    expect(errors).toHaveLength(0)
    const cap = findCapsule(ast)
    expect(cap).toBeTruthy()
    expect(cap.placement).toBe('medial')
    expect(cap.channel?.type).toBe('Literal')
    expect(cap.channel?.token?.value).toBe('5')
    expect(cap.left?.token?.value).toBe('foo')
    expect(cap.right?.token?.value).toBe('bar')

    const onf = normalizeToONF(cap)
    expect(onf.frames?.channel).toBe('5')
    expect(onf.frames?.channelKind).toBe('number')
    expect(onf.frames?.placement).toBe('medial')
    expect(onf.args?.length).toBe(2)
  })

  it('parses shell <5> without falling to prose', () => {
    const { ast, errors } = parse('<5>')
    expect(errors).toHaveLength(0)
    const cap = findCapsule(ast)
    expect(cap).toBeTruthy()
    expect(cap.placement).toBe('shell')
    expect(cap.channel?.token?.value).toBe('5')
    const onf = normalizeToONF(cap)
    expect(onf.frames?.channelKind).toBe('number')
  })

  it('parses shell <scent> with identifier channel', () => {
    const { ast, errors } = parse('<scent>')
    expect(errors).toHaveLength(0)
    const cap = findCapsule(ast)
    expect(cap.tag?.value).toBe('scent')
  })

  it('allows spaced medial arms', () => {
    const { ast, errors } = parse('bagel <scent> coffee')
    expect(errors).toHaveLength(0)
    const cap = findCapsule(ast)
    expect(cap?.placement).toBe('medial')
    expect(cap?.left?.token?.value).toBe('bagel')
    expect(cap?.right?.token?.value).toBe('coffee')
  })

  it('does not steal couple operator <>', () => {
    const { ast, errors } = parse('a<>b')
    expect(errors).toHaveLength(0)
    const json = JSON.stringify(normalizeToONF(ast))
    expect(json).toContain('couple')
    expect(findCapsule(ast)).toBeNull()
  })

  it('chains medial capsules a<r>b<s>c', () => {
    const { ast, errors } = parse('a<r>b<s>c')
    expect(errors).toHaveLength(0)
    const cap = findCapsule(ast)
    expect(cap?.placement).toBe('medial')
    // Outer channel is s; left is nested medial
    expect(cap?.tag?.value ?? cap?.channel?.token?.value).toBe('s')
    expect(cap?.right?.token?.value).toBe('c')
    expect(cap?.left?.type).toBe('Capsule')
  })
})

describe('probe over scope', () => {
  it('binds ?(_lens @main) as probe with Scope subject', () => {
    const { ast, errors } = parse('?(_lens @main)')
    expect(errors).toHaveLength(0)

    function findOp(node: unknown): any | null {
      if (!node || typeof node !== 'object') return null
      const obj = node as Record<string, unknown>
      if (obj.type === 'Operation' && (obj as any).operator?.value === '?') return node
      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            const f = findOp(item)
            if (f) return f
          }
        } else if (value && typeof value === 'object') {
          const f = findOp(value)
          if (f) return f
        }
      }
      return null
    }

    const op = findOp(ast)
    expect(op).toBeTruthy()
    expect(op.subject?.type).toBe('Scope')
    expect(op.linePayload).toBeUndefined()
  })
})

describe('preview medial', () => {
  it('renders bagel<scent>coffee', () => {
    const { ast } = parse('bagel<scent>coffee')
    const text = previewAST(ast as any)
    expect(text.replace(/\s+/g, '')).toContain('bagel<scent>coffee')
  })
})

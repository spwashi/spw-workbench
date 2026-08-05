import { describe, expect, it } from 'vitest'
import {
  buildChangeReport,
  compareAst,
  compareLex,
  formatChangeReportSpw,
} from './change-report'

describe('compareLex', () => {
  it('marks whitespace-only edits as triviaOnly', () => {
    const a = '^["x"]{ a }'
    const b = '^["x"]{  a  }'
    const lex = compareLex(a, b)
    expect(lex.triviaOnly).toBe(true)
    expect(lex.structuralOps).toBe(0)
  })

  it('counts structural insert when a new operator appears', () => {
    const a = '^["x"]{}'
    const b = '^["x"]{}\n![]'
    const lex = compareLex(a, b)
    expect(lex.triviaOnly).toBe(false)
    expect(lex.structuralOps).toBeGreaterThan(0)
    expect(lex.inserted).toBeGreaterThan(0)
  })
})

describe('compareAst', () => {
  it('path-matches when braces are unchanged', () => {
    const a = '^["x"]{ body }'
    const b = '^["x"]{  body  }'
    const ast = compareAst(a, b)
    expect(ast.braceEqual).toBe(true)
    expect(ast.pathMatch).toBe(true)
  })

  it('detects brace kind drift', () => {
    const a = '^["x"]{ body }'
    const b = '!["x"]{ body }'
    const ast = compareAst(a, b)
    // Different operator on frame may still share body braces — check findings exist
    expect(ast.findings.length).toBeGreaterThan(0)
  })
})

describe('buildChangeReport', () => {
  it('identity when sources equal', () => {
    const src = '~#goal(ship)\n'
    const r = buildChangeReport(src, src)
    expect(r.identity).toBe(true)
    expect(r.layoutOnly).toBe(false)
    expect(r.beforeHash).toBe(r.afterHash)
  })

  it('layoutOnly when only trivia moves and braces hold', () => {
    const before = '^["card"]{\n  ~#a: 1\n}\n'
    const after = '^["card"]{\n  ~#a: 1\n  \n}\n'
    const r = buildChangeReport(before, after, { uri: 'demo.spw' })
    expect(r.identity).toBe(false)
    expect(r.layoutOnly).toBe(true)
    expect(r.lex.triviaOnly).toBe(true)
    expect(r.ast.braceEqual).toBe(true)
    expect(r.editSpans).toBeGreaterThanOrEqual(1)
  })

  it('refuses layoutOnly when structure tokens change', () => {
    const before = '^["card"]{ ~#a: 1 }'
    const after = '^["card"]{ ~#a: 1 ; ~#b: 2 }'
    const r = buildChangeReport(before, after)
    expect(r.layoutOnly).toBe(false)
    expect(r.lex.structuralOps).toBeGreaterThan(0)
  })

  it('formats dual-read Spw card with nested groups', () => {
    const r = buildChangeReport('a', 'b')
    const card = formatChangeReportSpw(r)
    expect(card).toContain('^["delta"]{')
    expect(card).toContain('^["identity"]{')
    expect(card).toContain('^["lex"]{')
    expect(card).toContain('^["form"]{')
    expect(card).toContain('~#layoutOnly:')
    expect(card).toContain('~#ops:')
  })
})

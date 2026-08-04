import { describe, it, expect } from 'vitest'
import { parse } from './parse'

describe('parse dialect detection', () => {
  it('reports Spw.b by default', () => {
    const r = parse('^["x"]{ a: 1 }\n')
    expect(r.success).toBe(true)
    expect(r.dialect).toBe('Spw.b')
  })

  it('detects Spw.l and preprocesses newlines', () => {
    const r = parse('^seed[Q @profile:Spw.l]\na\nb\n')
    expect(r.dialect).toBe('Spw.l')
    expect(r.dialectPreprocessed).toBe(true)
  })

  it('emits machine lint warnings for Spw.m', () => {
    const r = parse('^seed[M @profile:Spw.m]\n^"old"{\n}\n')
    expect(r.dialect).toBe('Spw.m')
    expect(r.warnings.some(w => w.rule === 'dialect.machine_lint')).toBe(true)
  })

  it('respects autoDialect: false', () => {
    const r = parse('^seed[Q @profile:Spw.l]\n^["x"]{}\n', { autoDialect: false })
    expect(r.dialect).toBeUndefined()
    expect(r.dialectPreprocessed).toBeFalsy()
  })

  it('option dialect overrides header', () => {
    const r = parse('^seed[Q @profile:Spw.l]\n^["x"]{ a: 1 }\n', { dialect: 'Spw.b' })
    expect(r.dialect).toBe('Spw.b')
    expect(r.dialectSource).toBe('option')
  })
})

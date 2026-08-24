import { describe, it, expect } from 'vitest'
import {
  detectDialect,
  applyDialectPreprocess,
  resolveSurfaceProfile,
  detectReviewProfile,
  collectMachineLintWarnings,
} from './index'

describe('detectDialect', () => {
  it('defaults to Spw.b', () => {
    expect(detectDialect('^["x"]{ a: 1 }').id).toBe('Spw.b')
    expect(detectDialect('^["x"]{ a: 1 }').source).toBe('default')
  })

  it('reads @profile in seed head', () => {
    const src = '^seed[Demo v:1 @profile:Spw.l @intent:query]\n^["x"]{ a: 1 }\n'
    const d = detectDialect(src)
    expect(d.id).toBe('Spw.l')
    expect(d.source).toBe('header')
  })

  it('reads @dialect pragma', () => {
    const d = detectDialect('#:dialect Spw.f\n^["x"]{}\n')
    expect(d.id).toBe('Spw.f')
    expect(d.source).toBe('pragma')
  })

  it('reads @dialect:Spw.q', () => {
    expect(detectDialect('@dialect:Spw.q\nselect\n').id).toBe('Spw.q')
  })

  it('prefers @dialect over @profile', () => {
    const src = '@dialect:Spw.m\n^seed[X @profile:Spw.b]\n'
    expect(detectDialect(src).id).toBe('Spw.m')
  })

  it('does not treat indented examples as file pragmas', () => {
    const src = [
      '^seed[Examples @profile:Spw.b]',
      '^["example"]{',
      '  @dialect:Spw.l',
      '  #:dialect Spw.q',
      '  @profile:Spw.f',
      '}',
    ].join('\n')

    expect(detectDialect(src).id).toBe('Spw.b')
    expect(detectDialect(src).source).toBe('header')
  })

  it('ignores an indented dialect example without a seed header', () => {
    expect(detectDialect('example: |\n  @dialect:Spw.l\n').id).toBe('Spw.b')
  })
})

describe('applyDialectPreprocess', () => {
  it('collapses newlines for Spw.l', () => {
    const out = applyDialectPreprocess('a\nb\n\nc', 'Spw.l', true)
    expect(out.includes('\n\n')).toBe(false)
    expect(out.trim()).toBe('a b c')
  })

  it('leaves Spw.b unchanged', () => {
    const s = 'a\nb\n'
    expect(applyDialectPreprocess(s, 'Spw.b', false)).toBe(s)
  })
})

describe('resolveSurfaceProfile', () => {
  it('stacks path plan surface with Spw.p when no header', () => {
    const stack = resolveSurfaceProfile('^["intent"]{}', {
      path: '.agents/plans/foo/wip.spw',
    })
    expect(stack.dialect).toBe('Spw.p')
    expect(stack.review).toBe('plan_surface')
    expect(stack.metasyntax.planStream).toBe(true)
  })

  it('header dialect wins over path', () => {
    const stack = resolveSurfaceProfile('^seed[X @profile:Spw.m]\n', {
      path: '.agents/plans/foo/wip.spw',
    })
    expect(stack.dialect).toBe('Spw.m')
    expect(stack.metasyntax.machineLint).toBe(true)
  })

  it('enables flow glyphs for Spw.f', () => {
    const stack = resolveSurfaceProfile('@dialect:Spw.f\n', {})
    expect(stack.domain).toBe('flow')
    expect(stack.metasyntax.flowGlyphs).toBe(true)
  })
})

describe('detectReviewProfile', () => {
  it('classifies common paths', () => {
    expect(detectReviewProfile('.spw/index.spw')).toBe('canon_surface')
    expect(detectReviewProfile('docs/theory/spw/x.spw')).toBe('narrative_surface')
    expect(detectReviewProfile('packages/spw-seed/src/x.spw')).toBe('strict_surface')
  })
})

describe('collectMachineLintWarnings', () => {
  it('flags quoted frames', () => {
    const w = collectMachineLintWarnings('^"old"{\n}\n')
    expect(w.some(x => x.includes('quoted frame'))).toBe(true)
  })
})

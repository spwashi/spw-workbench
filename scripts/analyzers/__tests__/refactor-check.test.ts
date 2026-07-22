import { describe, expect, it } from 'vitest'
import { compareSourceProjections } from '../spw-refactor-check'

describe('Spw structural-projection verifier', () => {
  it('accepts spacing changes when the complete AST projection is unchanged', () => {
    const result = compareSourceProjections('{x}', '{ x }')
    expect(result.equivalent).toBe(true)
    expect(result.projection).toBe('ast-without-source-spans@1')
  })

  it('detects a boundary-kind change', () => {
    const result = compareSourceProjections('{x}', '[x]')
    expect(result.equivalent).toBe(false)
    expect(result.diffs[0]).toContain('mismatch')
  })

  it('refuses to certify two equally recovered inputs', () => {
    const result = compareSourceProjections('{', '{')

    expect(result.equivalent).toBe(false)
    expect(result.parseA.health).toBe('recovered')
    expect(result.parseB.health).toBe('recovered')
    expect(result.diffs).toEqual(expect.arrayContaining([
      expect.stringContaining('source A is not a complete structured parse (health=recovered'),
      expect.stringContaining('source B is not a complete structured parse (health=recovered'),
    ]))
  })

  it.each([
    '"unterminated',
    '`unterminated',
    '/* unterminated',
    '"odd\\' + '"',
  ])('refuses to certify identical invalid lexeme input %j', (source) => {
    const result = compareSourceProjections(source, source)

    expect(result.equivalent).toBe(false)
    expect(result.parseA).toMatchObject({
      health: 'invalid',
      topographyAuthority: 'seed_snapshot_topography',
      reasons: expect.arrayContaining(['unterminated_lexeme']),
    })
    expect(result.parseB.health).toBe('invalid')
  })
})

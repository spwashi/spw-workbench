import { describe, it, expect } from 'vitest'
import { tokenize } from '@spwashi/spw-seed'

function lex(source: string): string[] {
  const gen = tokenize(source)
  let result = gen.next()
  while (!result.done) result = gen.next()
  return result.value
    .filter((t) => t.type !== 'WHITESPACE' && t.type !== 'EOF')
    .map((t) => `${t.type}:${t.value}`)
}

describe('particle lexer — ⟨stance⟩#⟨aim⟩name', () => {
  it('lexes deixis (#>name) as one PARTICLE token', () => {
    expect(lex('#>spw_bias_product')).toEqual(['PARTICLE:#>spw_bias_product'])
  })

  it('lexes case (#:name) as one PARTICLE token, carrying the aim in kind', () => {
    const gen = tokenize('#:layer')
    let result = gen.next()
    while (!result.done) result = gen.next()
    const particle = result.value.find((t) => t.type === 'PARTICLE')
    expect(particle?.value).toBe('#:layer')
    expect(particle?.kind).toBe(':')
  })

  it('lexes the header stack: case + mood side by side', () => {
    expect(lex('#:layer #!pragmatics')).toEqual([
      'PARTICLE:#:layer',
      // mood still lexes via the operator path — untouched until its migration
      'OPERATOR:#',
      'OPERATOR:!',
      'IDENTIFIER:pragmatics',
    ])
  })

  it('leaves non-particle # forms exactly as before', () => {
    expect(lex('##x')).toEqual(['OPERATOR:#', 'OPERATOR:#', 'IDENTIFIER:x'])
    expect(lex('#[a]')).toEqual(['OPERATOR:#', 'CONTAINER_OPEN:[', 'IDENTIFIER:a', 'CONTAINER_CLOSE:]'])
    expect(lex('~#goal')).toEqual(['ANNOTATION:~#goal'])
  })

  it('requires a name — bare #> is not a particle', () => {
    expect(lex('#> x')).toEqual(['OPERATOR:#', 'CAPSULE_CLOSE:>', 'IDENTIFIER:x'])
  })

  it('never fires inside strings', () => {
    expect(lex('"has #>inside"')).toEqual(['STRING:"has #>inside"'])
  })
})

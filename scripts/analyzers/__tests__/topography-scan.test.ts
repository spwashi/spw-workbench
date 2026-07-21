import { describe, expect, it } from 'vitest'
import { snapshotTopography } from '@spwashi/spw-seed'
import { analyzeTopography } from '../spw-topography-scan'

function scan(source: string) {
  return analyzeTopography('memory.spw', 'memory.spw', source)
}

describe('operational topography scanner', () => {
  it('projects the authoritative Seed topography snapshot', () => {
    const source = '({[x]}) <>'
    const expected = snapshotTopography(source)
    const result = scan(source)

    expect(result).toMatchObject({
      parseHealth: expected.parseHealth,
      tokenCount: expected.tokenCount,
      significantTokens: expected.significantTokens,
      maxAstDepth: expected.maxAstDepth,
      maxPairedContainerDepth: expected.maxPairedContainerDepth,
      recognizedPairedContainers: expected.recognizedPairedContainers,
      explicitCoupleOperations: expected.explicitCoupleOperations,
      parseEvidence: {
        parserSuccess: expected.parserSuccess,
        proseFallback: expected.proseFallback,
        lexemesClosed: expected.lexemesClosed,
        reasons: expected.reasons,
        topographyAuthority: 'seed_snapshot_topography',
      },
    })
  })

  it('reports Seed AST depth and nested paired-container nodes', () => {
    const scope = scan('(x)')
    expect(scope.parseHealth).toBe('complete_structured')
    expect(scope.maxAstDepth).toBe(6)
    expect(scope.maxPairedContainerDepth).toBe(1)

    const nested = scan('({[x]})')
    expect(nested.maxPairedContainerDepth).toBe(3)
    expect(nested.recognizedPairedContainers).toMatchObject({
      scope: 1,
      frame: 1,
      body: 1,
    })
  })

  it('includes specialized parsed boundaries in coupling depth', () => {
    const result = scan('{<<((<x>))>>}')
    expect(result.maxPairedContainerDepth).toBe(4)
    expect(result.recognizedPairedContainers).toMatchObject({
      body: 1,
      capsule: 1,
      stream: 1,
      nrange: 1,
    })
  })

  it('reports prose fallback and recoverable lexer errors', () => {
    expect(scan('{').parseEvidence.reasons).toContain('prose_fallback')
    expect(scan('[x y]').parseHealth).toBe('recovered')
    expect(scan('§').parseEvidence.reasons).toEqual(['recoverable_errors', 'prose_fallback'])
  })

  it('does not mistake the explicit couple operator for an angle boundary', () => {
    const result = scan('<>["a","b"]')
    expect(result.parseHealth).toBe('complete_structured')
    expect(result.maxPairedContainerDepth).toBe(1)
    expect(result.recognizedPairedContainers).toMatchObject({ frame: 1, capsule: 0 })
    expect(result.explicitCoupleOperations).toBe(1)
  })

  it('uses odd/even backslash parity for quoted and phrase delimiters', () => {
    const evenQuote = '"abc\\\\' + '"'
    const oddQuote = '"abc\\' + '"'
    const evenPhrase = '`abc\\\\' + '`'
    const oddPhrase = '`abc\\' + '`'

    expect(scan(evenQuote).parseEvidence.lexemesClosed).toBe(true)
    expect(scan(evenPhrase).parseEvidence.lexemesClosed).toBe(true)
    expect(scan(oddQuote)).toMatchObject({
      parseHealth: 'invalid',
      parseEvidence: {
        lexemesClosed: false,
        reasons: expect.arrayContaining(['unterminated_lexeme']),
      },
    })
    expect(scan(oddPhrase)).toMatchObject({
      parseHealth: 'invalid',
      parseEvidence: { lexemesClosed: false },
    })
  })

  it.each(['"unterminated', '`unterminated', '/* unterminated'])(
    'rejects the unterminated lexeme %j',
    (source) => {
      const result = scan(source)
      expect(result.parseHealth).toBe('invalid')
      expect(result.parseEvidence.lexemesClosed).toBe(false)
      expect(result.parseEvidence.reasons).toContain('unterminated_lexeme')
    },
  )

  it.each(['{[}]', '{]', '{', '}', '[x}]'])(
    'does not report paired topography for crossed or unmatched source %s',
    (source) => {
      const result = scan(source)
      expect(result.parseHealth).not.toBe('complete_structured')
      expect(result.maxPairedContainerDepth).toBe(0)
      expect(result.recognizedPairedContainers).toEqual({
        scope: 0,
        frame: 0,
        body: 0,
        capsule: 0,
        stream: 0,
        nrange: 0,
      })
    },
  )
})

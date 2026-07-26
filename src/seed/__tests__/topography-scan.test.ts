import { describe, expect, it } from 'vitest'
import { analyzeTopography } from '../../../scripts/analyzers/spw-topography-scan'

function scan(source: string) {
  return analyzeTopography('memory.spw', 'memory.spw', source)
}

describe('operational topography scanner', () => {
  it('uses Seed AST depth and counts nested paired-container nodes', () => {
    const scope = scan('(x)')
    expect(scope.parseHealth).toBe('complete_structured')
    expect(scope.maxAstDepth).toBe(6)
    expect(scope.maxPairedContainerDepth).toBe(1)

    const nested = scan('({[x]})')
    expect(nested.maxPairedContainerDepth).toBe(3)
    expect(nested.recognizedPairedContainers).toMatchObject({ scope: 1, frame: 1, body: 1 })
  })

  it('includes specialized parsed boundaries in coupling depth', () => {
    const result = scan('{<<((<x>))>>}')
    expect(result.maxPairedContainerDepth).toBe(4)
    expect(result.recognizedPairedContainers).toMatchObject({ body: 1, capsule: 1, stream: 1, nrange: 1 })
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

  it('rejects lexemes that Seed currently accepts at EOF without a diagnostic', () => {
    for (const source of ['"unterminated', '`unterminated']) {
      const result = scan(source)
      expect(result.parseHealth).toBe('invalid')
      expect(result.parseEvidence.lexemesClosed).toBe(false)
      expect(result.parseEvidence.reasons).toContain('unterminated_lexeme')
    }
  })
})

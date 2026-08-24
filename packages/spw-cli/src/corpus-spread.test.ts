import { describe, expect, it } from 'vitest'
import {
  indexDepthForSpread,
  parseCorpusSpread,
  readCorpusSpreadArgument,
} from './corpus-spread'

describe('corpus spread arguments', () => {
  it.each([
    [['--spread', 'near'], 'near', 'minimal', 1, '--spread'],
    [['--spread=far'], 'far', 'full', 0, '--spread'],
    [['--depth', 'standard'], 'standard', 'standard', 1, '--depth'],
    [['--depth=minimal'], 'near', 'minimal', 0, '--depth'],
  ] as const)('reads lyrical and compatibility spellings', (argv, spread, indexDepth, nextIndex, spelling) => {
    expect(readCorpusSpreadArgument(argv, 0, 'census')).toEqual({
      spread,
      indexDepth,
      nextIndex,
      spelling,
    })
  })

  it('maps the public spread vocabulary to the current index profiles', () => {
    expect(indexDepthForSpread('near')).toBe('minimal')
    expect(indexDepthForSpread('standard')).toBe('standard')
    expect(indexDepthForSpread('far')).toBe('full')
  })

  it('leaves unrelated arguments to the command parser', () => {
    expect(readCorpusSpreadArgument(['--limit', '2'], 0, 'census')).toBeUndefined()
  })

  it.each([undefined, '', 'minimal', 'deep', 'STANDARD'])('rejects an invalid spread instead of silently choosing standard', value => {
    expect(() => parseCorpusSpread(value, 'graph')).toThrow('spw graph: --spread must be near|standard|far')
  })

  it('keeps the compatibility alias strict', () => {
    expect(() => readCorpusSpreadArgument(['--depth', 'deep'], 0, 'graph')).toThrow(
      'spw graph: --depth must be minimal|standard|full',
    )
  })
})

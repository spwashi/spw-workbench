import { describe, expect, it } from 'vitest'
import { RegisterBank } from '../state/register-bank'

describe('RegisterBank', () => {
  it('yanks into active, default, and history registers', () => {
    const bank = new RegisterBank()

    bank.setActive('a')
    bank.yank('boon')

    expect(bank.paste('a')).toBe('boon')
    expect(bank.paste('"')).toBe('boon')
    expect(bank.paste('0')).toBe('boon')
  })

  it('indexes resonate writes by lens and allows updates', () => {
    const bank = new RegisterBank()

    expect(bank.resonate('sig', 'first', 'cache.render')).toBe(true)
    expect(bank.resonate('sig', 'second', 'cache.render')).toBe(true)
    expect(bank.paste('sig')).toBe('second')
    expect(bank.keysForLens('cache.render')).toContain('sig')
    expect(bank.materialize('sig')?.lenses).toContain('cache.render')
  })

  it('normalizes measure output into [0,1]', () => {
    const bank = new RegisterBank()

    bank.set('measure', [1, 2, 3], { source: 'test' })
    expect(bank.measure('measure', 3)).toBe(1)
    expect(bank.measure('measure', 30)).toBeCloseTo(0.1)
  })

  describe('phase enrichment', () => {
    it('enrichPhase progressively enriches a cell lex → parse → sem', () => {
      const bank = new RegisterBank()
      bank.set('token', 'hello', { source: 'lexer', phase: 'lex' })

      expect(bank.phaseOf('token')).toBe('lex')

      bank.enrichPhase('token', 'parse', 'parser')
      expect(bank.phaseOf('token')).toBe('parse')

      bank.enrichPhase('token', 'sem', 'analyzer')
      expect(bank.phaseOf('token')).toBe('sem')

      // Value unchanged through enrichment
      expect(bank.get('token')).toBe('hello')
    })

    it('set() with phase option creates initial phase envelope', () => {
      const bank = new RegisterBank()
      bank.set('node', { type: 'Expression' }, { source: 'parser', phase: 'parse' })

      expect(bank.phaseOf('node')).toBe('parse')
      const meta = bank.materialize('node')
      expect(meta?.phases?.facets).toHaveLength(1)
      expect(meta?.phases?.facets[0].phase).toBe('parse')
      expect(meta?.phases?.facets[0].source).toBe('parser')
    })

    it('phaseOf returns undefined for unphased cells', () => {
      const bank = new RegisterBank()
      bank.set('legacy', 42, { source: 'old' })

      expect(bank.phaseOf('legacy')).toBeUndefined()
    })

    it('memoryWeight increases with phase progression', () => {
      const bank = new RegisterBank()
      bank.set('cell', 'data', { source: 'init', phase: 'lex' })
      bank.enrichPhase('cell', 'parse')
      bank.enrichPhase('cell', 'sem')

      const meta = bank.materialize('cell')
      const weights = meta?.phases?.facets.map(f => f.memoryWeight) ?? []
      expect(weights).toHaveLength(3)
      // lex < parse < sem
      expect(weights[0]).toBeLessThan(weights[1]!)
      expect(weights[1]).toBeLessThan(weights[2]!)
      // Exact values: lex=0.2, parse=0.4, sem=0.6
      expect(weights[0]).toBeCloseTo(0.2)
      expect(weights[1]).toBeCloseTo(0.4)
      expect(weights[2]).toBeCloseTo(0.6)
    })

    it('snapshot preserves phase envelope immutably', () => {
      const bank = new RegisterBank()
      bank.set('phased', 'value', { source: 'test', phase: 'lex' })
      bank.enrichPhase('phased', 'parse')

      const snap = bank.snapshot()
      const entry = snap.entries['phased']
      expect(entry.meta.phases?.current).toBe('parse')
      expect(entry.meta.phases?.facets).toHaveLength(2)

      // Mutating snapshot shouldn't affect bank
      entry.meta.phases!.facets.push({ phase: 'sem', enrichedAt: 'fake' })
      expect(bank.materialize('phased')?.phases?.facets).toHaveLength(2)
    })
  })
})

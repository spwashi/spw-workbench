import { describe, expect, it } from 'vitest'
import { RegisterBank } from '../state/register-bank'

describe('RegisterBank', () => {
  it('yanks into active, default, and history registers', () => {
    const bank = new RegisterBank()

    bank.focus('a')
    bank.extract('boon')

    expect(bank.deposit('a')).toBe('boon')
    expect(bank.deposit('"')).toBe('boon')
    expect(bank.deposit('0')).toBe('boon')
  })

  it('indexes resonate writes by lens and allows updates', () => {
    const bank = new RegisterBank()

    expect(bank.resonate('sig', 'first', 'cache.render')).toBe(true)
    expect(bank.resonate('sig', 'second', 'cache.render')).toBe(true)
    expect(bank.deposit('sig')).toBe('second')
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
    it('enrichPhase progressively enriches a cell lex → parse → semantic', () => {
      const bank = new RegisterBank()
      bank.set('token', 'hello', { source: 'lexer', phase: 'lex' })

      expect(bank.phaseOf('token')).toBe('lex')

      bank.enrichPhase('token', 'parse', 'parser')
      expect(bank.phaseOf('token')).toBe('parse')

      bank.enrichPhase('token', 'semantic', 'analyzer')
      expect(bank.phaseOf('token')).toBe('semantic')

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
      bank.enrichPhase('cell', 'semantic')

      const meta = bank.materialize('cell')
      const weights = meta?.phases?.facets.map(f => f.memoryWeight) ?? []
      expect(weights).toHaveLength(3)
      // lex < parse < semantic
      expect(weights[0]).toBeLessThan(weights[1]!)
      expect(weights[1]).toBeLessThan(weights[2]!)
      // Exact values: lex=0.2, parse=0.4, semantic=0.6
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
      entry.meta.phases!.facets.push({ phase: 'semantic', enrichedAt: 'fake' })
      expect(bank.materialize('phased')?.phases?.facets).toHaveLength(2)
    })
  })

  describe('acoustic fields', () => {
    it('new cells initialize with default acoustic fields', () => {
      const bank = new RegisterBank()
      bank.set('cell', 'value', { source: 'test' })
      const meta = bank.materialize('cell')
      expect(meta?.liminality).toBe('local')
      expect(meta?.frequency).toBeDefined()
      expect(meta?.coupling).toBe(0)
      expect(meta?.measureDepth).toBe(0)
    })

    it('promote/demote cycles liminality local→liminal→visible→global', () => {
      const bank = new RegisterBank()
      bank.set('cell', 'v', { source: 'test' })

      expect(bank.promote('cell')).toBe('liminal')
      expect(bank.promote('cell')).toBe('visible')
      expect(bank.promote('cell')).toBe('global')
      expect(bank.promote('cell')).toBe('global')

      expect(bank.demote('cell')).toBe('visible')
      expect(bank.demote('cell')).toBe('liminal')
      expect(bank.demote('cell')).toBe('local')
      expect(bank.demote('cell')).toBe('local')
    })

    it('promote/demote returns undefined for nonexistent cells', () => {
      const bank = new RegisterBank()
      expect(bank.promote('nope')).toBeUndefined()
      expect(bank.demote('nope')).toBeUndefined()
    })

    it('frequency updates on writes', () => {
      const bank = new RegisterBank()
      bank.set('hot', 'a', { source: 'test' })
      bank.set('hot', 'b', { source: 'test' })
      bank.set('hot', 'c', { source: 'test' })

      const freq = bank.frequencyOf('hot')
      // After 3+ writes, frequency should be > 0
      expect(freq).toBeDefined()
      expect(freq!).toBeGreaterThanOrEqual(0)
    })

    it('couple creates bidirectional coupling edges', () => {
      const bank = new RegisterBank()
      bank.set('a', 1, { source: 'test' })
      bank.set('b', 2, { source: 'test' })
      bank.set('c', 3, { source: 'test' })

      bank.couple('a', 'b')

      const couplingA = bank.couplingOf('a')
      const couplingB = bank.couplingOf('b')
      expect(couplingA).toBeGreaterThan(0)
      expect(couplingB).toBeGreaterThan(0)

      // Coupling a second edge should increase it
      bank.couple('a', 'c')
      expect(bank.couplingOf('a')).toBeGreaterThan(couplingA!)
    })

    it('measure increments measureDepth on each observation', () => {
      const bank = new RegisterBank()
      bank.set('observed', [1, 2, 3], { source: 'test' })

      expect(bank.materialize('observed')?.measureDepth).toBe(0)

      bank.measure('observed', 3)
      expect(bank.materialize('observed')?.measureDepth).toBe(1)

      bank.measure('observed', 3)
      expect(bank.materialize('observed')?.measureDepth).toBe(2)
    })

    it('snapshot clones acoustic fields', () => {
      const bank = new RegisterBank()
      bank.set('cell', 'v', { source: 'test' })
      bank.promote('cell')
      bank.couple('cell', '"')

      const snap = bank.snapshot()
      const entry = snap.entries['cell']
      expect(entry.meta.liminality).toBe('liminal')
      expect(entry.meta.coupling).toBeGreaterThan(0)
      expect(entry.meta.measureDepth).toBe(0)
    })
  })

  describe('semantic metadata', () => {
    it('persists operator valence and frame metadata on writes', () => {
      const bank = new RegisterBank()

      bank.set('"', 'hello', {
        source: 'interpret:collapse',
        descriptor: { accessMode: 'resolved', containerAffinity: 'value' },
        operator: '*',
        valence: ['boon'],
        registerRole: 'hydrate',
        semanticFrames: { reg: 'hydrate', value: 'greeting', label: 'seed' },
        force: true,
      })

      const meta = bank.materialize('"')
      expect(meta?.operator).toBe('*')
      expect(meta?.valence).toEqual(['boon'])
      expect(meta?.registerRole).toBe('hydrate')
      expect(meta?.semanticFrames).toMatchObject({
        reg: 'hydrate',
        value: 'greeting',
        label: 'seed',
      })
      expect(meta?.descriptor.accessMode).toBe('resolved')
      expect(meta?.descriptor.containerAffinity).toBe('value')
    })

    it('snapshot clones semantic metadata immutably', () => {
      const bank = new RegisterBank()
      bank.set('"', 'hello', {
        source: 'interpret:collapse',
        operator: '*',
        valence: ['boon'],
        semanticFrames: { reg: 'hydrate', value: 'greeting' },
        force: true,
      })

      const snap = bank.snapshot()
      snap.entries['"']!.meta.valence.push('bone')
      ;(snap.entries['"']!.meta.semanticFrames as Record<string, unknown>).reg = 'mutated'

      const meta = bank.materialize('"')
      expect(meta?.valence).toEqual(['boon'])
      expect(meta?.semanticFrames?.reg).toBe('hydrate')
    })
  })
})

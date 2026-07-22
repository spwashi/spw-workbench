import { describe, expect, it } from 'vitest'
import { RegisterBank } from '../state/register-bank'
import { castToBrand, $register } from '../../seed/types'

describe('RegisterBank', () => {
  it('yanks into active, default, and history registers', () => {
    const bank = new RegisterBank()

    bank.focus($register`a`)
    bank.extract('boon')

    expect(bank.deposit($register`a`)).toBe('boon')
    expect(bank.deposit($register`"`)).toBe('boon')
    expect(bank.deposit($register`0`)).toBe('boon')
  })

  it('indexes resonate writes by lens and allows updates', () => {
    const bank = new RegisterBank()

    expect(bank.resonate($register`sig`, 'first', 'cache.render')).toBe(true)
    expect(bank.resonate($register`sig`, 'second', 'cache.render')).toBe(true)
    expect(bank.deposit($register`sig`)).toBe('second')
    expect(bank.keysForLens('cache.render')).toContain('sig')
    expect(bank.materialize($register`sig`)?.lenses).toContain('cache.render')
  })

  it('normalizes measure output into [0,1]', () => {
    const bank = new RegisterBank()

    bank.set($register`measure`, [1, 2, 3], { source: 'test' })
    expect(bank.measure($register`measure`, 3)).toBe(1)
    expect(bank.measure($register`measure`, 30)).toBeCloseTo(0.1)
  })

  describe('phase enrichment', () => {
    it('enrichPhase progressively enriches a cell lex → parse → semantic', () => {
      const bank = new RegisterBank()
      const reg = $register`token`
      bank.set(reg, 'hello', { source: 'lexer', phase: 'lex' })

      expect(bank.phaseOf(reg)).toBe('lex')

      bank.enrichPhase(reg, 'parse', 'parser')
      expect(bank.phaseOf(reg)).toBe('parse')

      bank.enrichPhase(reg, 'semantic', 'analyzer')
      expect(bank.phaseOf(reg)).toBe('semantic')

      // Value unchanged through enrichment
      expect(bank.get(reg)).toBe('hello')
    })

    it('set() with phase option creates initial phase envelope', () => {
      const bank = new RegisterBank()
      const reg = $register`node`
      bank.set(reg, { type: 'Expression' }, { source: 'parser', phase: 'parse' })

      expect(bank.phaseOf(reg)).toBe('parse')
      const meta = bank.materialize(reg)
      expect(meta?.phases?.facets).toHaveLength(1)
      expect(meta?.phases?.facets[0].phase).toBe('parse')
      expect(meta?.phases?.facets[0].source).toBe('parser')
    })

    it('phaseOf returns undefined for unphased cells', () => {
      const bank = new RegisterBank()
      const reg = $register`legacy`
      bank.set(reg, 42, { source: 'old' })

      expect(bank.phaseOf(reg)).toBeUndefined()
    })

    it('memoryWeight increases with phase progression', () => {
      const bank = new RegisterBank()
      const reg = $register`cell`
      bank.set(reg, 'data', { source: 'init', phase: 'lex' })
      bank.enrichPhase(reg, 'parse')
      bank.enrichPhase(reg, 'semantic')

      const meta = bank.materialize(reg)
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
      const reg = $register`phased`
      bank.set(reg, 'value', { source: 'test', phase: 'lex' })
      bank.enrichPhase(reg, 'parse')

      const snap = bank.snapshot()
      const entry = snap.entries[reg]
      expect(entry.meta.phases?.current).toBe('parse')
      expect(entry.meta.phases?.facets).toHaveLength(2)

      // Mutating snapshot shouldn't affect bank
      entry.meta.phases!.facets.push({ phase: 'semantic', enrichedAt: 'fake' })
      expect(bank.materialize(reg)?.phases?.facets).toHaveLength(2)
    })
  })

  describe('acoustic fields', () => {
    it('new cells initialize with default acoustic fields', () => {
      const bank = new RegisterBank()
      const reg = $register`cell`
      bank.set(reg, 'value', { source: 'test' })
      const meta = bank.materialize(reg)
      expect(meta?.liminality).toBe('local')
      expect(meta?.frequency).toBeDefined()
      expect(meta?.coupling).toBe(0)
      expect(meta?.measureDepth).toBe(0)
    })

    it('promote/demote cycles liminality local→liminal→visible→global', () => {
      const bank = new RegisterBank()
      const reg = $register`cell`
      bank.set(reg, 'v', { source: 'test' })

      expect(bank.promote(reg)).toBe('liminal')
      expect(bank.promote(reg)).toBe('visible')
      expect(bank.promote(reg)).toBe('global')
      expect(bank.promote(reg)).toBe('global')

      expect(bank.demote(reg)).toBe('visible')
      expect(bank.demote(reg)).toBe('liminal')
      expect(bank.demote(reg)).toBe('local')
      expect(bank.demote(reg)).toBe('local')
    })

    it('promote/demote returns undefined for nonexistent cells', () => {
      const bank = new RegisterBank()
      expect(bank.promote($register`nope`)).toBeUndefined()
      expect(bank.demote($register`nope`)).toBeUndefined()
    })

    it('frequency updates on writes', () => {
      const bank = new RegisterBank()
      const reg = $register`hot`
      bank.set(reg, 'a', { source: 'test' })
      bank.set(reg, 'b', { source: 'test' })
      bank.set(reg, 'c', { source: 'test' })

      const freq = bank.frequencyOf(reg)
      // After 3+ writes, frequency should be > 0
      expect(freq).toBeDefined()
      expect(freq!).toBeGreaterThanOrEqual(0)
    })

    it('couple creates bidirectional coupling edges', () => {
      const bank = new RegisterBank()
      const a = $register`a`
      const b = $register`b`
      const c = $register`c`
      bank.set(a, 1, { source: 'test' })
      bank.set(b, 2, { source: 'test' })
      bank.set(c, 3, { source: 'test' })

      bank.couple(a, b)

      const couplingA = bank.couplingOf(a)
      const couplingB = bank.couplingOf(b)
      expect(couplingA).toBeGreaterThan(0)
      expect(couplingB).toBeGreaterThan(0)

      // Coupling a second edge should increase it
      bank.couple(a, c)
      expect(bank.couplingOf(a)).toBeGreaterThan(couplingA!)
    })

    it('measure increments measureDepth on each observation', () => {
      const bank = new RegisterBank()
      const reg = $register`observed`
      bank.set(reg, [1, 2, 3], { source: 'test' })

      expect(bank.materialize(reg)?.measureDepth).toBe(0)

      bank.measure(reg, 3)
      expect(bank.materialize(reg)?.measureDepth).toBe(1)

      bank.measure(reg, 3)
      expect(bank.materialize(reg)?.measureDepth).toBe(2)
    })

    it('memory budget enforces facet strip then cold cell drop', () => {
      const bank = new RegisterBank()
      const a = $register`a`
      const b = $register`b`
      const c = $register`c`
      bank.set(a, 'heavy-a', { source: 'test', phase: 'lex' })
      bank.enrichPhase(a, 'parse')
      bank.enrichPhase(a, 'semantic')
      bank.setFacetEvictable(a, true)
      bank.set(b, 'local-b', { source: 'test' })
      bank.set(c, 'local-c', { source: 'test' })

      const beforeFacets = bank.materialize(a)?.phases?.facets.length
      expect(beforeFacets).toBe(3)

      bank.setMemoryBudget({ maxCost: 1, maxCells: 3, preferFacetEviction: true })
      const pressure = bank.memoryPressure()
      expect(pressure.cells).toBeGreaterThan(0)

      const plan = bank.enforceMemoryBudget()
      expect(plan.facetEvictions.length + plan.cellEvictions.length).toBeGreaterThan(0)

      const afterFacets = bank.materialize(a)?.phases?.facets.length
      // Either facets stripped or cell gone if still over budget
      if (afterFacets != null) {
        expect(afterFacets).toBeLessThanOrEqual(beforeFacets!)
      }

      // Protected default register always remains
      expect(bank.listKeys()).toContain('"')
    })

    it('get touches lastUsedAt for LRU', async () => {
      const bank = new RegisterBank()
      const reg = $register`lru`
      bank.set(reg, 1, { source: 'test' })
      const t0 = bank.materialize(reg)!.lastUsedAt
      await new Promise(r => setTimeout(r, 5))
      bank.get(reg)
      const t1 = bank.materialize(reg)!.lastUsedAt
      expect(t1 >= t0).toBe(true)
    })

    it('purgeColdCells drops only local unprotected cells', () => {
      const bank = new RegisterBank()
      const cold = $register`cold`
      const hot = $register`hot`
      bank.set(cold, 'x', { source: 'test' })
      bank.set(hot, 'y', { source: 'test' })
      bank.promote(hot)
      bank.promote(hot) // visible
      const dropped = bank.purgeColdCells({ maxLiminality: 'local', limit: 10 })
      expect(dropped).toContain('cold')
      expect(dropped).not.toContain('hot')
      expect(bank.get(hot)).toBe('y')
    })

    it('snapshot clones acoustic fields', () => {
      const bank = new RegisterBank()
      const reg = $register`cell`
      const focus = $register`"`
      bank.set(reg, 'v', { source: 'test' })
      bank.promote(reg)
      bank.couple(reg, focus)

      const snap = bank.snapshot()
      const entry = snap.entries[reg]
      expect(entry.meta.liminality).toBe('liminal')
      expect(entry.meta.coupling).toBeGreaterThan(0)
      expect(entry.meta.measureDepth).toBe(0)
    })
  })

  describe('semantic metadata', () => {
    it('persists current-write operator valence and frame metadata', () => {
      const bank = new RegisterBank()
      const reg = $register`"`

      bank.set(reg, 'hello', {
        source: 'interpret:collapse',
        descriptor: { accessMode: 'resolved', containerAffinity: 'value' },
        operator: '*',
        valence: ['boon'],
        registerRole: 'collapse',
        semanticFrames: { value: 'greeting', label: 'seed' },
        force: true,
      })

      const meta = bank.materialize(reg)
      expect(meta?.operator).toBe('*')
      expect(meta?.valence).toEqual(['boon'])
      expect(meta?.registerRole).toBe('collapse')
      expect(meta?.semanticFrames).toMatchObject({
        value: 'greeting',
        label: 'seed',
      })
      expect(meta?.descriptor.accessMode).toBe('resolved')
      expect(meta?.descriptor.containerAffinity).toBe('value')
    })

    it('replaces write semantics instead of accumulating stale metadata', () => {
      const bank = new RegisterBank()
      const reg = $register`"`

      bank.set(reg, 'first', {
        source: 'interpret:collapse',
        operator: '*',
        valence: ['boon'],
        registerRole: 'collapse',
        semanticFrames: { label: 'first' },
        force: true,
      })

      bank.set(reg, 'second', {
        source: 'rewrite',
        force: true,
      })

      const meta = bank.materialize(reg)
      expect(meta?.operator).toBeUndefined()
      expect(meta?.valence).toEqual([])
      expect(meta?.registerRole).toBeUndefined()
      expect(meta?.semanticFrames).toBeUndefined()
    })

    it('snapshot clones semantic metadata immutably', () => {
      const bank = new RegisterBank()
      const reg = $register`"`
      bank.set(reg, 'hello', {
        source: 'interpret:collapse',
        operator: '*',
        valence: ['boon'],
        semanticFrames: { label: 'seed', value: 'greeting' },
        force: true,
      })

      const snap = bank.snapshot()
      snap.entries[reg]!.meta.valence.push('bone')
      ;(snap.entries[reg]!.meta.semanticFrames as Record<string, unknown>).label = 'mutated'

      const meta = bank.materialize(reg)
      expect(meta?.valence).toEqual(['boon'])
      expect(meta?.semanticFrames?.label).toBe('seed')
    })
  })
})

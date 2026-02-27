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
})

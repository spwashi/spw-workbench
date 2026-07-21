import { describe, expect, it } from 'vitest'
import { decidePulseWriteStatus } from '../../packages/spw-cli/src/pulse'

const safe = {
  requested: true,
  changed: true,
  healthRegressed: false,
  structureMoved: false,
  layoutOnlyProfile: true,
  conflicts: 0,
  sourceUnchanged: true,
}

describe('pulse write preconditions', () => {
  it('permits an exact, structure-stable planned write', () => {
    expect(decidePulseWriteStatus(safe)).toBe('written')
  })

  it('fails closed on health, structure, transform, and revision hazards', () => {
    expect(decidePulseWriteStatus({ ...safe, healthRegressed: true })).toBe('blocked_health_regression')
    expect(decidePulseWriteStatus({ ...safe, structureMoved: true })).toBe('blocked_structure_regression')
    expect(decidePulseWriteStatus({ ...safe, conflicts: 1 })).toBe('blocked_conflict')
    expect(decidePulseWriteStatus({ ...safe, sourceUnchanged: false })).toBe('blocked_stale_source')
  })
})

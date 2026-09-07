import { describe, expect, it } from 'vitest'
import { scanMalformedAxes } from './annotation-lint'

describe('scanMalformedAxes', () => {
  it('flags an axis whose value dropped the mood sigil', () => {
    const findings = scanMalformedAxes('#:operation contract\n')
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      kind: 'malformed-axis',
      axis: 'operation',
      value: 'contract',
      expected: '#!contract',
      line: 1,
    })
  })

  it('accepts the well-formed twin', () => {
    expect(scanMalformedAxes('#:operation #!contract\n#:fixity #!tending\n')).toEqual([])
  })
})

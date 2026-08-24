import { describe, expect, it } from 'vitest'
import { parseInspectArgs } from './inspect-args'

describe('inspect arguments', () => {
  it('separates source work, retention, and display handles', () => {
    const args = parseInspectArgs([
      'inspect',
      'source',
      'example.spw',
      '--through',
      'tokens',
      '--events=none',
      '--sample',
      '7',
    ])

    expect(args).toMatchObject({
      mode: 'source',
      targets: ['example.spw'],
      through: 'tokens',
      events: 'none',
      limit: 7,
    })
  })

  it('keeps the prior option names as compatibility aliases', () => {
    const args = parseInspectArgs([
      'source',
      'example.spw',
      '--product=trace',
      '--event-policy',
      'trace',
      '--limit=3',
    ])

    expect(args.through).toBe('trace')
    expect(args.events).toBe('trace')
    expect(args.limit).toBe(3)
  })

  it('preserves bare-file static inspection', () => {
    const args = parseInspectArgs(['example.spw'])

    expect(args.mode).toBe('static')
    expect(args.targets).toEqual(['example.spw'])
  })

  it.each([
    [['spacing', 'example.spw', '--through', 'tokens'], '--through is available for inspect source'],
    [['cache', 'example.spw', '--events', 'none'], '--events is available for inspect source or inspect spacing'],
    [['corpus', '--sample', '4'], '--sample is available for inspect source or inspect spacing'],
  ])('rejects a handle outside its meaningful plane', (argv, message) => {
    expect(() => parseInspectArgs(argv)).toThrow(message)
  })

  it.each([
    [['source', 'example.spw', '--through', 'ast'], '--through must be tokens|structure|trace'],
    [['source', 'example.spw', '--events=all'], '--events must be none|diagnostics|trace'],
    [['spacing', 'example.spw', '--sample', '0'], '--sample must be a positive integer'],
  ])('rejects malformed handle values', (argv, message) => {
    expect(() => parseInspectArgs(argv)).toThrow(message)
  })
})

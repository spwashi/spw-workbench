import { describe, it, expect } from 'vitest'
import { ServerIndex } from '../server-index'

describe('ServerIndex semantic context', () => {
  it('records nested frame paths on extracted annotations', () => {
    const index = new ServerIndex('/workspace')
    const text = [
      '#>spw_workspace',
      '#:layer #!pragmatics',
      '^["outer"]{',
      ' #:semantics #!materialization',
      ' ^["inner"]{',
      '  ~#note: "hello"',
      ' }',
      '}',
    ].join('\n')

    const doc = index.openDocument('file:///workspace/test.spw', '/workspace/test.spw', text, 1)
    const layer = doc.annotations.find((entry) => entry.name === 'layer' && entry.line === 1)
    const semantics = doc.annotations.find((entry) => entry.name === 'semantics')
    const note = doc.annotations.find((entry) => entry.name === 'note')

    expect(layer?.framePath).toEqual([])
    expect(semantics?.framePath).toEqual(['outer'])
    expect(note?.framePath).toEqual(['outer', 'inner'])
    expect(note?.sectionLabel).toBe('inner')
  })

  it('returns ambient and local annotation braids for a cursor position', () => {
    const index = new ServerIndex('/workspace')
    const text = [
      '#>spw_workspace',
      '#:layer #!pragmatics',
      '^["outer"]{',
      ' #:semantics #!materialization',
      ' ^["inner"]{',
      '  ~#note: "hello"',
      ' }',
      '}',
    ].join('\n')

    index.openDocument('file:///workspace/test.spw', '/workspace/test.spw', text, 1)

    expect(index.getContextAtPosition('file:///workspace/test.spw', { line: 2, character: 2 })).toEqual({
      framePath: ['outer'],
      ambientBraids: ['#>spw_workspace', '#:layer', '#!pragmatics'],
      localBraids: [],
      enteredFrame: 'outer',
      deltaBraids: [],
    })

    expect(index.getContextAtPosition('file:///workspace/test.spw', { line: 5, character: 4 })).toEqual({
      framePath: ['outer', 'inner'],
      ambientBraids: ['#>spw_workspace', '#:layer', '#!pragmatics', '#:semantics', '#!materialization'],
      localBraids: ['#note'],
      enteredFrame: null,
      deltaBraids: ['#note'],
    })
  })
})

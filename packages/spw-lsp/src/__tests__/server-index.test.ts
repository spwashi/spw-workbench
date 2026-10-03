import { describe, it, expect } from 'vitest'
import { ServerIndex } from '../server-index'
import { normalizeReading } from '../apposition'

describe('ServerIndex appositions', () => {
  const text = [
    '^["wonders"]{',
    '  ?["Why mix at the edge?"]{',
    '    #:depth #!computational ~#lens(bandwidth symmetry)',
    '    ~#lens: "bandwidth symmetry"',
    '    ~"../net.spw" ~#(nearest)',
    '    ~#hypothesis: "see ~#lens(not a reading)" // ~#lens(nor this)',
    '    ~#lens(unclosed',
    '    ~#lens() ~#lens(   )',
    '  }',
    '}',
  ].join('\n')

  function indexed(): ServerIndex {
    const index = new ServerIndex('/workspace')
    index.openDocument('file:///workspace/test.spw', '/workspace/test.spw', text, 1)
    index.saveDocument('file:///workspace/test.spw')
    return index
  }

  it('indexes a named apposition with its reading and frame path', () => {
    const appositions = indexed().allAnnotations().filter((entry) => entry.kind === 'apposition')
    expect(appositions).toEqual([{
      file: '/workspace/test.spw',
      line: 2,
      kind: 'apposition',
      name: 'lens',
      body: 'bandwidth symmetry',
      sectionLabel: 'wonders',
      framePath: ['wonders'],
    }])
  })

  it('skips anonymous, quoted, commented, unterminated and empty appositions, and keeps ~#lens: a topic', () => {
    const index = indexed()
    expect(index.lookupAppositions('lens').map((entry) => `${entry.line}:${entry.body}`)).toEqual(['2:bandwidth symmetry'])
    expect(index.lookupAnnotation('lens').map((entry) => `${entry.line}:${entry.kind}`)).toEqual(['3:topic'])
  })

  it('keeps readings out of the particle name map, so they never count as one more #lens', () => {
    const index = new ServerIndex('/workspace')
    index.openDocument('file:///workspace/c.spw', '/workspace/c.spw', '#:depth #!computational\n~#lens(edge case)', 1)
    index.saveDocument('file:///workspace/c.spw')

    expect(index.allAnnotationNames()).toEqual(['computational', 'depth'])
    expect(index.lookupAnnotation('lens')).toEqual([])
    expect([...index.coOccurrences('depth').keys()]).toEqual(['computational'])
    expect(index.lookupAppositions('lens').map((entry) => entry.body)).toEqual(['edge case'])
    // Still indexed: by file, and in the flat list the client tree reads.
    expect(index.annotationsForFile('/workspace/c.spw').map((entry) => entry.kind)).toEqual(['lens', 'intent', 'apposition'])
  })

  it('drops a file\'s readings from the apposition map when it is re-indexed', () => {
    const index = indexed()
    index.updateDocument('file:///workspace/test.spw', '#:depth #!computational', 2)
    index.saveDocument('file:///workspace/test.spw')
    expect(index.lookupAppositions('lens')).toEqual([])
    expect(index.lookupReading('lens', 'bandwidth symmetry')).toEqual([])
  })

  it('keeps appositions out of the line braids', () => {
    const index = indexed()
    expect(index.getContextAtPosition('file:///workspace/test.spw', { line: 2, character: 0 })?.localBraids)
      .toEqual(['#:depth', '#!computational'])
  })

  it('searches appositions by their reading', () => {
    const hits = indexed().searchAnnotations('bandwidth')
    expect(hits.map((entry) => entry.kind)).toEqual(['apposition'])
  })

  it('groups readings that differ only in case, underscores or spacing', () => {
    const index = indexed()
    index.openDocument('file:///workspace/b.spw', '/workspace/b.spw', '~#lens(Bandwidth_Symmetry)\n~#lens(bandwidth)', 1)
    index.saveDocument('file:///workspace/b.spw')

    expect(normalizeReading('  Bandwidth_ \tSymmetry ')).toBe('bandwidth symmetry')
    expect(index.lookupReading('lens', 'bandwidth  symmetry').map((entry) => entry.file))
      .toEqual(['/workspace/test.spw', '/workspace/b.spw'])
    expect(index.lookupReading('neighbor', 'bandwidth symmetry')).toEqual([])
  })
})

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

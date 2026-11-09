import { describe, it, expect } from 'vitest'
import { desugar, normalizeToONF } from './normalize'
import { parse } from './parser'
import { boundaryCoordinateForSurface } from './types/coupling'

const dummySpan = { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 2, offset: 1 } }

function makeNode(type: string, extra: Record<string, unknown> = {}) {
  return { type, span: dummySpan, ...extra } as any
}

function makeToken(type: string, value: string) {
  return { type, value, span: dummySpan }
}

function makeId(value: string) {
  return makeNode('Identifier', { token: makeToken('IDENTIFIER', value) })
}

function makeLit(value: string, tokType = 'STRING') {
  return makeNode('Literal', { token: makeToken(tokType, value) })
}

describe('desugar', () => {
  it('expands label sugar A{} to labeled body', () => {
    expect(desugar('A{}')).toBe('{_A }_A')
  })

  it('expands intrinsic sugar ?_query', () => {
    expect(desugar('?_foo')).toBe('?(foo)')
  })

  it('normalizes guillemets «...» to backticks `...`', () => {
    expect(desugar('«hello»')).toBe('`hello`')
  })

  it('normalizes multiple guillemets in one string', () => {
    expect(desugar('«a» and «b»')).toBe('`a` and `b`')
  })

  it('does not expand <> as intrinsic sugar (no <> operator)', () => {
    expect(desugar('<>_foo')).toBe('<>_foo')
  })
})

describe('normalizeToONF', () => {
  it('Wildcard → _[hole]', () => {
    const result = normalizeToONF({ type: 'Wildcard', span: {} as any })
    expect(result).toEqual({ sigil: '_', args: [], frames: { reg: 'hole' } })
  })

  it('Annotation → #[annotation]', () => {
    const onf = normalizeToONF(makeNode('Annotation', { name: makeToken('IDENTIFIER', 'topic') }))
    expect(onf.sigil).toBe('#')
    expect(onf.frames.reg).toBe('annotation')
    expect(onf.frames.value).toBe('topic')
  })

  it('ModifierChain → _[fold]', () => {
    const onf = normalizeToONF(makeNode('ModifierChain', {
      modifiers: [makeToken('MODIFIER', 'boon'), makeToken('MODIFIER', 'bone')],
    }))
    expect(onf.sigil).toBe('_')
    expect(onf.frames.reg).toBe('fold')
    expect(onf.frames.value).toBe('boon,bone')
  })

  it('Binding → =[changelist]', () => {
    const onf = normalizeToONF(makeNode('Binding', { key: makeId('x'), value: makeLit('42') }))
    expect(onf.sigil).toBe('=')
    expect(onf.frames.reg).toBe('changelist')
    expect(onf.args).toHaveLength(2)
  })

  it('Bullet → _[marker]', () => {
    const onf = normalizeToONF(makeNode('Bullet', {
      item: makeId('hello'),
      marker: makeToken('CONNECTOR', '..'),
    }))
    expect(onf.sigil).toBe('_')
    expect(onf.frames.reg).toBe('marker')
    expect(onf.frames.marker).toBe('..')
  })

  it('PathRef → @[pathref]', () => {
    const onf = normalizeToONF(makeNode('PathRef', { path: makeLit('./foo.spw') }))
    expect(onf.sigil).toBe('@')
    expect(onf.frames.reg).toBe('pathref')
  })

  it('Prose → _[prose]', () => {
    const onf = normalizeToONF(makeNode('Prose', {
      chunks: [makeNode('ProseChunk', { text: 'hello' }), makeNode('ProseChunk', { text: 'world' })],
    }))
    expect(onf.sigil).toBe('_')
    expect(onf.frames.reg).toBe('prose')
    expect(onf.args).toHaveLength(2)
  })

  it('ProseChunk → _[text]', () => {
    const onf = normalizeToONF(makeNode('ProseChunk', { text: 'hello world' }))
    expect(onf.frames.reg).toBe('text')
    expect(onf.frames.value).toBe('hello world')
  })

  it('Frame keeps register identity while occupancy varies', () => {
    const filled = normalizeToONF(makeNode('Frame', { content: [makeId('x')] }))
    expect(filled.frames.reg).toBe('inner')
    expect(filled.args).toHaveLength(1)
    expect((filled.frames.coupling as { kind: string; occupancy: string })?.kind).toBe('frame')
    expect((filled.frames.coupling as { form: string })?.form).toBe('boundary')
    expect((filled.frames.coupling as { occupancy: string })?.occupancy).toBe('inhabited')
    expect((filled.frames.coupling as { payload: string })?.payload).toBe('term')
    expect(filled.frames.coupling).not.toHaveProperty('charge')
    expect(filled.frames.coupling).not.toHaveProperty('family')

    const empty = normalizeToONF(makeNode('Frame', { content: [] }))
    expect(empty.frames.reg).toBe('inner')
    expect((empty.frames.coupling as { occupancy: string; surface: string })?.occupancy).toBe('empty')
    expect((empty.frames.coupling as { surface: string })?.surface).toBe('[]')
    expect((empty.frames.coupling as { payload: string })?.payload).toBe('void')
  })

  it('Frame with bare operator → payload act + interior placement', () => {
    const op = makeNode('Operation', { operator: makeToken('OPERATOR', '!') })
    const filled = normalizeToONF(makeNode('Frame', {
      content: [makeNode('Parameter', { value: makeNode('Expression', { terms: [op], connectors: [] }) })],
    }))
    expect((filled.frames.coupling as { payload: string; actPlacement?: string })?.payload).toBe('act')
    expect((filled.frames.coupling as { actPlacement?: string })?.actPlacement).toBe('interior')
  })

  it('Body keeps register identity while occupancy varies', () => {
    const filled = normalizeToONF(makeNode('Body', {
      sequence: makeNode('Sequence', { expressions: [makeId('a')] }),
    }))
    expect(filled.frames.reg).toBe('around')
    expect((filled.frames.coupling as { kind: string })?.kind).toBe('body')
    expect((filled.frames.coupling as { form: string })?.form).toBe('boundary')
    expect((filled.frames.coupling as { payload: string })?.payload).toBe('term')

    const empty = normalizeToONF(makeNode('Body', {
      sequence: makeNode('Sequence', { expressions: [] }),
    }))
    expect(empty.frames.reg).toBe('around')
    expect((empty.frames.coupling as { occupancy: string })?.occupancy).toBe('empty')
    expect((empty.frames.coupling as { payload: string })?.payload).toBe('void')
  })

  it('Body with bare operator → payload act', () => {
    const op = makeNode('Operation', { operator: makeToken('OPERATOR', '!') })
    const filled = normalizeToONF(makeNode('Body', {
      sequence: makeNode('Sequence', {
        expressions: [makeNode('Expression', { terms: [op], connectors: [] })],
      }),
    }))
    expect((filled.frames.coupling as { payload: string; actPlacement?: string })?.payload).toBe('act')
    expect((filled.frames.coupling as { actPlacement?: string })?.actPlacement).toBe('interior')
  })

  it('Scope keeps register identity while occupancy varies', () => {
    const filled = normalizeToONF(makeNode('Scope', {
      sequence: makeNode('Sequence', { expressions: [makeId('x')] }),
    }))
    expect(filled.frames.reg).toBe('scope')
    expect((filled.frames.coupling as { kind: string })?.kind).toBe('scope')
    expect((filled.frames.coupling as { form: string })?.form).toBe('boundary')

    const empty = normalizeToONF(makeNode('Scope', {
      sequence: makeNode('Sequence', { expressions: [] }),
    }))
    expect(empty.frames.reg).toBe('scope')
    expect((empty.frames.coupling as { surface: string })?.surface).toBe('()')
    expect((empty.frames.coupling as { payload: string })?.payload).toBe('void')
  })

  it('Stream keeps register identity and disambiguates the borrowed ? sigil', () => {
    const filled = normalizeToONF(makeNode('Stream', {
      sequence: makeNode('Sequence', { expressions: [makeId('a')] }),
    }))
    expect(filled.sigil).toBe('?')
    expect(filled.frames.reg).toBe('stream')
    expect((filled.frames.coupling as { kind: string })?.kind).toBe('stream')
    expect((filled.frames.coupling as { form: string })?.form).toBe('boundary')
    expect((filled.frames.coupling as { payload: string })?.payload).toBe('term')

    const empty = normalizeToONF(makeNode('Stream', {
      sequence: makeNode('Sequence', { expressions: [] }),
    }))
    expect(empty.frames.reg).toBe('stream')
    expect((empty.frames.coupling as { occupancy: string })?.occupancy).toBe('empty')
    expect((empty.frames.coupling as { payload: string })?.payload).toBe('void')
  })

  it('Capsule keeps register identity while occupancy varies', () => {
    const filled = normalizeToONF(makeNode('Capsule', {
      open: makeToken('CAPSULE_OPEN', '<'),
      body: makeNode('Body', {
        sequence: makeNode('Sequence', { expressions: [makeId('x')] }),
      }),
    }))
    expect(filled.frames.reg).toBe('capsule')
    expect((filled.frames.coupling as { kind: string })?.kind).toBe('capsule')
    expect((filled.frames.coupling as { form: string })?.form).toBe('boundary')
    expect((filled.frames.coupling as { payload: string })?.payload).toBe('term')

    const empty = normalizeToONF(makeNode('Capsule', {
      open: makeToken('CAPSULE_OPEN', '<'),
      body: makeNode('Body', {
        sequence: makeNode('Sequence', { expressions: [] }),
      }),
    }))
    // Empty body → empty capsule occupancy
    expect(empty.frames.reg).toBe('capsule')
    expect((empty.frames.coupling as { occupancy: string; surface: string })?.occupancy).toBe('empty')
    expect((empty.frames.coupling as { payload: string })?.payload).toBe('void')
  })

  it('Digraph <> is an operator coupling with arity, not boundary occupancy', () => {
    const empty = normalizeToONF(makeNode('Operation', {
      operator: makeToken('OPERATOR', '<>'),
    }))
    expect(empty.sigil).toBe('<>')
    expect(empty.frames.reg).toBe('couple')
    expect(empty.frames.coupling).toMatchObject({
      kind: 'couple',
      form: 'operator',
      surface: '<>',
      arity: 0,
    })
    expect(empty.frames.coupling).not.toHaveProperty('occupancy')
    expect(empty.frames.coupling).not.toHaveProperty('payload')
  })

  it('lowers <> Frame members into ordered couple operands', () => {
    const parsed = parse('<>["left", "right"]')
    expect(parsed.success).toBe(true)
    const onf = normalizeToONF(parsed.ast as any)

    expect(onf.sigil).toBe('<>')
    expect(onf.args).toHaveLength(2)
    expect(onf.frames.coupling).toMatchObject({
      kind: 'couple',
      form: 'operator',
      arity: 2,
    })
    expect((onf.frames.bound as { kind?: string })?.kind).toBe('frame')
  })

  it('Prefix Act·Bound ![] records placement on the paired-boundary projection', () => {
    const onf = normalizeToONF(makeNode('Operation', {
      operator: makeToken('OPERATOR', '!'),
      frame: makeNode('Frame', { content: [] }),
    }))
    expect(onf.sigil).toBe('!')
    expect((onf.frames.bound as { kind: string; occupancy: string })?.kind).toBe('frame')
    expect((onf.frames.bound as { occupancy: string })?.occupancy).toBe('empty')
    expect((onf.frames.bound as { actPlacement: string })?.actPlacement).toBe('prefix')
  })

  it('Match → ?[match]', () => {
    const onf = normalizeToONF(makeNode('Match', {
      input: makeId('x'),
      arms: [makeNode('MatchArm', { pattern: makeLit('1'), handler: makeLit('one') })],
    }))
    expect(onf.sigil).toBe('?')
    expect(onf.frames.reg).toBe('match')
    expect(onf.args).toHaveLength(2)
  })

  it('MatchArm → _[arm]', () => {
    const onf = normalizeToONF(makeNode('MatchArm', { pattern: makeLit('1'), handler: makeLit('one') }))
    expect(onf.frames.reg).toBe('arm')
    expect(onf.args).toHaveLength(2)
  })

  it('Spread → _[spread]', () => {
    const onf = normalizeToONF(makeNode('Spread', { capture: makeId('rest') }))
    expect(onf.frames.reg).toBe('spread')
  })

  it('Condition → ?[condition]', () => {
    const onf = normalizeToONF(makeNode('Condition', {
      left: makeId('a'), right: makeId('b'),
      operator: makeToken('OPERATOR', '=='),
    }))
    expect(onf.sigil).toBe('?')
    expect(onf.frames.reg).toBe('condition')
    expect(onf.frames.op).toBe('==')
  })

  it('Parameter → =[parameter]', () => {
    const onf = normalizeToONF(makeNode('Parameter', {
      name: makeToken('IDENTIFIER', 'count'),
      value: makeLit('42'),
    }))
    expect(onf.sigil).toBe('=')
    expect(onf.frames.reg).toBe('parameter')
    expect(onf.frames.name).toBe('count')
  })

  it('Sequence single → unwraps', () => {
    const onf = normalizeToONF(makeNode('Sequence', { expressions: [makeId('x')] }))
    expect(onf.frames.reg).not.toBe('sequence')
  })

  it('Sequence multiple → _[sequence]', () => {
    const onf = normalizeToONF(makeNode('Sequence', { expressions: [makeId('x'), makeId('y')] }))
    expect(onf.frames.reg).toBe('sequence')
    expect(onf.args).toHaveLength(2)
  })
})

describe('coupling surface coordinates', () => {
  it('treats base opening delimiters uniformly while preserving their kinds', () => {
    expect(['<', '(', '[', '{'].map(boundaryCoordinateForSurface)).toEqual([
      { kind: 'capsule', form: 'boundary', side: 'open', surface: '<' },
      { kind: 'scope', form: 'boundary', side: 'open', surface: '(' },
      { kind: 'frame', form: 'boundary', side: 'open', surface: '[' },
      { kind: 'body', form: 'boundary', side: 'open', surface: '{' },
    ])
  })

  it('does not reinterpret the adjacent <> relation as a boundary surface', () => {
    expect(boundaryCoordinateForSurface('<>')).toBeUndefined()
  })
})

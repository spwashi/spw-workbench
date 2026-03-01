import { describe, it, expect } from 'vitest'
import { desugar, normalizeToONF } from '../normalize'
import { collectPrecipitants } from '../../runtime/pipeline/stages'

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

  it('Frame → _[inner]', () => {
    const onf = normalizeToONF(makeNode('Frame', { content: [makeId('x')] }))
    expect(onf.frames.reg).toBe('inner')
    expect(onf.args).toHaveLength(1)
  })

  it('Body → _[around]', () => {
    const onf = normalizeToONF(makeNode('Body', {
      sequence: makeNode('Sequence', { expressions: [makeId('a')] }),
    }))
    expect(onf.frames.reg).toBe('around')
  })

  it('Scope → _[scope]', () => {
    const onf = normalizeToONF(makeNode('Scope', {
      sequence: makeNode('Sequence', { expressions: [] }),
    }))
    expect(onf.frames.reg).toBe('scope')
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

describe('runSpwStepped', () => {
  it('yields precipitants for each stage', () => {
    const { precipitants, result } = collectPrecipitants('!["hello"]')
    expect(result.success).toBe(true)
    expect(precipitants.length).toBeGreaterThanOrEqual(3)
    expect(precipitants[0].stage).toBe('desugar')
    expect(precipitants[1].stage).toBe('parse')
  })

  it('desugar precipitant captures input/output', () => {
    const { precipitants } = collectPrecipitants('A{}')
    const ds = precipitants.find(p => p.stage === 'desugar')!
    expect(ds.input).toBe('A{}')
    expect(ds.output).toBe('{_A }_A')
    expect(ds.delta).toContain('desugared')
  })

  it('all four stages on success', () => {
    const { precipitants, result } = collectPrecipitants('!["hello"]')
    if (result.success) {
      expect(precipitants).toHaveLength(4)
      expect(precipitants.map(p => p.stage)).toEqual(['desugar', 'parse', 'normalize', 'interpret'])
    }
  })
})

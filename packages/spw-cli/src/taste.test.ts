import { describe, it, expect } from 'vitest'
import { spwq } from '@spwashi/spw-seed'
import { buildTasteRows, declaredMarks, tasteVocabulary } from './taste'

describe('declaredMarks', () => {
  it('reads a mark and its value', () => {
    const marks = declaredMarks('^["intent"]{\n ~#taste: "small files; one each"\n}\n')
    expect(marks).toEqual([{ name: 'taste', value: 'small files; one each', line: 2 }])
  })

  it('accepts either stance prefix', () => {
    const marks = declaredMarks(' ~#goal: "a"\n $#goal: "b"\n')
    expect(marks.map((m) => m.name)).toEqual(['goal', 'goal'])
  })

  it('unwraps backtick values as well as quoted ones', () => {
    expect(declaredMarks(' ~#try: `npm run spw -- help`\n')[0]?.value).toBe('npm run spw -- help')
  })

  it('ignores marks that are only mentioned, not declared', () => {
    const source = [
      '# a header describing ~#taste: conventions',
      '// ~#taste: "commented out"',
      '^["a"]{',
      ' note: "write ~#taste: here"',
      ' ~#taste: "the real one"',
      '}',
    ].join('\n')
    expect(declaredMarks(source)).toEqual([
      { name: 'taste', value: 'the real one', line: 5 },
    ])
  })

  it('ignores a mark quoted inside a backtick command', () => {
    expect(declaredMarks(' cmd: `grep ~#taste: .`\n')).toEqual([])
  })
})

describe('mark visibility', () => {
  // Backticks used to void the surrounding frame, so the AST lost the mark and
  // only a lexical scan could find it. PHRASE is a literal now and both agree.
  it('agrees with the parser when a frame carries a backtick', () => {
    const source = '^["a"]{\n b: .{\n  src: `npm run x`\n  ~#taste: "held"\n }\n}\n'

    const parsed = spwq.fromSource(source, { nodeType: 'Annotation' } as never) as unknown[]
    expect(parsed).toHaveLength(1)
    expect(declaredMarks(source).map((m) => m.name)).toEqual(['taste'])
  })

  // The scan stays lexical for reasons the AST cannot express: a mark named
  // inside a backtick command is a mention, not a declaration.
  it('still reads marks the AST would count differently', () => {
    expect(declaredMarks(' cmd: `grep ~#taste: .`\n')).toEqual([])
  })

  it('agrees with the parser when no backtick is present', () => {
    const source = '^["a"]{\n b: .{\n  src: "npm run x"\n  ~#taste: "held"\n }\n}\n'

    const parsed = spwq.fromSource(source, { nodeType: 'Annotation' } as never) as unknown[]
    expect(parsed).toHaveLength(1)
    expect(declaredMarks(source)).toHaveLength(1)
  })
})

describe('buildTasteRows', () => {
  const sources = new Map([
    ['a.spw', '^["intent"]{\n ~#goal: "do a"\n ~#taste: "terse"\n}\n'],
    ['b.spw', '^["intent"]{\n ~#goal: "do b"\n}\n'],
    ['c.spw', '^["x"]{\n y: "no marks at all"\n}\n'],
  ])

  it('separates surfaces with taste from goals lacking one', () => {
    const rows = buildTasteRows(sources, [])
    expect(rows.find((r) => r.file === 'a.spw')?.taste).toBe('terse')
    expect(rows.find((r) => r.file === 'b.spw')?.taste).toBeNull()
    expect(rows.find((r) => r.file === 'b.spw')?.hasIntent).toBe(true)
    // No goal and no taste is not a gap — nothing was promised.
    expect(rows.find((r) => r.file === 'c.spw')?.hasIntent).toBe(false)
  })

  it('skips the second parse unless fidelity is requested', () => {
    const cheap = buildTasteRows(sources, [])
    for (const row of cheap) expect(row.visible).toBe(row.declared)
  })
})

describe('tasteVocabulary', () => {
  it('counts a word once per surface and drops stopwords', () => {
    const rows = buildTasteRows(
      new Map([
        ['a.spw', ' ~#taste: "short files and short names"\n'],
        ['b.spw', ' ~#taste: "short paths"\n'],
      ]),
      [],
    )
    const vocab = tasteVocabulary(rows)
    expect(vocab.get('short')).toBe(2)
    expect(vocab.get('and')).toBeUndefined()
  })
})

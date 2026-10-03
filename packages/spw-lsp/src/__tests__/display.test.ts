import { describe, expect, it } from 'vitest'
import { documentHighlight, hover, inlayHints, workspaceSymbols } from '../handlers/display'
import { formContextHover } from '../handlers/form-context'
import { ServerIndex } from '../server-index'
import { DEFAULT_CONFIG, type HandlerDeps } from '../types'

const TEST_URI = 'file:///workspace/test.spw'
const TEST_PATH = '/workspace/test.spw'

/** Other workspace files, indexed as if saved, so cross-file counts have something to count. */
interface SiblingFile { path: string; text: string }

function makeDeps(text: string, siblings: SiblingFile[] = []): HandlerDeps {
  const serverIndex = new ServerIndex('/workspace')
  serverIndex.openDocument(TEST_URI, TEST_PATH, text, 1)
  serverIndex.saveDocument(TEST_URI)
  for (const sibling of siblings) {
    const uri = `file://${sibling.path}`
    serverIndex.openDocument(uri, sibling.path, sibling.text, 1)
    serverIndex.saveDocument(uri)
  }

  return {
    serverIndex,
    config: {
      ...DEFAULT_CONFIG,
      inlayHints: { ...DEFAULT_CONFIG.inlayHints },
    },
    workspaceRoot: '/workspace',
    pathFromUri: (uri: string) => uri.replace('file://', ''),
    uriFromPath: (filePath: string) => `file://${filePath}`,
    resolveReferencePath: async () => null,
    suggestNearbyReference: async () => null,
    defaultRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    mergeRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    getDocumentText: async () => text,
    getWorkspaceSpwFiles: async () => [],
    mapWithConcurrency: async (items: any[], _concurrency: number, mapper: any) => Promise.all(items.map(mapper)),
    sendNotification: () => {},
    log: () => {},
    trialRunSpw: () => null,
    loadObservableState: async () => ({}),
    observableState: null,
    observableStateLoadedAt: 0,
  } as unknown as HandlerDeps
}

describe('display handlers', () => {
  it('emits boundary-delta and wonder synopsis inlay hints', async () => {
    const text = [
      '#>workspace',
      '#:layer #!pragmatics',
      '^["outer"]{',
      '  #:semantics #!materialization',
      '  ?["How does the field settle?"]{',
      '    #:depth #!computational // lens: living system',
      '    ~<@here> // nearest neighbor',
      '    !probe{ "measure the drift" }',
      '    $%[file.frame_count, file.annotation_density]',
      '  }',
      '}',
    ].join('\n')
    const deps = makeDeps(text)

    const result = await inlayHints({
      textDocument: { uri: TEST_URI },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 10, character: 1 },
      },
    }, deps)

    const byLine = result.map((hint) => `${hint.position.line}:${hint.label}`)

    // Hints show only what the line does not already say. The field braids on
    // lines 1 and 3 are written on those lines, so no field hint repeats them;
    // "outer" is on line 2, so the frame-entry hint is suppressed too.
    expect(byLine.some((h) => h.startsWith('1:'))).toBe(false)
    expect(byLine.some((h) => h.startsWith('2:'))).toBe(false)
    expect(byLine.some((h) => h.startsWith('3:'))).toBe(false)

    // The wonder hint drops depth/lens (both visible in the block below) and
    // keeps only the compressive digest — the metric count and neighbor flag.
    expect(byLine).toContain('4: [? 2 metrics · neighbor]')
  })

  it('includes frame path and braid context in annotation hover', async () => {
    const text = [
      '#>workspace',
      '#:layer #!pragmatics',
      '^["outer"]{',
      '  #:depth #!computational',
      '}',
    ].join('\n')
    const deps = makeDeps(text)

    const result = await hover({
      textDocument: { uri: TEST_URI },
      position: { line: 3, character: 12 },
    }, deps)

    expect(result?.contents.value).toContain('Frame path: `outer`')
    expect(result?.contents.value).toContain('Active facets: `#:depth` · `#!computational`')
    expect(result?.contents.value).toContain('Ambient field: `#>workspace` · `#:layer` · `#!pragmatics`')
  })

  it('highlights braid partners separately from exact annotation echoes', () => {
    const text = [
      '#:depth #!computational',
      '#:depth #!educational',
      '#:depth #!computational',
    ].join('\n')
    const deps = makeDeps(text)

    const result = documentHighlight({
      textDocument: { uri: TEST_URI },
      position: { line: 0, character: 12 },
    }, deps)

    const summary = result.map((entry) => ({
      line: entry.range.start.line,
      character: entry.range.start.character,
      kind: entry.kind,
    }))

    expect(summary).toEqual([
      { line: 0, character: 0, kind: 2 },
      { line: 0, character: 8, kind: 3 },
      { line: 2, character: 0, kind: 2 },
      { line: 2, character: 8, kind: 1 },
    ])
  })
})

/** A wonder block on line 1 whose body opens with `lensLines`. */
function wonderText(lensLines: string[]): string {
  return [
    '^["outer"]{',
    '  ?["How does the field settle?"]{',
    ...lensLines.map((line) => `    ${line}`),
    '    ~<@here> // nearest neighbor',
    '    !probe{ "measure the drift" }',
    '    $%[file.frame_count, file.annotation_density]',
    '  }',
    '}',
  ].join('\n')
}

const WONDER_LINE = 1
/** Inside the question text, past the `?["` glyphs. */
const QUESTION_COLUMN = 5

async function wonderHoverText(text: string, siblings: SiblingFile[] = []): Promise<string> {
  const result = await hover({
    textDocument: { uri: TEST_URI },
    position: { line: WONDER_LINE, character: QUESTION_COLUMN },
  }, makeDeps(text, siblings))
  return result?.contents.value ?? ''
}

describe('wonder lens', () => {
  it('answers inside the question with the wonder, not the form-geometry boundary', async () => {
    const text = wonderText(['#:depth #!computational ~#lens(living system)'])
    const deps = makeDeps(text)

    // The form-geometry hover does claim this column, so the ordering is what decides.
    const doc = deps.serverIndex.getDocument(TEST_URI)!
    expect(formContextHover(doc, { line: WONDER_LINE, character: QUESTION_COLUMN })).not.toBeNull()

    const result = await hover({
      textDocument: { uri: TEST_URI },
      position: { line: WONDER_LINE, character: QUESTION_COLUMN },
    }, deps)
    expect(result?.contents.value).toContain('Wonder')
    expect(result?.contents.value).not.toContain('Form coupling')
    expect(result?.range?.start.character).toBe(2)
  })

  it.each([
    ['apposition', ['#:depth #!computational ~#lens(living system)']],
    ['datum', ['#:depth #!computational', '~#lens: "living system"']],
    ['comment', ['#:depth #!computational // lens: living system']],
  ])('reads the %s form as the same lens, with the same inlay digest', async (_form, lensLines) => {
    const text = wonderText(lensLines)
    expect(await wonderHoverText(text)).toContain('**Depth axis:** computational · **Lens:** living system')

    const hints = await inlayHints({
      textDocument: { uri: TEST_URI },
      range: { start: { line: 0, character: 0 }, end: { line: 10, character: 1 } },
    }, makeDeps(text))
    const wonderHints = hints
      .filter((hint) => hint.position.line === WONDER_LINE && hint.label.startsWith(' [?'))
      .map((hint) => hint.label)
    expect(wonderHints).toEqual([' [? 2 metrics · neighbor]'])
  })

  it('prefers the apposition over a legacy comment in the same block', async () => {
    const text = wonderText(['#:depth #!computational // lens: material grain', '~#lens(living system)'])
    const value = await wonderHoverText(text)
    expect(value).toContain('**Lens:** living system')
    expect(value).not.toContain('material grain')
  })

  it('finds an apposition on its own line, away from #:depth', async () => {
    const text = wonderText(['#:depth #!computational', '~#hypothesis: "drift settles"', '~#lens(formal structure)'])
    expect(await wonderHoverText(text)).toContain('**Lens:** formal structure')
  })

  it('reads no lens from a commented-out apposition or one quoted inside a string', async () => {
    const text = wonderText(['#:depth #!computational // ~#lens(living system)', '~#hypothesis: "see ~#lens(material grain)"'])
    const value = await wonderHoverText(text)
    expect(value).toContain('**Depth axis:** computational')
    expect(value).not.toContain('Lens')
  })

  it('agrees with the lexer and the index when a backtick phrase swallows the apposition', async () => {
    const text = wonderText(['#:depth #!computational see `code ~#lens(after backtick)'])
    const deps = makeDeps(text)
    // The lexer reads `\`code ~#lens(…)` as one PHRASE, so neither the index nor the hover sees a reading.
    expect(deps.serverIndex.lookupAppositions('lens')).toEqual([])
    expect(await wonderHoverText(text)).not.toContain('Lens')
  })

  it('keeps prose punctuation inside the reading', async () => {
    const text = wonderText(["#:depth #!computational ~#lens(it's the root map, 50% done)"])
    expect(await wonderHoverText(text)).toContain("**Lens:** it's the root map, 50% done")
  })

  it('counts how often the lens recurs, folding case and underscores', async () => {
    const text = wonderText(['#:depth #!computational ~#lens(living system)'])
    const value = await wonderHoverText(text, [
      { path: '/workspace/other.spw', text: '?["q"]{\n  #:depth #!stylistic ~#lens(Living_System)\n}' },
    ])
    expect(value).toContain('`~#lens(living system)` recurs **2**× in **2** file(s)')
  })

  it('reads only a one-line wonder\'s own body, never the sibling below it', async () => {
    const text = ['^["outer"]{', '  ?["q1"]{ #:depth #!a }', '  ~#lens(sibling reading)', '}'].join('\n')
    const value = await wonderHoverText(text)
    expect(value).toContain('**Depth axis:** a')
    expect(value).not.toContain('Lens')
    expect(value).not.toContain('sibling reading')
  })

  it('reads an apposition written on the header line itself', async () => {
    const braced = ['^["outer"]{', '  ?["q"]{ ~#lens(header reading)', '    #:depth #!a', '  }', '}'].join('\n')
    expect(await wonderHoverText(braced)).toContain('**Depth axis:** a · **Lens:** header reading')

    const oneLine = ['^["outer"]{', '  ?["q"]{ #:depth #!a ~#lens(inline reading) } // lens: trailing comment', '}'].join('\n')
    expect(await wonderHoverText(oneLine)).toContain('**Lens:** inline reading')

    const indented = ['^["outer"]{', '  ?["q"] ~#lens(indented reading)', '    #:depth #!a', '}'].join('\n')
    expect(await wonderHoverText(indented)).toContain('**Lens:** indented reading')
  })

  it('reads no sibling at the header\'s own depth as the body of a wonder without a brace', async () => {
    const text = ['^["outer"]{', '  ?["q1"] #:depth #!a', '  ~#lens(sibling reading)', '}'].join('\n')
    const value = await wonderHoverText(text)
    expect(value).toContain('**Depth axis:** a')
    expect(value).not.toContain('sibling reading')

    const deeper = ['^["outer"]{', '  ?["q1"] #:depth #!a', '   ~#lens(own reading)', '}'].join('\n')
    expect(await wonderHoverText(deeper)).toContain('**Lens:** own reading')
  })

  it('stops at a nested wonder, whose lens is its own', async () => {
    const text = [
      '^["outer"]{',
      '  ?["outer question"]{',
      '    #:depth #!a',
      '    ?["inner question"]{ ~#lens(inner reading) }',
      '  }',
      '}',
    ].join('\n')
    const outer = await wonderHoverText(text)
    expect(outer).toContain('**Depth axis:** a')
    expect(outer).not.toContain('inner reading')

    const inner = await hover({ textDocument: { uri: TEST_URI }, position: { line: 3, character: 8 } }, makeDeps(text))
    expect(inner?.contents.value).toContain('> inner question')
    expect(inner?.contents.value).toContain('**Lens:** inner reading')
  })

  it('skips an empty apposition and falls back to the next form', async () => {
    const text = wonderText(['#:depth #!computational ~#lens() // lens: living system'])
    const value = await wonderHoverText(text)
    expect(value).toContain('**Lens:** living system')
    expect(value).toContain('the parser drops')
  })

  it('escapes a reading that holds backticks in the wonder hover', async () => {
    const value = await wonderHoverText(wonderText(['#:depth #!computational ~#lens(see `x` here)']))
    expect(value).toContain('**Lens:** see \\`x\\` here')
    expect(value).toContain('``~#lens(see `x` here)`` recurs **1**× in **1** file(s)')
  })

  it('flags a comment-form lens as absent from the AST', async () => {
    const commentValue = await wonderHoverText(wonderText(['#:depth #!computational // lens: living system']))
    expect(commentValue).toContain('the parser drops')
    const appositionValue = await wonderHoverText(wonderText(['#:depth #!computational ~#lens(living system)']))
    expect(appositionValue).not.toContain('the parser drops')
  })
})

describe('apposition hover and symbols', () => {
  const text = [
    '^["claims"]{',
    '  #:depth #!computational ~#lens(bandwidth symmetry)',
    '  ~#lens: "bandwidth symmetry"',
    '}',
  ].join('\n')
  const siblings: SiblingFile[] = [
    { path: '/workspace/a.spw', text: '~#lens(bandwidth_symmetry)\n~#lens(ecological zone)' },
  ]

  it('reads ~#lens( as an apposition, not the #lens topic', async () => {
    const deps = makeDeps(text, siblings)
    const column = '  #:depth #!computational ~#l'.length
    const result = await hover({ textDocument: { uri: TEST_URI }, position: { line: 1, character: column } }, deps)
    const value = result?.contents.value ?? ''

    expect(value).toContain('*apposition (named reading)*')
    expect(value).not.toContain('*topic*')
    expect(value).toContain('This reading: **2** occurrence(s) in **2** file(s)')
    expect(value).toContain('`~#lens(…)` readings: **3** in **2** file(s)')
    expect(value).toContain('Other readings: `ecological zone`')
    expect(result?.range).toEqual({
      start: { line: 1, character: '  #:depth #!computational '.length },
      end: { line: 1, character: '  #:depth #!computational ~#lens(bandwidth symmetry)'.length },
    })
  })

  it('leaves the ~#lens: datum on the topic hover, counting no readings as topics', async () => {
    const deps = makeDeps(text, siblings)
    const result = await hover({ textDocument: { uri: TEST_URI }, position: { line: 2, character: 4 } }, deps)
    // Only the datum: the three appositions share the word `lens`, not the concept.
    expect(result?.contents.value).toContain('**#lens** — *topic*')
    expect(result?.contents.value).toContain('**1** file(s), **1** occurrence(s)')
  })

  it('keeps readings out of a particle\'s co-occurrence list', async () => {
    const deps = makeDeps('^["x"]{\n  #:depth #!computational ~#lens(bandwidth symmetry)\n}', siblings)
    const result = await hover({ textDocument: { uri: TEST_URI }, position: { line: 1, character: 4 } }, deps)
    const value = result?.contents.value ?? ''
    expect(value).toContain('**#:depth** — *lens*')
    expect(value).toContain('Co-occurs with: `#computational` (1×)')
    expect(value).not.toContain('`#lens`')
  })

  it('treats an empty reading as stating nothing: no index entry, no symbol', async () => {
    const deps = makeDeps('^["x"]{\n  ~#lens()\n}')
    const result = await hover({ textDocument: { uri: TEST_URI }, position: { line: 1, character: 4 } }, deps)
    expect(result?.contents.value).toContain('*apposition (empty reading)*')
    expect(deps.serverIndex.lookupAppositions('lens')).toEqual([])
    expect(workspaceSymbols({ query: 'lens' }, deps).map((symbol) => symbol.name)).not.toContain('~#lens()')
  })

  it('fences a reading that holds backticks so the hover still renders', async () => {
    const line = '  ~#lens(see `x` here)'
    const deps = makeDeps(`^["x"]{\n${line}\n}`, [{ path: '/workspace/a.spw', text: '~#lens(see ``y`` there)' }])
    const result = await hover({ textDocument: { uri: TEST_URI }, position: { line: 1, character: 4 } }, deps)
    const value = result?.contents.value ?? ''
    expect(value).toContain('**``~#lens(see `x` here)``** — *apposition (named reading)*')
    // The count rides a no-break space so it never wraps away from its reading.
    expect(value).toContain('Other readings: ```see ``y`` there```\u00a0(1×)')
  })

  it('describes an anonymous apposition without indexing it', async () => {
    const deps = makeDeps('^["x"]{\n  ~#(nearest neighbor)\n}')
    const result = await hover({ textDocument: { uri: TEST_URI }, position: { line: 1, character: 6 } }, deps)
    expect(result?.contents.value).toContain('*apposition (anonymous reading)*')
    expect(deps.serverIndex.allAnnotations().some((entry) => entry.kind === 'apposition')).toBe(false)
  })

  it('keeps #:lens in workspace symbols when readings named lens fill the cap', () => {
    // 41 files of readings indexed ahead of the one #:lens file: in index order
    // the cap of 40 would cut #:lens. Readings match on their body only, and
    // exact names rank ahead of them, so #:lens survives either way.
    const readings: SiblingFile[] = Array.from({ length: 41 }, (_, i) => ({
      path: `/workspace/readings-${i}.spw`,
      text: `~#lens(living system ${i})\n~#lens(through a lens ${i})`,
    }))
    const deps = makeDeps('^["x"]{\n  ~#note: "none"\n}', [...readings, { path: '/workspace/z.spw', text: '#:lens #!a' }])

    const names = workspaceSymbols({ query: 'lens' }, deps).map((symbol) => symbol.name)
    expect(names).toHaveLength(40)
    expect(names[0]).toBe('#:lens')
    expect(names.slice(1).every((name) => name.startsWith('~#lens(through a lens'))).toBe(true)
  })

  it('finds an apposition by its reading in workspace symbols', () => {
    const deps = makeDeps(text, siblings)
    const symbols = workspaceSymbols({ query: 'bandwidth' }, deps)
    const names = symbols.map((symbol) => symbol.name)
    expect(names).toContain('~#lens(bandwidth symmetry)')
    expect(names).toContain('~#lens(bandwidth_symmetry)')
    const own = symbols.find((symbol) => symbol.location.uri === TEST_URI)
    // 15 = LSP SymbolKind.String
    expect(own).toMatchObject({ kind: 15, containerName: 'claims' })
  })
})

import { describe, expect, it } from 'vitest'
import { documentHighlight, hover, inlayHints } from '../handlers/display'
import { ServerIndex } from '../server-index'
import { DEFAULT_CONFIG, type HandlerDeps } from '../types'

const TEST_URI = 'file:///workspace/test.spw'
const TEST_PATH = '/workspace/test.spw'

function makeDeps(text: string): HandlerDeps {
  const serverIndex = new ServerIndex('/workspace')
  serverIndex.openDocument(TEST_URI, TEST_PATH, text, 1)
  serverIndex.saveDocument(TEST_URI)

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
    expect(byLine).toContain('1: [ambient +#:layer #!pragmatics]')
    expect(byLine).toContain('2: [enter outer]')
    expect(byLine).toContain('3: [ambient +#:semantics #!materialization]')
    expect(byLine).toContain('4: [? computational · lens: living system · 2 metrics · neighbor]')
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
    expect(result?.contents.value).toContain('Braid: `#:depth #!computational`')
    expect(result?.contents.value).toContain('Ambient: `#>workspace` · `#:layer #!pragmatics`')
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

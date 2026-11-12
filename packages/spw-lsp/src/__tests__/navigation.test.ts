/**
 * Navigation Handlers — Tests
 *
 * Verifies definition, document links, references, prepareRename,
 * and cascading workspace-wide rename.
 */

import { describe, it, expect } from 'vitest'
import { definition, documentLinks, prepareRename, rename, references } from '../handlers/navigation'
import type { HandlerDeps, LspTextEdit } from '../types'

// ── Helpers ────────────────────────────────────────────────────

function makeDeps(overrides: Partial<HandlerDeps> & { text?: string; files?: Record<string, string> } = {}): HandlerDeps {
  const text = overrides.text ?? ''
  const files = overrides.files ?? {}

  return {
    serverIndex: {
      getDocument: (uri: string) => {
        const t = uri === 'file:///test.spw' ? text : (files[uri] ?? null)
        return t !== null ? { text: t, selectorHits: null } : null
      },
      allAnnotationNames: () => [],
      lookupAnnotation: (name: string) => {
        const results: Array<{ file: string; line: number }> = []
        const allTexts: Record<string, string> = { 'file:///test.spw': text, ...files }
        for (const [uri, content] of Object.entries(allTexts)) {
          const lines = content.split('\n')
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`#${name}`)) {
              results.push({ file: uri.replace('file://', ''), line: i })
            }
          }
        }
        return results
      },
      getSelectorDef: () => null,
    },
    config: {
      inlayHints: { paths: true, annotations: true, frames: true },
      diagnostics: { unresolvedRefs: 'warning', staleProjections: true },
      roots: {},
      workspace: { exclude: [] },
      formatOnSave: false,
    },
    workspaceRoot: '/workspace',
    pathFromUri: (uri: string) => uri.replace('file://', ''),
    uriFromPath: (p: string) => p.startsWith('file://') ? p : `file://${p}`,
    mergeRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    defaultRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    getDocumentText: async (uri: string) => {
      if (uri === 'file:///test.spw') return text
      return files[uri] ?? null
    },
    getWorkspaceSpwFiles: async () => {
      const paths = ['/test.spw']
      for (const uri of Object.keys(files)) {
        paths.push(uri.replace('file://', ''))
      }
      return paths
    },
    resolveReferencePath: async () => null,
    suggestNearbyReference: async () => null,
    mapWithConcurrency: async (items: any[], _c: number, fn: any) => Promise.all(items.map(fn)),
    sendNotification: () => {},
    log: () => {},
    trialRunSpw: () => null,
    loadObservableState: async () => ({}),
    observableState: null,
    observableStateLoadedAt: 0,
    ...overrides,
  } as unknown as HandlerDeps
}

function params(line: number, character: number) {
  return { textDocument: { uri: 'file:///test.spw' }, position: { line, character } }
}

// ── Definition ─────────────────────────────────────────────────

describe('definition', () => {
  it('returns null for missing uri', async () => {
    const result = await definition(
      { textDocument: { uri: '' }, position: { line: 0, character: 0 } } as any,
      makeDeps(),
    )
    expect(result).toBeNull()
  })

  it('returns null when no path ref at position', async () => {
    const result = await definition(params(0, 0), makeDeps({ text: '// just a comment' }))
    expect(result).toBeNull()
  })

  it('resolves tilde path to definition location', async () => {
    const deps = makeDeps({ text: '@cluster: ~"plans/index.spw"' })
    deps.resolveReferencePath = async () => '/workspace/plans/index.spw'
    const result = await definition(params(0, 15), deps)
    expect(result).toHaveLength(1)
    expect(result![0].uri).toBe('file:///workspace/plans/index.spw')
  })
})

// ── Document Links ─────────────────────────────────────────────

describe('documentLinks', () => {
  it('returns empty for missing uri', async () => {
    const result = await documentLinks({ textDocument: { uri: '' } }, makeDeps())
    expect(result).toEqual([])
  })

  it('returns empty when no resolvable paths', async () => {
    const result = await documentLinks(
      { textDocument: { uri: 'file:///test.spw' } },
      makeDeps({ text: '#layer #!pragmatics' }),
    )
    expect(result).toEqual([])
  })
})

// ── Prepare Rename ─────────────────────────────────────────────

describe('prepareRename', () => {
  it('returns null for non-renameable position', async () => {
    const result = await prepareRename(params(0, 0), makeDeps({ text: '// comment' }))
    expect(result).toBeNull()
  })

  it('identifies annotation name for rename', async () => {
    const deps = makeDeps({ text: '#layer #!pragmatics' })
    const result = await prepareRename(params(0, 2), deps)
    expect(result).not.toBeNull()
    expect(result!.placeholder).toBe('layer')
  })

  it('identifies trait name for rename', async () => {
    const deps = makeDeps({ text: '~#goal: "Build the LSP"' })
    const result = await prepareRename(params(0, 3), deps)
    expect(result).not.toBeNull()
    expect(result!.placeholder).toBe('goal')
  })

  it('identifies @root name for rename', async () => {
    const deps = makeDeps({ text: '@cluster: ~"path"' })
    const result = await prepareRename(params(0, 3), deps)
    expect(result).not.toBeNull()
    expect(result!.placeholder).toBe('cluster')
  })

  it('identifies frame name for rename', async () => {
    const deps = makeDeps({ text: '^["roots"]{}' })
    const result = await prepareRename(params(0, 5), deps)
    expect(result).not.toBeNull()
    expect(result!.placeholder).toBe('roots')
  })
})

// ── Rename ─────────────────────────────────────────────────────

describe('rename', () => {
  it('returns null for non-renameable position', async () => {
    const result = await rename(
      { textDocument: { uri: 'file:///test.spw' }, position: { line: 0, character: 0 }, newName: 'x' },
      makeDeps({ text: '// comment' }),
    )
    expect(result).toBeNull()
  })

  it('renames annotation across files', async () => {
    const deps = makeDeps({
      text: '#layer #!pragmatics\n~#goal: "test"',
      files: {
        'file:///other.spw': '#layer #!semantics',
      },
    })
    const result = await rename(
      { textDocument: { uri: 'file:///test.spw' }, position: { line: 0, character: 2 }, newName: 'tier' },
      deps,
    )
    expect(result).not.toBeNull()
    const allEdits = Object.values(result!.changes).flat()
    // Should rename #layer in both files
    expect(allEdits.length).toBeGreaterThanOrEqual(2)
    expect(allEdits.every((e: LspTextEdit) => e.newText === 'tier')).toBe(true)
  })

  it('renames @root across files', async () => {
    const deps = makeDeps({
      text: '@cluster: ~"path"\n@artifact: ~"path2"',
      files: {
        'file:///other.spw': '@cluster: ~"different"',
      },
    })
    const result = await rename(
      { textDocument: { uri: 'file:///test.spw' }, position: { line: 0, character: 2 }, newName: 'plans' },
      deps,
    )
    expect(result).not.toBeNull()
    const allEdits = Object.values(result!.changes).flat()
    expect(allEdits.length).toBeGreaterThanOrEqual(2)
    expect(allEdits.every((e: LspTextEdit) => e.newText === 'plans')).toBe(true)
  })

  it('renames frame name across files', async () => {
    const deps = makeDeps({
      text: '^["roots"]{\n  @cluster: ~"path"\n}',
      files: {
        'file:///other.spw': '^["roots"]{\n  @other: ~"path"\n}',
      },
    })
    const result = await rename(
      { textDocument: { uri: 'file:///test.spw' }, position: { line: 0, character: 4 }, newName: 'origins' },
      deps,
    )
    expect(result).not.toBeNull()
    const allEdits = Object.values(result!.changes).flat()
    expect(allEdits.length).toBeGreaterThanOrEqual(2)
    expect(allEdits.every((e: LspTextEdit) => e.newText === 'origins')).toBe(true)
  })
})

// ── Rename by token: a mark renames only marks of its kind and name ──

describe('rename by token', () => {
  const at = (line: number, character: number, newName: string) =>
    ({ textDocument: { uri: 'file:///test.spw' }, position: { line, character }, newName })
  const editsIn = (result: { changes: Record<string, LspTextEdit[]> } | null, uri: string) =>
    (result?.changes[uri] ?? []).map(e => [e.range.start.line, e.range.start.character, e.range.end.character, e.newText])

  it('leaves a hyphenated name that starts with the old one', async () => {
    const result = await rename(at(0, 2, 'bar'), makeDeps({ text: '#foo #foo-bar' }))
    expect(editsIn(result, 'file:///test.spw')).toEqual([[0, 1, 4, 'bar']])
  })

  it('leaves the name inside a string and a comment', async () => {
    const text = '#foo\nnote: "see #foo here"\n// #foo\n# a comment about #foo'
    const result = await rename(at(0, 2, 'bar'), makeDeps({ text }))
    expect(editsIn(result, 'file:///test.spw')).toEqual([[0, 1, 4, 'bar']])
  })

  it('renames only marks of the kind under the caret', async () => {
    const text = '#>foo\n#:foo\n#!foo\n~#foo: 1\n#foo'
    const anchor = await rename(at(0, 3, 'bar'), makeDeps({ text }))
    expect(editsIn(anchor, 'file:///test.spw')).toEqual([[0, 2, 5, 'bar']])
    const lens = await rename(at(1, 3, 'bar'), makeDeps({ text }))
    expect(editsIn(lens, 'file:///test.spw')).toEqual([[1, 2, 5, 'bar']])
    const mark = await rename(at(3, 3, 'bar'), makeDeps({ text }))
    expect(editsIn(mark, 'file:///test.spw')).toEqual([[3, 2, 5, 'bar']])
    const tag = await rename(at(4, 2, 'bar'), makeDeps({ text }))
    expect(editsIn(tag, 'file:///test.spw')).toEqual([[4, 1, 4, 'bar']])
  })

  it('renames a lens across files, as a shared word', async () => {
    const deps = makeDeps({ text: '#:layer #!pragmatics', files: { 'file:///other.spw': '#:layer\n#layer' } })
    const result = await rename(at(0, 3, 'tier'), deps)
    expect(editsIn(result, 'file:///test.spw')).toEqual([[0, 2, 7, 'tier']])
    expect(editsIn(result, 'file:///other.spw')).toEqual([[0, 2, 7, 'tier']])
  })

  it('renames an anchor in its own file and re-aims the citations that reach that file', async () => {
    const deps = makeDeps({
      text: '#>foo',
      files: {
        'file:///other.spw': 'a: ~"test.spw#foo"\nb: ~"third.spw#foo"\nc: "test.spw#foo"',
        'file:///third.spw': '#>foo',
      },
    })
    deps.resolveReferencePath = async (hit: { target: string }) =>
      // As the real resolver does, the fragment stays on the resolved path.
      hit.target.startsWith('test.spw') ? '/test.spw#foo' : hit.target.startsWith('third.spw') ? '/third.spw#foo' : null
    const result = await rename(at(0, 3, 'bar'), deps)
    expect(editsIn(result, 'file:///test.spw')).toEqual([[0, 2, 5, 'bar']])
    expect(editsIn(result, 'file:///other.spw')).toEqual([[0, 14, 17, 'bar']])
    expect(editsIn(result, 'file:///third.spw')).toEqual([])
  })

  it('leaves a fragment written against a name', async () => {
    const result = await rename(at(1, 2, 'bar'), makeDeps({ text: 'see @page#foo and file#foo\n#foo' }))
    expect(editsIn(result, 'file:///test.spw')).toEqual([[1, 1, 4, 'bar']])
  })

  it('renames marks after a dropped brace or an unpaired apostrophe on an earlier line', async () => {
    const dropped = await rename(at(2, 2, 'bar'), makeDeps({ text: '^x{ a: 1\n#foo\n#foo' }))
    expect(editsIn(dropped, 'file:///test.spw')).toEqual([[1, 1, 4, 'bar'], [2, 1, 4, 'bar']])
    const apostrophe = await rename(at(2, 2, 'bar'), makeDeps({ text: "~<rationale>{ the maker's hand }\n#foo\n#foo" }))
    expect(editsIn(apostrophe, 'file:///test.spw')).toEqual([[1, 1, 4, 'bar'], [2, 1, 4, 'bar']])
  })

  it('leaves a plan stream entry as it was written', async () => {
    const text = '#:layer\n >>[2026-10-12 21:02] observe — every header has #:layer #!pragmatics\n#:layer'
    const result = await rename(at(0, 3, 'tier'), makeDeps({ text }))
    expect(editsIn(result, 'file:///test.spw')).toEqual([[0, 2, 7, 'tier'], [2, 2, 7, 'tier']])
  })

  it('offers no rename for a name inside a string', async () => {
    const result = await prepareRename(params(0, 12), makeDeps({ text: 'note: "see #foo here"' }))
    expect(result).toBeNull()
  })
})

// ── References ─────────────────────────────────────────────────

describe('references', () => {
  it('returns empty for non-reference position', async () => {
    const result = await references(
      { textDocument: { uri: 'file:///test.spw' }, position: { line: 0, character: 0 } },
      makeDeps({ text: '// comment' }),
    )
    expect(result).toEqual([])
  })

  it('finds annotation references across files', async () => {
    const deps = makeDeps({
      text: '#layer #!pragmatics',
      files: {
        'file:///other.spw': '#layer #!semantics',
      },
    })
    const result = await references(
      { textDocument: { uri: 'file:///test.spw' }, position: { line: 0, character: 2 } },
      deps,
    )
    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})

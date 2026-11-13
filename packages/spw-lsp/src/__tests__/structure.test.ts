import { describe, expect, it } from 'vitest'
import { codeAction } from '../handlers/editing'
import { linkedEditingRanges, selectionRanges, type LspSelectionRange } from '../handlers/structure'
import type { HandlerDeps } from '../types'

const URI = 'file:///workspace/a.spw'
const depsFor = (text: string): HandlerDeps =>
  ({
    serverIndex: {
      getDocument: () => ({ text, filePath: '/workspace/a.spw', selectorHits: [] }),
      allAnnotationNames: () => [],
      lookupAnnotation: () => [],
      formatDocument: (t: string) => t,
      formatRange: (t: string) => t,
    },
    config: { inlayHints: { paths: true, annotations: true, frames: true }, diagnostics: { unresolvedRefs: 'warning', staleProjections: true }, roots: {}, workspace: { exclude: [] }, formatOnSave: false },
    getDocumentText: async () => text,
  }) as unknown as HandlerDeps

const chain = (r: LspSelectionRange | undefined): LspSelectionRange[] => (r ? [r, ...chain(r.parent)] : [])

describe('selection by structure', () => {
  it('answers each position with a chain whose parents hold their children', () => {
    const text = 'home{\n  seed[x]\n}'
    const [first] = selectionRanges({ textDocument: { uri: URI }, positions: [{ line: 1, character: 7 }] }, depsFor(text))
    const ranges = chain(first).map((r) => r.range)
    expect(ranges[0]).toEqual({ start: { line: 1, character: 7 }, end: { line: 1, character: 8 } })
    for (let i = 1; i < ranges.length; i++) {
      const [inner, outer] = [ranges[i - 1]!, ranges[i]!]
      const before = (a: { line: number; character: number }, b: typeof a) => a.line < b.line || (a.line === b.line && a.character <= b.character)
      expect(before(outer.start, inner.start) && before(inner.end, outer.end)).toBe(true)
    }
  })
})

describe('pair labels while typing', () => {
  it('links the two labels only when the caret is on one', () => {
    const text = '{_A x }_A'
    const deps = depsFor(text)
    expect(linkedEditingRanges({ textDocument: { uri: URI }, position: { line: 0, character: 2 } }, deps)?.ranges).toEqual([
      { start: { line: 0, character: 2 }, end: { line: 0, character: 3 } },
      { start: { line: 0, character: 8 }, end: { line: 0, character: 9 } },
    ])
    expect(linkedEditingRanges({ textDocument: { uri: URI }, position: { line: 0, character: 4 } }, deps)).toBeNull()
  })

  it('offers to close a labeled open with its label among the code actions', async () => {
    const text = '{_axes a b }'
    const actions = await codeAction({ textDocument: { uri: URI }, range: { start: { line: 0, character: 3 }, end: { line: 0, character: 3 } }, context: { diagnostics: [] } } as never, depsFor(text))
    const close = actions.find((a) => a.title.startsWith('Close with its label'))
    expect(close?.edit?.changes?.[URI]?.[0]).toEqual({ range: { start: { line: 0, character: 12 }, end: { line: 0, character: 12 } }, newText: '_axes' })
  })
})

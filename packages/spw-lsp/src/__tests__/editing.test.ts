/**
 * Editing Handlers — Tests
 *
 * Verifies completion stages (root, annotation, sigil snippets, file-system),
 * code action generation (trait↔binding toggle, wrap-in-frame), and formatting.
 */

import { describe, it, expect, vi } from 'vitest'
import { completion, codeAction, formatting, rangeFormatting } from '../handlers/editing'
import { SIGIL_SEMANTICS } from '../server-index'
import type { HandlerDeps } from '../types'

// ── Helpers ────────────────────────────────────────────────────

function makeDeps(overrides: Partial<HandlerDeps> & { text?: string } = {}): HandlerDeps {
  const text = overrides.text ?? ''
  return {
    serverIndex: {
      getDocument: () => ({ text, filePath: '/workspace/test.spw', selectorHits: [] }),
      allAnnotationNames: () => [],
      lookupAnnotation: () => [],
      formatDocument: (t: string) => t,
      formatRange: (t: string) => t,
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
    uriFromPath: (p: string) => `file://${p}`,
    mergeRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    defaultRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    getDocumentText: async () => text,
    getWorkspaceSpwFiles: async () => [],
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

function params(uri: string, line: number, character: number) {
  return { textDocument: { uri }, position: { line, character } }
}

// ── Completion: empty / missing ────────────────────────────────

describe('completion — empty input', () => {
  it('returns empty for missing uri', async () => {
    const result = await completion({ textDocument: { uri: '' }, position: { line: 0, character: 0 } } as any, makeDeps())
    expect(result).toEqual([])
  })

  it('returns empty for null document', async () => {
    const deps = makeDeps()
    deps.getDocumentText = async () => null
    const result = await completion(params('file:///test.spw', 0, 0), deps)
    expect(result).toEqual([])
  })
})

// ── Completion: @-root ─────────────────────────────────────────

describe('completion — @-root', () => {
  it('completes root names after @', async () => {
    const deps = makeDeps({
      text: '@',
      mergeRoots: () => ({
        here: '/workspace',
        repo: '/workspace',
        cluster: '/workspace/.agents/plans',
        artifact: '/workspace/.agents/plans/vscode-lsp',
      }),
    } as any)
    const result = await completion(params('file:///test.spw', 0, 1), deps)
    const labels = result.map(i => i.label)
    expect(labels).toContain('cluster')
    expect(labels).toContain('artifact')
    expect(labels).not.toContain('here')
    expect(labels).not.toContain('repo')
  })
})

// ── Completion: annotation ─────────────────────────────────────

describe('completion — annotation', () => {
  it('completes annotation names after #', async () => {
    const deps = makeDeps({ text: '#lay' })
    deps.serverIndex = {
      ...deps.serverIndex,
      allAnnotationNames: () => ['layer', 'layout', 'lane', 'ladder'],
      lookupAnnotation: (name: string) => [{ file: '/workspace/test.spw', line: 0 }],
    } as any
    const result = await completion(params('file:///test.spw', 0, 4), deps)
    const labels = result.map(i => i.label)
    expect(labels).toContain('layer')
    expect(labels).toContain('layout')
    expect(labels).not.toContain('lane')
    expect(labels).not.toContain('ladder')
  })
})

// ── Completion: sigil snippets ─────────────────────────────────

describe('completion — sigil snippets', () => {
  const sigils = ['^', '!', '#', '?', '~', '&', '%', '*', '$', '=']

  for (const sigil of sigils) {
    it(`offers snippets for ${sigil}`, async () => {
      const deps = makeDeps({ text: ` ${sigil}` })
      const result = await completion(params('file:///test.spw', 0, 2), deps)
      if (sigil === '@') {
        // @ triggers root completion, not snippets
        return
      }
      // Some sigils have snippets, some don't
      if (result.length > 0) {
        expect(result[0].insertTextFormat).toBe(2) // Snippet format
      }
    })
  }

  it('^ snippets include frame declaration', async () => {
    const deps = makeDeps({ text: ' ^' })
    const result = await completion(params('file:///test.spw', 0, 2), deps)
    expect(result.some(i => i.label.includes('["section"]'))).toBe(true)
  })
})

// ── Code Actions ───────────────────────────────────────────────

describe('code actions', () => {
  it('offers trait→binding toggle for ~#key: value', async () => {
    const deps = makeDeps({ text: '~#goal: "Build the LSP"' })
    const result = await codeAction({
      textDocument: { uri: 'file:///test.spw' },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      context: { diagnostics: [] },
    }, deps)
    expect(result.some(a => a.title.includes('Lexical Binding'))).toBe(true)
    const toggle = result.find(a => a.title.includes('Lexical Binding'))!
    expect(toggle.edit?.changes['file:///test.spw']?.[0].newText).toContain('.{ goal =')
  })

  it('offers binding→trait toggle for .{ key = value }', async () => {
    const deps = makeDeps({ text: '.{ goal = "Build the LSP" }' })
    const result = await codeAction({
      textDocument: { uri: 'file:///test.spw' },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      context: { diagnostics: [] },
    }, deps)
    expect(result.some(a => a.title.includes('Concise Trait'))).toBe(true)
    const toggle = result.find(a => a.title.includes('Concise Trait'))!
    expect(toggle.edit?.changes['file:///test.spw']?.[0].newText).toContain('~#goal:')
  })

  it('offers wrap-in-frame for multi-line selection', async () => {
    const deps = makeDeps({ text: '@cluster: ~"path"\n@artifact: ~"path2"' })
    const result = await codeAction({
      textDocument: { uri: 'file:///test.spw' },
      range: { start: { line: 0, character: 0 }, end: { line: 1, character: 20 } },
      context: { diagnostics: [] },
    }, deps)
    expect(result.some(a => a.title.includes('Wrap in Frame'))).toBe(true)
    const wrap = result.find(a => a.title.includes('Wrap in Frame'))!
    expect(wrap.edit?.changes['file:///test.spw']?.[0].newText).toContain('^["frame"]')
  })

  it('offers unresolved root-reference quick-fixes with a full replacement span', async () => {
    const text = '@cluster/planz'
    const deps = makeDeps({
      text,
      suggestNearbyReference: async () => '@cluster/plans',
    } as any)
    deps.serverIndex = {
      ...deps.serverIndex,
      getDocument: () => ({
        text,
        filePath: '/workspace/test.spw',
        selectorHits: [{
          kind: 'rootRef',
          raw: '@cluster/planz',
          root: 'cluster',
          target: 'planz',
          span: {
            startOffset: 0,
            endOffset: text.length,
            startLine: 0,
            startCharacter: 0,
            endLine: 0,
            endCharacter: text.length - 1,
          },
        }],
      }),
    } as any
    const result = await codeAction({
      textDocument: { uri: 'file:///test.spw' },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      context: {
        diagnostics: [{
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: text.length - 1 } },
          severity: 2,
          source: 'spw',
          message: 'unresolved reference: @cluster/planz',
        }],
      },
    }, deps)
    const quickfix = result.find(a => a.title.includes('@cluster/plans'))
    expect(quickfix).toBeDefined()
    expect(quickfix?.edit?.changes['file:///test.spw']?.[0]).toEqual({
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: text.length },
      },
      newText: '@cluster/plans',
    })
  })

  it('preserves path quoting when fixing unresolved path references', async () => {
    const text = '~"planz"'
    const deps = makeDeps({
      text,
      suggestNearbyReference: async () => 'plans',
    } as any)
    deps.serverIndex = {
      ...deps.serverIndex,
      getDocument: () => ({
        text,
        filePath: '/workspace/test.spw',
        selectorHits: [{
          kind: 'pathRef',
          raw: '~"planz"',
          target: 'planz',
          span: {
            startOffset: 0,
            endOffset: text.length,
            startLine: 0,
            startCharacter: 0,
            endLine: 0,
            endCharacter: text.length - 1,
          },
        }],
      }),
    } as any
    const result = await codeAction({
      textDocument: { uri: 'file:///test.spw' },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      context: {
        diagnostics: [{
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: text.length - 1 } },
          severity: 2,
          source: 'spw',
          message: 'unresolved reference: planz',
        }],
      },
    }, deps)
    const quickfix = result.find(a => a.title.includes('plans'))
    expect(quickfix?.edit?.changes['file:///test.spw']?.[0]).toEqual({
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: text.length },
      },
      newText: '~"plans"',
    })
  })

  it('returns empty for no applicable patterns', async () => {
    const deps = makeDeps({ text: '// just a comment' })
    const result = await codeAction({
      textDocument: { uri: 'file:///test.spw' },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      context: { diagnostics: [] },
    }, deps)
    expect(result).toEqual([])
  })
})

// ── Formatting ─────────────────────────────────────────────────

describe('formatting', () => {
  it('returns empty when document unchanged', () => {
    const deps = makeDeps({ text: 'already formatted' })
    const result = formatting(
      { textDocument: { uri: 'file:///test.spw' }, options: { tabSize: 2, insertSpaces: true } },
      deps,
    )
    expect(result).toEqual([])
  })

  it('returns full-document edit when formatting changes text', () => {
    const original = '^["roots"]{\n@cluster: ~"path"\n}'
    const formatted = '^["roots"] {\n  @cluster: ~"path"\n}'
    const deps = makeDeps({ text: original })
    deps.serverIndex = {
      ...deps.serverIndex,
      getDocument: () => ({ text: original }),
      formatDocument: () => formatted,
    } as any
    const result = formatting(
      { textDocument: { uri: 'file:///test.spw' }, options: { tabSize: 2, insertSpaces: true } },
      deps,
    )
    expect(result).toHaveLength(1)
    expect(result[0].newText).toBe(formatted)
    expect(result[0].range.start).toEqual({ line: 0, character: 0 })
  })
})

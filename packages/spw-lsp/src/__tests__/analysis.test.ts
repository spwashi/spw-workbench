/**
 * Analysis Handlers — Tests
 *
 * Verifies diagnostic generation (brace physics, broken refs) and folding ranges.
 */

import { describe, it, expect, vi } from 'vitest'
import { publishDiagnostics, foldingRanges } from '../handlers/analysis'
import type { HandlerDeps, LspDiagnostic } from '../types'

// ── Helpers ────────────────────────────────────────────────────

function makeDeps(overrides: Partial<HandlerDeps> & { text?: string; filePath?: string } = {}): HandlerDeps & { diagnostics: LspDiagnostic[] } {
  const text = overrides.text ?? ''
  const filePath = overrides.filePath ?? '/workspace/test.spw'
  const diagnostics: LspDiagnostic[] = []
  return {
    diagnostics,
    serverIndex: {
      getDocument: () => ({ text, filePath, selectorHits: [], parseResult: null }),
      annotationsForFile: () => [],
      getProjectionsFromSpecOwner: () => [],
    },
    config: {
      inlayHints: { paths: true, annotations: true, frames: true },
      diagnostics: { unresolvedRefs: 'off', staleProjections: false },
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
    sendNotification: (_method: string, params: any) => {
      if (params?.diagnostics) diagnostics.push(...params.diagnostics)
    },
    log: () => {},
    trialRunSpw: () => ({ success: true }),
    loadObservableState: async () => ({}),
    observableState: null,
    observableStateLoadedAt: 0,
    ...overrides,
  } as unknown as HandlerDeps & { diagnostics: LspDiagnostic[] }
}

// ── Brace physics: unmatched braces ──────────────────────────

describe('diagnostics — unmatched braces', () => {
  it('reports unclosed opening brace', async () => {
    const deps = makeDeps({ text: '^["test"] {' })
    await publishDiagnostics('file:///test.spw', deps)
    const braceErrors = deps.diagnostics.filter(d => d.source === 'spw-physics' && d.message.includes('Unclosed'))
    expect(braceErrors.length).toBe(1)
    expect(braceErrors[0].range.start.line).toBe(0)
  })

  it('reports extra closing brace', async () => {
    const deps = makeDeps({ text: '}' })
    await publishDiagnostics('file:///test.spw', deps)
    const braceErrors = deps.diagnostics.filter(d => d.source === 'spw-physics' && d.message.includes('Unmatched closing'))
    expect(braceErrors.length).toBe(1)
    expect(braceErrors[0].range.start.line).toBe(0)
  })

  it('passes for balanced braces', async () => {
    const deps = makeDeps({ text: '^["test"] {\n  ~#key: value\n}' })
    await publishDiagnostics('file:///test.spw', deps)
    const braceErrors = deps.diagnostics.filter(d =>
      d.source === 'spw-physics' && (d.message.includes('Unclosed') || d.message.includes('Unmatched'))
    )
    expect(braceErrors.length).toBe(0)
  })

  it('ignores braces inside strings', async () => {
    const deps = makeDeps({ text: '~#key: "{ not a brace }"' })
    await publishDiagnostics('file:///test.spw', deps)
    const braceErrors = deps.diagnostics.filter(d =>
      d.source === 'spw-physics' && (d.message.includes('Unclosed') || d.message.includes('Unmatched'))
    )
    expect(braceErrors.length).toBe(0)
  })

  it('ignores braces inside quoted text that contains apostrophes', async () => {
    const deps = makeDeps({ text: '~#quote: "don\'t {"' })
    await publishDiagnostics('file:///test.spw', deps)
    const braceErrors = deps.diagnostics.filter(d =>
      d.source === 'spw-physics' && (d.message.includes('Unclosed') || d.message.includes('Unmatched'))
    )
    expect(braceErrors.length).toBe(0)
  })

  it('ignores braces after line comments', async () => {
    const deps = makeDeps({ text: '// { comment brace' })
    await publishDiagnostics('file:///test.spw', deps)
    const braceErrors = deps.diagnostics.filter(d =>
      d.source === 'spw-physics' && (d.message.includes('Unclosed') || d.message.includes('Unmatched'))
    )
    expect(braceErrors.length).toBe(0)
  })

  it('reports multiple unclosed braces', async () => {
    const deps = makeDeps({ text: '{\n  {\n    content' })
    await publishDiagnostics('file:///test.spw', deps)
    const braceErrors = deps.diagnostics.filter(d => d.source === 'spw-physics' && d.message.includes('Unclosed'))
    expect(braceErrors.length).toBe(2)
  })
})

// ── Brace physics: depth budget ──────────────────────────────

describe('diagnostics — depth budget', () => {
  it('warns when nesting exceeds 4', async () => {
    const deps = makeDeps({ text: '{\n{\n{\n{\n{\ncontent\n}\n}\n}\n}\n}' })
    await publishDiagnostics('file:///test.spw', deps)
    const depthWarnings = deps.diagnostics.filter(d => d.message.includes('Nesting depth'))
    expect(depthWarnings.length).toBe(1)
    expect(depthWarnings[0].message).toContain('5')
  })

  it('no warning at depth 4', async () => {
    const deps = makeDeps({ text: '{\n{\n{\n{\ncontent\n}\n}\n}\n}' })
    await publishDiagnostics('file:///test.spw', deps)
    const depthWarnings = deps.diagnostics.filter(d => d.message.includes('Nesting depth'))
    expect(depthWarnings.length).toBe(0)
  })
})

// ── Folding ranges ───────────────────────────────────────────

describe('folding ranges', () => {
  it('creates ranges for brace blocks', () => {
    const deps = makeDeps({ text: '^["test"] {\n  content\n}' })
    const ranges = foldingRanges({ textDocument: { uri: 'file:///test.spw' } }, deps)
    expect(ranges.length).toBe(1)
    expect(ranges[0]).toEqual({ startLine: 0, endLine: 2 })
  })

  it('handles nested brace blocks', () => {
    const deps = makeDeps({ text: '^["outer"] {\n  ^["inner"] {\n    content\n  }\n}' })
    const ranges = foldingRanges({ textDocument: { uri: 'file:///test.spw' } }, deps)
    expect(ranges.length).toBe(2)
  })

  it('creates comment folding for block comments', () => {
    const deps = makeDeps({ text: '/* start\n  middle\n  end */' })
    const ranges = foldingRanges({ textDocument: { uri: 'file:///test.spw' } }, deps)
    const commentRanges = ranges.filter(r => r.kind === 'comment')
    expect(commentRanges.length).toBe(1)
  })

  it('folds consecutive hash comments', () => {
    const deps = makeDeps({ text: '# line 1\n# line 2\n# line 3\ncontent' })
    const ranges = foldingRanges({ textDocument: { uri: 'file:///test.spw' } }, deps)
    const commentRanges = ranges.filter(r => r.kind === 'comment')
    expect(commentRanges.length).toBe(1)
    expect(commentRanges[0]).toEqual({ startLine: 0, endLine: 2, kind: 'comment' })
  })
})

/**
 * Path reference selection — navigation ergonomics
 *
 * Corpus-fit coverage for the three living path forms:
 *   ~"path"  |  ~<label>"path"  |  ~<.spw/...>  |  @root/path
 */

import { describe, it, expect } from 'vitest'
import {
  selectPathRefs,
  findPathRefAtPosition,
  isAnglePathLike,
} from '../spw-selector'
import { definition, documentLinks } from '../handlers/navigation'
import type { HandlerDeps } from '../types'

function makeDeps(overrides: Partial<HandlerDeps> & { text?: string } = {}): HandlerDeps {
  const text = overrides.text ?? ''
  return {
    serverIndex: {
      getDocument: () => ({ text, selectorHits: null }),
      allAnnotationNames: () => [],
      lookupAnnotation: () => [],
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
    uriFromPath: (p: string) => (p.startsWith('file://') ? p : `file://${p}`),
    mergeRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    defaultRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    getDocumentText: async () => text,
    getWorkspaceSpwFiles: async () => ['/test.spw'],
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

describe('isAnglePathLike', () => {
  it('accepts slash paths, dot-relative, and known extensions', () => {
    expect(isAnglePathLike('.spw/agents.spw')).toBe(true)
    expect(isAnglePathLike('./index.spw')).toBe(true)
    expect(isAnglePathLike('src/seed/docs/index.spw')).toBe(true)
    expect(isAnglePathLike('readme.md')).toBe(true)
  })

  it('rejects labels and pattern fragments', () => {
    expect(isAnglePathLike('core')).toBe(false)
    expect(isAnglePathLike('#.')).toBe(false)
    expect(isAnglePathLike('a*b')).toBe(false)
  })
})

describe('selectPathRefs — corpus path forms', () => {
  it('selects quoted tilde path', () => {
    const hits = selectPathRefs('@repo: ~".."')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ kind: 'pathRef', target: '..' })
  })

  it('selects labeled quoted path ~<label>"path"', () => {
    const hits = selectPathRefs('~<core>"../core/index.spw"')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({
      kind: 'pathRef',
      target: '../core/index.spw',
      raw: '~<core>"../core/index.spw"',
    })
  })

  it('selects angle path without quotes (nearest-neighbor form)', () => {
    const hits = selectPathRefs('  ~<.spw/agents.spw>  // nearest neighbor')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({
      kind: 'pathRef',
      target: '.spw/agents.spw',
      raw: '~<.spw/agents.spw>',
    })
  })

  it('does not treat bare ~<label> as a path', () => {
    const hits = selectPathRefs('~<core> alone')
    expect(hits.filter((h) => h.kind === 'pathRef')).toHaveLength(0)
  })

  it('selects @root/path', () => {
    const hits = selectPathRefs('memory: @spw/harness/memory-surface.spw')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({
      kind: 'rootRef',
      root: 'spw',
      target: 'harness/memory-surface.spw',
    })
  })

  it('selects multiple path forms on one line', () => {
    const hits = selectPathRefs('~#inputs: [@spw/topology.spw, ~"../docs", ~<.spw/index.spw>]')
    const kinds = hits.map((h) => h.kind).sort()
    expect(hits.length).toBeGreaterThanOrEqual(3)
    expect(kinds).toContain('rootRef')
    expect(kinds).toContain('pathRef')
  })

  it('findPathRefAtPosition hits the full angle path span', () => {
    const source = '~<.spw/agents.spw>'
    const hits = selectPathRefs(source)
    // Cursor on the middle of the path body
    const hit = findPathRefAtPosition(hits, 0, 5)
    expect(hit).not.toBeNull()
    expect(hit!.target).toBe('.spw/agents.spw')
  })
})

describe('definition + documentLinks for angle paths', () => {
  it('definition resolves angle path via resolveReferencePath', async () => {
    const text = '~<.spw/agents.spw>'
    const deps = makeDeps({ text })
    deps.resolveReferencePath = async (hit) => {
      expect(hit.kind).toBe('pathRef')
      expect(hit.target).toBe('.spw/agents.spw')
      return '/workspace/.spw/agents.spw'
    }
    const result = await definition(
      { textDocument: { uri: 'file:///test.spw' }, position: { line: 0, character: 4 } },
      deps,
    )
    expect(result).toHaveLength(1)
    expect(result![0].uri).toBe('file:///workspace/.spw/agents.spw')
  })

  it('documentLinks emits clickable range for angle path', async () => {
    const text = '  ~<.spw/agents.spw>'
    const deps = makeDeps({ text })
    deps.resolveReferencePath = async () => '/workspace/.spw/agents.spw'
    const links = await documentLinks({ textDocument: { uri: 'file:///test.spw' } }, deps)
    expect(links).toHaveLength(1)
    expect(links[0].range.start.character).toBe(2)
    expect(links[0].target).toBe('file:///workspace/.spw/agents.spw')
  })

  it('documentLinks emits half-open range for @root/path (end exclusive)', async () => {
    const text = '@biome/algos/geom.spw'
    const deps = makeDeps({ text })
    deps.resolveReferencePath = async () => '/workspace/.spw/biome/ocean/algos/geom.spw'
    const links = await documentLinks({ textDocument: { uri: 'file:///test.spw' } }, deps)
    expect(links).toHaveLength(1)
    expect(links[0].range.start.character).toBe(0)
    // LSP Range.end is exclusive — one past last character of the path unit
    expect(links[0].range.end.character).toBe(text.length)
  })

  it('selectPathRefs spans are half-open [start, end)', () => {
    const text = '~"plans/index.spw"'
    const hits = selectPathRefs(text)
    expect(hits).toHaveLength(1)
    expect(hits[0].span.startCharacter).toBe(0)
    expect(hits[0].span.endCharacter).toBe(text.length)
    expect(hits[0].span.endOffset).toBe(text.length)
    // Cursor on last character is inside; cursor at end is outside
    expect(findPathRefAtPosition(hits, 0, text.length - 1)).not.toBeNull()
    expect(findPathRefAtPosition(hits, 0, text.length)).toBeNull()
  })
})

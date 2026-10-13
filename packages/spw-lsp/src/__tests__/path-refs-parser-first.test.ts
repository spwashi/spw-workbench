/**
 * Citations read from the parser first.
 *
 * A path written inside a string, a backtick phrase or a comment is text, so
 * it is never a citation; the text fallback runs only where the parse failed,
 * and what it finds there is marked recovered. Spans stay exact.
 */

import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parse } from '@spwashi/spw-seed'
import { selectPathRefs } from '../spw-selector'
import { publishDiagnostics } from '../handlers/analysis'
import { codeLens, inlayHints } from '../handlers/display'
import { ServerIndex } from '../server-index'
import { DEFAULT_CONFIG, type HandlerDeps, type LspDiagnostic } from '../types'

const TEST_URI = 'file:///workspace/docs/learn/quest.spw'
const TEST_PATH = '/workspace/docs/learn/quest.spw'

interface SiblingFile { path: string; text: string }

function makeDeps(text: string, siblings: SiblingFile[] = []): HandlerDeps & { diagnostics: LspDiagnostic[] } {
  const serverIndex = new ServerIndex('/workspace')
  serverIndex.openDocument(TEST_URI, TEST_PATH, text, 1)
  serverIndex.saveDocument(TEST_URI)
  for (const sibling of siblings) {
    const uri = `file://${sibling.path}`
    serverIndex.openDocument(uri, sibling.path, sibling.text, 1)
    serverIndex.saveDocument(uri)
  }
  const diagnostics: LspDiagnostic[] = []
  return {
    diagnostics,
    serverIndex,
    config: { ...DEFAULT_CONFIG, diagnostics: { unresolvedRefs: 'warning', staleProjections: false } },
    workspaceRoot: '/workspace',
    pathFromUri: (uri: string) => uri.replace('file://', ''),
    uriFromPath: (filePath: string) => `file://${filePath}`,
    // Nothing resolves: every citation the selector reports becomes a diagnostic.
    resolveReferencePath: async () => null,
    suggestNearbyReference: async () => null,
    defaultRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    mergeRoots: () => ({ here: '/workspace', repo: '/workspace' }),
    getDocumentText: async () => text,
    getWorkspaceSpwFiles: async () => [],
    mapWithConcurrency: async (items: any[], _c: number, fn: any) => Promise.all(items.map(fn)),
    sendNotification: (_method: string, params: any) => {
      if (params?.diagnostics) diagnostics.push(...params.diagnostics)
    },
    log: () => {},
    trialRunSpw: () => ({ success: true }),
    loadObservableState: async () => ({}),
    observableState: null,
    observableStateLoadedAt: 0,
  } as unknown as HandlerDeps & { diagnostics: LspDiagnostic[] }
}

/** The quest's point step: its try line quotes a citation as an example. */
const POINT_STEP = [
  ' point: .{',
  '  scene = `(kitchen)`',
  '  speaker = `@yesterday`',
  '  try = `@yesterday: ~"./yesterday.spw"`',
  '  reads = "@ says from where you are looking. ~ keeps yesterday\'s page within reach without opening it."',
  '  grow = "Link your pages; spw resolve reports every citation."',
  ' }[reg=facet]',
  ' learn: ~"./index.spw"',
].join('\n')

describe('selectPathRefs — the parser decides what is a citation', () => {
  it('does not read a citation quoted as an example inside a backtick phrase', () => {
    expect(selectPathRefs('try = `@yesterday: ~"./yesterday.spw"`')).toEqual([])
  })

  it('reads only the real citation in the quest point step', () => {
    const hits = selectPathRefs(POINT_STEP)
    expect(hits.map((hit) => hit.raw)).toEqual(['~"./index.spw"'])
    expect(hits[0].recovered).toBeFalsy()
  })

  it('does not stitch a citation across two strings', () => {
    // The text fallback read `~", lean: "` here as a path to a file named `, lean: `.
    expect(selectPathRefs('form: "=~", lean: #mixed, prior: "a regex match"')).toEqual([])
  })

  it('does not read citations inside comments or strings', () => {
    const source = [
      '^["plan"]{',
      ' # needs: [~"../other/wip.spw"]',
      ' note: "see ~<.spw/index.spw> and @spw/harness/memory.spw"',
      ' real: ~"./real.spw"',
      '}',
    ].join('\n')
    expect(selectPathRefs(source).map((hit) => hit.target)).toEqual(['./real.spw'])
  })

  it('keeps the labeled form ~<label>"path" from the token stream', () => {
    const source = ' .. ~<research>"./spw/design-research.spw" # Phase profiles'
    const hits = selectPathRefs(source)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ kind: 'pathRef', target: './spw/design-research.spw', raw: '~<research>"./spw/design-research.spw"' })
    expect(hits[0].span.startCharacter).toBe(4)
    expect(hits[0].span.endCharacter).toBe(4 + hits[0].raw.length)
  })

  it('keeps exact spans for path and root refs', () => {
    const source = 'a: [~"x.spw", @r/y.spw]'
    const hits = selectPathRefs(source)
    expect(hits.map((hit) => [hit.kind, hit.raw, hit.span.startOffset, hit.span.endOffset])).toEqual([
      ['pathRef', '~"x.spw"', 4, 12],
      ['rootRef', '@r/y.spw', 14, 22],
    ])
    for (const hit of hits) expect(source.slice(hit.span.startOffset, hit.span.endOffset)).toBe(hit.raw)
  })

  it('keeps a wildcard root ref whole', () => {
    const [hit] = selectPathRefs('x: @spw/harness/*')
    expect(hit).toMatchObject({ kind: 'rootRef', root: 'spw', target: 'harness/*', raw: '@spw/harness/*' })
    const [glob] = selectPathRefs(' @src/app/components/**/*.spw # per-component docs')
    expect(glob).toMatchObject({ root: 'src', target: 'app/components/**/*.spw', raw: '@src/app/components/**/*.spw' })
  })

  it('reads a root ref as written, hyphens and all', () => {
    const [hit] = selectPathRefs(' @lib/spw-v0.1.0-alpha/ # archive')
    expect(hit).toMatchObject({ root: 'lib', target: 'spw-v0.1.0-alpha/', raw: '@lib/spw-v0.1.0-alpha/' })
  })

  it('maps spans back through a dialect that collapses whitespace', () => {
    const source = '@dialect:Spw.l\n^"a"{\n   ~"f.spw"\n}\n'
    expect(parse(source).dialectPreprocessed).toBe(true)
    const [hit] = selectPathRefs(source)
    expect(hit.raw).toBe('~"f.spw"')
    expect(hit.span).toMatchObject({ startLine: 2, startCharacter: 3, endLine: 2, endCharacter: 11 })
  })

  it('reuses a parse it is handed', () => {
    const source = 'learn: ~"./index.spw"'
    expect(selectPathRefs(source, parse(source))).toEqual(selectPathRefs(source))
  })
})

describe('selectPathRefs — recovery where the parse failed', () => {
  it('reads a stretch the prose fallback dropped, and marks it recovered', () => {
    const source = 'x }} ~"b.spw" {'
    expect(parse(source).completeness.proseFallback).toBe(true)
    const hits = selectPathRefs(source)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ target: 'b.spw', raw: '~"b.spw"', recovered: true })
    expect(hits[0].span).toMatchObject({ startOffset: 5, endOffset: 13 })
  })

  it('still skips phrases and comments inside a failed stretch', () => {
    const source = 'x }} `~"q.spw"` # c ~"r.spw"\n ~"u.spw" {'
    const hits = selectPathRefs(source)
    expect(hits.map((hit) => hit.target)).toEqual(['u.spw'])
  })

  it('leaves expressions the fallback still recognised unrecovered', () => {
    const source = 'a: "x" ~"g.spw" ]]] ~"h.spw"'
    const hits = selectPathRefs(source)
    expect(hits.map((hit) => [hit.target, Boolean(hit.recovered)])).toEqual([
      ['g.spw', false],
      ['h.spw', false],
    ])
  })

  it('reads the whole document as text when the parse threw', () => {
    const hits = selectPathRefs('see ~"a.spw" and @spw/b.spw', null)
    expect(hits.map((hit) => [hit.raw, hit.recovered])).toEqual([
      ['~"a.spw"', true],
      ['@spw/b.spw', true],
    ])
  })
})

describe('the index remembers citations per content', () => {
  it('reads the scan parse once and parses again only when the text moves', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'spw-citations-'))
    try {
      const file = path.join(dir, 'a.spw')
      const text = 'learn: ~"./b.spw"\n'
      writeFileSync(file, text)
      const index = new ServerIndex(dir)
      await index.refreshFileAnnotations(file)

      const first = index.citationsFor(file, text)
      expect(first.map((hit) => hit.target)).toEqual(['./b.spw'])
      expect(index.citationsFor(file, text)).toBe(first)
      expect(index.citationsFor(file, 'learn: ~"./c.spw"\n').map((hit) => hit.target)).toEqual(['./c.spw'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('handlers follow the parser', () => {
  it('flags no unresolved reference for an example quoted in a phrase', async () => {
    const deps = makeDeps(POINT_STEP)
    await publishDiagnostics(TEST_URI, deps)
    const unresolved = deps.diagnostics.filter((d) => d.message.startsWith('unresolved reference:'))
    expect(unresolved.map((d) => d.message)).toEqual(['unresolved reference: ./index.spw'])
    expect(unresolved[0].range.start).toEqual({ line: 7, character: 8 })
  })

  it('says when an unresolved reference was recovered from unparsed text', async () => {
    const deps = makeDeps('x }} ~"b.spw" {')
    await publishDiagnostics(TEST_URI, deps)
    const [unresolved] = deps.diagnostics.filter((d) => d.message.startsWith('unresolved reference:'))
    expect(unresolved.message).toContain('recovered')
  })

  it('gives an anchor quoted in a phrase or string no lens and no incoming count', async () => {
    const text = [
      '#>real_anchor',
      ' name: .{',
      '  try = `#>my_notes`',
      '  reads = "#>quoted_anchor gives the page a name"',
      ' }',
    ].join('\n')
    // Other surfaces declare both names, so a lens on a quoted mention would count them.
    const deps = makeDeps(text, [
      { path: '/workspace/notes.spw', text: '#>my_notes\n#>quoted_anchor\n#>real_anchor\n' },
    ])

    const lenses = codeLens({ textDocument: { uri: TEST_URI } }, deps)
    const anchorLines = lenses
      .filter((lens) => /anchor|file ref/.test(lens.command?.title ?? ''))
      .map((lens) => lens.range.start.line)
    expect(anchorLines).toEqual([0])

    const hints = await inlayHints({
      textDocument: { uri: TEST_URI },
      range: { start: { line: 1, character: 0 }, end: { line: 4, character: 0 } },
    }, deps)
    expect(hints.filter((hint) => hint.label.includes('incoming'))).toEqual([])
  })
})

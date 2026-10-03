/**
 * Fragment navigation — `~"file#anchor"` addresses a node, so going to its
 * definition should land on the anchor, not the top of the page.
 *
 * These tests use real files. Go to definition reads an unindexed target by
 * parsing it, so the definition tests leave the target unindexed. A link
 * listing reads only the index and never parses, so the link tests index
 * their targets first. Where the line comes from when the server has already
 * indexed the target is covered in fragment-anchor-index.test.ts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { definition, documentLinks, references } from '../handlers/navigation'
import { pathFromUri, resolveReferencePath, splitAnchor, uriFromPath } from '../helpers'
import { ServerIndex } from '../server-index'
import { DEFAULT_CONFIG } from '../types'
import type { HandlerDeps } from '../types'
import type { AnnotationEntry } from '../server-index'
import type { SpwSelectorHit } from '../spw-selector'

let dir: string
let targetPath: string

const TARGET = [
  '# A registry with two anchors.', // 0
  '', //                               1
  '#>first_anchor', //                 2
  '^["one"]{', //                      3
  '}', //                              4
  '', //                               5
  '#>second_anchor', //                6
  '^["two"]{', //                      7
  '}', //                              8
].join('\n')

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-fragment-'))
  targetPath = path.join(dir, 'registry.spw')
  await fs.writeFile(targetPath, TARGET, 'utf8')
})

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

const CITING_URI = 'file:///test.spw'

/** The citing buffer for its own URI; anything else is read from disk. */
function bufferThenDisk(citingUri: string, text: string) {
  return async (uri: string): Promise<string | null> => {
    if (uri === citingUri) return text
    const p = pathFromUri(uri)
    return p ? fs.readFile(p, 'utf8').catch(() => null) : null
  }
}

/** The anchors a workspace scan of TARGET records, with 0-indexed lines. */
function targetAnchors(): AnnotationEntry[] {
  return [
    { file: targetPath, line: 2, kind: 'anchor', name: 'first_anchor', framePath: [] },
    { file: targetPath, line: 6, kind: 'anchor', name: 'second_anchor', framePath: [] },
  ]
}

function makeDeps(text: string, { indexed = false } = {}): HandlerDeps {
  return {
    serverIndex: {
      // Only the citing surface is open; the target is indexed only on request.
      getDocument: (uri: string) => (uri === CITING_URI ? { text, selectorHits: null, annotations: [] } : null),
      allDocuments: () => new Map(),
      annotationsForFile: (p: string) => (indexed && p === targetPath ? targetAnchors() : []),
    },
    pathFromUri: (uri: string) => uri.replace('file://', ''),
    uriFromPath: (p: string) => (p.startsWith('file://') ? p : `file://${p}`),
    getDocumentText: bufferThenDisk(CITING_URI, text),
    // The path resolves; only the fragment is under test here. Like the real
    // helper, the resolved path carries the target's `#fragment` back out.
    resolveReferencePath: async (hit: SpwSelectorHit) => `${targetPath}${splitAnchor(hit.target).hash}`,
  } as unknown as HandlerDeps
}

const AT_REF = { textDocument: { uri: CITING_URI }, position: { line: 0, character: 10 } }

describe('definition — fragments land on their anchor', () => {
  it('jumps to the line the deixis anchor marks', async () => {
    const source = `=ref{ ~"${targetPath}#second_anchor" }`
    const result = await definition(AT_REF, makeDeps(source))

    expect(result).not.toBeNull()
    expect(result![0]!.range.start.line).toBe(6)
  })

  it('distinguishes two anchors in the same surface', async () => {
    const first = await definition(AT_REF, makeDeps(`=ref{ ~"${targetPath}#first_anchor" }`))
    const second = await definition(AT_REF, makeDeps(`=ref{ ~"${targetPath}#second_anchor" }`))

    expect(first![0]!.range.start.line).toBe(2)
    expect(second![0]!.range.start.line).toBe(6)
  })

  it('points the location at the file, not at the raw fragment', async () => {
    const result = await definition(AT_REF, makeDeps(`=ref{ ~"${targetPath}#second_anchor" }`))
    expect(result![0]!.uri).toBe(`file://${targetPath}`)
  })

  it('opens the file when the reference names no fragment', async () => {
    const result = await definition(AT_REF, makeDeps(`=ref{ ~"${targetPath}" }`))
    expect(result![0]!.range.start.line).toBe(0)
  })

  it('still opens the file when the anchor is stale', async () => {
    // A dangling fragment should navigate somewhere useful, not fail.
    const result = await definition(AT_REF, makeDeps(`=ref{ ~"${targetPath}#removed_anchor" }`))
    expect(result![0]!.uri).toBe(`file://${targetPath}`)
    expect(result![0]!.range.start.line).toBe(0)
  })
})

describe('documentLinks — anchored targets carry their line', () => {
  it('appends the anchor line so a click lands on it', async () => {
    const source = `=ref{ ~"${targetPath}#second_anchor" }`
    const [link] = await documentLinks({ textDocument: { uri: CITING_URI } }, makeDeps(source, { indexed: true }))
    expect(link!.target).toBe(`file://${targetPath}#L7`)
  })

  it('links an unindexed target to the file instead of parsing it', async () => {
    const source = `=ref{ ~"${targetPath}#second_anchor" }`
    const [link] = await documentLinks({ textDocument: { uri: CITING_URI } }, makeDeps(source))
    expect(link!.target).toBe(`file://${targetPath}`)
  })

  it('leaves an unanchored target bare', async () => {
    const source = `=ref{ ~"${targetPath}" }`
    const [link] = await documentLinks({ textDocument: { uri: CITING_URI } }, makeDeps(source))
    expect(link!.target).toBe(`file://${targetPath}`)
  })

  it('drops a stale anchor rather than leaking it into the link', async () => {
    const source = `=ref{ ~"${targetPath}#removed_anchor" }`
    const [link] = await documentLinks({ textDocument: { uri: CITING_URI } }, makeDeps(source, { indexed: true }))
    expect(link!.target).toBe(`file://${targetPath}`)
  })
})

// ── Real resolution ─────────────────────────────────────────────
// No stubbed resolver: the selector, `resolveReferencePath`, and the URI
// helpers are the ones the server wires, so the fragment makes the whole
// round trip — split off by the resolver, re-attached to its answer, and
// read back as an anchor by the handler.

const CLAIMS = [
  '#>seidel_five', //                  0
  '^"claim"{', //                      1
  ' text: "five aberrations"', //      2
  ' ^"refinements"{', //               3
  '  #>seidel_coma', //                4
  '  ^"coma"{', //                     5
  '   ^"conditions"{', //              6
  '    #>seidel_coma_abbe', //         7
  '    ^"abbe_sine"{', //              8
  '     text: "offense against the sine condition"', // 9
  '    }', //                          10
  '   }', //                           11
  '  }', //                            12
  ' }', //                             13
  '}', //                              14
].join('\n')

function realDeps(workspaceRoot: string, citingPath: string, text: string): HandlerDeps {
  const serverIndex = new ServerIndex(workspaceRoot)
  return {
    serverIndex,
    pathFromUri,
    uriFromPath,
    getDocumentText: bufferThenDisk(uriFromPath(citingPath), text),
    resolveReferencePath: (
      hit: SpwSelectorHit,
      source: string,
      docPath: string,
      options?: { allowDirectory?: boolean },
    ) => resolveReferencePath(hit, source, docPath, workspaceRoot, DEFAULT_CONFIG, serverIndex, options),
  } as unknown as HandlerDeps
}

/** Go to the definition of the first path ref on line 0 of `source`, cited from `citingPath`. */
async function defineFrom(workspaceRoot: string, citingPath: string, source: string) {
  const params = { textDocument: { uri: uriFromPath(citingPath) }, position: { line: 0, character: 10 } }
  return definition(params, realDeps(workspaceRoot, citingPath, source))
}

/** Links from `citingPath` once the workspace is scanned; a listing reads only the index. */
async function linksFrom(workspaceRoot: string, citingPath: string, source: string) {
  const deps = realDeps(workspaceRoot, citingPath, source)
  await (deps.serverIndex as ServerIndex).scanWorkspace()
  return documentLinks({ textDocument: { uri: uriFromPath(citingPath) } }, deps)
}

describe('real resolution — nested anchors land on their line', () => {
  let root: string
  let claimsPath: string
  let citingPath: string
  let labClaims: string

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-fragment-real-'))
    await fs.mkdir(path.join(root, 'optics', 'lenses'), { recursive: true })
    claimsPath = path.join(root, 'optics', 'aberrations.spw')
    citingPath = path.join(root, 'optics', 'index.spw')
    await fs.writeFile(claimsPath, CLAIMS, 'utf8')

    // A directory whose own name carries a `#` — the fragment must be told
    // apart from it.
    const lab = path.join(root, 'c#lab')
    await fs.mkdir(lab, { recursive: true })
    labClaims = path.join(lab, 'aberrations.spw')
    await fs.writeFile(labClaims, CLAIMS, 'utf8')
  })

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('the real resolver re-attaches the fragment the handler must strip', async () => {
    // Pins the contract the handler relies on: if the resolver ever stops
    // returning `file#anchor`, the stubbed tests above stop mirroring it.
    const serverIndex = new ServerIndex(root)
    const hit = {
      kind: 'pathRef',
      raw: '~"./aberrations.spw#seidel_coma_abbe"',
      target: './aberrations.spw#seidel_coma_abbe',
      span: { startLine: 0, startCharacter: 0, endLine: 0, endCharacter: 0 },
    } as unknown as SpwSelectorHit
    const resolved = await resolveReferencePath(hit, '', citingPath, root, DEFAULT_CONFIG, serverIndex)
    expect(resolved).toBe(`${claimsPath}#seidel_coma_abbe`)
  })

  it('goes to a deeply nested anchor from a file-relative ref', async () => {
    const result = await defineFrom(root, citingPath, `=ref{ ~"./aberrations.spw#seidel_coma_abbe" }`)

    expect(result).not.toBeNull()
    expect(result![0]!.uri).toBe(uriFromPath(claimsPath))
    expect(result![0]!.range.start.line).toBe(7)
  })

  it('distinguishes nesting levels within one file', async () => {
    const top = await defineFrom(root, citingPath, `=ref{ ~"./aberrations.spw#seidel_five" }`)
    const mid = await defineFrom(root, citingPath, `=ref{ ~"./aberrations.spw#seidel_coma" }`)

    expect(top![0]!.range.start.line).toBe(0)
    expect(mid![0]!.range.start.line).toBe(4)
  })

  it('goes to the anchor through the workspace-root fallback', async () => {
    // Root-relative paths (as canon-mount writes its bias edges) miss the
    // file-relative lookup and resolve against the workspace root instead.
    const result = await defineFrom(root, citingPath, `=ref{ ~"optics/aberrations.spw#seidel_coma_abbe" }`)

    expect(result![0]!.uri).toBe(uriFromPath(claimsPath))
    expect(result![0]!.range.start.line).toBe(7)
  })

  it('goes to the anchor when the resolver infers the extension', async () => {
    // `./aberrations#…` has no extension: the resolver appends `.spw` before
    // re-attaching the fragment, so the suffix still sits at the very end.
    const result = await defineFrom(root, citingPath, `=ref{ ~"./aberrations#seidel_coma_abbe" }`)

    expect(result![0]!.uri).toBe(uriFromPath(claimsPath))
    expect(result![0]!.range.start.line).toBe(7)
  })

  it('opens a directory target bare when it carries a fragment', async () => {
    // A directory with no index resolves without its hash; the handler must
    // leave that path whole and fall back to the start.
    const lenses = path.join(root, 'optics', 'lenses')
    const source = `=ref{ ~"./lenses#seidel_coma" }`
    const result = await defineFrom(root, citingPath, source)
    const [link] = await linksFrom(root, citingPath, source)

    expect(result![0]!.uri).toBe(uriFromPath(lenses))
    expect(result![0]!.range.start.line).toBe(0)
    expect(link!.target).toBe(uriFromPath(lenses))
  })

  it('links carry the anchor as a 1-based #L line on a bare file URI', async () => {
    const source = `=ref{ ~"./aberrations.spw#seidel_coma_abbe" } =ref{ ~"./aberrations.spw" }`
    const links = await linksFrom(root, citingPath, source)

    expect(links.map((link) => link.target)).toEqual([
      `${uriFromPath(claimsPath)}#L8`,
      uriFromPath(claimsPath),
    ])
  })

  it('keeps a `#` that belongs to a directory above the citing file', async () => {
    // Only the target's own fragment is an anchor; a first-`#` split of the
    // resolved path would cut `c#lab/` down to `c`.
    const citing = path.join(path.dirname(labClaims), 'index.spw')
    const source = `=ref{ ~"./aberrations.spw#seidel_coma_abbe" }`
    const result = await defineFrom(root, citing, source)
    const [link] = await linksFrom(root, citing, source)

    expect(result![0]!.uri).toBe(uriFromPath(labClaims))
    expect(result![0]!.range.start.line).toBe(7)
    expect(link!.target).toBe(`${uriFromPath(labClaims)}#L8`)
  })
})

// ── References ──────────────────────────────────────────────────
// References compare files, not anchors: every citation of the same file is
// a reference, whatever node it points into. The comparison must strip only
// each citation's own fragment — a first-`#` split would cut every path under
// a `c#…` directory down to the same prefix and call them all equal.

describe('references — anchored citations compare by file', () => {
  let root: string
  let files: string[]

  const write = async (rel: string, text: string) => {
    const full = path.join(root, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, text, 'utf8')
    return full
  }

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-fragment-refs-'))
    files = [
      await write('c#lab/aberrations.spw', CLAIMS),
      await write('c#lab/index.spw', `=ref{ ~"./aberrations.spw#seidel_coma_abbe" }`),
      await write('c#lab/peer.spw', [
        `=ref{ ~"./aberrations.spw" }`, //                0 — same file, no anchor
        `=ref{ ~"./aberrations.spw#seidel_five" }`, //    1 — same file, other anchor
        `=ref{ ~"./coma.spw" }`, //                       2 — other file, same dir
      ].join('\n')),
      await write('c#lab/coma.spw', '#>coma\n^"coma"{\n}'),
      // Same basename, sibling `c#…` directory: a different file.
      await write('c#dev/aberrations.spw', CLAIMS),
      await write('c#dev/index.spw', `=ref{ ~"./aberrations.spw#seidel_coma_abbe" }`),
    ]
  })

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  function refDeps(): HandlerDeps {
    const serverIndex = new ServerIndex(root)
    return {
      serverIndex,
      pathFromUri,
      uriFromPath,
      getDocumentText: async (uri: string) => {
        const p = pathFromUri(uri)
        return p ? fs.readFile(p, 'utf8').catch(() => null) : null
      },
      getWorkspaceSpwFiles: async () => files,
      mapWithConcurrency: async <T, R>(items: T[], _c: number, fn: (item: T) => Promise<R>) =>
        Promise.all(items.map(fn)),
      resolveReferencePath: (
        hit: SpwSelectorHit,
        source: string,
        docPath: string,
        options?: { allowDirectory?: boolean },
      ) => resolveReferencePath(hit, source, docPath, root, DEFAULT_CONFIG, serverIndex, options),
    } as unknown as HandlerDeps
  }

  it('finds every citation of the file under a `#` directory, and nothing else', async () => {
    const citing = path.join(root, 'c#lab', 'index.spw')
    const params = { textDocument: { uri: uriFromPath(citing) }, position: { line: 0, character: 10 } }
    const result = await references(params, refDeps())

    const peer = uriFromPath(path.join(root, 'c#lab', 'peer.spw'))
    expect(result.map((loc) => `${loc.uri}:${loc.range.start.line}`).sort()).toEqual([
      `${uriFromPath(citing)}:0`,
      `${peer}:0`,
      `${peer}:1`,
    ].sort())
  })
})

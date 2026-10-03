/**
 * Fragment anchors come from the index — `~"file#anchor"` must be cheap.
 *
 * A reference cut carries thousands of anchored refs, and documentLinks
 * resolves every one on every request. The anchor line is already in the
 * server's annotation index, so an indexed target must land without a parse,
 * an open buffer must win over the saved file, a link listing must never
 * parse, and go to definition may parse an unindexed target at most once per
 * file version. A name the index saw more than once is the one case it cannot
 * settle alone, so the seed does.
 *
 * `parse` is wrapped in a spy; calls are counted by the text they parse, so
 * the index's own scans and the citing file's selector work do not count.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse, resolveFragment } from '@spwashi/spw-seed'
import { definition, documentLinks } from '../handlers/navigation'
import { clearParsedAnchorLines } from '../anchor-lines'
import { getDocumentText, pathFromUri, resolveReferencePath, uriFromPath } from '../helpers'
import { ServerIndex } from '../server-index'
import { DEFAULT_CONFIG } from '../types'
import type { HandlerDeps } from '../types'
import type { SpwSelectorHit } from '../spw-selector'

vi.mock('@spwashi/spw-seed', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@spwashi/spw-seed')>()
  return { ...actual, parse: vi.fn(actual.parse) }
})

const parseSpy = vi.mocked(parse)

/** How many times `text` itself was parsed since the spy was last cleared. */
function parsesOf(text: string): number {
  return parseSpy.mock.calls.filter(([input]) => input === text).length
}

const TARGET = [
  '#>alpha', //       0
  '^"alpha"{', //     1
  '}', //             2
  '', //              3
  '#>beta', //        4
  '^"beta"{', //      5
  '}', //             6
].join('\n')

/** The target as typed but not yet saved: a new anchor, and `beta` moved down. */
const BUFFER = [
  '#>alpha', //       0
  '^"alpha"{', //     1
  '}', //             2
  '#>gamma', //       3
  '^"gamma"{', //     4
  '}', //             5
  '', //              6
  '#>beta', //        7
  '^"beta"{', //      8
  '}', //             9
].join('\n')

/**
 * A name mentioned in a stream entry before its anchor. The index reads every
 * `#>` token, so it sees `target` twice; the seed binds only the second.
 */
const MENTIONED = [
  ' >>[2026-01-01 00:00] note — see #>target below', // 0  a mention, not a binding
  '#>target', //                                         1
  '^"target"{', //                                       2
  '}', //                                                3
  '', //                                                 4
  '#>solo', //                                           5
  '^"solo"{', //                                         6
  '}', //                                                7
].join('\n')

let root: string
let targetPath: string
let citingPath: string
let mentionedPath: string

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-fragment-index-'))
  await fs.mkdir(path.join(root, 'notes'), { recursive: true })
  targetPath = path.join(root, 'notes', 'target.spw')
  citingPath = path.join(root, 'notes', 'index.spw')
  mentionedPath = path.join(root, 'notes', 'mentioned.spw')
  await fs.writeFile(targetPath, TARGET, 'utf8')
  await fs.writeFile(mentionedPath, MENTIONED, 'utf8')
  await fs.writeFile(citingPath, '=ref{ ~"./target.spw#beta" }', 'utf8')
})

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

beforeEach(() => {
  clearParsedAnchorLines()
})

/** Deps wired as the stdio server wires them: buffer-first text, real resolver. */
function serverDeps(serverIndex: ServerIndex, overrides: Partial<HandlerDeps> = {}): HandlerDeps {
  return {
    serverIndex,
    pathFromUri,
    uriFromPath,
    getDocumentText: (uri: string) => getDocumentText(uri, serverIndex),
    resolveReferencePath: (
      hit: SpwSelectorHit,
      source: string,
      docPath: string,
      options?: { allowDirectory?: boolean },
    ) => resolveReferencePath(hit, source, docPath, root, DEFAULT_CONFIG, serverIndex, options),
    ...overrides,
  } as unknown as HandlerDeps
}

async function scannedIndex(): Promise<ServerIndex> {
  const serverIndex = new ServerIndex(root)
  await serverIndex.scanWorkspace()
  return serverIndex
}

const AT_REF = () => ({ textDocument: { uri: uriFromPath(citingPath) }, position: { line: 0, character: 10 } })

/** Go to definition from the citing file, its buffer rewritten to cite `ref`. */
async function jumpLine(serverIndex: ServerIndex, ref: string): Promise<number> {
  const deps = serverDeps(serverIndex, {
    getDocumentText: async (uri: string) =>
      uri === uriFromPath(citingPath) ? `=ref{ ~"${ref}" }` : getDocumentText(uri, serverIndex),
  } as Partial<HandlerDeps>)
  return (await definition(AT_REF(), deps))![0]!.range.start.line
}

describe('anchor lines — the index answers before any parse', () => {
  it('resolves an indexed target without parsing it', async () => {
    const deps = serverDeps(await scannedIndex())
    parseSpy.mockClear()

    const result = await definition(AT_REF(), deps)
    const [link] = await documentLinks({ textDocument: { uri: uriFromPath(citingPath) } }, deps)

    expect(result![0]!.range.start.line).toBe(4)
    expect(link!.target).toBe(`${uriFromPath(targetPath)}#L5`)
    expect(parsesOf(TARGET)).toBe(0)
  })

  it('finds an anchor that exists only in an unsaved buffer', async () => {
    const serverIndex = await scannedIndex()
    // The workspace index still holds the saved file; the open buffer differs.
    serverIndex.openDocument(uriFromPath(targetPath), targetPath, BUFFER, 2)
    parseSpy.mockClear()

    const lineOf = (anchor: string) => jumpLine(serverIndex, `./target.spw#${anchor}`)

    expect(await lineOf('gamma')).toBe(3)
    expect(await lineOf('beta')).toBe(7)
    expect(serverIndex.annotationsForFile(targetPath).some((e) => e.name === 'gamma')).toBe(false)
    expect(parsesOf(BUFFER)).toBe(0)

    // Closed without saving: the buffer is gone, and the saved file answers.
    serverIndex.closeDocument(uriFromPath(targetPath))
    expect(await lineOf('gamma')).toBe(0)
    expect(await lineOf('beta')).toBe(4)
  })

  it('reads an unindexed closed target from disk, so a discarded buffer never answers', async () => {
    // Opened with an unsaved anchor, then closed without saving: the server
    // may still hold that text, but the saved file is what a fragment means.
    const serverIndex = new ServerIndex(root)
    serverIndex.openDocument(uriFromPath(targetPath), targetPath, BUFFER, 1)
    serverIndex.closeDocument(uriFromPath(targetPath))
    parseSpy.mockClear()

    expect(await jumpLine(serverIndex, './target.spw#gamma')).toBe(0)
    expect(await jumpLine(serverIndex, './target.spw#beta')).toBe(4)
    expect(parsesOf(TARGET)).toBe(1)
    expect(parsesOf(BUFFER)).toBe(0)
  })
})

describe('anchor lines — a listing never parses; definition parses once per version', () => {
  const REFS = 30
  let widePath: string
  let wideCiting: string

  beforeAll(async () => {
    widePath = path.join(root, 'wide.spw')
    wideCiting = path.join(root, 'wide-index.spw')
    await fs.writeFile(widePath, TARGET, 'utf8')
    const lines = Array.from({ length: REFS }, (_, i) => `=ref{ ~"./wide.spw#${i % 2 ? 'beta' : 'alpha'}" }`)
    await fs.writeFile(wideCiting, lines.join('\n'), 'utf8')
  })

  const linksOf = (deps: HandlerDeps) => documentLinks({ textDocument: { uri: uriFromPath(wideCiting) } }, deps)

  it(`links ${REFS} refs to an unindexed file without parsing it`, async () => {
    // Before the first scan reaches the target, the listing links the file
    // and leaves the line to go to definition.
    const deps = serverDeps(new ServerIndex(root))
    parseSpy.mockClear()

    const links = await linksOf(deps)
    expect(links.map((l) => l.target)).toEqual(Array.from({ length: REFS }, () => uriFromPath(widePath)))
    expect(parsesOf(TARGET)).toBe(0)
  })

  it(`parses once for ${REFS} definitions into one file, then not again until it changes`, async () => {
    const serverIndex = new ServerIndex(root)
    parseSpy.mockClear()

    for (let i = 0; i < REFS; i++) {
      const anchor = i % 2 ? 'beta' : 'alpha'
      expect(await jumpLine(serverIndex, `../wide.spw#${anchor}`)).toBe(i % 2 ? 4 : 0)
    }
    expect(parsesOf(TARGET)).toBe(1)

    // An edit on disk changes the stat, so the next definition parses again.
    await fs.writeFile(widePath, BUFFER, 'utf8')
    expect(await jumpLine(serverIndex, '../wide.spw#beta')).toBe(7)
    expect(parsesOf(BUFFER)).toBe(1)
    await fs.writeFile(widePath, TARGET, 'utf8')
  })

  it(`does not parse an indexed target for ${REFS} refs`, async () => {
    const deps = serverDeps(await scannedIndex())
    parseSpy.mockClear()

    const links = await linksOf(deps)
    expect(links).toHaveLength(REFS)
    expect(parsesOf(TARGET)).toBe(0)
  })
})

describe('anchor lines — a name the index saw twice is settled by the seed', () => {
  /** The line `resolveFragment` gives, from the same parse the spy wraps. */
  const seedLine = (text: string, fragment: string) =>
    resolveFragment(parse(text).ast!, fragment).binding!.particle.span.start.line - 1

  it('lands on the anchor, not on a mention that stands before it', async () => {
    const serverIndex = await scannedIndex()
    const sightings = serverIndex.annotationsForFile(mentionedPath).filter((e) => e.kind === 'anchor' && e.name === 'target')
    expect(sightings.map((e) => e.line)).toEqual([0, 1])
    const expected = seedLine(MENTIONED, 'target')
    parseSpy.mockClear()

    // A name seen once is still the index's to answer.
    expect(await jumpLine(serverIndex, './mentioned.spw#solo')).toBe(5)
    expect(parsesOf(MENTIONED)).toBe(0)

    expect(await jumpLine(serverIndex, './mentioned.spw#target')).toBe(1)
    expect(expected).toBe(1)
    expect(parsesOf(MENTIONED)).toBe(1)
  })

  it('settles an open buffer from the parse it already holds', async () => {
    const serverIndex = await scannedIndex()
    serverIndex.openDocument(uriFromPath(mentionedPath), mentionedPath, MENTIONED, 1)
    parseSpy.mockClear()

    expect(await jumpLine(serverIndex, './mentioned.spw#target')).toBe(1)
    expect(parsesOf(MENTIONED)).toBe(0)
  })
})

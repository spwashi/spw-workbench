/**
 * Fragment navigation — `~"file#anchor"` addresses a node, so going to its
 * definition should land on the anchor, not the top of the page.
 *
 * These tests use real files: the fragment is read by parsing the target
 * surface, so an in-memory stub would prove nothing about the round trip.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { definition, documentLinks } from '../handlers/navigation'
import type { HandlerDeps } from '../types'

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

function makeDeps(text: string): HandlerDeps {
  return {
    serverIndex: { getDocument: () => ({ text, selectorHits: null }) },
    pathFromUri: (uri: string) => uri.replace('file://', ''),
    uriFromPath: (p: string) => (p.startsWith('file://') ? p : `file://${p}`),
    getDocumentText: async () => text,
    // The path resolves; only the fragment is under test here.
    resolveReferencePath: async () => targetPath,
  } as unknown as HandlerDeps
}

const AT_REF = { textDocument: { uri: 'file:///test.spw' }, position: { line: 0, character: 10 } }

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

  it('opens the file when the reference names no fragment', async () => {
    const result = await definition(AT_REF, makeDeps(`=ref{ ~"${targetPath}" }`))
    expect(result![0]!.range.start.line).toBe(0)
  })

  it('still opens the file when the anchor is stale', async () => {
    // A dangling fragment should navigate somewhere useful, not fail.
    const result = await definition(AT_REF, makeDeps(`=ref{ ~"${targetPath}#removed_anchor" }`))
    expect(result![0]!.range.start.line).toBe(0)
  })
})

describe('documentLinks — anchored targets carry their line', () => {
  it('appends the anchor line so a click lands on it', async () => {
    const source = `=ref{ ~"${targetPath}#second_anchor" }`
    const [link] = await documentLinks({ textDocument: { uri: 'file:///test.spw' } }, makeDeps(source))
    expect(link!.target.endsWith('#L7')).toBe(true)
  })

  it('leaves an unanchored target bare', async () => {
    const source = `=ref{ ~"${targetPath}" }`
    const [link] = await documentLinks({ textDocument: { uri: 'file:///test.spw' } }, makeDeps(source))
    expect(link!.target).not.toContain('#L')
  })
})

/**
 * Handles in prose — a `@name` the file declares, named inside a quoted or
 * backtick string, links where its declaration links and hovers with the
 * declaration first (spwashi.com upstream ask handle_in_prose; the hover
 * order is hovers_that_answer: meaning first, geometry last).
 *
 * Real files and the real resolver, so the link a handle earns is the one its
 * declaration's citation earns. Narrow beside citation-navigation
 * ~[refs_outside_strings]: an undeclared handle, a root followed by a path,
 * and a handle in code position all stay as they were.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { definition, documentLinks } from '../handlers/navigation'
import { hover } from '../handlers/display'
import { publishDiagnostics } from '../handlers/analysis'
import { declaredHandles, proseHandles } from '../handlers/prose-handles'
import { mergeRoots, pathFromUri, resolveReferencePath, uriFromPath } from '../helpers'
import { ServerIndex } from '../server-index'
import { selectPathRefs } from '../spw-selector'
import { DEFAULT_CONFIG, type HandlerDeps, type LspDiagnostic } from '../types'
import { lex } from '@spwashi/spw-seed'

const DOC = [
  '# Handles the blocks below use.', //                                                    0
  '@plan: ~"./PLAN.md"', //                                                                 1
  '@expression_query: ~"../public/js/expression-query.js"', //                              2
  '', //                                                                                    3
  '^["moves"]{', //                                                                         4
  ' query = "Run an expression query (@expression_query) over the journal page"', //        5
  ' tick = `see @plan for the slices`', //                                                  6
  ' multi = `first line', //                                                                7
  '  then @expression_query again`', //                                                     8
  ' undeclared = "ask @foo about it"', //                                                   9
  ' rooted = "a root with a path: @plan/notes.md stays text"', //                          10
  ' near = "write sam@plan.com, read the @plan.md file, ask the @planner, see @plan#slices"', // 11
  ' escaped = "a \\"quoted\\" word, then @plan"', //                                       12
  ' must_ship: [@plan, @expression_query]', //                                             13
  '}', //                                                                                  14
].join('\n')

const FIRST_LINE = '/** Expression query — reads what an entry holds under a word. */'

let root: string
let docPath: string
let docUri: string
let planPath: string
let queryPath: string

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-prose-handles-'))
  docPath = path.join(root, 'plans', 'wip.spw')
  planPath = path.join(root, 'plans', 'PLAN.md')
  queryPath = path.join(root, 'public', 'js', 'expression-query.js')
  await fs.mkdir(path.dirname(docPath), { recursive: true })
  await fs.mkdir(path.dirname(queryPath), { recursive: true })
  await fs.writeFile(docPath, DOC, 'utf8')
  await fs.writeFile(planPath, '# Plan\n', 'utf8')
  await fs.writeFile(queryPath, `\n${FIRST_LINE}\nexport function query() {}\n`, 'utf8')
  docUri = uriFromPath(docPath)
})

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

function makeDeps(text = DOC): HandlerDeps & { diagnostics: LspDiagnostic[] } {
  const serverIndex = new ServerIndex(root)
  serverIndex.openDocument(docUri, docPath, text, 1)
  const config = { ...DEFAULT_CONFIG, diagnostics: { unresolvedRefs: 'warning' as const, staleProjections: false } }
  const diagnostics: LspDiagnostic[] = []
  return {
    diagnostics,
    serverIndex,
    config,
    workspaceRoot: root,
    pathFromUri,
    uriFromPath,
    resolveReferencePath: (hit: any, source: string, p: string, options?: { allowDirectory?: boolean }) =>
      resolveReferencePath(hit, source, p, root, config, serverIndex, options),
    suggestNearbyReference: async () => null,
    mergeRoots: (source: string, fileDir: string) => mergeRoots(source, fileDir, root, config, serverIndex),
    defaultRoots: () => ({}),
    getDocumentText: async (uri: string) => (uri === docUri ? text : null),
    getWorkspaceSpwFiles: async () => [docPath],
    mapWithConcurrency: async (items: any[], _c: number, fn: any) => Promise.all(items.map(fn)),
    sendNotification: (_method: string, params: any) => {
      if (params?.diagnostics) diagnostics.push(...params.diagnostics)
    },
    log: () => {},
    trialRunSpw: () => null,
    loadObservableState: async () => ({}),
    observableState: null,
    observableStateLoadedAt: 0,
  } as unknown as HandlerDeps & { diagnostics: LspDiagnostic[] }
}

const at = (line: number, character: number) => ({ textDocument: { uri: docUri }, position: { line, character } })

/** Column of the `@` that opens `needle` on a line of DOC. */
function col(line: number, needle: string): number {
  const c = DOC.split('\n')[line].indexOf(needle)
  if (c < 0) throw new Error(`${needle} not on line ${line}`)
  return c
}

async function linksOn(line: number) {
  const links = await documentLinks({ textDocument: { uri: docUri } }, makeDeps())
  return links.filter((link) => link.range.start.line === line)
}

describe('declared handles', () => {
  it('reads each @name: bound to a parsed citation, and nothing quoted', () => {
    const quoted = `${DOC}\nexample = "@ghost: ~\\"./nowhere.md\\""\n`
    const declared = declaredHandles(quoted, selectPathRefs(quoted))
    expect([...declared.keys()]).toEqual(['plan', 'expression_query'])
    expect(declared.get('plan')?.line).toBe(1)
    expect(declared.get('expression_query')?.written).toBe('@expression_query: ~"../public/js/expression-query.js"')
  })

  it('finds uses only inside strings and backtick phrases, mapped to document positions', () => {
    const uses = proseHandles(DOC, selectPathRefs(DOC), () => lex(DOC, { eventPolicy: 'none' }).tokens)
    const where = uses.map((use) => `${use.name}@${use.range.start.line}:${use.range.start.character}-${use.range.end.character}`)
    expect(where).toEqual([
      `expression_query@5:${col(5, '@expression_query')}-${col(5, '@expression_query') + '@expression_query'.length}`,
      `plan@6:${col(6, '@plan')}-${col(6, '@plan') + '@plan'.length}`,
      `expression_query@8:${col(8, '@expression_query')}-${col(8, '@expression_query') + '@expression_query'.length}`,
      `plan@12:${col(12, '@plan')}-${col(12, '@plan') + '@plan'.length}`,
    ])
  })
})

describe('document links for a handle in prose', () => {
  it('links a declared handle in a double-quoted string to its declaration target', async () => {
    const [link] = await linksOn(5)
    expect(link.target).toBe(uriFromPath(queryPath))
    expect(link.range.start.character).toBe(col(5, '@expression_query'))
    expect(link.range.end.character).toBe(col(5, '@expression_query') + '@expression_query'.length)
  })

  it('links the same target the declaration itself links', async () => {
    const [declarationLink] = await linksOn(2)
    const [proseLink] = await linksOn(5)
    expect(proseLink.target).toBe(declarationLink.target)
  })

  it('links a declared handle in a backtick phrase, one line or several', async () => {
    expect((await linksOn(6)).map((link) => link.target)).toEqual([uriFromPath(planPath)])
    const [multi] = await linksOn(8)
    expect(multi.target).toBe(uriFromPath(queryPath))
    expect(multi.range.start.character).toBe(col(8, '@expression_query'))
  })

  it('keeps its place after escaped quotes', async () => {
    const [link] = await linksOn(12)
    expect(link.range.start.character).toBe(col(12, '@plan'))
    expect(link.target).toBe(uriFromPath(planPath))
  })

  it('gives an undeclared handle nothing', async () => {
    expect(await linksOn(9)).toEqual([])
  })

  it('gives a root followed by a path inside a string no link (refs_outside_strings)', async () => {
    expect(await linksOn(10)).toEqual([])
  })

  // A handle with an anchor is the root-with-fragment form root_anchor_lsp owns; it stays text here.
  it('reads a handle only at a word boundary: no email, dotted name, longer word or anchor', async () => {
    expect(await linksOn(11)).toEqual([])
  })

  it('leaves a handle in code position as it was: no link', async () => {
    expect(await linksOn(13)).toEqual([])
  })
})

describe('definition for a handle in prose', () => {
  it('goes where the declaration goes', async () => {
    const result = await definition(at(5, col(5, '@expression_query') + 3), makeDeps())
    expect(result?.[0].uri).toBe(uriFromPath(queryPath))
  })

  it('finds nothing for an undeclared handle or a handle in code position', async () => {
    expect(await definition(at(9, col(9, '@foo') + 1), makeDeps())).toBeNull()
    expect(await definition(at(13, col(13, '@plan') + 1), makeDeps())).toBeNull()
  })
})

describe('hover for a handle in prose', () => {
  it('leads with the declaration, and form geometry comes last', async () => {
    const result = await hover(at(5, col(5, '@expression_query') + 4), makeDeps())
    const value = result?.contents.value ?? ''
    expect(value.startsWith('**`@expression_query`** → `public/js/expression-query.js`')).toBe(true)
    expect(value).toContain('Declared on line 3: `@expression_query: ~"../public/js/expression-query.js"`')
    expect(value).toContain('Expression query — reads what an entry holds under a word.')
    const declared = value.indexOf('Declared on line')
    const geometry = value.indexOf('\n---\n')
    expect(declared).toBeGreaterThan(0)
    expect(geometry).toBeGreaterThan(declared)
    expect(value.slice(geometry)).toMatch(/\*\*(Form coupling|Label site)\*\*/)
    expect(result?.range).toEqual({
      start: { line: 5, character: col(5, '@expression_query') },
      end: { line: 5, character: col(5, '@expression_query') + '@expression_query'.length },
    })
  })

  it('leads with the declaration in a backtick phrase', async () => {
    const result = await hover(at(6, col(6, '@plan') + 1), makeDeps())
    expect(result?.contents.value.startsWith('**`@plan`** → `plans/PLAN.md`')).toBe(true)
  })

  it('answers an undeclared handle or a rooted path in a string as before', async () => {
    for (const [line, needle] of [[9, '@foo'], [10, '@plan/notes.md']] as const) {
      const result = await hover(at(line, col(line, needle) + 1), makeDeps())
      expect(result?.contents.value ?? '').not.toContain('Declared on line')
    }
  })

  it('leaves a handle in code position to the hover it had', async () => {
    const result = await hover(at(13, col(13, '@plan') + 1), makeDeps())
    expect(result?.contents.value ?? '').not.toContain('Declared on line')
  })
})

describe('what a handle in prose never becomes', () => {
  it('raises no diagnostic and adds no citation for the graph', async () => {
    const deps = makeDeps()
    await publishDiagnostics(docUri, deps)
    const proseLines = new Set([5, 6, 7, 8, 9, 10, 11, 12])
    expect(deps.diagnostics.filter((d) => proseLines.has(d.range.start.line))).toEqual([])

    // The graph and the unresolved-reference check read selector hits; a string adds none.
    const hits = deps.serverIndex.getDocument(docUri)?.selectorHits ?? []
    expect(hits.map((hit) => hit.span.startLine)).toEqual([1, 2])
  })
})

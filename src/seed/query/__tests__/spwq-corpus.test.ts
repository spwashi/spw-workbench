import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAVIGABLE, PATH_REFS, REFERENCES, parse, spwq, walkAST } from '../../index'

const WORKSPACE_MANIFEST = readFileSync(resolve(process.cwd(), '.spw/workspace.spw'), 'utf8')
const SPW_INDEX = readFileSync(resolve(process.cwd(), '.spw/index.spw'), 'utf8')

/**
 * Parse each manifest once for the whole file.
 *
 * These are the two largest surfaces in the corpus and parsing them is
 * CPU-bound. Re-parsing per assertion put the file close enough to the 5s
 * default timeout that it failed intermittently once the suite grew.
 */
function parseOnce(source: string) {
  const output = parse(source)
  if (!output.ast) throw new Error('corpus manifest failed to parse')
  return output.ast
}

const WORKSPACE_AST = parseOnce(WORKSPACE_MANIFEST)
const INDEX_AST = parseOnce(SPW_INDEX)

function collectNodeTypes(ast: typeof WORKSPACE_AST): Map<string, number> {
  const counts = new Map<string, number>()
  walkAST(ast, (node) => {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1)
  })
  return counts
}

describe('spwq corpus dogfood', () => {
  it('walks real workspace manifests beyond the top-level nodes', () => {
    const counts = collectNodeTypes(WORKSPACE_AST)

    expect(counts.get('Seed')).toBe(1)
    expect(counts.get('Prose')).toBeGreaterThanOrEqual(1)
    expect(counts.get('PathRef')).toBeGreaterThan(20)
    expect(counts.get('Reference')).toBeGreaterThan(10)
    expect(counts.get('Operation')).toBeGreaterThan(20)
  })

  it('finds navigable refs in the workspace manifest', () => {
    const matches = spwq(WORKSPACE_AST, NAVIGABLE)
    const pathTargets = matches
      .filter((match) => match.node.type === 'PathRef')
      .map((match) => {
        const raw = (match.node as { path?: { token?: { value?: string } } }).path?.token?.value ?? ''
        return raw.replace(/^["'`]|["'`]$/g, '')
      })
    const references = matches
      .filter((match) => match.node.type === 'Reference')
      .map((match) => (match.node as { raw?: string }).raw ?? '')

    expect(matches.length).toBeGreaterThan(50)
    expect(matches.every((match) => match.node.type === 'PathRef' || match.node.type === 'Reference')).toBe(true)
    expect(pathTargets).toContain('./conventions/cli.spw')
    expect(pathTargets).toContain('../docs')
    expect(references).toContain('spec')
    expect(references).toContain('seed')
  })

  it('keeps index manifest selection observable through presets', () => {
    const pathRefs = spwq(INDEX_AST, PATH_REFS)
    const refs = spwq(INDEX_AST, REFERENCES)

    expect(pathRefs.length).toBeGreaterThan(10)
    expect(refs.length).toBeGreaterThan(10)
    expect(pathRefs.every((match) => match.node.type === 'PathRef')).toBe(true)
    expect(refs.every((match) => match.node.type === 'Reference')).toBe(true)
  })
})

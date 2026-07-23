/**
 * Cache reflection — the index read back as a record of attention.
 */

import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse, particleMix } from '@spwashi/spw-seed'
import { ServerIndex } from '../server-index'
import { archetypeOf, cacheReflection } from '../handlers/cache-reflection'
import type { HandlerDeps } from '../types'

const ROOT = path.resolve('/workspace')

function deps(serverIndex: ServerIndex): HandlerDeps {
  return { serverIndex, workspaceRoot: ROOT } as unknown as HandlerDeps
}

function uriFor(name: string): string {
  return pathToFileURL(path.join(ROOT, name)).toString()
}

function open(index: ServerIndex, name: string, text: string): string {
  const uri = uriFor(name)
  index.openDocument(uri, path.join(ROOT, name), text, 1)
  return uri
}

const CANON = '#>an_anchor\n#:layer #!canon\n^["intent"]{\n}'
const PLAN = '^["cache"]{\n ~#status: "open"\n ~#next: "4"\n ~#age: "1"\n}'

describe('archetypeOf — a surface is what it spends itself on', () => {
  const mixOf = (source: string) => particleMix(parse(source).ast ?? null, source)

  it('calls a reference-heavy surface an index', () => {
    // Same marks as canon; only the outbound references differ.
    expect(archetypeOf(mixOf(CANON), 14)).toBe('index')
    expect(archetypeOf(mixOf(CANON), 3)).toBe('classified')
  })

  it('calls an aspect-heavy surface working state, however many refs it carries', () => {
    expect(archetypeOf(mixOf(PLAN), 20)).toBe('working-state')
  })

  it('calls a marked surface with few refs settled canon', () => {
    expect(archetypeOf(mixOf(CANON), 3)).toBe('classified')
  })

  it('calls an unmarked surface plain', () => {
    expect(archetypeOf(mixOf('x: 1\n'), 0)).toBe('plain')
  })
})

describe('cacheReflection — what the session paid attention to', () => {
  it('notices a surface consulted repeatedly but never edited', () => {
    const index = new ServerIndex(ROOT)
    const uri = uriFor('reference.spw')
    for (let i = 0; i < 3; i += 1) {
      index.openDocument(uri, path.join(ROOT, 'reference.spw'), CANON, 1)
    }

    const note = cacheReflection(deps(index)).notes.find((n) => n.uri === uri)
    expect(note?.kind).toBe('returning')
    expect(note?.detail).toContain('3 times')
  })

  it('notices a surface under active revision', () => {
    const index = new ServerIndex(ROOT)
    const uri = open(index, 'draft.spw', CANON)
    for (let v = 2; v <= 5; v += 1) index.updateDocument(uri, `${CANON}\n# edit ${v}`, v)

    expect(cacheReflection(deps(index)).notes.find((n) => n.uri === uri)?.kind).toBe('churning')
  })

  it('notices a held reading of a surface whose content expires', () => {
    const index = new ServerIndex(ROOT)
    const uri = open(index, 'plan.spw', PLAN)
    index.closeDocument(uri) // no longer hot: the view is held, not live

    const note = cacheReflection(deps(index)).notes.find((n) => n.uri === uri)
    expect(note?.kind).toBe('expired-view')
  })

  it('says nothing about a durable surface that is simply open', () => {
    const index = new ServerIndex(ROOT)
    open(index, 'canon.spw', CANON)
    expect(cacheReflection(deps(index)).notes).toEqual([])
  })

  it('groups tracked surfaces into the kinds the workspace grew', () => {
    const index = new ServerIndex(ROOT)
    open(index, 'canon-a.spw', CANON)
    open(index, 'canon-b.spw', CANON)
    open(index, 'plan.spw', PLAN)

    const { families, tracked } = cacheReflection(deps(index))
    expect(tracked).toBe(3)
    // Largest family first.
    expect(families[0]).toMatchObject({ archetype: 'classified', volatility: 'durable' })
    expect(families[0]!.uris).toHaveLength(2)
    expect(families.map((f) => f.archetype)).toContain('working-state')
  })

  it('measures how concentrated the session was', () => {
    const index = new ServerIndex(ROOT)
    const focus = uriFor('focus.spw')
    for (let i = 0; i < 3; i += 1) index.openDocument(focus, path.join(ROOT, 'focus.spw'), CANON, 1)
    open(index, 'aside.spw', CANON)

    // Three of four opens landed on one surface.
    expect(cacheReflection(deps(index)).concentration).toBeCloseTo(0.75, 5)
  })

  it('reports an empty session without inventing attention', () => {
    const reflection = cacheReflection(deps(new ServerIndex(ROOT)))
    expect(reflection).toMatchObject({ tracked: 0, concentration: 0, notes: [], families: [] })
  })
})

/**
 * Reference graph — which surfaces point at which.
 *
 * Built against real files: resolution is the point, and a stubbed resolver
 * would only prove the bookkeeping.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildReferenceGraph, invalidateReferenceGraph } from '../handlers/reference-graph'
import type { HandlerDeps } from '../types'

let root: string

async function write(relativePath: string, text: string): Promise<void> {
  const full = path.join(root, relativePath)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, text, 'utf8')
}

async function collect(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await collect(full))
    else if (entry.name.endsWith('.spw')) out.push(full)
  }
  return out
}

function makeDeps(): HandlerDeps {
  return {
    serverIndex: {
      getCurrentBeat: () => 0,
      getDocument: () => null,
    },
    workspaceRoot: root,
    uriFromPath: (p: string) => `file://${p}`,
    getWorkspaceSpwFiles: () => collect(root),
    mapWithConcurrency: async <T, R>(items: T[], _c: number, fn: (item: T) => Promise<R>) =>
      Promise.all(items.map(fn)),
    // Resolve relative to the referring file, as navigation does.
    resolveReferencePath: async (hit: { target: string }, _source: string, docPath: string) => {
      const candidate = path.resolve(path.dirname(docPath), hit.target)
      try {
        await fs.access(candidate)
        return candidate
      } catch {
        return null
      }
    },
  } as unknown as HandlerDeps
}

beforeEach(async () => {
  invalidateReferenceGraph()
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-refgraph-'))
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('buildReferenceGraph — standing comes from who points at you', () => {
  it('counts inbound references and ranks the load-bearing surface first', async () => {
    await write('shared.spw', '#>shared_anchor\n')
    await write('a.spw', '=ref{ ~"./shared.spw" }\n')
    await write('b.spw', '=ref{ ~"./shared.spw" }\n')
    await write('c.spw', '=ref{ ~"./shared.spw" }\n')

    const report = await buildReferenceGraph(makeDeps())

    expect(report.hubs[0]).toMatchObject({ path: 'shared.spw', inbound: 3, outbound: 0 })
    expect(report.hubs[0]!.referrers).toEqual(['a.spw', 'b.spw', 'c.spw'])
    expect(report.edges).toBe(3)
  })

  it('separates a foundation from a junction by direction', async () => {
    // Both are pointed at twice; only one points back out.
    await write('foundation.spw', '#>f\n')
    await write('junction.spw', '=r{ ~"./leaf1.spw" }\n=r{ ~"./leaf2.spw" }\n')
    await write('leaf1.spw', '#>l1\n')
    await write('leaf2.spw', '#>l2\n')
    await write('x.spw', '=r{ ~"./foundation.spw" }\n=r{ ~"./junction.spw" }\n')
    await write('y.spw', '=r{ ~"./foundation.spw" }\n=r{ ~"./junction.spw" }\n')

    const byPath = new Map((await buildReferenceGraph(makeDeps())).hubs.map((h) => [h.path, h]))

    expect(byPath.get('foundation.spw')).toMatchObject({ inbound: 2, outbound: 0 })
    expect(byPath.get('junction.spw')).toMatchObject({ inbound: 2, outbound: 2 })
  })

  it('does not let a surface make itself a hub', async () => {
    await write('self.spw', '=ref{ ~"./self.spw" }\n')
    const report = await buildReferenceGraph(makeDeps())

    expect(report.edges).toBe(0)
    expect(report.hubs).toEqual([])
  })
})

describe('buildReferenceGraph — orphans are surfaces that expected referrers', () => {
  it('reports a canon surface nothing points at', async () => {
    await write('linked.spw', '#>l\n')
    await write('adrift.spw', '#>a\n')
    await write('entry.spw', '=ref{ ~"./linked.spw" }\n')

    const { orphans } = await buildReferenceGraph(makeDeps())

    expect(orphans).toContain('adrift.spw')
    expect(orphans).toContain('entry.spw') // nothing points at the entry either
    expect(orphans).not.toContain('linked.spw')
  })

  it('leaves out surfaces never meant to be pointed at', async () => {
    await write('.agents/plans/live/wip.spw', '#>w\n')
    await write('.agents/plans/_archive/old/wip.spw', '#>o\n')
    await write('canon.spw', '#>c\n')

    const { orphans } = await buildReferenceGraph(makeDeps())

    expect(orphans).toEqual(['canon.spw'])
  })
})

describe('buildReferenceGraph — edges are between surfaces', () => {
  it('counts a reference to source or prose as external, not as a node', async () => {
    await write('impl.ts', 'export const x = 1\n')
    await write('notes.md', '# notes\n')
    await write('surface.spw', '=a{ ~"./impl.ts" }\n=b{ ~"./notes.md" }\n')

    const report = await buildReferenceGraph(makeDeps())

    expect(report.surfaces).toBe(1)
    expect(report.external).toBe(2)
    expect(report.edges).toBe(0)
  })

  it('counts a reference that resolves to nothing as unresolved', async () => {
    await write('surface.spw', '=ref{ ~"./missing.spw" }\n')

    const report = await buildReferenceGraph(makeDeps())

    expect(report.unresolved).toBe(1)
    expect(report.external).toBe(0)
  })
})

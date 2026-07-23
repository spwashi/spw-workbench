import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse, resolveFragment, readBias, spwq, BIAS } from '@spwashi/spw-seed'

const SURFACE = `# A surface with two anchors.

#>alpha
^"a"{ x: 1 }

#>beta
?["q"]{ y: 2 }
`

describe('resolveFragment — ~"file#anchor" addresses a node', () => {
  it('resolves a fragment to its deixis binding and bound node', () => {
    const resolved = resolveFragment(parse(SURFACE).ast!, 'beta')
    expect(resolved.binding).not.toBeNull()
    expect(resolved.binding!.particle.name.value).toBe('beta')
    expect(resolved.binding!.bound).not.toBeNull()
  })

  it('reports danglers with the available anchors as suggestions', () => {
    const resolved = resolveFragment(parse(SURFACE).ast!, 'gamma')
    expect(resolved.binding).toBeNull()
    expect(resolved.available).toEqual(['alpha', 'beta'])
  })

  it('readBias carries the fragment on path targets', () => {
    const match = spwq.fromSource('=ref{ ~"a/b.spw#some_anchor" }', BIAS)[0]!
    const edge = readBias(match.node)!
    expect(edge.targets[0]).toEqual({
      value: 'a/b.spw#some_anchor',
      kind: 'path',
      fragment: 'some_anchor',
    })
  })

  it('resolves real canon: the dialect registry fragment from canon-mount', () => {
    // canon-mount points at .spw/registries/dialect-spec.spw#spw_dialect_registry
    const registry = parse(readFileSync('.spw/registries/dialect-spec.spw', 'utf8')).ast!
    const resolved = resolveFragment(registry, 'spw_dialect_registry')
    expect(resolved.binding).not.toBeNull()
  })
})

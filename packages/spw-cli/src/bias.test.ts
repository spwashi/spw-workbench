/**
 * The polymorphism proof: one neutral bias edge, three consumer verbs.
 *
 * Seed emits the edge ({ anchor, axis, targets, sign }); each consumer chooses
 * the verb — mount resolves it, mutate rewrites by it, expand projects it.
 * These tests pin that contract at the pure-function seams the CLI verbs share.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { biasSites, resolveTilde } from './bias-edges'
import { applyBiasRewrites, biasRewriteRules } from './bias-apply'
import { project } from './expand'

const EDGE = '=@Old{ @New }'

describe('one bias edge, three verbs', () => {
  it('reads as a neutral edge (the shared substrate)', () => {
    const sites = biasSites(EDGE)
    expect(sites).toHaveLength(1)
    const { edge } = sites[0]!
    expect(edge.anchor).toEqual({ value: 'Old', kind: 'ref' })
    expect(edge.targets).toEqual([{ value: 'New', kind: 'ref' }])
    expect(edge.sign).toBe('forward')
  })

  it('mutate verb: the same edge is a rewrite rule; bane is the revert', () => {
    const rules = biasRewriteRules(EDGE)
    expect(rules).toEqual([{ from: '@Old', to: '@New', sign: 'forward' }])

    const forward = applyBiasRewrites('use @Old here', rules)
    expect(forward.text).toBe('use @New here')

    const revertRules = biasRewriteRules('=bane@Old{ @New }')
    const reverted = applyBiasRewrites(forward.text, revertRules)
    expect(reverted.text).toBe('use @Old here')
  })

  it('mutate verb ignores resolution/template edges (no anchor → not a rewrite)', () => {
    expect(biasRewriteRules('=ref{ ~"x.spw" }')).toEqual([])
    expect(biasRewriteRules('={ ~"x.spw" }')).toEqual([])
  })
})

describe('expand + mount verbs over surface edges', () => {
  let dir: string

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'spw-bias-'))
    await fs.writeFile(path.join(dir, 'inner.spw'), 'inner_content\n')
    await fs.writeFile(path.join(dir, 'mid.spw'), 'mid_top\n={ ~"inner.spw" }\nmid_bottom\n')
    await fs.writeFile(path.join(dir, 'loop.spw'), 'loop_head\n={ ~"loop.spw" }\n')
  })

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('mount verb: resolves a surface target on disk, null when dangling', async () => {
    expect(await resolveTilde('inner.spw', dir)).not.toBeNull()
    expect(await resolveTilde('inner.spw#some_anchor', dir)).not.toBeNull() // fragment stripped
    expect(await resolveTilde('missing.spw', dir)).toBeNull()
  })

  it('expand verb: projects templates recursively, source-immutable', async () => {
    const source = 'doc_head\n={ ~"mid.spw" }\ndoc_tail\n'
    const { text, unfolded } = await project(source, dir, new Set(), 0, 4)
    expect(unfolded).toBe(1)
    // nested unfold: mid's own edge pulled inner's content through
    expect(text).toContain('mid_top')
    expect(text).toContain('inner_content')
    // provenance stream framing, edge retained (the edge IS the fold)
    expect(text).toContain('={ ~"mid.spw" }')
    expect(text).toContain('<<  # ⟵ ~"mid.spw"')
    expect(text).toContain('>>')
  })

  it('expand verb: cycle guard terminates a self-referential template', async () => {
    const source = '={ ~"loop.spw" }\n'
    const { text } = await project(source, dir, new Set(), 0, 8)
    expect(text).toContain('(cycle: already expanding loop.spw)')
  })

  it('expand verb: depth bound cuts deep chains', async () => {
    const source = '={ ~"mid.spw" }\n'
    const { text } = await project(source, dir, new Set(), 0, 1)
    expect(text).toContain('(depth limit 1 reached)')
  })
})

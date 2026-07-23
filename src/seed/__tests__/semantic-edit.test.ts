import { describe, it, expect } from 'vitest'
import {
  parse,
  planSemanticEdits,
  applySemanticPlan,
  renameMark,
  renameParticle,
  type SemanticRule,
} from '@spwashi/spw-seed'

const CACHE = [
  '#>spw_index',
  '#:layer #!canon',
  '',
  '^["cache"]{',
  ' ~#status: "planning"',
  ' ~#goal: "unify the lattice"',
  '}',
  '',
].join('\n')

describe('planSemanticEdits — patches addressed by what a node is', () => {
  it('renames a mark while preserving its stance prefix', () => {
    const plan = planSemanticEdits(CACHE, [renameMark('status', 'phase')])
    expect(plan.edits).toHaveLength(1)
    // The whole point: `~#` survives, only the name changes.
    expect(applySemanticPlan(CACHE, plan)).toContain('~#phase: "planning"')
    expect(applySemanticPlan(CACHE, plan)).not.toContain('~#status')
  })

  it('renames a particle scoped by aim, not by bare name', () => {
    const plan = planSemanticEdits(CACHE, [renameParticle('>', 'spw_index', 'spw_root')])
    expect(applySemanticPlan(CACHE, plan)).toContain('#>spw_root')
  })

  it('leaves the rest of the surface byte-identical', () => {
    const out = applySemanticPlan(CACHE, planSemanticEdits(CACHE, [renameMark('status', 'phase')]))
    // Every line but the renamed one is untouched.
    expect(out.split('\n').filter((l) => !l.includes('phase')))
      .toEqual(CACHE.split('\n').filter((l) => !l.includes('status')))
  })

  it('is idempotent: applying a rename to its own output is a no-op', () => {
    const rules = [renameMark('status', 'phase')]
    const once = applySemanticPlan(CACHE, planSemanticEdits(CACHE, rules))
    const twice = planSemanticEdits(once, rules)
    expect(twice.edits).toEqual([])
  })

  it('keeps the result parseable', () => {
    const out = applySemanticPlan(CACHE, planSemanticEdits(CACHE, [
      renameMark('goal', 'north_star'),
      renameParticle(':', 'layer', 'tier'),
    ]))
    expect(parse(out).ast).not.toBeNull()
  })
})

describe('planSemanticEdits — planning is a decision with evidence', () => {
  it('carries a reason on every edit', () => {
    const [edit] = planSemanticEdits(CACHE, [renameMark('goal', 'north_star')]).edits
    expect(edit!.reason).toContain('goal')
    expect(edit!.reason).toContain('north_star')
  })

  it('withholds a rule above the effect ceiling, with a reason', () => {
    const plan = planSemanticEdits(CACHE, [renameMark('status', 'phase')], {
      ceiling: 'effect.l1.memory',
    })
    expect(plan.edits).toEqual([])
    expect(plan.withheld).toHaveLength(1)
    expect(plan.withheld[0]!.reason).toContain('effect.l2.workspace')
  })

  it('reports overlapping edits as a conflict instead of ordering them', () => {
    // Two rules that both rewrite the same mark contend for one range.
    const toPhase = renameMark('status', 'phase')
    const toState = renameMark('status', 'state')
    const plan = planSemanticEdits(CACHE, [toPhase, toState])

    expect(plan.edits).toEqual([])
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.conflicts[0]!.edits).toHaveLength(2)
  })

  it('counts matches even where nothing is rewritten', () => {
    // A rule that always declines still reports what its selector found.
    const inspect: SemanticRule = {
      id: 'inspect',
      description: 'match anchors, change nothing',
      select: { nodeType: 'Particle', aim: '>' },
      stratum: 'reference',
      effectGrade: 'effect.l0.measure',
      rewrite: () => null,
    }
    const plan = planSemanticEdits(CACHE, [inspect])
    expect(plan.matched).toBe(1)
    expect(plan.edits).toEqual([])
  })
})

describe('planSemanticEdits — a surface that does not parse yields no edits', () => {
  it('returns an empty plan rather than guessing', () => {
    const plan = planSemanticEdits('^["unclosed"]{', [renameMark('x', 'y')], { ast: null })
    expect(plan.edits).toEqual([])
    expect(plan.matched).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import {
  parse,
  planSemanticEdits,
  applySemanticPlan,
  deriveMark,
  countOps,
  latestTimestamp,
  type MarkDeriver,
} from '@spwashi/spw-seed'

const PLAN = [
  '^["open"]{',
  ' ?[a]: "first question"',
  ' ?[b]: "second question"',
  ' ?[c]: "third question"',
  '}',
  '',
  '^["stream"]{',
  ' >>[2026-07-23 03:12] observe — early',
  ' >>[2026-07-23 07:13] implement — latest',
  ' >>[2026-07-23 06:30] decide — middle',
  '}',
  '',
  '^["cache"]{',
  ' ~#open_count: "1"',
  ' ~#last_stream: "2026-07-23 03:12"',
  '}',
  '',
].join('\n')

const cacheRules = [
  deriveMark('open_count', countOps('open', '?')),
  deriveMark('last_stream', latestTimestamp('stream')),
]

describe('derived marks — a cache block that summarizes itself', () => {
  it('refreshes a count from the questions it summarizes', () => {
    const out = applySemanticPlan(PLAN, planSemanticEdits(PLAN, [cacheRules[0]!]))
    // Three open questions, not the stale "1".
    expect(out).toContain('~#open_count: "3"')
  })

  it('refreshes a timestamp to the newest entry, not the lexical last', () => {
    const out = applySemanticPlan(PLAN, planSemanticEdits(PLAN, [cacheRules[1]!]))
    // 07:13 is newest even though 06:30 appears later in the stream.
    expect(out).toContain('~#last_stream: "2026-07-23 07:13"')
  })

  it('preserves the mark, its stance, and its spacing', () => {
    const out = applySemanticPlan(PLAN, planSemanticEdits(PLAN, cacheRules))
    expect(out).toContain(' ~#open_count: "3"')
    expect(out).toContain(' ~#last_stream: "2026-07-23 07:13"')
    // Only the two cache values changed; everything else is byte-identical.
    const changed = (a: string, b: string) =>
      a.split('\n').filter((l, i) => l !== b.split('\n')[i])
    expect(changed(out, PLAN)).toHaveLength(2)
  })

  it('is idempotent: a refreshed block refreshes to itself', () => {
    const once = applySemanticPlan(PLAN, planSemanticEdits(PLAN, cacheRules))
    expect(planSemanticEdits(once, cacheRules).edits).toEqual([])
  })

  it('keeps the surface parseable', () => {
    const out = applySemanticPlan(PLAN, planSemanticEdits(PLAN, cacheRules))
    expect(parse(out).ast).not.toBeNull()
  })

  it('leaves an already-accurate value untouched', () => {
    // open_count already says 3.
    const accurate = PLAN.replace('~#open_count: "1"', '~#open_count: "3"')
    const plan = planSemanticEdits(accurate, [cacheRules[0]!])
    expect(plan.edits).toEqual([])
  })
})

describe('derived marks — the deriver signature is open', () => {
  it('reaches the whole surface, not only the matched mark', () => {
    // A deriver that reports the surface length proves it sees `root`/`source`.
    const sizeOf: MarkDeriver = ({ source }) => String(source.length)
    const src = '^["x"]{\n ~#size: "0"\n}'
    const out = applySemanticPlan(src, planSemanticEdits(src, [deriveMark('size', sizeOf)]))
    expect(out).toContain(`~#size: "${src.length}"`)
  })

  it('does not derive a mark whose value is a reference rather than a literal', () => {
    const src = '^["x"]{\n ~#ref: ~"./other.spw"\n}'
    const plan = planSemanticEdits(src, [deriveMark('ref', () => 'anything')])
    expect(plan.edits).toEqual([])
  })

  it('finds a frame even when it is full of prose', () => {
    // The stream frame folds into prose chunks; the timestamp is still found.
    const stamp = latestTimestamp('stream')({
      node: parse(PLAN).ast!,
      root: parse(PLAN).ast!,
      source: PLAN,
    })
    expect(stamp).toBe('2026-07-23 07:13')
  })
})

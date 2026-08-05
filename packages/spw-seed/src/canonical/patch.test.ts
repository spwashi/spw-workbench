import { describe, expect, it } from 'vitest'
import {
  applyPatch,
  applyPatchToFiles,
  buildPatch,
  buildPatchFromEdits,
  PatchMemoryBank,
  filterEditsForSelection,
  formatPatchSpw,
  selectionFromSource,
} from './patch'
import { irRefKey } from '../ir/ref'

describe('buildPatch', () => {
  it('builds identity patch with nest selection stamp', () => {
    const src = '^seed[Demo]{ x }'
    const d = buildPatch(src, src, { uri: 'demo.spw', store: 'memory' })
    expect(d.differential.identity).toBe(true)
    expect(d.selection.uri).toBe('demo.spw')
    expect(d.selection.nestSkeleton).toBeTruthy()
    expect(d.ref.kind).toBe('patch')
    expect(d.ref.schema).toBe('spw.patch/1')
    expect(d.narrative.identity).toBe(true)
  })

  it('carries edits and layoutOnly narrative for trivia-only rewrite', () => {
    const before = '^["card"]{\n  ~#a: 1\n}\n'
    const after = '^["card"]{\n  ~#a: 1\n  \n}\n'
    const d = buildPatch(before, after, { uri: 'c.spw' })
    expect(d.differential.identity).toBe(false)
    expect(d.differential.edits.length).toBeGreaterThan(0)
    expect(d.narrative.layoutOnly).toBe(true)
    expect(d.report?.layoutOnly).toBe(true)
  })
})

describe('applyPatch', () => {
  it('applies whole-file patch when beforeHash matches', () => {
    const before = 'alpha\n'
    const after = 'beta\n'
    const d = buildPatch(before, after, { applyTarget: 'file' })
    const result = applyPatch(before, d)
    expect(result.ok).toBe(true)
    expect(result.source).toBe(after)
    expect(result.applied).toBeGreaterThan(0)
  })

  it('refuses stale beforeHash', () => {
    const d = buildPatch('a\n', 'b\n')
    const result = applyPatch('other\n', d)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/beforeHash/)
  })

  it('scopes apply to byte span (node selection range)', () => {
    const before = 'AAA\nBBB\nCCC\n'
    const after = 'AAA\nXXX\nCCC\n'
    const d = buildPatch(before, after)
    const midStart = before.indexOf('BBB')
    const midEnd = midStart + 3
    const result = applyPatch(before, d, {
      selection: { span: { start: midStart, end: midEnd } },
    })
    expect(result.ok).toBe(true)
    expect(result.source.includes('AAA')).toBe(true)
  })

  it('buildPatchFromEdits round-trips', () => {
    const before = 'hello world'
    const d = buildPatchFromEdits(before, [
      {
        start: 6,
        end: 11,
        newText: 'spw',
        ruleId: 't',
        stratum: 'source',
      },
    ])
    const result = applyPatch(before, d)
    expect(result.ok).toBe(true)
    expect(result.source).toBe('hello spw')
  })
})

describe('applyPatchToFiles', () => {
  it('maps multi-file targets independently', () => {
    const d = buildPatch('a\n', 'b\n', { applyTarget: 'files' })
    const results = applyPatchToFiles(
      [
        { uri: 'ok.spw', source: 'a\n' },
        { uri: 'stale.spw', source: 'z\n' },
      ],
      d,
    )
    expect(results).toHaveLength(2)
    expect(results[0]!.ok).toBe(true)
    expect(results[0]!.source).toBe('b\n')
    expect(results[1]!.ok).toBe(false)
  })
})

describe('PatchMemoryBank', () => {
  it('stores and retrieves by irRefKey', () => {
    const bank = new PatchMemoryBank()
    const d = buildPatch('x', 'y', { uri: 'm.spw', store: 'memory' })
    bank.set(d)
    expect(bank.get(d.ref)?.selection.uri).toBe('m.spw')
    expect(bank.get(irRefKey(d.ref))?.differential.afterHash).toBe(
      d.differential.afterHash,
    )
    expect(formatPatchSpw(d)).toContain('^["patch"]{')
  })
})

describe('selectionFromSource', () => {
  it('stamps nest skeleton', () => {
    const sel = selectionFromSource('{[]}', { uri: 'n.spw' })
    expect(sel.nestSkeleton).toBeTruthy()
    expect(sel.contentHash).toHaveLength(16)
  })
})

describe('filterEditsForSelection', () => {
  it('returns all edits when selection is whole-file', () => {
    const edits = [
      { start: 0, end: 1, newText: 'z', ruleId: 'r', stratum: 'source' as const },
    ]
    expect(filterEditsForSelection('ab', edits, {})).toHaveLength(1)
  })
})

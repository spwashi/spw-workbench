import { describe, it, expect } from 'vitest'
import { canonicalize, resolveFormatProfile } from './canonicalize'
import {
  compareFormatProfiles,
  diffLines,
  formatPulses,
  FORMAT_CAPABILITIES,
} from './format-pulses'

const MESSY = [
  '^["a"]{',
  '~#name: "x"   ',
  '~#note: "y"',
  '}',
  '',
  '',
  '',
  '^["b"]{',
  'c: 1',
  '}',
].join('\n')

describe('formatPulses', () => {
  it('ends where the formatter ends', () => {
    // The contract that keeps the sequence honest: the last pulse is exactly a
    // full format, so the steps describe the real formatter rather than a copy.
    for (const profile of ['canonical', 'pretty', 'layout', 'wide', 'culture'] as const) {
      const seq = formatPulses(MESSY, profile)
      const direct = canonicalize(MESSY, resolveFormatProfile(profile)).source
      expect(seq.formatted).toBe(direct)
      if (seq.pulses.length > 0) {
        expect(seq.pulses[seq.pulses.length - 1]!.after).toBe(direct)
      }
    }
  })

  it('chains each step onto the previous one', () => {
    const seq = formatPulses(MESSY, 'layout')
    expect(seq.pulses.length).toBeGreaterThan(1)
    for (let i = 1; i < seq.pulses.length; i++) {
      expect(seq.pulses[i]!.before).toBe(seq.pulses[i - 1]!.after)
    }
    expect(seq.pulses[0]!.before).toBe(MESSY)
  })

  it('reports only the capabilities the profile enables', () => {
    const seq = formatPulses(MESSY, 'canonical')
    const options = resolveFormatProfile('canonical')
    const expected = FORMAT_CAPABILITIES.filter(c => options[c] === true)
    expect(seq.pulses.map(p => p.capability)).toEqual(expected)
    expect(seq.pulses.map(p => p.capability)).not.toContain('indentBraces')
  })

  it('applies capabilities in the order canonicalize does', () => {
    const seq = formatPulses(MESSY, 'culture')
    const order = seq.pulses.map(p => p.capability)
    const canonical = FORMAT_CAPABILITIES.filter(c => order.includes(c))
    expect(order).toEqual(canonical)
  })

  it('marks which pulses actually rewrote the surface', () => {
    const seq = formatPulses(MESSY, 'layout')
    expect(seq.changedCount).toBe(seq.pulses.filter(p => p.changed).length)
    expect(seq.changedCount).toBeGreaterThan(0)
    const trim = seq.pulses.find(p => p.capability === 'trimTrailingWhitespace')
    expect(trim?.changed).toBe(true)
  })

  it('honours an indent override', () => {
    const two = formatPulses(MESSY, 'layout', { indentSize: 2 })
    const eight = formatPulses(MESSY, 'layout', { indentSize: 8 })
    expect(eight.formatted).not.toBe(two.formatted)
    expect(eight.formatted).toContain('        ~#name')
  })
})

describe('wide profile', () => {
  it('is layout at four spaces', () => {
    const wide = resolveFormatProfile('wide')
    const layout = resolveFormatProfile('layout')
    expect(wide.indentSize).toBe(4)
    expect({ ...wide, indentSize: 2 }).toEqual(layout)
  })
})

describe('compareFormatProfiles', () => {
  it('measures each profile against the original, not the previous one', () => {
    const rows = compareFormatProfiles(MESSY, ['canonical', 'layout', 'wide'])
    expect(rows.map(r => r.profile)).toEqual(['canonical', 'layout', 'wide'])
    for (const row of rows) {
      expect(row.formatted).toBe(canonicalize(MESSY, resolveFormatProfile(row.profile)).source)
    }
  })

  it('separates profiles that change the surface from those that do not', () => {
    const clean = '^["a"]{\n  b: 1\n}\n'
    const rows = compareFormatProfiles(clean, ['canonical', 'wide'])
    expect(rows[0]!.changed).toBe(false)
    expect(rows[1]!.changed).toBe(true)
  })
})

describe('diffLines', () => {
  it('returns nothing for identical text', () => {
    expect(diffLines('a\nb', 'a\nb')).toEqual([])
  })

  it('pairs same-length rewrites line for line', () => {
    const d = diffLines('a\nX\nc', 'a\nY\nc', 0)
    expect(d.map(x => [x.kind, x.text])).toEqual([
      ['remove', 'X'],
      ['add', 'Y'],
    ])
  })

  it('reports only the appended line when text grows', () => {
    const d = diffLines('a\nb', 'a\nb\nc', 0)
    expect(d.map(x => [x.kind, x.text])).toEqual([['add', 'c']])
  })

  it('falls back to block form when a rewrite also changes the line count', () => {
    const d = diffLines('a\nX\nd', 'a\nY\nZ\nd', 0)
    expect(d.filter(x => x.kind === 'remove').map(x => x.text)).toEqual(['X'])
    expect(d.filter(x => x.kind === 'add').map(x => x.text)).toEqual(['Y', 'Z'])
  })

  it('includes the requested context', () => {
    const d = diffLines('a\nb\nX\nd\ne', 'a\nb\nY\nd\ne', 1)
    expect(d.filter(x => x.kind === 'context').map(x => x.text)).toEqual(['b', 'd'])
  })
})

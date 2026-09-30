import { describe, expect, it } from 'vitest'
import { countOps, latestTimestamp } from './derived-marks'
import { parse } from '../parser'

const derive = (deriver: ReturnType<typeof latestTimestamp>, source: string): string | null =>
  deriver({ source, root: parse(source).ast!, node: parse(source).ast! })

describe('latestTimestamp', () => {
  it('reads timed, date-only, and quoted entry heads', () => {
    const source = [
      '^["stream"]{',
      ' >>[2026-08-24 11:12] decide — timed',
      ' >>[2026-09-05] observe — date only',
      ' >>["2026-07-01"] note — quoted',
      '}',
    ].join('\n')
    expect(derive(latestTimestamp('stream'), source)).toBe('2026-09-05')
  })

  it('prefers a timed entry over a date-only head on the same day', () => {
    const source = '^["stream"]{\n >>[2026-09-05] a\n >>[2026-09-05 14:10] b\n}\n'
    expect(derive(latestTimestamp('stream'), source)).toBe('2026-09-05 14:10')
  })

  it('ignores dates quoted inside an entry message and outside the frame', () => {
    const source = [
      '^["stream"]{',
      ' >>[2026-08-01 09:00] revise — supersedes the 2026-12-31 23:59 draft',
      '}',
      '^["cache"]{',
      ' ~#last_stream: "2027-01-01 00:00"',
      '}',
    ].join('\n')
    expect(derive(latestTimestamp('stream'), source)).toBe('2026-08-01 09:00')
  })

  it('returns null when the frame is missing or has no entries', () => {
    expect(derive(latestTimestamp('stream'), '^["open"]{}\n')).toBeNull()
    expect(derive(latestTimestamp('stream'), '^["stream"]{\n}\n')).toBeNull()
  })
})

describe('countOps', () => {
  it('counts one operator kind inside a named frame', () => {
    const source = '^["open"]{\n ?[a]: "one"\n ?[b]: "two"\n}\n'
    const root = parse(source).ast!
    expect(countOps('open', '?')({ source, root, node: root })).toBe('2')
  })
})

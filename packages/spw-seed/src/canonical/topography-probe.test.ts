import { describe, expect, it } from 'vitest'
import { snapshotTopography } from './topography-probe'

/** A stream frame whose entries carry the prose that used to read as broken syntax. */
const HOSTILE_STREAM = [
  '^["stream"]{',
  " >>[2026-10-12 21:34] decide — a hyphen-ated word, an em—dash, it's an apostrophe, and \"an unbalanced quote",
  ' >>[2026-10-12 21:35] observe — what changed? (a parenthesis left open',
  ' >>[0] observe — baseline @$organ under #$style_id',
  '}',
  '',
].join('\n')

describe('snapshotTopography', () => {
  it('reads stream entries as prose with no path given', () => {
    const snapshot = snapshotTopography(HOSTILE_STREAM)
    expect(snapshot.reasons).toEqual([])
    expect(snapshot.parseHealth).toBe('complete_structured')
  })
})

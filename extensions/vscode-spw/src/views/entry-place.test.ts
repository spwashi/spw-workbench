import { describe, expect, it } from 'vitest'
import { distinctPlaces, entryRow, shortPlace } from './entry-place'

const names = (paths: string[]): Record<string, string> =>
  Object.fromEntries([...distinctPlaces(paths)].map(([p, place]) => [p, place.name]))

describe('where a concept row points', () => {
  it('leads with the file name and adds a folder only where a sibling shares the name', () => {
    expect(names([
      '.agents/plans/curiosity-mutation-ergonomics/wip.spw',
      '.agents/plans/typescript-upgrade-ladder/wip.spw',
      '.agents/plans/index.spw',
      '.agents/plans/curiosity-mutation-ergonomics/wip.spw',
    ])).toEqual({
      '.agents/plans/curiosity-mutation-ergonomics/wip.spw': 'curiosity-mutation-ergonomics/wip.spw',
      '.agents/plans/typescript-upgrade-ladder/wip.spw': 'typescript-upgrade-ladder/wip.spw',
      '.agents/plans/index.spw': 'index.spw',
    })
  })

  it('names a deep file by its name when siblings sit in other roots, keeping the folder aside', () => {
    const deep = '.agents/plans/caches-cut-2026-09-30/references/spw-branch/seeds/contraption-excerpts/coupling-map.spw'
    const places = distinctPlaces([deep, '.spw/caches/tree/spw/theory/valence-and-charge.spw'])
    expect(places.get(deep)).toEqual({
      name: 'coupling-map.spw',
      folder: '.agents/plans/caches-cut-2026-09-30/references/spw-branch/seeds/contraption-excerpts',
    })
  })

  it('climbs as many folders as it takes, and stops at the root', () => {
    expect(names(['a/x/wip.spw', 'b/x/wip.spw', 'c/y/wip.spw', 'wip.spw'])).toEqual({
      'a/x/wip.spw': 'a/x/wip.spw',
      'b/x/wip.spw': 'b/x/wip.spw',
      'c/y/wip.spw': 'y/wip.spw',
      'wip.spw': 'wip.spw',
    })
    expect(shortPlace('.agents/plans/a/wip.spw')).toBe('a/wip.spw')
  })
})

describe('a row shows what its ancestors do not', () => {
  const parts = {
    concept: '#public_interest_research',
    bareConcept: '#public_interest_research',
    place: { name: 'a/wip.spw', folder: '.agents/plans' },
    line: 41,
    context: 'development',
  }

  it('under a concept, the place is the label and its folder trails the description', () => {
    expect(entryRow(parts, 'concept')).toEqual({ label: 'a/wip.spw:42', description: 'development · .agents/plans' })
  })

  it('under a concept, a reading still tells its rows apart', () => {
    const reading = { ...parts, concept: '~#lens(living system)', bareConcept: '~#lens', context: null, place: { name: 'tmp.spw', folder: '' } }
    expect(entryRow(reading, 'concept')).toEqual({ label: 'tmp.spw:42', description: '~#lens(living system)' })
  })

  it('under a file, the concept is the label and the path is not repeated', () => {
    expect(entryRow(parts, 'file')).toEqual({ label: '#public_interest_research', description: 'development · line 42' })
  })

  it('under a kind or a phase, the concept leads and the file name follows', () => {
    expect(entryRow({ ...parts, context: null }, 'nothing')).toEqual({ label: '#public_interest_research', description: 'a/wip.spw:42' })
  })
})

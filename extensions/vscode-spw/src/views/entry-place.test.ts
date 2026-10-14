import { describe, expect, it } from 'vitest'
import { distinctPlaces, entryRow, shortPlace } from './entry-place'

describe('where a concept row points', () => {
  it('drops the folders every sibling shares, so the slug that differs is what shows', () => {
    const places = distinctPlaces([
      '.agents/plans/curiosity-mutation-ergonomics/wip.spw',
      '.agents/plans/typescript-upgrade-ladder/wip.spw',
      '.agents/plans/index.spw',
      '.agents/plans/curiosity-mutation-ergonomics/wip.spw',
    ])
    expect(places.get('.agents/plans/curiosity-mutation-ergonomics/wip.spw')).toBe('curiosity-mutation-ergonomics/wip.spw')
    expect(places.get('.agents/plans/typescript-upgrade-ladder/wip.spw')).toBe('typescript-upgrade-ladder/wip.spw')
    expect(places.get('.agents/plans/index.spw')).toBe('index.spw')
    expect(places.size).toBe(3)
  })

  it('keeps the parent folder of a path with no siblings, since wip.spw alone names nothing', () => {
    expect(distinctPlaces(['.agents/plans/a/wip.spw']).get('.agents/plans/a/wip.spw')).toBe('a/wip.spw')
    expect(shortPlace('tmp.spw')).toBe('tmp.spw')
  })

  it('keeps a whole path when siblings share no folder', () => {
    const places = distinctPlaces(['tmp.spw', '.spw/index.spw'])
    expect(places.get('tmp.spw')).toBe('tmp.spw')
    expect(places.get('.spw/index.spw')).toBe('.spw/index.spw')
  })
})

describe('a row shows what its ancestors do not', () => {
  const parts = { concept: '#public_interest_research', bareConcept: '#public_interest_research', place: 'a/wip.spw', line: 41, context: 'development' }

  it('under a concept, the place is the label and the concept is not repeated', () => {
    expect(entryRow(parts, 'concept')).toEqual({ label: 'a/wip.spw:42', description: 'development' })
  })

  it('under a concept, a reading still tells its rows apart', () => {
    const reading = { ...parts, concept: '~#lens(living system)', bareConcept: '~#lens', context: null }
    expect(entryRow(reading, 'concept')).toEqual({ label: 'a/wip.spw:42', description: '~#lens(living system)' })
  })

  it('under a file, the concept is the label and the path is not repeated', () => {
    expect(entryRow(parts, 'file')).toEqual({ label: '#public_interest_research', description: 'development · line 42' })
  })

  it('under a kind or a phase, the concept leads and the short place follows', () => {
    expect(entryRow({ ...parts, context: null }, 'nothing')).toEqual({ label: '#public_interest_research', description: 'a/wip.spw:42' })
  })
})

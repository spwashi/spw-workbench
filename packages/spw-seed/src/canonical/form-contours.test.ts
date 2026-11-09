import { describe, expect, it } from 'vitest'
import {
  contourFormLadder,
  expandFormContour,
  listFormLadders,
  reduceFormContour,
  restoreFormContour,
} from '@spwashi/spw-seed'

describe('form contours', () => {
  it('keeps Couple and Capsule as distinct contour kinds', () => {
    expect(contourFormLadder('<>')?.ladderKind).toBe('operator')
    expect(contourFormLadder('< >')?.ladderKind).toBe('boundary')
  })

  it('reports only axes actually lost from the retained view', () => {
    for (const ladder of listFormLadders()) {
      const reduction = reduceFormContour(contourFormLadder(ladder)!, { policy: 'endpoints' })
      const retainedAxes = new Set(reduction.contour.points.flatMap(point => point.axes))
      for (const axis of reduction.loss.omittedAxes) {
        expect(retainedAxes.has(axis), `${ladder.id}:${axis}`).toBe(false)
      }
    }
  })

  it('keeps a receipt-owned immutable snapshot for exact restoration', () => {
    const source = contourFormLadder('body')!
    const reduction = reduceFormContour(source, { policy: 'endpoints' })
    const expected = restoreFormContour(reduction)

    source.points[0].surface = 'caller-mutated'
    reduction.contour.points[0].surface = 'view-mutated'

    expect(Object.isFrozen(reduction.original)).toBe(true)
    expect(restoreFormContour(reduction)).toEqual(expected)
    expect(expandFormContour(reduction, { full: true }).contour).toEqual(expected)
  })
})

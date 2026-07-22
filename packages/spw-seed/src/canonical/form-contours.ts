/**
 * Evidence-bearing views over form ladders.
 *
 * A contour is an ordered observation of a ladder, not a claim that the
 * surfaces are evolutionary stages. Reduction creates a lossy projection and
 * names what it omits. Expansion uses the reduction receipt to reveal nearby
 * points or restore the exact input view.
 *
 * This module is portable: editor, LSP, CLI, and agent surfaces can choose
 * different view densities without changing source or inventing equivalence.
 */

import { hashString } from './canonicalize'
import {
  FORM_LADDER_PROFILE,
  boundaryLadder,
  operatorLadder,
  probeFormLadder,
  type EnrichmentRole,
  type FormAxis,
  type LadderStep,
  type ResolvedFormLadder,
} from './form-ladders'
import type { ParseHealth } from './topography-probe'

export type FormContourView = 'full' | 'reduced' | 'expanded'

export interface FormContourEvidence {
  expectation: LadderStep['parseExpectation']
  parseHealth: ParseHealth
  expectationMet: boolean
  proseFallback: boolean
}

export interface FormContourPoint {
  /** Stable position in the complete catalog ladder. */
  catalogIndex: number
  id: string
  surface: string
  role: EnrichmentRole
  implies: string
  /** Axes attributed by the named interpretive ladder profile. */
  axes: readonly FormAxis[]
  /** Parser observation, kept separate from the interpretive role/axes. */
  evidence: FormContourEvidence
}

export interface FormContourDimensions {
  visiblePointCount: number
  catalogPointCount: number
  roleVariety: number
  structuredEvidenceCount: number
  conceptualSlotCount: number
  failedExpectationCount: number
  axisCoverage: {
    covered: number
    declared: number
    ratio: number
    /** Axes implied by visible roles but absent from the ladder declaration. */
    undeclared: FormAxis[]
  }
}

export interface FormContour {
  profile: typeof FORM_LADDER_PROFILE
  ladderId: string
  ladderKind: ResolvedFormLadder['kind']
  declaredAxes: readonly FormAxis[]
  view: FormContourView
  /** Signature of the complete catalog ladder from which this view derives. */
  catalogSignature: string
  /** Signature of parser observations visible in this view. */
  evidenceSignature: string
  /** Signature of the ordered points visible in this view. */
  viewSignature: string
  points: FormContourPoint[]
  omittedPointIds: string[]
  dimensions: FormContourDimensions
}

export type FormReductionPolicy = 'endpoints' | 'evidence' | 'axes' | 'balanced'

export interface FormContourReduction {
  operation: 'reduce'
  policy: FormReductionPolicy
  inputSignature: string
  outputSignature: string
  contour: FormContour
  omittedPoints: FormContourPoint[]
  loss: {
    kind: 'none' | 'projection'
    omittedPointCount: number
    omittedRoles: EnrichmentRole[]
    omittedAxes: FormAxis[]
    omittedStructuredEvidence: number
  }
  /** A non-identity projection never claims semantic equivalence. */
  semanticEquivalence: 'identity' | 'not_claimed'
  /** The receipt retains the exact input contour for restoration. */
  reversible: 'identity' | 'with_receipt'
  original: FormContour
}

export interface FormContourExpansion {
  operation: 'expand'
  inputSignature: string
  outputSignature: string
  contour: FormContour
  addedPointIds: string[]
  remainingOmittedPointIds: string[]
  exactRestore: boolean
}

const ROLE_AXES: Partial<Record<EnrichmentRole, readonly FormAxis[]>> = {
  select: ['selection'],
  materialize: ['material'],
  hold: ['flow'],
  membrane: ['interface'],
  channel: ['flow'],
  range: ['selection'],
  label: ['label'],
  path: ['path'],
  ref: ['reference'],
  ground: ['ground'],
  fold: ['fold'],
  annotate: ['label'],
  defer: ['potential'],
  collapse: ['ground'],
  integrate: ['label', 'material'],
  couple: ['interface'],
  open: ['potential'],
}

function catalogSignatureFor(
  points: readonly FormContourPoint[],
  declaredAxes: readonly FormAxis[],
): string {
  return hashString(
    `${FORM_LADDER_PROFILE.id}@${FORM_LADDER_PROFILE.revision}\u001e` +
      `${declaredAxes.join(',')}\u001e` + points
      .map(point =>
        `${point.catalogIndex}:${point.id}:${point.surface}:${point.role}:` +
        `${point.axes.join(',')}:${point.implies}`,
      )
      .join('\u001f'),
  )
}

function cloneContour(contour: FormContour): FormContour {
  return {
    ...contour,
    declaredAxes: [...contour.declaredAxes],
    points: contour.points.map(point => ({
      ...point,
      axes: [...point.axes],
      evidence: { ...point.evidence },
    })),
    omittedPointIds: [...contour.omittedPointIds],
    dimensions: {
      ...contour.dimensions,
      axisCoverage: {
        ...contour.dimensions.axisCoverage,
        undeclared: [...contour.dimensions.axisCoverage.undeclared],
      },
    },
  }
}

/** Freeze the receipt-owned snapshot so later caller mutation cannot rewrite history. */
function freezeContourSnapshot(contour: FormContour): FormContour {
  Object.freeze(contour.declaredAxes)
  for (const point of contour.points) {
    Object.freeze(point.axes)
    Object.freeze(point.evidence)
    Object.freeze(point)
  }
  Object.freeze(contour.points)
  Object.freeze(contour.omittedPointIds)
  Object.freeze(contour.dimensions.axisCoverage.undeclared)
  Object.freeze(contour.dimensions.axisCoverage)
  Object.freeze(contour.dimensions)
  return Object.freeze(contour)
}

function evidenceSignatureFor(points: readonly FormContourPoint[]): string {
  return hashString(
    points
      .map(point =>
        `${point.catalogIndex}:${point.evidence.expectation}:${point.evidence.parseHealth}:` +
        `${point.evidence.expectationMet}:${point.evidence.proseFallback}`,
      )
      .join('\u001f'),
  )
}

function viewSignatureFor(
  catalogSignature: string,
  points: readonly FormContourPoint[],
): string {
  return hashString(
    `${catalogSignature}\u001e${evidenceSignatureFor(points)}\u001e` +
      points.map(point => point.catalogIndex).join(','),
  )
}

function dimensionsFor(
  points: readonly FormContourPoint[],
  catalogPointCount: number,
  declaredAxes: readonly FormAxis[],
): FormContourDimensions {
  const roles = new Set(points.map(point => point.role))
  const coveredAxes = new Set(points.flatMap(point => point.axes))
  const declared = new Set(declaredAxes)
  const covered = [...coveredAxes].filter(axis => declared.has(axis)).length
  const undeclared = [...coveredAxes].filter(axis => !declared.has(axis))

  return {
    visiblePointCount: points.length,
    catalogPointCount,
    roleVariety: roles.size,
    structuredEvidenceCount: points.filter(
      point => point.evidence.expectation === 'structured' && point.evidence.expectationMet,
    ).length,
    conceptualSlotCount: points.filter(point => point.evidence.expectation === 'conceptual').length,
    failedExpectationCount: points.filter(point => !point.evidence.expectationMet).length,
    axisCoverage: {
      covered,
      declared: declared.size,
      ratio: declared.size === 0 ? 1 : covered / declared.size,
      undeclared,
    },
  }
}

function projectContour(
  original: FormContour,
  indices: readonly number[],
  view: FormContourView,
): FormContour {
  const selected = new Set(indices)
  const points = original.points.filter(point => selected.has(point.catalogIndex))
  const newlyOmittedPointIds = original.points
    .filter(point => !selected.has(point.catalogIndex))
    .map(point => point.id)
  const omittedPointIds = [...new Set([...original.omittedPointIds, ...newlyOmittedPointIds])]

  return {
    ...original,
    view,
    points,
    omittedPointIds,
    evidenceSignature: evidenceSignatureFor(points),
    viewSignature: viewSignatureFor(original.catalogSignature, points),
    dimensions: dimensionsFor(
      points,
      original.dimensions.catalogPointCount,
      original.declaredAxes,
    ),
  }
}

/** Observe a complete ladder with interpretive axes and measured parser evidence. */
export function contourFormLadder(
  ladderOrQuery: ResolvedFormLadder | string,
): FormContour | undefined {
  const ladder = typeof ladderOrQuery === 'string'
    ? boundaryLadder(ladderOrQuery) ?? operatorLadder(ladderOrQuery)
    : ladderOrQuery
  if (!ladder) return undefined

  const probe = probeFormLadder(ladder)
  const points = ladder.steps.map((step, catalogIndex): FormContourPoint => {
    const observation = probe.steps[catalogIndex]
    const attributedAxes = ROLE_AXES[step.role] ?? []
    return {
      catalogIndex,
      id: step.id,
      surface: step.surface,
      role: step.role,
      implies: step.implies,
      axes: attributedAxes,
      evidence: {
        expectation: step.parseExpectation,
        parseHealth: observation.parseHealth,
        expectationMet: observation.expectationMet,
        proseFallback: observation.proseFallback,
      },
    }
  })
  const catalogSignature = catalogSignatureFor(points, ladder.axes)
  const evidenceSignature = evidenceSignatureFor(points)

  return {
    profile: FORM_LADDER_PROFILE,
    ladderId: ladder.id,
    ladderKind: ladder.kind,
    declaredAxes: ladder.axes,
    view: 'full',
    catalogSignature,
    evidenceSignature,
    viewSignature: viewSignatureFor(catalogSignature, points),
    points,
    omittedPointIds: [],
    dimensions: dimensionsFor(points, points.length, ladder.axes),
  }
}

function endpoints(points: readonly FormContourPoint[]): number[] {
  if (points.length === 0) return []
  if (points.length === 1) return [points[0].catalogIndex]
  return [points[0].catalogIndex, points[points.length - 1].catalogIndex]
}

function balancedIndices(points: readonly FormContourPoint[], maxPoints: number): number[] {
  if (!Number.isInteger(maxPoints) || maxPoints < 2) {
    throw new RangeError('balanced contour reduction requires maxPoints >= 2')
  }
  if (points.length <= maxPoints) return points.map(point => point.catalogIndex)

  const indices = new Set<number>()
  for (let slot = 0; slot < maxPoints; slot += 1) {
    const pointIndex = Math.round((slot * (points.length - 1)) / (maxPoints - 1))
    indices.add(points[pointIndex].catalogIndex)
  }
  return [...indices]
}

function reductionIndices(
  contour: FormContour,
  policy: FormReductionPolicy,
  maxPoints: number,
): number[] {
  const points = contour.points
  const keep = new Set(endpoints(points))

  if (policy === 'evidence') {
    for (const point of points) {
      if (point.evidence.expectation === 'structured' || !point.evidence.expectationMet) {
        keep.add(point.catalogIndex)
      }
    }
  } else if (policy === 'axes') {
    for (const axis of contour.declaredAxes) {
      const anchor = points.find(point => point.axes.includes(axis))
      if (anchor) keep.add(anchor.catalogIndex)
    }
  } else if (policy === 'balanced') {
    return balancedIndices(points, maxPoints)
  }

  return [...keep].sort((a, b) => a - b)
}

/**
 * Project a contour to a named density. This is explicitly not a semantic
 * equivalence transform unless it is the identity projection.
 */
export function reduceFormContour(
  contour: FormContour,
  options: { policy?: FormReductionPolicy; maxPoints?: number } = {},
): FormContourReduction {
  const policy = options.policy ?? 'axes'
  const indices = reductionIndices(contour, policy, options.maxPoints ?? 4)
  const reduced = projectContour(contour, indices, 'reduced')
  const retained = new Set(indices)
  const omittedPoints = contour.points.filter(point => !retained.has(point.catalogIndex))
  const retainedPoints = contour.points.filter(point => retained.has(point.catalogIndex))
  const retainedAxes = new Set(retainedPoints.flatMap(point => point.axes))
  const retainedRoles = new Set(retainedPoints.map(point => point.role))
  const omittedAxes = [...new Set(omittedPoints.flatMap(point => point.axes))]
    .filter(axis => !retainedAxes.has(axis))
  const omittedRoles = [...new Set(omittedPoints.map(point => point.role))]
    .filter(role => !retainedRoles.has(role))
  const identity = omittedPoints.length === 0
  const original = freezeContourSnapshot(cloneContour(contour))

  return {
    operation: 'reduce',
    policy,
    inputSignature: contour.viewSignature,
    outputSignature: reduced.viewSignature,
    contour: reduced,
    omittedPoints,
    loss: {
      kind: identity ? 'none' : 'projection',
      omittedPointCount: omittedPoints.length,
      omittedRoles,
      omittedAxes,
      omittedStructuredEvidence: omittedPoints.filter(
        point => point.evidence.expectation === 'structured' && point.evidence.expectationMet,
      ).length,
    },
    semanticEquivalence: identity ? 'identity' : 'not_claimed',
    reversible: identity ? 'identity' : 'with_receipt',
    original,
  }
}

/**
 * Reveal points around the reduced anchors, or restore the entire input view.
 * Expansion never reparses or guesses missing content; it reads the receipt.
 */
export function expandFormContour(
  reduction: FormContourReduction,
  options: { radius?: number; full?: boolean } = {},
): FormContourExpansion {
  const original = reduction.original
  const reducedIndices = new Set(reduction.contour.points.map(point => point.catalogIndex))
  const selected = new Set(reducedIndices)

  if (options.full ?? false) {
    for (const point of original.points) selected.add(point.catalogIndex)
  } else {
    const radius = options.radius ?? 1
    if (!Number.isInteger(radius) || radius < 0) {
      throw new RangeError('contour expansion radius must be a non-negative integer')
    }
    for (const anchor of reducedIndices) {
      for (const point of original.points) {
        if (Math.abs(point.catalogIndex - anchor) <= radius) selected.add(point.catalogIndex)
      }
    }
  }

  const indices = [...selected].sort((a, b) => a - b)
  const exactRestore = indices.length === original.points.length
  const contour = exactRestore
    ? cloneContour(original)
    : projectContour(original, indices, 'expanded')
  const addedPointIds = contour.points
    .filter(point => !reducedIndices.has(point.catalogIndex))
    .map(point => point.id)

  return {
    operation: 'expand',
    inputSignature: reduction.outputSignature,
    outputSignature: contour.viewSignature,
    contour,
    addedPointIds,
    remainingOmittedPointIds: contour.omittedPointIds,
    exactRestore,
  }
}

/** Restore the exact contour retained by a reduction receipt. */
export function restoreFormContour(reduction: FormContourReduction): FormContour {
  return cloneContour(reduction.original)
}

export function formatFormContour(contour: FormContour): string {
  const dimensions = contour.dimensions
  const lines = [
    `${contour.ladderId} [${contour.view}] ${contour.viewSignature}`,
    `profile=${contour.profile.id}@${contour.profile.revision} status=${contour.profile.status}`,
    `points=${dimensions.visiblePointCount}/${dimensions.catalogPointCount}` +
      ` roles=${dimensions.roleVariety}` +
      ` axes=${dimensions.axisCoverage.covered}/${dimensions.axisCoverage.declared}` +
      ` structured=${dimensions.structuredEvidenceCount}` +
      ` conceptual=${dimensions.conceptualSlotCount}` +
      ` failed=${dimensions.failedExpectationCount}`,
  ]

  for (const point of contour.points) {
    lines.push(
      `${point.catalogIndex + 1}. ${point.surface} [${point.role}]` +
        (point.axes.length > 0 ? ` axes=${point.axes.join(',')}` : '') +
        ` health=${point.evidence.parseHealth}` +
        (point.evidence.expectationMet ? '' : ' expectation=failed'),
    )
  }
  if (contour.omittedPointIds.length > 0) {
    lines.push(`omitted=${contour.omittedPointIds.join(',')}`)
  }
  return lines.join('\n')
}

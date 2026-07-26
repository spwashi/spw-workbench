/**
 * Source differentials — ordered text edits with strata and mutation vectors.
 *
 * A differential is a plan from `before` → `after` under a named rule and
 * stratum. Applying edits is pure effect.l1.memory; workspace write authority
 * is effect.l2.workspace and lives outside this module.
 *
 * @see docs/theory/spw/operational-topography.spw (layout_differential, mutation_profile)
 * @see docs/theory/spw/operational-devices.spw (semantic differentials)
 */

export type DifferentialStratum =
  | 'source'
  | 'structure'
  | 'layout'
  | 'reference'
  | 'operation'
  | 'script'

/**
 * Effect ceiling for planned mutations (transport + kernel share these ids).
 */
export type EffectGrade =
  | 'effect.l0.measure'
  | 'effect.l1.memory'
  | 'effect.l2.workspace'
  | 'effect.l3.external'

/**
 * How an evidence contribution was produced.
 *
 * These values are categories, not grades: a reported preference is neither
 * above nor below an observed syntax span. Effect authority remains a separate
 * ordered concept.
 */
export const EVIDENCE_BASES = ['observed', 'derived', 'reported'] as const
export type EvidenceBasis = (typeof EVIDENCE_BASES)[number]

/** The subject of an evidence contribution, independent of how it was made. */
export const EVIDENCE_DOMAINS = [
  'source',
  'syntax',
  'structure',
  'topology',
  'layout',
  'runtime',
  'architecture',
  'preference',
] as const
export type EvidenceDomain = (typeof EVIDENCE_DOMAINS)[number]

/** The contribution an item of evidence makes to a result. */
export const EVIDENCE_ROLES = ['match', 'filter', 'projection', 'annotation'] as const
export type EvidenceRole = (typeof EVIDENCE_ROLES)[number]

/** Versioned tool or code path that emitted an evidence contribution. */
export interface EvidenceProducer {
  id: string
  version: string
}

/** Immutable identity of an artifact used as evidence. */
export interface EvidenceArtifactRef {
  id: string
  revision: string
}

/** Versioned method used to derive evidence from one or more artifacts. */
export interface EvidenceMethod {
  id: string
  version: string
  deterministic: boolean
  /** Hash of the exact heuristic or profile configuration, when applicable. */
  profileHash?: string
}

/** Recomputable description of uncertainty emitted by a derivation method. */
export interface EvidenceUncertainty {
  measure: string
  value: number
  unit?: string
}

/** Attributed human, agent, or model identity credited with a report. */
export interface EvidenceReporter {
  id: string
  kind: 'human' | 'agent' | 'model'
  /** Software or model version when the reporter has one. */
  version?: string
}

export interface ObservedEvidenceProvenance {
  producer: EvidenceProducer
  artifact: EvidenceArtifactRef
}

export interface DerivedEvidenceProvenance {
  producer: EvidenceProducer
  method: EvidenceMethod
  inputs: readonly [EvidenceArtifactRef, ...EvidenceArtifactRef[]]
  /** Present only for method-derived evidence, never for direct observations or reports. */
  uncertainty?: EvidenceUncertainty
}

export interface ReportedEvidenceProvenance {
  producer: EvidenceProducer
  reporter: EvidenceReporter
  context?: EvidenceArtifactRef
}

interface EvidenceContributionBase {
  domain: EvidenceDomain
  role: EvidenceRole
}

export interface ObservedEvidenceContribution extends EvidenceContributionBase {
  basis: 'observed'
  provenance: ObservedEvidenceProvenance
}

export interface DerivedEvidenceContribution extends EvidenceContributionBase {
  basis: 'derived'
  provenance: DerivedEvidenceProvenance
}

export interface ReportedEvidenceContribution extends EvidenceContributionBase {
  basis: 'reported'
  provenance: ReportedEvidenceProvenance
}

/**
 * Portable evidence descriptor. Narrow on `basis` to obtain the provenance
 * required for that basis; no ordering or "at most" relation is defined.
 */
export type EvidenceContribution =
  | ObservedEvidenceContribution
  | DerivedEvidenceContribution
  | ReportedEvidenceContribution

export const EFFECT_L0_MEASURE = 'effect.l0.measure' as const
export const EFFECT_L1_MEMORY = 'effect.l1.memory' as const
export const EFFECT_L2_WORKSPACE = 'effect.l2.workspace' as const
export const EFFECT_L3_EXTERNAL = 'effect.l3.external' as const

export const EFFECT_GRADE_ORDER: Record<EffectGrade, number> = {
  'effect.l0.measure': 0,
  'effect.l1.memory': 1,
  'effect.l2.workspace': 2,
  'effect.l3.external': 3,
}

export function effectGradeAtMost(grade: EffectGrade, ceiling: EffectGrade): boolean {
  return EFFECT_GRADE_ORDER[grade] <= EFFECT_GRADE_ORDER[ceiling]
}

/**
 * UTF-16 code-unit offsets into the full source string (JS string indexing).
 * Not line/column; convert at the editor boundary when needed.
 */
export interface SourceEdit {
  /** Inclusive start offset */
  start: number
  /** Exclusive end offset */
  end: number
  /** Replacement text (empty string = delete) */
  newText: string
  /** Rule that produced this edit */
  ruleId: string
  /** Differential stratum */
  stratum: DifferentialStratum
}

export interface MutationVector {
  layout_delta: number
  token_delta: number
  structure_delta: number
  label_delta: number
  reference_delta: number
  script_delta: number
  edit_count: number
  bytes_delta: number
}

export interface SourceDifferential {
  beforeHash: string
  afterHash: string
  beforeLength: number
  afterLength: number
  edits: SourceEdit[]
  vector: MutationVector
  identity: boolean
}

/**
 * Apply ordered non-overlapping edits (sorted by start ascending).
 * Edits must not overlap; later edits are applied after earlier ones by
 * processing from end → start so offsets stay valid.
 */
export function applyEdits(source: string, edits: readonly SourceEdit[]): string {
  if (edits.length === 0) return source

  const ordered = [...edits].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    return a.end - b.end
  })

  // Overlap check
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].start < ordered[i - 1].end) {
      throw new Error(
        `overlapping edits: ${ordered[i - 1].ruleId}[${ordered[i - 1].start},${ordered[i - 1].end}) ` +
          `vs ${ordered[i].ruleId}[${ordered[i].start},${ordered[i].end})`,
      )
    }
  }

  let out = source
  for (let i = ordered.length - 1; i >= 0; i--) {
    const e = ordered[i]
    if (e.start < 0 || e.end > out.length || e.start > e.end) {
      throw new Error(
        `edit out of range: ${e.ruleId}[${e.start},${e.end}) length=${out.length}`,
      )
    }
    out = out.slice(0, e.start) + e.newText + out.slice(e.end)
  }
  return out
}

/**
 * Build a minimal line-oriented differential between two sources.
 * Common prefix/suffix lines are preserved; the middle is one replace edit
 * (or several line-local edits when single-line changes dominate).
 */
export function differentialFromSources(
  before: string,
  after: string,
  ruleId: string,
  stratum: DifferentialStratum,
  hash: (s: string) => string,
): SourceDifferential {
  if (before === after) {
    const h = hash(before)
    return {
      beforeHash: h,
      afterHash: h,
      beforeLength: before.length,
      afterLength: after.length,
      edits: [],
      vector: zeroVector(),
      identity: true,
    }
  }

  const edits = lineSpanEdits(before, after, ruleId, stratum)
  const vector = vectorFromEdits(edits, before.length, after.length, stratum)

  return {
    beforeHash: hash(before),
    afterHash: hash(after),
    beforeLength: before.length,
    afterLength: after.length,
    edits,
    vector,
    identity: false,
  }
}

export function zeroVector(): MutationVector {
  return {
    layout_delta: 0,
    token_delta: 0,
    structure_delta: 0,
    label_delta: 0,
    reference_delta: 0,
    script_delta: 0,
    edit_count: 0,
    bytes_delta: 0,
  }
}

export function mergeVectors(a: MutationVector, b: MutationVector): MutationVector {
  return {
    layout_delta: a.layout_delta + b.layout_delta,
    token_delta: a.token_delta + b.token_delta,
    structure_delta: a.structure_delta + b.structure_delta,
    label_delta: a.label_delta + b.label_delta,
    reference_delta: a.reference_delta + b.reference_delta,
    script_delta: a.script_delta + b.script_delta,
    edit_count: a.edit_count + b.edit_count,
    bytes_delta: a.bytes_delta + b.bytes_delta,
  }
}

function vectorFromEdits(
  edits: readonly SourceEdit[],
  beforeLen: number,
  afterLen: number,
  stratum: DifferentialStratum,
): MutationVector {
  const v = zeroVector()
  v.edit_count = edits.length
  v.bytes_delta = afterLen - beforeLen
  const mag = Math.max(1, edits.length)
  switch (stratum) {
    case 'layout':
      v.layout_delta = mag
      break
    case 'source':
      v.token_delta = mag
      break
    case 'structure':
      v.structure_delta = mag
      break
    case 'reference':
      v.reference_delta = mag
      break
    case 'script':
      v.script_delta = mag
      break
    case 'operation':
      v.structure_delta = mag
      break
  }
  return v
}

/**
 * Compute edits by shared line prefix/suffix.
 * Single middle span becomes one SourceEdit (efficient for format rewrites).
 */
function lineSpanEdits(
  before: string,
  after: string,
  ruleId: string,
  stratum: DifferentialStratum,
): SourceEdit[] {
  // Whole-file replace is always valid; refine when line structure helps
  const bLines = splitKeepEnds(before)
  const aLines = splitKeepEnds(after)

  let prefix = 0
  const minLen = Math.min(bLines.length, aLines.length)
  while (prefix < minLen && bLines[prefix] === aLines[prefix]) {
    prefix++
  }

  let suffix = 0
  while (
    suffix < minLen - prefix &&
    bLines[bLines.length - 1 - suffix] === aLines[aLines.length - 1 - suffix]
  ) {
    suffix++
  }

  const bStart = offsetOfLine(bLines, prefix)
  const bEnd = offsetOfLine(bLines, bLines.length - suffix)
  const aMid = aLines.slice(prefix, aLines.length - suffix).join('')

  // If everything differs, one full replace
  if (prefix === 0 && suffix === 0) {
    return [
      {
        start: 0,
        end: before.length,
        newText: after,
        ruleId,
        stratum,
      },
    ]
  }

  return [
    {
      start: bStart,
      end: bEnd,
      newText: aMid,
      ruleId,
      stratum,
    },
  ]
}

/** Split into lines keeping trailing newline on each piece (except possibly last). */
function splitKeepEnds(text: string): string[] {
  if (text.length === 0) return []
  const parts: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      parts.push(text.slice(start, i + 1))
      start = i + 1
    }
  }
  if (start < text.length) {
    parts.push(text.slice(start))
  }
  return parts
}

function offsetOfLine(lines: string[], lineIndex: number): number {
  let offset = 0
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    offset += lines[i].length
  }
  return offset
}

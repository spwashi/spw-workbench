/**
 * Operational transformation, folding, matrix operations, and sequencing.
 *
 * Layered on SourceEdit differentials (not collaborative multi-user OT protocol —
 * single-document edit algebra for mutation automata, pulse, and probes).
 *
 * | Primitive   | Role |
 * |-------------|------|
 * | transform   | Rebase one edit against another already applied (offset OT) |
 * | compose     | Sequential A then B → single differential from base |
 * | fold        | Reduce edit lists / transform pipelines to compact form |
 * | matrix      | Stratum × metric tables from mutation vectors |
 * | sequence    | Named ordered pipelines of rules/profiles |
 *
 * @see packages/spw-seed/src/canonical/differential.ts
 * @see packages/spw-seed/src/canonical/mutation-automata.ts
 * @see docs/theory/spw/operational-transform.spw
 */

import { hashString } from './canonicalize'
import {
  applyEdits,
  differentialFromSources,
  mergeVectors,
  zeroVector,
  type DifferentialStratum,
  type MutationVector,
  type SourceDifferential,
  type SourceEdit,
} from './differential'

// ── OT helpers ─────────────────────────────────────────────────

/** Net document length change produced by an edit. */
export function editLengthDelta(edit: SourceEdit): number {
  return edit.newText.length - (edit.end - edit.start)
}

export type TransformConflict =
  | 'overlap'
  | 'contained'
  | 'identical'
  | 'out_of_order'

export interface TransformResult {
  /** Rebased edit, or null if op is fully absorbed / no-op after against */
  edit: SourceEdit | null
  conflict?: TransformConflict
}

/**
 * Operational transform: rebase `op` so it applies *after* `against`,
 * both originally planned against the same base document.
 *
 * Non-overlapping case adjusts offsets by length delta of `against`.
 * Overlap is reported as conflict (no silent merge of structure edits).
 */
export function transformEdit(op: SourceEdit, against: SourceEdit): TransformResult {
  // against entirely before op
  if (against.end <= op.start) {
    const d = editLengthDelta(against)
    return {
      edit: {
        ...op,
        start: op.start + d,
        end: op.end + d,
      },
    }
  }

  // against entirely after op
  if (against.start >= op.end) {
    return { edit: { ...op } }
  }

  // Identical span+text → no-op
  if (
    against.start === op.start &&
    against.end === op.end &&
    against.newText === op.newText
  ) {
    return { edit: null, conflict: 'identical' }
  }

  // against wholly contains op → op absorbed / conflict
  if (against.start <= op.start && against.end >= op.end) {
    return { edit: null, conflict: 'contained' }
  }

  // op wholly contains against → conflict (would need slice rewrite)
  if (op.start <= against.start && op.end >= against.end) {
    return { edit: null, conflict: 'overlap' }
  }

  // Partial overlap
  return { edit: null, conflict: 'overlap' }
}

/**
 * Transform a list of ops against an already-applied list (in order).
 * Ops that conflict are dropped and recorded.
 */
export function transformEditList(
  ops: readonly SourceEdit[],
  againstList: readonly SourceEdit[],
): { edits: SourceEdit[]; conflicts: Array<{ op: SourceEdit; conflict: TransformConflict }> } {
  let current = [...ops]
  const conflicts: Array<{ op: SourceEdit; conflict: TransformConflict }> = []

  for (const against of againstList) {
    const next: SourceEdit[] = []
    for (const op of current) {
      const r = transformEdit(op, against)
      if (r.edit) next.push(r.edit)
      else if (r.conflict && r.conflict !== 'identical') {
        conflicts.push({ op, conflict: r.conflict })
      }
    }
    current = next
  }

  return { edits: current, conflicts }
}

// ── Fold / compose ─────────────────────────────────────────────

/**
 * Fold adjacent non-overlapping edits: merge only when end-to-end abut
 * and same ruleId+stratum (optional compaction). Default: sort + identity.
 */
export function foldEdits(
  edits: readonly SourceEdit[],
  options: { mergeAdjacent?: boolean } = {},
): SourceEdit[] {
  if (edits.length === 0) return []
  const ordered = [...edits].sort((a, b) => a.start - b.start || a.end - b.end)

  if (!options.mergeAdjacent) return ordered

  const out: SourceEdit[] = []
  for (const e of ordered) {
    const prev = out[out.length - 1]
    if (
      prev &&
      prev.end === e.start &&
      prev.ruleId === e.ruleId &&
      prev.stratum === e.stratum
    ) {
      out[out.length - 1] = {
        ...prev,
        end: e.end,
        newText: prev.newText + e.newText,
      }
    } else {
      out.push({ ...e })
    }
  }
  return out
}

/**
 * Fold left a pure transform pipeline: source → T1 → T2 → … → Tn.
 * Returns intermediate sources and per-step differentials vs previous.
 */
export function foldTransforms(
  source: string,
  transforms: readonly {
    id: string
    stratum: DifferentialStratum
    apply: (s: string) => string
  }[],
): {
  source: string
  steps: Array<{ id: string; differential: SourceDifferential; source: string }>
  folded: SourceDifferential
  vector: MutationVector
} {
  let current = source
  const steps: Array<{ id: string; differential: SourceDifferential; source: string }> = []
  let vector = zeroVector()

  for (const t of transforms) {
    const next = t.apply(current)
    const differential = differentialFromSources(
      current,
      next,
      t.id,
      t.stratum,
      hashString,
    )
    steps.push({ id: t.id, differential, source: next })
    if (!differential.identity) {
      vector = mergeVectors(vector, differential.vector)
    }
    current = next
  }

  const folded = differentialFromSources(
    source,
    current,
    'fold',
    'operation',
    hashString,
  )

  return { source: current, steps, folded, vector }
}

/**
 * Compose two edit lists planned on the same base: apply A, then rebase B
 * against A, then concatenate. Conflicts drop B edits.
 */
export function composeEditLists(
  base: string,
  first: readonly SourceEdit[],
  second: readonly SourceEdit[],
): { edits: SourceEdit[]; source: string; conflicts: ReturnType<typeof transformEditList>['conflicts'] } {
  const a = foldEdits(first)
  const mid = applyEdits(base, a)
  const { edits: rebased, conflicts } = transformEditList(second, a)
  const b = foldEdits(rebased)
  // B is in mid-document coordinates; apply on mid
  const source = applyEdits(mid, b)
  // Return composed differential as single span from base for simplicity
  const composed = differentialFromSources(base, source, 'compose', 'operation', hashString)
  return { edits: composed.edits, source, conflicts }
}

/**
 * Sequential composition of differentials against one base source.
 * Applies each transform function in order (fold), returns folded differential.
 */
export function composeSequence(
  base: string,
  stages: readonly {
    id: string
    stratum: DifferentialStratum
    apply: (s: string) => string
  }[],
): ReturnType<typeof foldTransforms> {
  return foldTransforms(base, stages)
}

// ── Matrix operations ──────────────────────────────────────────

export const MUTATION_VECTOR_AXES = [
  'layout_delta',
  'token_delta',
  'structure_delta',
  'label_delta',
  'reference_delta',
  'script_delta',
  'edit_count',
  'bytes_delta',
] as const satisfies readonly (keyof MutationVector)[]

export type MutationVectorAxis = (typeof MUTATION_VECTOR_AXES)[number]

export const STRATUM_ORDER: readonly DifferentialStratum[] = [
  'source',
  'structure',
  'layout',
  'reference',
  'operation',
  'script',
] as const

/** Dense matrix: rows = strata (or step ids), cols = vector axes. */
export interface MutationMatrix {
  /** Row labels (stratum or step id) */
  rows: string[]
  /** Column labels (vector axes) */
  cols: readonly MutationVectorAxis[]
  /** row-major data[row][col] */
  data: number[][]
}

export function vectorToArray(v: MutationVector): number[] {
  return MUTATION_VECTOR_AXES.map(axis => v[axis])
}

export function vectorFromArray(values: readonly number[]): MutationVector {
  const v = zeroVector()
  MUTATION_VECTOR_AXES.forEach((axis, i) => {
    v[axis] = values[i] ?? 0
  })
  return v
}

export function scaleVector(v: MutationVector, k: number): MutationVector {
  return vectorFromArray(vectorToArray(v).map(x => x * k))
}

export function dotVectors(a: MutationVector, b: MutationVector): number {
  const aa = vectorToArray(a)
  const bb = vectorToArray(b)
  return aa.reduce((sum, x, i) => sum + x * (bb[i] ?? 0), 0)
}

/** L1 magnitude of non-byte axes (rough “mutation mass”). */
export function vectorMagnitude(v: MutationVector): number {
  return (
    Math.abs(v.layout_delta) +
    Math.abs(v.token_delta) +
    Math.abs(v.structure_delta) +
    Math.abs(v.label_delta) +
    Math.abs(v.reference_delta) +
    Math.abs(v.script_delta) +
    Math.abs(v.edit_count)
  )
}

/**
 * Build a matrix from labeled vectors (one row each).
 * Missing axes default to 0.
 */
export function matrixFromVectors(
  rows: readonly { id: string; vector: MutationVector }[],
): MutationMatrix {
  return {
    rows: rows.map(r => r.id),
    cols: MUTATION_VECTOR_AXES,
    data: rows.map(r => vectorToArray(r.vector)),
  }
}

/** Aggregate vectors by stratum (sum). */
export function matrixByStratum(
  entries: readonly { stratum: DifferentialStratum; vector: MutationVector }[],
): MutationMatrix {
  const acc = new Map<DifferentialStratum, MutationVector>()
  for (const s of STRATUM_ORDER) acc.set(s, zeroVector())
  for (const e of entries) {
    acc.set(e.stratum, mergeVectors(acc.get(e.stratum) ?? zeroVector(), e.vector))
  }
  return matrixFromVectors(
    STRATUM_ORDER.map(stratum => ({
      id: stratum,
      vector: acc.get(stratum) ?? zeroVector(),
    })),
  )
}

export function matrixAdd(a: MutationMatrix, b: MutationMatrix): MutationMatrix {
  if (a.rows.length !== b.rows.length || a.cols.length !== b.cols.length) {
    throw new Error('matrixAdd: shape mismatch')
  }
  return {
    rows: [...a.rows],
    cols: a.cols,
    data: a.data.map((row, i) => row.map((x, j) => x + (b.data[i]?.[j] ?? 0))),
  }
}

/** Matrix-vector multiply treating v as a column aligned with cols. */
export function matrixVectorMul(m: MutationMatrix, v: MutationVector): number[] {
  const col = vectorToArray(v)
  return m.data.map(row => row.reduce((sum, x, j) => sum + x * (col[j] ?? 0), 0))
}

/** Transpose for row/col swap (step-major ↔ axis-major views). */
export function matrixTranspose(m: MutationMatrix): MutationMatrix {
  const rows = [...m.cols]
  const cols = m.rows as unknown as MutationVectorAxis[]
  const data: number[][] = rows.map((_, j) => m.data.map(row => row[j] ?? 0))
  return {
    rows: rows as string[],
    cols: cols.length === MUTATION_VECTOR_AXES.length ? MUTATION_VECTOR_AXES : (cols as readonly MutationVectorAxis[]),
    data,
  }
}

export function formatMatrix(m: MutationMatrix, precision = 0): string {
  const header = ['', ...m.cols].join('\t')
  const body = m.data.map((row, i) => {
    const cells = row.map(n =>
      precision === 0 ? String(n) : n.toFixed(precision),
    )
    return [m.rows[i], ...cells].join('\t')
  })
  return [header, ...body].join('\n')
}

// ── Sequencing ─────────────────────────────────────────────────

export type SequenceStepKind = 'rule' | 'profile' | 'fold' | 'custom'

export interface SequenceStep {
  id: string
  kind: SequenceStepKind
  /** rule id or profile id when kind is rule/profile */
  target?: string
  stratum?: DifferentialStratum
  /** Custom pure transform when kind is custom */
  apply?: (source: string) => string
}

export interface OperationalSequence {
  id: string
  description: string
  /** serial: each step sees previous output; parallel_plan: each plans on base then OT-compose */
  mode: 'serial' | 'parallel_plan'
  steps: SequenceStep[]
}

export interface SequenceRunResult {
  sequenceId: string
  mode: 'serial' | 'parallel_plan'
  source: string
  inputHash: string
  outputHash: string
  changed: boolean
  steps: Array<{
    id: string
    differential: SourceDifferential
    source: string
  }>
  folded: SourceDifferential
  vector: MutationVector
  matrix: MutationMatrix
  conflicts: Array<{ op: SourceEdit; conflict: TransformConflict }>
}

/** Built-in operational sequences for pulse / automata. */
export const OPERATIONAL_SEQUENCES: Record<string, OperationalSequence> = {
  layout_then_script: {
    id: 'layout_then_script',
    description: 'Canonical layout bundle, then equiv script rewrites',
    mode: 'serial',
    steps: [
      { id: 'layout_bundle', kind: 'rule', target: 'layout_bundle', stratum: 'layout' },
      { id: 'equiv_seq_alias', kind: 'rule', target: 'equiv_seq_alias', stratum: 'script' },
      { id: 'equiv_wildcard', kind: 'rule', target: 'equiv_wildcard', stratum: 'script' },
      { id: 'equiv_dot_postfix', kind: 'rule', target: 'equiv_dot_postfix', stratum: 'script' },
    ],
  },
  script_then_layout: {
    id: 'script_then_layout',
    description: 'Script rewrites first, then layout (order sensitivity probe)',
    mode: 'serial',
    steps: [
      { id: 'equiv_seq_alias', kind: 'rule', target: 'equiv_seq_alias', stratum: 'script' },
      { id: 'equiv_wildcard', kind: 'rule', target: 'equiv_wildcard', stratum: 'script' },
      { id: 'equiv_dot_postfix', kind: 'rule', target: 'equiv_dot_postfix', stratum: 'script' },
      { id: 'layout_bundle', kind: 'rule', target: 'layout_bundle', stratum: 'layout' },
    ],
  },
  layout_granular: {
    id: 'layout_granular',
    description: 'Granular layout rule sequence (fold of layout_full)',
    mode: 'serial',
    steps: [
      { id: 'normalize_newlines', kind: 'rule', target: 'normalize_newlines', stratum: 'source' },
      { id: 'trim_trailing_whitespace', kind: 'rule', target: 'trim_trailing_whitespace', stratum: 'layout' },
      { id: 'ensure_final_newline', kind: 'rule', target: 'ensure_final_newline', stratum: 'layout' },
    ],
  },
  parallel_layout_script: {
    id: 'parallel_layout_script',
    description: 'Plan layout and script on same base, OT-compose (conflict probe)',
    mode: 'parallel_plan',
    steps: [
      { id: 'layout_bundle', kind: 'rule', target: 'layout_bundle', stratum: 'layout' },
      { id: 'equiv_seq_alias', kind: 'rule', target: 'equiv_seq_alias', stratum: 'script' },
    ],
  },
}

export interface ResolveStepContext {
  /** Map rule id → pure transform */
  rules: Map<string, (source: string) => string>
}

/**
 * Run a named or inline operational sequence.
 * Serial mode folds transforms; parallel_plan mode OT-composes edit lists.
 */
export function runOperationalSequence(
  source: string,
  sequence: OperationalSequence | string,
  ctx: ResolveStepContext,
): SequenceRunResult {
  const seq =
    typeof sequence === 'string'
      ? OPERATIONAL_SEQUENCES[sequence]
      : sequence
  if (!seq) {
    throw new Error(`unknown operational sequence: ${String(sequence)}`)
  }

  const inputHash = hashString(source)
  const conflicts: SequenceRunResult['conflicts'] = []

  if (seq.mode === 'parallel_plan') {
    // Each step plans on base; compose via OT order of steps
    let current = source
    const steps: SequenceRunResult['steps'] = []
    let vector = zeroVector()
    let applied: SourceEdit[] = []

    for (const step of seq.steps) {
      const apply = resolveStepApply(step, ctx)
      const planned = apply(source) // plan on base
      const diff = differentialFromSources(
        source,
        planned,
        step.id,
        step.stratum ?? 'operation',
        hashString,
      )
      const { edits: rebased, conflicts: c } = transformEditList(diff.edits, applied)
      conflicts.push(...c)
      const mid = applyEdits(current, rebased)
      const stepDiff = differentialFromSources(
        current,
        mid,
        step.id,
        step.stratum ?? 'operation',
        hashString,
      )
      steps.push({ id: step.id, differential: stepDiff, source: mid })
      if (!stepDiff.identity) {
        vector = mergeVectors(vector, stepDiff.vector)
        applied = [
          ...applied,
          ...differentialFromSources(source, mid, step.id, step.stratum ?? 'operation', hashString)
            .edits,
        ]
      }
      current = mid
    }

    const folded = differentialFromSources(source, current, seq.id, 'operation', hashString)
    return {
      sequenceId: seq.id,
      mode: seq.mode,
      source: current,
      inputHash,
      outputHash: hashString(current),
      changed: current !== source,
      steps,
      folded,
      vector,
      matrix: matrixFromVectors(steps.map(s => ({ id: s.id, vector: s.differential.vector }))),
      conflicts,
    }
  }

  // serial fold
  const transforms = seq.steps.map(step => ({
    id: step.id,
    stratum: step.stratum ?? ('operation' as DifferentialStratum),
    apply: resolveStepApply(step, ctx),
  }))
  const foldedRun = foldTransforms(source, transforms)

  return {
    sequenceId: seq.id,
    mode: seq.mode,
    source: foldedRun.source,
    inputHash,
    outputHash: hashString(foldedRun.source),
    changed: foldedRun.source !== source,
    steps: foldedRun.steps,
    folded: foldedRun.folded,
    vector: foldedRun.vector,
    matrix: matrixFromVectors(
      foldedRun.steps.map(s => ({ id: s.id, vector: s.differential.vector })),
    ),
    conflicts,
  }
}

function resolveStepApply(
  step: SequenceStep,
  ctx: ResolveStepContext,
): (source: string) => string {
  if (step.kind === 'custom' && step.apply) return step.apply
  if (step.target && ctx.rules.has(step.target)) {
    return ctx.rules.get(step.target)!
  }
  if (step.apply) return step.apply
  // Identity fallback — missing rule is no-op with stable id for probes
  return (s: string) => s
}

/**
 * Build ResolveStepContext from pure (source) => source maps or rule id pairs.
 */
export function sequenceContextFromMap(
  rules: Iterable<readonly [string, (source: string) => string]>,
): ResolveStepContext {
  return { rules: new Map(rules) }
}

/** Empty context — all missing rules no-op. */
export function emptySequenceContext(): ResolveStepContext {
  return { rules: new Map() }
}

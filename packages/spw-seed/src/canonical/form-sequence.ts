/**
 * Form sequences — wrap / reduce / label / annotate algebra on surfaces.
 *
 * Distinct from mutation automata (file text rewrite under effect grades):
 * these steps are *interpretive form enrichment*, notation:
 *
 *   &  =>  {&}  =>  {&[#label]}  =>  {&<#tag>_label}
 *
 * Masks project which sequence steps or surface regions remain visible
 * (pair with form-contour reduce policies; no claim of semantic identity).
 *
 * @see form-ladders.ts op:& wrap → select → annotate
 * @see prompts/sagas/macros.spw holes: & / {&}
 * @see docs/theory/spw/form-ladders.spw
 */

import { operatorLadder, type EnrichmentRole, type LadderStep } from './form-ladders'

export type FormSequenceOp =
  | 'seed'
  | 'wrap'
  | 'select'
  | 'label'
  | 'annotate'
  | 'reduce'
  | 'ground'
  | 'membrane'
  | 'fold'

export interface FormSequenceStep {
  /** Original surface text for this step */
  surface: string
  op: FormSequenceOp
  role?: EnrichmentRole
  /** Extracted label if present (_label, #label, "label") */
  label?: string
  /** Capsule/tag interior when &<#tag> style */
  tag?: string
  /** Selection arms when &[a,b] or {&[#…]} */
  selection?: string[]
}

export interface FormSequence {
  version: 'spw.form.seq/1'
  arrow: '=>'
  steps: FormSequenceStep[]
  /** Compact notation joined by => */
  notation: string
  /** Last surface in the chain */
  terminal: string
}

export interface FormMask {
  id: string
  description: string
  /** Keep only steps whose op is in this set (empty = all) */
  ops?: FormSequenceOp[]
  /** Drop labels matching these substrings */
  excludeLabels?: string[]
  /** Keep only steps with labels matching (if set) */
  includeLabels?: string[]
  /** Collapse intermediate steps — keep seed + terminal only */
  endpointsOnly?: boolean
}

export interface FormSequenceApplyResult {
  sequence: FormSequence
  masked?: FormSequence
  /** Text after applying terminal wrap to seed if seed was bare */
  product: string
  ops: FormSequenceOp[]
}

const ARROW_SPLIT = /\s*=>\s*/

/** Builtin confluence enrichment chain (machine-backed preferred product). */
export const CONFLUENCE_WRAP_SEQUENCE = '& => {&} => {&[#label]} => {&<#tag>_label}'

/** Builtin body inhabit reduce (reverse of wrap — conceptual fold). */
export const CONFLUENCE_REDUCE_SEQUENCE = '{&<#tag>_label} => {&[#label]} => {&} => &'

/**
 * Parse a form sequence string into structured steps.
 * Accepts unicode or ascii arrows already normalized to => by caller.
 */
export function parseFormSequence(notation: string): FormSequence {
  const raw = notation
    .replace(/→/g, '=>')
    .replace(/⇒/g, '=>')
    .trim()
  if (!raw) {
    return {
      version: 'spw.form.seq/1',
      arrow: '=>',
      steps: [],
      notation: '',
      terminal: '',
    }
  }
  const parts = raw.split(ARROW_SPLIT).map(s => s.trim()).filter(Boolean)
  const steps = parts.map(classifySurface)
  return {
    version: 'spw.form.seq/1',
    arrow: '=>',
    steps,
    notation: steps.map(s => s.surface).join(' => '),
    terminal: steps[steps.length - 1]?.surface ?? '',
  }
}

/**
 * Classify a single surface fragment into op + label/tag/selection.
 */
export function classifySurface(surface: string): FormSequenceStep {
  const s = surface.trim()
  // {&<#tag>_label} or {&<#tag>}
  const membraneLabel = s.match(/^\{&\s*<#?([^>]+)>\s*(?:_([A-Za-z_][\w.-]*))?\s*\}$/)
  if (membraneLabel) {
    return {
      surface: s,
      op: 'membrane',
      role: 'membrane',
      tag: membraneLabel[1],
      label: membraneLabel[2],
    }
  }
  // {&[#label]} or {&[a, b]}
  const annotated = s.match(/^\{&\s*\[([^\]]*)\]\s*\}$/)
  if (annotated) {
    const inner = annotated[1]!.trim()
    const labelMatch = inner.match(/^#([A-Za-z_][\w.-]*)$/)
    if (labelMatch) {
      return {
        surface: s,
        op: 'annotate',
        role: 'annotate',
        label: labelMatch[1],
        selection: [inner],
      }
    }
    const arms = inner.split(/[,|]/).map(x => x.trim()).filter(Boolean)
    return {
      surface: s,
      op: 'select',
      role: 'select',
      selection: arms,
      label: arms[0]?.replace(/^#/, ''),
    }
  }
  // {&} wrap
  if (s === '{&}' || s === '{ & }') {
    return { surface: '{&}', op: 'wrap', role: 'wrap' }
  }
  // . {&: _} ground
  if (/^\.\{\s*&/.test(s)) {
    return { surface: s, op: 'ground', role: 'ground' }
  }
  // &[a,b] select without body
  if (/^&\[/.test(s)) {
    const m = s.match(/^&\[([^\]]*)\]/)
    const arms = (m?.[1] ?? '').split(/[,|]/).map(x => x.trim()).filter(Boolean)
    return { surface: s, op: 'select', role: 'select', selection: arms }
  }
  // bare &
  if (s === '&') {
    return { surface: '&', op: 'seed', role: 'seed' }
  }
  // reduce markers: strip one layer of {} around &
  if (s === '&' || (s.startsWith('{') && s.includes('&') && s.endsWith('}'))) {
    // already handled wraps; fallthrough
  }
  // labeled _suffix on any form
  const trailLabel = s.match(/_([A-Za-z_][\w.-]*)$/)
  if (trailLabel && s.includes('&')) {
    return {
      surface: s,
      op: 'label',
      role: 'label',
      label: trailLabel[1],
    }
  }
  return { surface: s, op: 'fold', role: 'fold' }
}

/** Apply a mask to a sequence (projection; not semantic equivalence). */
export function applyFormMask(seq: FormSequence, mask: FormMask): FormSequence {
  let steps = [...seq.steps]
  if (mask.endpointsOnly && steps.length > 2) {
    steps = [steps[0]!, steps[steps.length - 1]!]
  }
  if (mask.ops?.length) {
    const allow = new Set(mask.ops)
    steps = steps.filter(s => allow.has(s.op))
  }
  if (mask.excludeLabels?.length) {
    steps = steps.filter(
      s => !s.label || !mask.excludeLabels!.some(ex => s.label!.includes(ex)),
    )
  }
  if (mask.includeLabels?.length) {
    steps = steps.filter(
      s => s.label && mask.includeLabels!.some(inc => s.label!.includes(inc)),
    )
  }
  return {
    version: 'spw.form.seq/1',
    arrow: '=>',
    steps,
    notation: steps.map(s => s.surface).join(' => '),
    terminal: steps[steps.length - 1]?.surface ?? '',
  }
}

export const BUILTIN_FORM_MASKS: FormMask[] = [
  {
    id: 'wrap_only',
    description: 'Seed and wrap product only',
    ops: ['seed', 'wrap'],
  },
  {
    id: 'label_path',
    description: 'Steps that carry labels or tags',
    ops: ['annotate', 'label', 'membrane', 'select'],
  },
  {
    id: 'endpoints',
    description: 'First and last surfaces only',
    endpointsOnly: true,
  },
  {
    id: 'reduce_view',
    description: 'Prefer reduced / seed forms',
    ops: ['seed', 'reduce', 'wrap'],
  },
]

/**
 * Advance one enrichment step from a surface (confluence family default).
 * Deterministic string transforms — does not parse Spw AST.
 */
export function advanceFormSurface(
  surface: string,
  op: FormSequenceOp,
  opts: { label?: string; tag?: string; arms?: string[] } = {},
): string {
  const s = surface.trim()
  const label = opts.label ?? 'label'
  const tag = opts.tag ?? 'tag'
  switch (op) {
    case 'seed':
      return '&'
    case 'wrap':
      if (s === '&' || s === '') return '{&}'
      if (s.startsWith('{') && s.endsWith('}')) return s
      return `{${s}}`
    case 'select': {
      const arms = opts.arms?.length ? opts.arms.join(', ') : 'a, b'
      if (s === '{&}' || s === '&') return `{&[${arms}]}`
      return `${s}[${arms}]`
    }
    case 'annotate':
      if (s === '{&}' || s === '&' || s.startsWith('{&')) return `{&[#${label}]}`
      return `{${s}[#${label}]}`
    case 'membrane':
      return `{&<#${tag}>_${label}}`
    case 'label':
      if (s.includes('_')) return s
      return `${s}_${label}`
    case 'ground':
      return `.{&: _}`
    case 'reduce':
      return reduceOneLayer(s)
    case 'fold':
      return s
    default:
      return s
  }
}

function reduceOneLayer(s: string): string {
  // {&<#tag>_label} → {&[#label]}
  const mem = s.match(/^\{&\s*<#?([^>]+)>\s*(?:_([A-Za-z_][\w.-]*))?\s*\}$/)
  if (mem) {
    const lab = mem[2] ?? 'label'
    return `{&[#${lab}]}`
  }
  // {&[#label]} → {&}
  if (/^\{&\s*\[[^\]]*\]\s*\}$/.test(s)) return '{&}'
  // {&} → &
  if (s === '{&}' || s === '{ & }') return '&'
  // strip outer braces
  if (s.startsWith('{') && s.endsWith('}') && s.length > 2) return s.slice(1, -1).trim()
  return s
}

/**
 * Run a full sequence from a seed, producing each intermediate surface.
 * If `notation` provided, parse it; else use confluence wrap catalog.
 */
export function runFormSequence(
  notation: string = CONFLUENCE_WRAP_SEQUENCE,
  opts: { maskId?: string; mask?: FormMask; seed?: string } = {},
): FormSequenceApplyResult {
  const parsed = parseFormSequence(notation)
  let steps = parsed.steps
  // If seed override and first is seed op, re-derive chain by ops
  if (opts.seed != null && steps.length) {
    let cur = opts.seed
    const rebuilt: FormSequenceStep[] = []
    for (const step of steps) {
      cur = advanceFormSurface(cur === opts.seed && rebuilt.length === 0 ? opts.seed : cur, step.op, {
        label: step.label,
        tag: step.tag,
        arms: step.selection,
      })
      // For first step if seed is &, classify seed
      if (rebuilt.length === 0 && opts.seed === '&') {
        rebuilt.push(classifySurface('&'))
        if (step.op === 'seed') continue
      }
      rebuilt.push({ ...classifySurface(cur), op: step.op, label: step.label, tag: step.tag })
    }
    steps = rebuilt.length ? rebuilt : steps
  }

  const sequence: FormSequence = {
    version: 'spw.form.seq/1',
    arrow: '=>',
    steps,
    notation: steps.map(s => s.surface).join(' => '),
    terminal: steps[steps.length - 1]?.surface ?? '',
  }

  let masked: FormSequence | undefined
  const mask =
    opts.mask ??
    (opts.maskId ? BUILTIN_FORM_MASKS.find(m => m.id === opts.maskId) : undefined)
  if (mask) masked = applyFormMask(sequence, mask)

  return {
    sequence,
    masked,
    product: sequence.terminal,
    ops: sequence.steps.map(s => s.op),
  }
}

/** Catalog steps for op:& ladder from form-ladders (authoritative). */
export function confluenceLadderCatalog(): LadderStep[] {
  return [...(operatorLadder('&')?.steps ?? [])]
}

/**
 * Label a selection: attach #label or _label to a seed surface under a process.
 * selection labeling process (not file mutation).
 */
export function labelSelection(
  seed: string,
  label: string,
  style: 'hash' | 'underscore' | 'membrane' = 'hash',
): FormSequence {
  const lab = label.replace(/^#/, '').replace(/^_/, '')
  if (style === 'membrane') {
    return parseFormSequence(`${seed} => {&} => {&<#${lab}>_${lab}}`)
  }
  if (style === 'underscore') {
    return parseFormSequence(`${seed} => {&} => {&}_${lab}`)
  }
  return parseFormSequence(`${seed} => {&} => {&[#${lab}]}`)
}

export function formatFormSequence(seq: FormSequence, opts: { numbered?: boolean } = {}): string {
  if (!seq.steps.length) return '(empty sequence)'
  if (opts.numbered) {
    return seq.steps
      .map((s, i) => `${i}: [${s.op}] ${s.surface}${s.label ? `  label=${s.label}` : ''}`)
      .join('\n')
  }
  return seq.notation
}

/**
 * Form geometry — compositional label mobility across liminal shapes.
 *
 * Builds on paired-boundary/operator ladders with an explicit geometry:
 *
 *   LabelSite  ×  LiminalShape  ×  Bound?  →  position
 *   MobilityRule: position → position  (rewrite, inverse, compose, status)
 *   ReferenceProgression: ordered sites a label travels as it becomes addressable
 *   HigherOrderForm: named compositions of mobility rules
 *
 * Aimed at rules that can *develop* computationally: each rule carries
 * status implemented | partial | proposed and optional pure apply().
 *
 * Runtime register liminality (local→liminal→visible→global) is a parallel
 * axis — bridged, not collapsed into surface geometry.
 *
 * @see docs/theory/spw/form-geometry.spw
 * @see packages/spw-seed/src/canonical/form-ladders.ts
 * @see packages/spw-runtime/src/state/types.ts (LIMINALITY_ORDER)
 */

import type { BoundaryLadderId } from './form-ladders'
import { hashString } from './canonicalize'
import {
  snapshotTopography,
  topographyDelta,
  type ParseHealth,
  type TopographyDelta,
} from './topography-probe'

// ── Sites & liminal shapes ─────────────────────────────────────

/**
 * Where a label can sit relative to Acts/Bounds (canonical coordinates).
 * Not left/right — site geometry.
 */
export type LabelSite =
  | 'free' // unbound name in the ambient sequence
  | 'operator_adjacent' // Act label: !name, ~name
  | 'frame_param' // [name: x] or [name]
  | 'facet_key' // .{name: v}
  | 'header' // ^["name"]{…}
  | 'capsule_tag' // <name>
  | 'path_node' // segment in a / b / c
  | 'ref_handle' // @(name) or pathref target
  | 'couple_peer' // <>(a, b) peer key
  | 'interior_term' // bare id inside a Bound
  | 'stream_slot' // position in <<…>>
  | 'register_meta' // $(name) substrate key
  | 'pair_open' // open pair label: {_name …} (desugar surface)
  | 'pair_close' // close pair label: …}_name

/**
 * Shape of liminality — how “open / transitional / addressable” the site is.
 * Orthogonal to runtime Liminality (local|liminal|visible|global), but mappable.
 */
export type LiminalShape =
  | 'void' // empty Bound — no interior to host a label yet
  | 'hole' // explicit `_` placeholder
  | 'aperture' // open-boundary / ingress — name at the opening
  | 'chamber' // interior payload — name lives inside
  | 'egress' // close-boundary — name at release (proposed pair label)
  | 'exterior' // outside any Bound — free or path ambient
  | 'membrane' // capsule interface thickness
  | 'channel' // stream-ordered liminality
  | 'published' // integrated / globally addressable header or ref

/** Runtime register liminality — bridge target, not surface law. */
export type RegisterLiminality = 'local' | 'liminal' | 'visible' | 'global'

export const REGISTER_LIMINALITY_ORDER: readonly RegisterLiminality[] = [
  'local',
  'liminal',
  'visible',
  'global',
] as const

/**
 * Soft map: surface liminal shape → typical register liminality after bind.
 * Profile-only until a named experiment measures it.
 */
export const LIMINAL_SHAPE_TO_REGISTER: Record<LiminalShape, RegisterLiminality> = {
  void: 'local',
  hole: 'local',
  aperture: 'liminal',
  chamber: 'liminal',
  egress: 'liminal',
  exterior: 'visible',
  membrane: 'visible',
  channel: 'visible',
  published: 'global',
}

export interface LabelPosition {
  site: LabelSite
  liminal: LiminalShape
  /** Host paired-boundary kind when the site is Bound-relative. */
  boundary?: BoundaryLadderId
  /** Nesting depth of host Bound (0 = top-level) */
  depth?: number
}

export interface LabelPositionPattern {
  site?: LabelSite | LabelSite[]
  liminal?: LiminalShape | LiminalShape[]
  boundary?: BoundaryLadderId | BoundaryLadderId[]
}

// ── Mobility rules ─────────────────────────────────────────────

export type RuleStatus = 'implemented' | 'partial' | 'proposed'

export const FORM_GEOMETRY_PROFILE = {
  id: 'Spw.Form.Geometry',
  revision: '0.2',
  status: 'interpretive',
  labelGrammar: 'identifier',
} as const

export const FORM_MOBILITY_APPLICATION_PROFILE = {
  id: 'Spw.Form.Geometry.Application',
  revision: '0.1',
  status: 'operational',
  effectGrade: 'effect.l1.memory',
  authority: 'in-memory source only',
  semanticEquivalence: 'not_claimed',
} as const

export interface MobilityApplicationReceipt {
  profile: typeof FORM_MOBILITY_APPLICATION_PROFILE
  effectGrade: 'effect.l1.memory'
  beforeHash: string
  afterHash: string
  beforeHealth: ParseHealth
  afterHealth: ParseHealth
  topographyDelta: TopographyDelta
  /** Mobility changes meaning by design; no semantic equivalence is inferred. */
  semanticEquivalence: 'not_claimed'
  inverse: {
    ruleId?: string
    comparison: 'trimmed_surface'
    status: 'unavailable' | 'failed' | 'exact' | 'changed'
    restoredSource?: string
  }
}

export type MobilityApplication =
  | { ok: true; source: string; rule: MobilityRule; receipt: MobilityApplicationReceipt }
  | { ok: false; reason: string; rule?: MobilityRule }

export interface MobilityRule {
  id: string
  /** Short geometric reading */
  name: string
  from: LabelPositionPattern
  to: LabelPositionPattern
  /**
   * Surface sketch with `$L` as the label placeholder.
   * Computational apply() may implement a subset.
   */
  rewrite: { before: string; after: string }
  /** Inverse rule id when reversible */
  inverse?: string
  status: RuleStatus
  /**
   * Pure source rewrite when implemented.
   * Returns null if preconditions fail (label missing / pattern mismatch).
   */
  apply?: (source: string, label: string) => string | null
  /** Geometric class of motion */
  motion:
    | 'ingress' // exterior → interior / aperture
    | 'egress' // interior → exterior / published
    | 'orbit' // move around ports of same Bound
    | 'promote' // raise liminal shape / register liminality
    | 'demote'
    | 'project' // into path / ref geometry
    | 'fold' // many labels → one
    | 'unfold'
    | 'rehost' // change host boundary kind
  /** Axes this rule serves */
  axes: readonly string[]
}

function matchPattern(
  pos: LabelPosition,
  pattern: LabelPositionPattern,
): boolean {
  if (pattern.site !== undefined) {
    const sites = Array.isArray(pattern.site) ? pattern.site : [pattern.site]
    if (!sites.includes(pos.site)) return false
  }
  if (pattern.liminal !== undefined) {
    const shapes = Array.isArray(pattern.liminal) ? pattern.liminal : [pattern.liminal]
    if (!shapes.includes(pos.liminal)) return false
  }
  if (pattern.boundary !== undefined) {
    const boundaries = Array.isArray(pattern.boundary) ? pattern.boundary : [pattern.boundary]
    if (!pos.boundary || !boundaries.includes(pos.boundary)) return false
  }
  return true
}

function subLabel(template: string, label: string): string {
  return template.replace(/\$L/g, label)
}

// ── Computational applies (growing set) ────────────────────────

/** free `name` → operator-adjacent `!name` (prefix seed + label). */
function applyFreeToOperatorAdjacent(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === label) return `!${label}`
  if (trimmed === '') return `!${label}`
  // whole-source free id only
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed) && trimmed === label) return `!${label}`
  return null
}

/** free name → frame param `[name]` selection. */
function applyFreeToFrameParam(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === label || trimmed === '') return `[${label}]`
  if (trimmed === '[]') return `[${label}]`
  return null
}

/** free / empty frame → `[name: _]` hole param. */
function applyFreeToFrameParamHole(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === label || trimmed === '' || trimmed === '[]') return `[${label}: _]`
  return null
}

/** free name → capsule tag `<name>`. */
function applyFreeToCapsuleTag(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === label || trimmed === '' || trimmed === '< >' || trimmed === '<>') {
    // empty capsule shell preferred over digraph when source empty
    if (trimmed === '<>') return null // refuse to overwrite couple digraph silently
    return `<${label}>`
  }
  return null
}

/** free name → facet ground `.{name: _}` */
function applyFreeToFacetKey(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === label || trimmed === '' || trimmed === '.{}' || trimmed === '{}') {
    return `.{${label}: _}`
  }
  return null
}

/** free name → ref handle `@(name)` */
function applyFreeToRefHandle(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === label || trimmed === '' || trimmed === '@()' || trimmed === '()') {
    return `@(${label})`
  }
  return null
}

/** free name → header `^["name"]{}` */
function applyFreeToHeader(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === label || trimmed === '') {
    return `^["${label}"]{}`
  }
  return null
}

/** `[name]` → free name (egress selection). */
function applyFrameParamToFree(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === `[${label}]` || trimmed === `[${label}: _]`) return label
  return null
}

/** `!name` → free name */
function applyOperatorAdjacentToFree(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === `!${label}`) return label
  return null
}

/** `[name]` → `name / _` path projection start */
function applyFrameParamToPath(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === `[${label}]` || trimmed === label) return `${label} / _`
  return null
}

/** `name` → `name / k` extend path (k provided as label for next segment — uses label as new segment). */
function applyPathExtend(source: string, label: string): string | null {
  const trimmed = source.trim()
  // extend if source looks like a path or bare id
  if (/^[A-Za-z_][A-Za-z0-9_]*(\s*\/\s*[A-Za-z_`][^/]*)*$/.test(trimmed) || trimmed.endsWith('/ _') || trimmed.endsWith('/_')) {
    const base = trimmed.replace(/\s*\/\s*_$/, '').replace(/\/_$/, '')
    return `${base} / ${label}`
  }
  if (trimmed === '_') return label
  return null
}

/** `@(name)` → free / published pathref-ish */
function applyRefToFree(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === `@(${label})`) return label
  return null
}

/** interior `{name}` → facet `.{name: name}` ground fold of self */
function applyInteriorToFacet(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === `{${label}}`) return `.{${label}: ${label}}`
  return null
}

/**
 * Fold facet keyed by label into integrate header, preserving value body.
 *   .{L: BODY}  →  ^["L"]{BODY}
 *   .{L: _}     →  ^["L"]{_}
 *   free L / .{} with only key L also accepted loosely
 */
function applyFacetsToHeader(source: string, label: string): string | null {
  const trimmed = source.trim()
  // .{label: rest} — rest may contain nested braces if balanced simply
  const re = new RegExp(
    `^\\.\\{\\s*${escapeRegExp(label)}\\s*:\\s*([\\s\\S]*)\\}\\s*$`,
  )
  const m = trimmed.match(re)
  if (m) {
    const body = m[1].trim()
    return `^["${label}"]{${body}}`
  }
  // empty facet product with free label seed
  if (trimmed === label || trimmed === '.{}') {
    return `^["${label}"]{}`
  }
  return null
}

/** Inverse-ish: header → facet with hole or empty body */
function applyHeaderToFacet(source: string, label: string): string | null {
  const trimmed = source.trim()
  const re = new RegExp(
    `^\\^\\[\\s*"${escapeRegExp(label)}"\\s*\\]\\s*\\{([\\s\\S]*)\\}\\s*$`,
  )
  const m = trimmed.match(re)
  if (m) {
    const body = m[1].trim()
    return body.length === 0 ? `.{${label}: _}` : `.{${label}: ${body}}`
  }
  return null
}

/**
 * Observer handle → substrate meta handle.
 * Headers are rejected because $(L) has no place to retain their payload.
 */
function applyPublishedToRegisterMeta(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === `@(${label})`) return `$(${label})`
  return null
}

/** $(L) → @(L) demote surface meta to ref handle */
function applyRegisterMetaToRef(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === `$(${label})`) return `@(${label})`
  return null
}

/**
 * Pair labels using desugar surface convention A{} → {_A }_A.
 * free / {} → {_L }_L
 */
function applyFreeToPairLabels(source: string, label: string): string | null {
  const trimmed = source.trim()
  if (trimmed === label || trimmed === '' || trimmed === '{}') {
    return `{_${label} }_${label}`
  }
  // body with single interior term
  const bodyRe = /^\{\s*([^{}]+)\s*\}$/
  const m = trimmed.match(bodyRe)
  if (m && !trimmed.includes(`_${label}`)) {
    const interior = m[1].trim()
    return `{_${label} ${interior} }_${label}`
  }
  return null
}

/** {_L … }_L → free L (strip pair labels, keep interior if any) */
function pairLabelInterior(source: string, label: string): string | null {
  const trimmed = source.trim()
  const re = new RegExp(
    `^\\{\\s*_${escapeRegExp(label)}\\s*([\\s\\S]*?)\\s*\\}_${escapeRegExp(label)}\\s*$`,
  )
  const m = trimmed.match(re)
  if (!m) return null
  return m[1].trim()
}

/** Empty {_L }_L → free L. */
function applyEmptyPairLabelsToFree(source: string, label: string): string | null {
  const interior = pairLabelInterior(source, label)
  return interior === '' ? label : null
}

/** Inhabited {_L body }_L → unlabeled {body}. */
function applyInhabitedPairLabelsToBody(source: string, label: string): string | null {
  const interior = pairLabelInterior(source, label)
  return interior ? `{${interior}}` : null
}

/** {_L … }_L → ^["L"]{…} publish pair-labeled body as header */
function applyPairLabelsToHeader(source: string, label: string): string | null {
  const trimmed = source.trim()
  const re = new RegExp(
    `^\\{\\s*_${escapeRegExp(label)}\\s*([\\s\\S]*?)\\s*\\}_${escapeRegExp(label)}\\s*$`,
  )
  const m = trimmed.match(re)
  if (!m) return null
  const interior = m[1].trim()
  return `^["${label}"]{${interior}}`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Rule catalog ───────────────────────────────────────────────

export const MOBILITY_RULES: readonly MobilityRule[] = [
  // ── ingress: free → named sites ────────────────────────────
  {
    id: 'ingress.operator_label',
    name: 'attach operator-adjacent label',
    from: { site: 'free', liminal: ['exterior', 'void'] },
    to: { site: 'operator_adjacent', liminal: 'aperture' },
    rewrite: { before: '$L', after: '!$L' },
    inverse: 'egress.operator_label',
    status: 'implemented',
    apply: applyFreeToOperatorAdjacent,
    motion: 'ingress',
    axes: ['label', 'potential'],
  },
  {
    id: 'ingress.frame_select',
    name: 'pull label into frame selection',
    from: { site: 'free', liminal: ['exterior', 'void'] },
    to: { site: 'frame_param', liminal: 'chamber', boundary: 'frame' },
    rewrite: { before: '$L', after: '[$L]' },
    inverse: 'egress.frame_select',
    status: 'implemented',
    apply: applyFreeToFrameParam,
    motion: 'ingress',
    axes: ['selection', 'label'],
  },
  {
    id: 'ingress.frame_hole',
    name: 'pull label into frame as named hole',
    from: { site: ['free', 'frame_param'], liminal: ['exterior', 'void', 'chamber'] },
    to: { site: 'frame_param', liminal: 'hole', boundary: 'frame' },
    rewrite: { before: '$L | []', after: '[$L: _]' },
    status: 'implemented',
    apply: applyFreeToFrameParamHole,
    motion: 'ingress',
    axes: ['selection', 'label', 'ground'],
  },
  {
    id: 'ingress.facet_key',
    name: 'ground label as facet key',
    from: { site: 'free', liminal: ['exterior', 'void'] },
    to: { site: 'facet_key', liminal: 'chamber', boundary: 'body' },
    rewrite: { before: '$L | .{}', after: '.{$L: _}' },
    status: 'implemented',
    apply: applyFreeToFacetKey,
    motion: 'ingress',
    axes: ['ground', 'label', 'material'],
  },
  {
    id: 'ingress.capsule_tag',
    name: 'seat label on capsule membrane',
    from: { site: 'free', liminal: ['exterior', 'void'] },
    to: { site: 'capsule_tag', liminal: 'membrane', boundary: 'capsule' },
    rewrite: { before: '$L | < >', after: '<$L>' },
    status: 'implemented',
    apply: applyFreeToCapsuleTag,
    motion: 'ingress',
    axes: ['interface', 'label'],
  },
  {
    id: 'ingress.ref_handle',
    name: 'publish label as observer handle',
    from: { site: 'free', liminal: ['exterior', 'void'] },
    to: { site: 'ref_handle', liminal: 'published', boundary: 'scope' },
    rewrite: { before: '$L | @()', after: '@($L)' },
    inverse: 'egress.ref_handle',
    status: 'implemented',
    apply: applyFreeToRefHandle,
    motion: 'ingress',
    axes: ['reference', 'flow'],
  },
  {
    id: 'ingress.header',
    name: 'promote label to integrate header',
    from: { site: 'free', liminal: ['exterior', 'void'] },
    to: { site: 'header', liminal: 'published', boundary: 'body' },
    rewrite: { before: '$L', after: '^["$L"]{}' },
    status: 'implemented',
    apply: applyFreeToHeader,
    motion: 'promote',
    axes: ['label', 'material', 'fold'],
  },

  // ── egress: named sites → free / path ──────────────────────
  {
    id: 'egress.frame_select',
    name: 'push selection label out to free',
    from: { site: 'frame_param', liminal: ['chamber', 'hole'], boundary: 'frame' },
    to: { site: 'free', liminal: 'exterior' },
    rewrite: { before: '[$L]', after: '$L' },
    inverse: 'ingress.frame_select',
    status: 'implemented',
    apply: applyFrameParamToFree,
    motion: 'egress',
    axes: ['selection', 'label'],
  },
  {
    id: 'egress.operator_label',
    name: 'detach operator-adjacent label',
    from: { site: 'operator_adjacent', liminal: 'aperture' },
    to: { site: 'free', liminal: 'exterior' },
    rewrite: { before: '!$L', after: '$L' },
    inverse: 'ingress.operator_label',
    status: 'implemented',
    apply: applyOperatorAdjacentToFree,
    motion: 'egress',
    axes: ['label'],
  },
  {
    id: 'egress.ref_handle',
    name: 'unref handle to free name',
    from: { site: 'ref_handle', liminal: 'published', boundary: 'scope' },
    to: { site: 'free', liminal: 'exterior' },
    rewrite: { before: '@($L)', after: '$L' },
    inverse: 'ingress.ref_handle',
    status: 'implemented',
    apply: applyRefToFree,
    motion: 'egress',
    axes: ['reference'],
  },

  // ── project: into path geometry ────────────────────────────
  {
    id: 'project.frame_to_path',
    name: 'selection becomes path root',
    from: { site: ['frame_param', 'free'], liminal: ['chamber', 'exterior'] },
    to: { site: 'path_node', liminal: 'exterior' },
    rewrite: { before: '[$L] | $L', after: '$L / _' },
    status: 'implemented',
    apply: applyFrameParamToPath,
    motion: 'project',
    axes: ['path', 'selection'],
  },
  {
    id: 'project.path_extend',
    name: 'extend path with new segment label',
    from: { site: 'path_node', liminal: 'exterior' },
    to: { site: 'path_node', liminal: 'exterior' },
    rewrite: { before: '… / _', after: '… / $L' },
    status: 'implemented',
    apply: applyPathExtend,
    motion: 'project',
    axes: ['path', 'reference'],
  },

  // ── rehost / fold ──────────────────────────────────────────
  {
    id: 'rehost.interior_to_facet',
    name: 'body interior term becomes facet key+value',
    from: { site: 'interior_term', liminal: 'chamber', boundary: 'body' },
    to: { site: 'facet_key', liminal: 'chamber', boundary: 'body' },
    rewrite: { before: '{$L}', after: '.{$L: $L}' },
    status: 'implemented',
    apply: applyInteriorToFacet,
    motion: 'rehost',
    axes: ['ground', 'label', 'material'],
  },
  {
    id: 'fold.facets_to_header',
    name: 'fold facet field into named header unit',
    from: { site: 'facet_key', liminal: 'chamber', boundary: 'body' },
    to: { site: 'header', liminal: 'published', boundary: 'body' },
    rewrite: { before: '.{$L: …}', after: '^["$L"]{…}' },
    inverse: 'unfold.header_to_facet',
    status: 'implemented',
    apply: applyFacetsToHeader,
    motion: 'fold',
    axes: ['fold', 'label'],
  },
  {
    id: 'unfold.header_to_facet',
    name: 'unfold header unit back to facet key',
    from: { site: 'header', liminal: 'published', boundary: 'body' },
    to: { site: 'facet_key', liminal: 'chamber', boundary: 'body' },
    rewrite: { before: '^["$L"]{…}', after: '.{$L: …}' },
    inverse: 'fold.facets_to_header',
    status: 'implemented',
    apply: applyHeaderToFacet,
    motion: 'unfold',
    axes: ['fold', 'label', 'ground'],
  },
  {
    id: 'orbit.frame_param_to_tag',
    name: 'move label from frame param to capsule tag',
    from: { site: 'frame_param', boundary: 'frame' },
    to: { site: 'capsule_tag', boundary: 'capsule', liminal: 'membrane' },
    rewrite: { before: '[$L]', after: '<$L>' },
    status: 'implemented',
    apply: (source, label) => {
      const t = source.trim()
      if (t === `[${label}]` || t === `[${label}: _]`) return `<${label}>`
      return null
    },
    motion: 'rehost',
    axes: ['selection', 'interface', 'label'],
  },
  {
    id: 'orbit.tag_to_ref',
    name: 'capsule tag becomes observer ref',
    from: { site: 'capsule_tag', boundary: 'capsule' },
    to: { site: 'ref_handle', boundary: 'scope', liminal: 'published' },
    rewrite: { before: '<$L>', after: '@($L)' },
    status: 'implemented',
    apply: (source, label) => {
      const t = source.trim()
      if (t === `<${label}>`) return `@(${label})`
      return null
    },
    motion: 'rehost',
    axes: ['interface', 'reference'],
  },
  {
    id: 'promote.register_bridge',
    name: 'project observer handle to substrate meta $(L)',
    from: { site: 'ref_handle', liminal: 'published', boundary: 'scope' },
    to: { site: 'register_meta', liminal: 'published' },
    rewrite: { before: '@($L)', after: '$($L)' },
    inverse: 'demote.register_to_ref',
    status: 'implemented',
    apply: applyPublishedToRegisterMeta,
    motion: 'promote',
    axes: ['reference', 'ground'],
  },
  {
    id: 'demote.register_to_ref',
    name: 'substrate meta back to observer ref',
    from: { site: 'register_meta', liminal: 'published' },
    to: { site: 'ref_handle', liminal: 'published', boundary: 'scope' },
    rewrite: { before: '$($L)', after: '@($L)' },
    inverse: 'promote.register_bridge',
    status: 'implemented',
    apply: applyRegisterMetaToRef,
    motion: 'demote',
    axes: ['reference', 'ground'],
  },

  // ── pair labels (desugar surface {_L } _L) ─────────────────
  {
    id: 'ingress.pair_labels',
    name: 'attach open/close pair labels on body (desugar surface)',
    from: { site: ['free', 'interior_term'], liminal: ['exterior', 'void', 'chamber'] },
    to: { site: 'pair_open', liminal: 'aperture', boundary: 'body' },
    rewrite: { before: '$L | {} | {body}', after: '{_$L … }_$L' },
    status: 'implemented',
    apply: applyFreeToPairLabels,
    motion: 'ingress',
    axes: ['label', 'material'],
  },
  {
    id: 'egress.pair_labels',
    name: 'strip empty pair labels to a free label',
    from: { site: ['pair_open', 'pair_close'], liminal: ['aperture', 'egress'], boundary: 'body' },
    to: { site: 'free', liminal: 'exterior' },
    rewrite: { before: '{_$L }_$L', after: '$L' },
    status: 'implemented',
    apply: applyEmptyPairLabelsToFree,
    motion: 'egress',
    axes: ['label', 'material'],
  },
  {
    id: 'egress.pair_labels_to_body',
    name: 'strip pair labels while retaining an inhabited body',
    from: { site: ['pair_open', 'pair_close'], liminal: ['aperture', 'egress'], boundary: 'body' },
    to: { site: 'interior_term', liminal: 'chamber', boundary: 'body' },
    rewrite: { before: '{_$L body }_$L', after: '{body}' },
    status: 'implemented',
    apply: applyInhabitedPairLabelsToBody,
    motion: 'egress',
    axes: ['label', 'material'],
  },
  {
    id: 'promote.pair_to_header',
    name: 'pair-labeled body publishes as integrate header',
    from: { site: 'pair_open', liminal: 'aperture', boundary: 'body' },
    to: { site: 'header', liminal: 'published', boundary: 'body' },
    rewrite: { before: '{_$L … }_$L', after: '^["$L"]{…}' },
    status: 'implemented',
    apply: applyPairLabelsToHeader,
    motion: 'promote',
    axes: ['label', 'fold', 'material'],
  },
]

const RULE_BY_ID = new Map(MOBILITY_RULES.map(r => [r.id, r]))

export function mobilityRule(id: string): MobilityRule | undefined {
  return RULE_BY_ID.get(id)
}

export function rulesFrom(pos: LabelPosition): MobilityRule[] {
  return MOBILITY_RULES.filter(r => matchPattern(pos, r.from))
}

export function rulesTo(pos: LabelPosition): MobilityRule[] {
  return MOBILITY_RULES.filter(r => matchPattern(pos, r.to))
}

export function rulesByMotion(motion: MobilityRule['motion']): MobilityRule[] {
  return MOBILITY_RULES.filter(r => r.motion === motion)
}

export function rulesByStatus(status: RuleStatus): MobilityRule[] {
  return MOBILITY_RULES.filter(r => r.status === status)
}

/**
 * Apply a mobility rule computationally when implemented/partial.
 */
export function applyMobilityRule(
  ruleId: string,
  source: string,
  label: string,
): MobilityApplication {
  const rule = RULE_BY_ID.get(ruleId)
  if (!rule) return { ok: false, reason: `unknown rule ${ruleId}` }
  if (!rule.apply) return { ok: false, reason: `rule ${ruleId} has no computational apply (${rule.status})`, rule }
  if (!isFormLabel(label)) {
    return { ok: false, reason: `label must match ${FORM_GEOMETRY_PROFILE.labelGrammar} grammar`, rule }
  }
  const next = rule.apply(source, label)
  if (next === null) return { ok: false, reason: `preconditions failed for ${ruleId}`, rule }

  const beforeTopography = snapshotTopography(source)
  const afterTopography = snapshotTopography(next)
  const inverseRule = rule.inverse ? RULE_BY_ID.get(rule.inverse) : undefined
  const restoredSource = inverseRule?.apply?.(next, label) ?? undefined
  const inverseStatus = !rule.inverse || !inverseRule?.apply
    ? 'unavailable'
    : restoredSource === undefined
      ? 'failed'
      : restoredSource === source.trim()
        ? 'exact'
        : 'changed'

  return {
    ok: true,
    source: next,
    rule,
    receipt: {
      profile: FORM_MOBILITY_APPLICATION_PROFILE,
      effectGrade: 'effect.l1.memory',
      beforeHash: hashString(source),
      afterHash: hashString(next),
      beforeHealth: beforeTopography.parseHealth,
      afterHealth: afterTopography.parseHealth,
      topographyDelta: topographyDelta(beforeTopography, afterTopography),
      semanticEquivalence: 'not_claimed',
      inverse: {
        ruleId: rule.inverse,
        comparison: 'trimmed_surface',
        status: inverseStatus,
        restoredSource,
      },
    },
  }
}

/** Current mobility labels are identifier surfaces, not arbitrary source. */
export function isFormLabel(label: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(label)
}

// ── Reference progression ──────────────────────────────────────

/**
 * Canonical compositional reference progression:
 * how a name becomes increasingly addressable.
 */
export interface ReferenceProgression {
  id: string
  name: string
  description: string
  /** Ordered positions (geometric waypoints) */
  waypoints: LabelPosition[]
  /** Rule ids that move between consecutive waypoints when available */
  rulePath: string[]
  status: RuleStatus
}

export const REFERENCE_PROGRESSIONS: readonly ReferenceProgression[] = [
  {
    id: 'ref.selection_path',
    name: 'selection → path → ref',
    description: 'Name enters selection, becomes path root, then observer handle',
    waypoints: [
      { site: 'free', liminal: 'exterior' },
      { site: 'frame_param', liminal: 'chamber', boundary: 'frame' },
      { site: 'path_node', liminal: 'exterior' },
      { site: 'ref_handle', liminal: 'published', boundary: 'scope' },
    ],
    rulePath: ['ingress.frame_select', 'project.frame_to_path', 'ingress.ref_handle'],
    status: 'partial',
  },
  {
    id: 'ref.ground_publish',
    name: 'ground facet → header publish',
    description: 'Name grounds as facet key then folds to integrate header',
    waypoints: [
      { site: 'free', liminal: 'exterior' },
      { site: 'facet_key', liminal: 'chamber', boundary: 'body' },
      { site: 'header', liminal: 'published', boundary: 'body' },
    ],
    rulePath: ['ingress.facet_key', 'fold.facets_to_header'],
    status: 'implemented',
  },
  {
    id: 'ref.membrane_observe',
    name: 'membrane tag → observer',
    description: 'Capsule tag rehosts to perspective ref',
    waypoints: [
      { site: 'free', liminal: 'exterior' },
      { site: 'capsule_tag', liminal: 'membrane', boundary: 'capsule' },
      { site: 'ref_handle', liminal: 'published', boundary: 'scope' },
    ],
    rulePath: ['ingress.capsule_tag', 'orbit.tag_to_ref'],
    status: 'implemented',
  },
  {
    id: 'ref.pair_publish',
    name: 'pair labels → header',
    description: 'Desugar pair labels then publish as header',
    waypoints: [
      { site: 'free', liminal: 'exterior' },
      { site: 'pair_open', liminal: 'aperture', boundary: 'body' },
      { site: 'header', liminal: 'published', boundary: 'body' },
    ],
    rulePath: ['ingress.pair_labels', 'promote.pair_to_header'],
    status: 'implemented',
  },
  {
    id: 'ref.to_register_meta',
    name: 'observer → substrate meta',
    description: 'Published ref bridges to $(L) surface (runtime promote is separate effect.l1.memory)',
    waypoints: [
      { site: 'free', liminal: 'exterior' },
      { site: 'ref_handle', liminal: 'published', boundary: 'scope' },
      { site: 'register_meta', liminal: 'published' },
    ],
    rulePath: ['ingress.ref_handle', 'promote.register_bridge'],
    status: 'implemented',
  },
  {
    id: 'ref.path_chain',
    name: 'path chain deepening',
    description: 'Compose path segments as higher-order reference form',
    waypoints: [
      { site: 'free', liminal: 'exterior' },
      { site: 'path_node', liminal: 'exterior' },
      { site: 'path_node', liminal: 'exterior' },
      { site: 'path_node', liminal: 'exterior' },
    ],
    rulePath: ['project.frame_to_path', 'project.path_extend', 'project.path_extend'],
    status: 'implemented',
  },
  {
    id: 'ref.action_label_cycle',
    name: 'free ⇄ operator-adjacent',
    description: 'Attach/detach action label (aperture liminality)',
    waypoints: [
      { site: 'free', liminal: 'exterior' },
      { site: 'operator_adjacent', liminal: 'aperture' },
      { site: 'free', liminal: 'exterior' },
    ],
    rulePath: ['ingress.operator_label', 'egress.operator_label'],
    status: 'implemented',
  },
]

/**
 * Walk a reference progression computationally as far as rules allow.
 */
export function walkReferenceProgression(
  progressionId: string,
  label: string,
  startSource?: string,
): {
  progression: ReferenceProgression
  steps: Array<{
    ruleId: string
    ok: boolean
    before: string
    after?: string
    reason?: string
    receipt?: MobilityApplicationReceipt
  }>
  source: string
  completed: boolean
} | undefined {
  const progression = REFERENCE_PROGRESSIONS.find(p => p.id === progressionId)
  if (!progression) return undefined

  let source = startSource ?? label
  const steps: Array<{
    ruleId: string
    ok: boolean
    before: string
    after?: string
    reason?: string
    receipt?: MobilityApplicationReceipt
  }> = []

  for (const ruleId of progression.rulePath) {
    const before = source
    const result = applyMobilityRule(ruleId, source, label)
    if (!result.ok) {
      steps.push({ ruleId, ok: false, before, reason: result.reason })
      return { progression, steps, source, completed: false }
    }
    source = result.source
    steps.push({ ruleId, ok: true, before, after: source, receipt: result.receipt })
  }

  return { progression, steps, source, completed: true }
}

// ── Higher-order compositional forms ───────────────────────────

/**
 * A higher-order form is a named composition of mobility rules
 * (and optional boundary ladder ids) describing a reusable geometric program.
 */
export interface HigherOrderForm {
  id: string
  name: string
  description: string
  /** Ordered rule ids */
  program: string[]
  /** Optional paired-boundary ladder anchors. */
  boundaries?: BoundaryLadderId[]
  /**
   * Algebraic sketch — composition of motions, not executable Spw.
   * Example: ingress ∘ project ∘ promote
   */
  composition: string
  status: RuleStatus
  /** What liminal shapes the program traverses */
  liminalPath: LiminalShape[]
}

export const HIGHER_ORDER_FORMS: readonly HigherOrderForm[] = [
  {
    id: 'hof.select_then_path',
    name: 'Select then path',
    description: 'Pull free label into [] then open a path root',
    program: ['ingress.frame_select', 'project.frame_to_path'],
    boundaries: ['frame'],
    composition: 'project ∘ ingress_select',
    status: 'implemented',
    liminalPath: ['exterior', 'chamber', 'exterior'],
  },
  {
    id: 'hof.ground_then_publish',
    name: 'Ground then publish',
    description: 'Seat label as facet key then fold facet into integrate header',
    program: ['ingress.facet_key', 'fold.facets_to_header'],
    boundaries: ['body'],
    composition: 'fold_header ∘ ingress_ground',
    status: 'implemented',
    liminalPath: ['exterior', 'chamber', 'published'],
  },
  {
    id: 'hof.membrane_to_observer',
    name: 'Membrane to observer',
    description: 'Tag capsule then rehost to @(tag)',
    program: ['ingress.capsule_tag', 'orbit.tag_to_ref'],
    boundaries: ['capsule', 'scope'],
    composition: 'rehost_ref ∘ ingress_membrane',
    status: 'implemented',
    liminalPath: ['exterior', 'membrane', 'published'],
  },
  {
    id: 'hof.path_deepen',
    name: 'Path deepen',
    description: 'Build a multi-segment path reference',
    program: ['project.frame_to_path', 'project.path_extend', 'project.path_extend'],
    composition: 'path_extend² ∘ path_root',
    status: 'implemented',
    liminalPath: ['exterior', 'exterior', 'exterior'],
  },
  {
    id: 'hof.label_orbit_frame_capsule_scope',
    name: 'Label orbit frame→capsule→scope',
    description: 'Move one label across boundary hosts: selection → membrane → reference',
    program: ['ingress.frame_select', 'orbit.frame_param_to_tag', 'orbit.tag_to_ref'],
    boundaries: ['frame', 'capsule', 'scope'],
    composition: 'rehost_scope ∘ rehost_capsule ∘ ingress_frame',
    status: 'implemented',
    liminalPath: ['exterior', 'chamber', 'membrane', 'published'],
  },
  {
    id: 'hof.action_aperture_cycle',
    name: 'Action aperture cycle',
    description: 'Attach and detach !label — reversible aperture liminality',
    program: ['ingress.operator_label', 'egress.operator_label'],
    composition: 'egress ∘ ingress',
    status: 'implemented',
    liminalPath: ['exterior', 'aperture', 'exterior'],
  },
  {
    id: 'hof.interior_ground_fold',
    name: 'Interior ground fold',
    description: 'Body interior {x} becomes grounded facet .{x: x}',
    program: ['rehost.interior_to_facet'],
    boundaries: ['body'],
    composition: 'rehost_ground',
    status: 'implemented',
    liminalPath: ['chamber', 'chamber'],
  },
  {
    id: 'hof.pair_label_publish',
    name: 'Pair labels then publish',
    description: 'Desugar-style {_L }_L pair labels then promote to ^["L"]{}',
    program: ['ingress.pair_labels', 'promote.pair_to_header'],
    boundaries: ['body'],
    composition: 'promote_header ∘ ingress_pair',
    status: 'implemented',
    liminalPath: ['exterior', 'aperture', 'published'],
  },
  {
    id: 'hof.publish_to_register',
    name: 'Publish then substrate bridge',
    description: 'Free name becomes an observer ref, then a reversible $(L) substrate meta surface',
    program: ['ingress.ref_handle', 'promote.register_bridge'],
    boundaries: ['scope'],
    composition: 'register_bridge ∘ ingress_ref',
    status: 'implemented',
    liminalPath: ['exterior', 'published', 'published'],
  },
  {
    id: 'hof.ground_fold_register',
    name: 'Ground → header → register meta',
    description: 'Proposed payload-carrying chain: free → facet → header → register projection',
    program: ['ingress.facet_key', 'fold.facets_to_header', 'promote.register_bridge'],
    boundaries: ['body'],
    composition: 'register_bridge ∘ fold_header ∘ ingress_ground',
    status: 'partial',
    liminalPath: ['exterior', 'chamber', 'published', 'published'],
  },
]

/**
 * Run a higher-order form program on a label/source.
 */
export function runHigherOrderForm(
  formId: string,
  label: string,
  startSource?: string,
): {
  form: HigherOrderForm
  steps: Array<{
    ruleId: string
    ok: boolean
    before: string
    after?: string
    reason?: string
    receipt?: MobilityApplicationReceipt
  }>
  source: string
  completed: boolean
} | undefined {
  const form = HIGHER_ORDER_FORMS.find(f => f.id === formId)
  if (!form) return undefined

  let source = startSource ?? label
  const steps: Array<{
    ruleId: string
    ok: boolean
    before: string
    after?: string
    reason?: string
    receipt?: MobilityApplicationReceipt
  }> = []

  for (const ruleId of form.program) {
    const before = source
    // path_deepen needs varying segment labels — use label + index
    const segmentLabel =
      ruleId === 'project.path_extend' ? `${label}${steps.filter(s => s.ruleId === ruleId).length + 1}` : label
    const result = applyMobilityRule(ruleId, source, segmentLabel === label ? label : segmentLabel)
    // For path_extend after frame_to_path, first extend uses label as first real segment
    if (!result.ok && ruleId === 'project.path_extend') {
      // try with plain label once
      const retry = applyMobilityRule(ruleId, source, label)
      if (retry.ok) {
        source = retry.source
        steps.push({ ruleId, ok: true, before, after: source, receipt: retry.receipt })
        continue
      }
    }
    if (!result.ok) {
      steps.push({ ruleId, ok: false, before, reason: result.reason })
      return { form, steps, source, completed: false }
    }
    source = result.source
    steps.push({ ruleId, ok: true, before, after: source, receipt: result.receipt })
  }

  return { form, steps, source, completed: true }
}

// ── Site graph (adjacency for tooling) ─────────────────────────

export interface SiteEdge {
  from: LabelSite
  to: LabelSite
  ruleIds: string[]
  motions: MobilityRule['motion'][]
}

/** Derived directed graph of label sites via mobility rules (coarse). */
export function labelSiteGraph(): SiteEdge[] {
  const edgeMap = new Map<string, SiteEdge>()

  for (const rule of MOBILITY_RULES) {
    const fromSites = flattenSite(rule.from.site) ?? (['free'] as LabelSite[])
    const toSites = flattenSite(rule.to.site) ?? (['free'] as LabelSite[])
    for (const f of fromSites) {
      for (const t of toSites) {
        const key = `${f}->${t}`
        const existing = edgeMap.get(key)
        if (existing) {
          if (!existing.ruleIds.includes(rule.id)) existing.ruleIds.push(rule.id)
          if (!existing.motions.includes(rule.motion)) existing.motions.push(rule.motion)
        } else {
          edgeMap.set(key, {
            from: f,
            to: t,
            ruleIds: [rule.id],
            motions: [rule.motion],
          })
        }
      }
    }
  }

  return Array.from(edgeMap.values())
}

function flattenSite(site: LabelSite | LabelSite[] | undefined): LabelSite[] | undefined {
  if (site === undefined) return undefined
  return Array.isArray(site) ? site : [site]
}

export function formatSiteGraph(): string {
  const edges = labelSiteGraph()
  const lines = ['from → to | motions | rules']
  for (const e of edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))) {
    lines.push(
      `${e.from} → ${e.to} | ${e.motions.join(',')} | ${e.ruleIds.join(', ')}`,
    )
  }
  return lines.join('\n')
}

export function formatHigherOrderForms(): string {
  return HIGHER_ORDER_FORMS.map(
    f =>
      `${f.id}\n  ${f.name}: ${f.description}\n  ${f.composition}\n  liminal: ${f.liminalPath.join(' → ')}\n  program: ${f.program.join(' ⇒ ')}\n  status: ${f.status}`,
  ).join('\n\n')
}

export function formatMobilityRules(status?: RuleStatus): string {
  const rules = status ? rulesByStatus(status) : MOBILITY_RULES
  return rules
    .map(
      r =>
        `${r.id} [${r.status}/${r.motion}]\n  ${r.name}\n  ${subLabel(r.rewrite.before, '$L')}  ⇒  ${subLabel(r.rewrite.after, '$L')}`,
    )
    .join('\n\n')
}

/** List rule ids that are computationally runnable today. */
export function computationalRuleIds(): string[] {
  return MOBILITY_RULES.filter(r => typeof r.apply === 'function').map(r => r.id)
}

/**
 * Form enrichment ladders — paired boundaries first, then operators.
 *
 * Two sequence families (both use meta-arrow `=>`, neither is file mutation):
 *
 * 1. **Boundary ladders** — each Bound suggests an operational progression:
 *    empty → inhabited → labeled/selected → path/ref → ground/fold
 *
 * 2. **Operator ladders** — each Act composes with observed Bounds and products
 *    (`#[…]`, `.{…}`, `@(…)`, wrap, annotate) without inventing physical law.
 *
 * Vocabulary is structural: hole `_`, void empty form, selection, path, ref,
 * label, ground, fold. Capacitance / "_cap" is not canonical here.
 *
 * @see docs/theory/spw/form-ladders.spw
 * @see docs/theory/spw/operator-brace-composition.spw
 * @see docs/theory/spw/coupling-constructors.spw
 */

import type { OperatorKind } from '../types/token'
import type { CouplingKind } from '../types/coupling'
import { parse } from '../parser'
import { normalizeToONF } from '../normalize'
import type { ONFNode } from '../types/ast/onf'
import { snapshotTopography, type TopographySnapshot } from './topography-probe'
import { readCouplingFrame } from '../types/coupling'

// ── Roles ──────────────────────────────────────────────────────

/**
 * Conceptual operation of a ladder step (not an effect.l* ceiling).
 */
export type EnrichmentRole =
  // structural occupancy
  | 'empty' // void occupancy of a Bound
  | 'inhabit' // place a term inside
  | 'multi' // several interior args
  // interpretive boundary operations
  | 'select' // pin / address / parameterize (frame)
  | 'materialize' // field / definition (body)
  | 'hold' // flow / perspective hold (scope)
  | 'membrane' // interface shell (capsule)
  | 'channel' // ordered stream
  | 'range' // n-range band
  // reference geometry
  | 'label' // open/close or operator label
  | 'path' // / projection or path segment
  | 'ref' // @ / pathref reference
  | 'ground' // . ground / baseline / facet ground
  | 'fold' // reduce many → one; sequence fold
  // act products
  | 'seed' // bare Act
  | 'wrap' // Bound around Act
  | 'product' // preferred Act×Bound idiom
  | 'annotate' // descriptive interior (may be conceptual)
  | 'defer' // ~ potential
  | 'collapse' // * value
  | 'integrate' // ^ promote
  | 'couple' // <> peers
  | 'open' // … continuation slot

export type LadderArrow = '=>'

export type LadderKind = 'boundary' | 'operator'

export type BoundaryLadderId =
  | 'frame'
  | 'body'
  | 'scope'
  | 'capsule'
  | 'stream'
  | 'nrange'

export interface LadderStep {
  id: string
  surface: string
  role: EnrichmentRole
  implies: string
  parseExpectation: 'structured' | 'conceptual'
}

export interface FormLadder {
  id: string
  kind: LadderKind
  /** Display name */
  name: string
  essence: string
  /**
   * What this ladder is for operationally (selection, path, ground, …).
   * Multiple axes may apply; first is primary.
   */
  axes: readonly FormAxis[]
  arrow: LadderArrow
  steps: LadderStep[]
  notation: string
}

/** Cross-cutting interpretive axes paired boundaries and Acts may participate in. */
export type FormAxis =
  | 'selection' // address / pin / params
  | 'reference' // @, pathref, external target
  | 'path' // / projection chains
  | 'label' // named pair or operator label
  | 'ground' // baseline / facet; not an invented empty runtime unit
  | 'fold' // reduce / merge / multi→one
  | 'flow' // perspective / ordered channel
  | 'interface' // membrane / couple ports
  | 'material' // body field / definition
  | 'potential' // defer / probe

export interface BoundaryLadder extends FormLadder {
  kind: 'boundary'
  boundary: BoundaryLadderId
  couplingKind: CouplingKind
  /** Empty surface glyph */
  emptySurface: string
  /** Portable structure of an empty boundary; this is not a runtime unit value. */
  emptyState: Readonly<{ occupancy: 'empty'; payload: 'void' }>
}

/**
 * Evidence posture for this catalog. The axes are hypotheses for probing and
 * teaching; the parser observations in a ladder probe are measured separately.
 * The included set is explicit because local "brace" vocabularies may exclude
 * angle boundaries even though Seed's paired-boundary model includes Capsule.
 */
export const FORM_LADDER_PROFILE = {
  id: 'Spw.Form.Ladders',
  revision: '0.3',
  status: 'interpretive',
  includedBoundaryKinds: ['frame', 'body', 'scope', 'capsule', 'stream', 'nrange'],
} as const

export interface OperatorLadder extends FormLadder {
  kind: 'operator'
  operator: OperatorKind
  preferredBoundary: BoundaryLadderId | 'void' | 'none'
  preferredProduct?: string
}

export type ResolvedFormLadder = BoundaryLadder | OperatorLadder

// ── Helpers ────────────────────────────────────────────────────

function notationOf(steps: LadderStep[], arrow: LadderArrow = '=>'): string {
  return steps.map(s => s.surface).join(` ${arrow} `)
}

function S(
  id: string,
  surface: string,
  role: EnrichmentRole,
  implies: string,
  exp: 'structured' | 'conceptual' = 'structured',
): LadderStep {
  return { id, surface, role, implies, parseExpectation: exp }
}

// ── Paired-boundary ladders (primary) ─────────────────────────

/**
 * Paired-boundary operational hypotheses.
 *
 * A Bound kind suggests which axes may be worth probing — selection, path,
 * reference, label, ground, fold — without asserting runtime physics.
 */
export const BOUNDARY_LADDERS: Record<BoundaryLadderId, BoundaryLadder> = {
  frame: {
    id: 'boundary:frame',
    kind: 'boundary',
    boundary: 'frame',
    couplingKind: 'frame',
    name: 'Frame []',
    essence: 'selection / parameter / address boundary',
    emptySurface: '[]',
    emptyState: { occupancy: 'empty', payload: 'void' },
    axes: ['selection', 'label', 'path', 'fold'],
    arrow: '=>',
    steps: [
      S('empty', '[]', 'empty', 'uninhabited Frame; selection is a profile reading'),
      S('inhabit', '[x]', 'inhabit', 'select a single term'),
      S('select', '[a, b]', 'select', 'enumerate selection / params', 'conceptual'),
      S('label', '[name: x]', 'label', 'named parameter (Parameter form)', 'conceptual'),
      S('path', 'x / [y]', 'path', 'project then re-select', 'conceptual'),
      S('product', '#[a, b]', 'product', 'resonance × frame → set'),
      S('fold', '#[a, b, c]', 'fold', 'fold many into one categorical set', 'conceptual'),
    ],
    notation: '',
  },
  body: {
    id: 'boundary:body',
    kind: 'boundary',
    boundary: 'body',
    couplingKind: 'body',
    name: 'Body {}',
    essence: 'materialization / definition / field boundary',
    emptySurface: '{}',
    emptyState: { occupancy: 'empty', payload: 'void' },
    axes: ['material', 'ground', 'label', 'fold'],
    arrow: '=>',
    steps: [
      S('empty', '{}', 'empty', 'uninhabited Body; material is a profile reading'),
      S('inhabit', '{x}', 'inhabit', 'one term in the field'),
      S('materialize', '{a b}', 'materialize', 'juxtaposed material (sequence interior)', 'conceptual'),
      S('ground', '.{}', 'ground', 'ground Act × body → empty facet'),
      S('label', '.{k: v}', 'label', 'named facet binding', 'conceptual'),
      S('fold', '.{a: 1, b: 2}', 'fold', 'fold properties into one facet map', 'conceptual'),
      S('integrate', '^["name"]{}', 'integrate', 'labeled integrate block (header idiom)', 'conceptual'),
    ],
    notation: '',
  },
  scope: {
    id: 'boundary:scope',
    kind: 'boundary',
    boundary: 'scope',
    couplingKind: 'scope',
    name: 'Scope ()',
    essence: 'flow / perspective / hold — reference-friendly boundary',
    emptySurface: '()',
    emptyState: { occupancy: 'empty', payload: 'void' },
    axes: ['flow', 'reference', 'path', 'ground'],
    arrow: '=>',
    steps: [
      S('empty', '()', 'empty', 'uninhabited Scope; hold is a profile reading'),
      S('inhabit', '(x)', 'inhabit', 'hold one term'),
      S('hold', '(_)', 'hold', 'hold a hole (open placeholder)'),
      S('ref', '@()', 'ref', 'perspective product empty observer'),
      S('ref_named', '@(here)', 'ref', 'named observer / standpoint'),
      S('path', '(a / b)', 'path', 'path inside a hold', 'conceptual'),
      S('product', '@(a / b)', 'product', 'observe a projection', 'conceptual'),
    ],
    notation: '',
  },
  capsule: {
    id: 'boundary:capsule',
    kind: 'boundary',
    boundary: 'capsule',
    couplingKind: 'capsule',
    name: 'Capsule <…>',
    essence: 'interface / concept shell — not digraph <>',
    emptySurface: '< >',
    emptyState: { occupancy: 'empty', payload: 'void' },
    axes: ['interface', 'label', 'reference'],
    arrow: '=>',
    steps: [
      S('empty', '< >', 'empty', 'uninhabited Capsule, visibly distinct from operator <>'),
      S('label', '<tag>', 'label', 'tagged shell (tag, often still empty occupancy)'),
      S('membrane', '<x>', 'membrane', 'capsule with tag/id surface'),
      S('inhabit', '<tag>{body}', 'inhabit', 'shell + material body', 'conceptual'),
      S('ref', '~"<path>"', 'ref', 'pathref as portable reference (related surface)', 'conceptual'),
    ],
    notation: '',
  },
  stream: {
    id: 'boundary:stream',
    kind: 'boundary',
    boundary: 'stream',
    couplingKind: 'stream',
    name: 'Stream <<…>>',
    essence: 'ordered channel — fold over sequence of values',
    emptySurface: '<<>>',
    emptyState: { occupancy: 'empty', payload: 'void' },
    axes: ['flow', 'fold', 'path', 'reference'],
    arrow: '=>',
    steps: [
      S('empty', '<<>>', 'empty', 'empty channel'),
      S('inhabit', '<<x>>', 'inhabit', 'single value on the channel'),
      S('multi', '<<a, b>>', 'multi', 'ordered multi-value channel', 'conceptual'),
      S('channel', '<<a, b, c>>', 'channel', 'longer stream for fold', 'conceptual'),
      S('fold', '<<a, b>> / head', 'fold', 'project/fold stream head (conceptual)', 'conceptual'),
      S('ref', '<<x>>@sink', 'ref', 'stream with sink reference (ONF may drop sink)', 'conceptual'),
    ],
    notation: '',
  },
  nrange: {
    id: 'boundary:nrange',
    kind: 'boundary',
    boundary: 'nrange',
    couplingKind: 'nrange',
    name: 'NRange ((…))',
    essence: 'range / band boundary — extent then step',
    emptySurface: '(())',
    emptyState: { occupancy: 'empty', payload: 'void' },
    axes: ['selection', 'path', 'fold'],
    arrow: '=>',
    steps: [
      S('empty', '(())', 'empty', 'empty range (parser may recover as prose today)', 'conceptual'),
      S('inhabit', '((x))', 'inhabit', 'range over one expression', 'conceptual'),
      S('range', '((a / b))', 'range', 'range with internal path', 'conceptual'),
      S('fold', '((a .. b))', 'fold', 'range as fold of continuum (conceptual)', 'conceptual'),
    ],
    notation: '',
  },
}

// ── Operator ladders (secondary — compose with boundaries) ─────

/**
 * Operator ladders use boundary products and interpretive roles.
 * Terminals prefer ground / fold / ref — not capacitance metaphors.
 */
export const OPERATOR_LADDERS: Record<OperatorKind, OperatorLadder> = {
  '&': {
    id: 'op:&',
    kind: 'operator',
    operator: '&',
    name: 'Confluence',
    essence: 'merge streams — fold many into one field',
    preferredBoundary: 'body',
    preferredProduct: '{&}',
    axes: ['fold', 'material', 'selection', 'label', 'ground'],
    arrow: '=>',
    steps: [
      S('seed', '&', 'seed', 'bare confluence Act'),
      S('wrap', '{&}', 'wrap', 'materialize merge inside a body field'),
      S('select', '&[a, b]', 'select', 'merge with selection of arms', 'conceptual'),
      S('annotate', '{&[describe!]}', 'annotate', 'optional named force on a merge arm', 'conceptual'),
      S('fold', '&(a, b, c)', 'fold', 'fold n args through confluence', 'conceptual'),
      S('ground', '.{&: _}', 'ground', 'ground a merge slot in a facet', 'conceptual'),
    ],
    notation: '',
  },
  '!': {
    id: 'op:!',
    kind: 'operator',
    operator: '!',
    name: 'Action',
    essence: 'commit / hydrate — often prefix over a Bound',
    preferredBoundary: 'void',
    preferredProduct: '![]',
    axes: ['label', 'selection', 'material', 'path', 'ground'],
    arrow: '=>',
    steps: [
      S('seed', '!', 'seed', 'bare action Act'),
      S('label', '!x', 'label', 'operator label (adjacent id)'),
      S('select', '![]', 'select', 'prefix Act owns empty frame'),
      S('wrap', '{!}', 'wrap', 'action as body interior'),
      S('path', '! x / y', 'path', 'action then path (conceptual)', 'conceptual'),
      S('ground', '!.{}', 'ground', 'force a facet ground', 'conceptual'),
    ],
    notation: '',
  },
  '~': {
    id: 'op:~',
    kind: 'operator',
    operator: '~',
    name: 'Potential',
    essence: 'defer — hold without collapse',
    preferredBoundary: 'scope',
    preferredProduct: '~()',
    axes: ['potential', 'flow', 'ground', 'reference'],
    arrow: '=>',
    steps: [
      S('seed', '~', 'seed', 'bare potential Act'),
      S('hold', '~()', 'hold', 'defer empty hold'),
      S('hold_hole', '~(_)', 'hold', 'defer a hole (open binding site)'),
      S('wrap', '{~}', 'wrap', 'potential inside body'),
      S('ref', '~@"target"', 'ref', 'deferred path-like reference', 'conceptual'),
      S('ground', '~.{}', 'ground', 'defer a ground facet', 'conceptual'),
    ],
    notation: '',
  },
  '?': {
    id: 'op:?',
    kind: 'operator',
    operator: '?',
    name: 'Wonder',
    essence: 'probe / branch — stream affinity',
    preferredBoundary: 'stream',
    preferredProduct: '<<>>',
    axes: ['potential', 'flow', 'selection', 'path', 'fold'],
    arrow: '=>',
    steps: [
      S('seed', '?', 'seed', 'bare wonder Act'),
      S('channel', '<<>>', 'channel', 'empty stream Bound (affinity neighbor)'),
      S('inhabit', '<<?>>', 'inhabit', 'probe on a channel'),
      S('select', '?(a, b)', 'select', 'conditional arms', 'conceptual'),
      S('path', '? a / b', 'path', 'probe then project', 'conceptual'),
      S('fold', '?(a, b, c)', 'fold', 'multi-arm wonder fold', 'conceptual'),
    ],
    notation: '',
  },
  '*': {
    id: 'op:*',
    kind: 'operator',
    operator: '*',
    name: 'Value',
    essence: 'collapse to concrete — end of defer chain',
    preferredBoundary: 'body',
    preferredProduct: '*{}',
    axes: ['ground', 'fold', 'material', 'path'],
    arrow: '=>',
    steps: [
      S('seed', '*', 'seed', 'bare collapse Act'),
      S('ground', '*()', 'ground', 'collapse empty hold / unit'),
      S('inhabit', '*(x)', 'inhabit', 'collapse a term'),
      S('wrap', '{*}', 'wrap', 'collapse interior in body'),
      S('path', '* x / k', 'path', 'collapse after path', 'conceptual'),
      S('fold', '*(a, b)', 'fold', 'collapse of multi (last/merge policy conceptual)', 'conceptual'),
    ],
    notation: '',
  },
  '#': {
    id: 'op:#',
    kind: 'operator',
    operator: '#',
    name: 'Resonance',
    essence: 'categorical set — selection product',
    preferredBoundary: 'frame',
    preferredProduct: '#[…]',
    axes: ['selection', 'fold', 'ground', 'path', 'label'],
    arrow: '=>',
    steps: [
      S('seed', '#', 'seed', 'bare resonance Act'),
      S('empty', '#[]', 'empty', 'empty set product'),
      S('select', '#[a]', 'select', 'singleton set'),
      S('fold', '#[a, b, c]', 'fold', 'fold members into a set', 'conceptual'),
      S('path', '#x / y', 'path', 'tag then project', 'conceptual'),
      S('label', '#name[]', 'label', 'labeled set (conceptual)', 'conceptual'),
    ],
    notation: '',
  },
  '.': {
    id: 'op:.',
    kind: 'operator',
    operator: '.',
    name: 'Ground',
    essence: 'baseline / subject / property ground',
    preferredBoundary: 'body',
    preferredProduct: '.{…}',
    axes: ['ground', 'path', 'label', 'fold'],
    arrow: '=>',
    steps: [
      S('seed', '.', 'seed', 'bare ground Act'),
      S('empty', '.{}', 'empty', 'empty facet — ground with no properties'),
      S('label', '.{k: v}', 'label', 'named property on ground', 'conceptual'),
      S('path', '. / k', 'path', 'project from ground', 'conceptual'),
      S('path_chain', 'a / b / c', 'path', 'path chain (connector ladder)', 'conceptual'),
      S('fold', '.{a: 1, b: 2}', 'fold', 'fold properties onto ground', 'conceptual'),
    ],
    notation: '',
  },
  '@': {
    id: 'op:@',
    kind: 'operator',
    operator: '@',
    name: 'Perspective',
    essence: 'observe / reference standpoint',
    preferredBoundary: 'scope',
    preferredProduct: '@(…)',
    axes: ['reference', 'flow', 'path'],
    arrow: '=>',
    steps: [
      S('seed', '@', 'seed', 'bare perspective Act'),
      S('empty', '@()', 'empty', 'empty observer product'),
      S('ref', '@(here)', 'ref', 'named standpoint'),
      S('path', '@(a / b)', 'path', 'observe a path', 'conceptual'),
      S('ref_path', '~"relative/path"', 'ref', 'pathref surface (portable ref)', 'conceptual'),
      S('wrap', '{@(here)}', 'wrap', 'observation inside body', 'conceptual'),
    ],
    notation: '',
  },
  '^': {
    id: 'op:^',
    kind: 'operator',
    operator: '^',
    name: 'Integration',
    essence: 'promote / label a unit upward',
    preferredBoundary: 'body',
    preferredProduct: '^["name"]{}',
    axes: ['label', 'material', 'fold', 'selection', 'ground'],
    arrow: '=>',
    steps: [
      S('seed', '^', 'seed', 'bare integrate Act'),
      S('wrap', '{^}', 'wrap', 'integrate marker in body'),
      S('label', '^["name"]{}', 'label', 'named integrate block', 'conceptual'),
      S('select', '^[]', 'select', 'integrate with frame', 'conceptual'),
      S('fold', '^(a, b)', 'fold', 'integrate multiple args', 'conceptual'),
      S('ground', '^.{}', 'ground', 'integrate a ground facet', 'conceptual'),
    ],
    notation: '',
  },
  '$': {
    id: 'op:$',
    kind: 'operator',
    operator: '$',
    name: 'Substrate',
    essence: 'medium / meta register reflection',
    preferredBoundary: 'none',
    preferredProduct: '$(reg)',
    axes: ['reference', 'ground', 'label', 'path'],
    arrow: '=>',
    steps: [
      S('seed', '$', 'seed', 'bare substrate Act'),
      S('ref', '$(reg)', 'ref', 'materialize named register meta'),
      S('label', '$name', 'label', 'substrate label form', 'conceptual'),
      S('path', '$ / meta', 'path', 'project substrate', 'conceptual'),
      S('ground', '$.{}', 'ground', 'substrate ground facet', 'conceptual'),
      S('measure', '$%[m]', 'annotate', 'substrate measurement point idiom', 'conceptual'),
    ],
    notation: '',
  },
  '%': {
    id: 'op:%',
    kind: 'operator',
    operator: '%',
    name: 'Measure',
    essence: 'sample / scale — often over a selection',
    preferredBoundary: 'frame',
    preferredProduct: '%[metric]',
    axes: ['selection', 'ground', 'reference', 'label', 'path'],
    arrow: '=>',
    steps: [
      S('seed', '%', 'seed', 'bare measure Act'),
      S('select', '%[]', 'select', 'measure empty selection', 'conceptual'),
      S('label', '%[metric]', 'label', 'named metric frame', 'conceptual'),
      S('ref', '$%[metric]', 'ref', 'measurement point on substrate', 'conceptual'),
      S('path', '% x / scale', 'path', 'measure then scale path', 'conceptual'),
      S('ground', '%.{}', 'ground', 'measure a ground', 'conceptual'),
    ],
    notation: '',
  },
  '=': {
    id: 'op:=',
    kind: 'operator',
    operator: '=',
    name: 'Configuration',
    essence: 'bind — label a value into place',
    preferredBoundary: 'body',
    preferredProduct: 'k = v',
    axes: ['label', 'ground', 'material', 'selection', 'fold'],
    arrow: '=>',
    steps: [
      S('seed', '=', 'seed', 'bare bind Act'),
      S('label', 'k = v', 'label', 'name–value bind', 'conceptual'),
      S('ground', '.{k: v}', 'ground', 'facet bind as ground product', 'conceptual'),
      S('wrap', '{=}', 'wrap', 'bind marker in body'),
      S('select', '=[k]', 'select', 'bind into selection', 'conceptual'),
      S('fold', '={a: 1, b: 2}', 'fold', 'fold many binds', 'conceptual'),
    ],
    notation: '',
  },
  '<>': {
    id: 'op:<>',
    kind: 'operator',
    operator: '<>',
    name: 'Coupling',
    essence: 'peer exchange — interface between named registers',
    preferredBoundary: 'frame',
    preferredProduct: '<>[a, b]',
    axes: ['interface', 'reference', 'label', 'path'],
    arrow: '=>',
    steps: [
      S('seed', '<>', 'seed', 'zero-arity couple Act; not an empty boundary'),
      S('couple', '<>["a", "b"]', 'couple', 'couple two operands selected by a Frame'),
      S('ref', '<>[@src, @dst]', 'ref', 'peer references selected by a Frame', 'conceptual'),
      S('wrap', '{<>["a", "b"]}', 'wrap', 'couple expression inside a Body', 'conceptual'),
      S('path', 'a <> b / edge', 'path', 'couple then project edge', 'conceptual'),
    ],
    notation: '',
  },
}

// ── Cross-axis index: which boundaries suggest which axes ─────

export interface BoundaryAxisImplication {
  boundary: BoundaryLadderId
  axis: FormAxis
  /** Why this boundary may open this axis under this profile */
  implies: string
  /** Entry surfaces on that axis */
  surfaces: string[]
}

/**
 * Boundary → operational-axis hypothesis table.
 */
export const BOUNDARY_AXIS_IMPLICATIONS: BoundaryAxisImplication[] = [
  {
    boundary: 'frame',
    axis: 'selection',
    implies: '[] pins, parameters, and enumerated addresses',
    surfaces: ['[]', '[x]', '#[…]'],
  },
  {
    boundary: 'frame',
    axis: 'path',
    implies: 'selection often follows or precedes / projection',
    surfaces: ['x / [y]', '#[a] / b'],
  },
  {
    boundary: 'frame',
    axis: 'fold',
    implies: 'multi-select folds into sets under #',
    surfaces: ['#[a, b, c]'],
  },
  {
    boundary: 'body',
    axis: 'material',
    implies: '{} is the materialization / definition field',
    surfaces: ['{}', '{x}', '.{…}'],
  },
  {
    boundary: 'body',
    axis: 'ground',
    implies: '.{} grounds property structure',
    surfaces: ['.{}', '.{k: v}'],
  },
  {
    boundary: 'body',
    axis: 'label',
    implies: 'facet keys and ^["name"]{} headers label material',
    surfaces: ['.{k: v}', '^["name"]{}'],
  },
  {
    boundary: 'body',
    axis: 'fold',
    implies: 'property maps fold many binds into one body',
    surfaces: ['.{a: 1, b: 2}'],
  },
  {
    boundary: 'scope',
    axis: 'flow',
    implies: '() holds flow without binding identity',
    surfaces: ['()', '(x)', '~()'],
  },
  {
    boundary: 'scope',
    axis: 'reference',
    implies: '@(…) and pathrefs use scope-shaped observation',
    surfaces: ['@()', '@(here)', '~"path"'],
  },
  {
    boundary: 'scope',
    axis: 'path',
    implies: 'paths nest cleanly inside holds',
    surfaces: ['(a / b)', '@(a / b)'],
  },
  {
    boundary: 'capsule',
    axis: 'interface',
    implies: '<…> is membrane/shell; digraph <> is separate couple Act',
    surfaces: ['< >', '<tag>', '<x>'],
  },
  {
    boundary: 'capsule',
    axis: 'label',
    implies: 'capsule tags name the interface',
    surfaces: ['<tag>'],
  },
  {
    boundary: 'stream',
    axis: 'flow',
    implies: '<<>> is ordered channel flow',
    surfaces: ['<<>>', '<<x>>', '<<a, b>>'],
  },
  {
    boundary: 'stream',
    axis: 'fold',
    implies: 'streams are natural fold domains (head/reduce conceptual)',
    surfaces: ['<<a, b, c>>'],
  },
  {
    boundary: 'nrange',
    axis: 'selection',
    implies: 'ranges select a band of a continuum',
    surfaces: ['(())', '((x))'],
  },
  {
    boundary: 'nrange',
    axis: 'path',
    implies: 'range interiors often carry paths or sequences',
    surfaces: ['((a / b))'],
  },
]

// fill notations
for (const ladder of Object.values(BOUNDARY_LADDERS)) {
  ladder.notation = notationOf(ladder.steps, ladder.arrow)
}
for (const ladder of Object.values(OPERATOR_LADDERS)) {
  ladder.notation = notationOf(ladder.steps, ladder.arrow)
}

// ── Lookup ─────────────────────────────────────────────────────

export function boundaryLadder(id: BoundaryLadderId | string): BoundaryLadder | undefined {
  if (Object.hasOwn(BOUNDARY_LADDERS, id)) return BOUNDARY_LADDERS[id as BoundaryLadderId]
  // allow [] {} () aliases
  const aliases: Record<string, BoundaryLadderId> = {
    '[]': 'frame',
    '{}': 'body',
    '()': 'scope',
    '< >': 'capsule',
    '<…>': 'capsule',
    '<<>>': 'stream',
    '(())': 'nrange',
    frame: 'frame',
    body: 'body',
    scope: 'scope',
    capsule: 'capsule',
    stream: 'stream',
    nrange: 'nrange',
  }
  const mapped = aliases[id]
  return mapped ? BOUNDARY_LADDERS[mapped] : undefined
}

export function operatorLadder(op: OperatorKind | string): OperatorLadder | undefined {
  if (Object.hasOwn(OPERATOR_LADDERS, op)) return OPERATOR_LADDERS[op as OperatorKind]
  return undefined
}

export function listBoundaryLadders(): BoundaryLadder[] {
  return Object.values(BOUNDARY_LADDERS)
}

export function listOperatorLadders(): OperatorLadder[] {
  return Object.values(OPERATOR_LADDERS)
}

export function listFormLadders(): ResolvedFormLadder[] {
  return [...listBoundaryLadders(), ...listOperatorLadders()]
}

export function implicationsForBoundary(boundary: BoundaryLadderId): BoundaryAxisImplication[] {
  return BOUNDARY_AXIS_IMPLICATIONS.filter(i => i.boundary === boundary)
}

export function implicationsForAxis(axis: FormAxis): BoundaryAxisImplication[] {
  return BOUNDARY_AXIS_IMPLICATIONS.filter(i => i.axis === axis)
}

// ── Probe ──────────────────────────────────────────────────────

export interface LadderStepProbe {
  step: LadderStep
  index: number
  parseSuccess: boolean
  parseHealth: TopographySnapshot['parseHealth']
  proseFallback: boolean
  onf: {
    sigil?: string
    reg?: string
    couplingKind?: string
    occupancy?: string
    payload?: string
    arity?: number
  } | null
  topography: TopographySnapshot
  expectationMet: boolean
}

export interface FormLadderProbe {
  ladder: FormLadder
  steps: LadderStepProbe[]
  structuredHits: number
  conceptualSlots: number
  findings: string[]
}

function firstOnf(source: string): ONFNode | null {
  const result = parse(source)
  if (!result.success || !result.ast) return null
  try {
    return normalizeToONF(result.ast)
  } catch {
    return null
  }
}

function probeStep(step: LadderStep, index: number): LadderStepProbe {
  const topography = snapshotTopography(step.surface)
  const onfNode = firstOnf(step.surface)
  const coupling = onfNode ? readCouplingFrame(onfNode.frames) : undefined
  const c = coupling as {
    kind?: string
    occupancy?: string
    payload?: string
    arity?: number
  } | undefined

  const onf = onfNode
    ? {
        sigil: String(onfNode.sigil),
        reg: typeof onfNode.frames.reg === 'string' ? onfNode.frames.reg : undefined,
        couplingKind: c?.kind,
        occupancy: c?.occupancy,
        payload: c?.payload,
        arity: c?.arity,
      }
    : null

  const proseFallback = topography.proseFallback
  const structuredOk =
    topography.parseHealth === 'complete_structured' ||
    (topography.parseHealth === 'recovered' && !proseFallback)

  const expectationMet =
    step.parseExpectation === 'conceptual' ? true : structuredOk && !proseFallback

  return {
    step,
    index,
    parseSuccess: topography.parserSuccess,
    parseHealth: topography.parseHealth,
    proseFallback,
    onf,
    topography,
    expectationMet,
  }
}

function probeLadder(ladder: FormLadder): FormLadderProbe {
  const stepProbes = ladder.steps.map((step, index) => probeStep(step, index))
  const structuredHits = stepProbes.filter(
    s => s.step.parseExpectation === 'structured' && s.expectationMet,
  ).length
  const conceptualSlots = stepProbes.filter(s => s.step.parseExpectation === 'conceptual').length

  const findings: string[] = [
    `${ladder.kind === 'boundary' ? 'boundary' : 'op'} ${ladder.name}: ${ladder.essence}`,
    `axes: ${ladder.axes.join(', ')}`,
    `notation: ${ladder.notation}`,
    `steps=${stepProbes.length} structured-ok=${structuredHits} conceptual=${conceptualSlots}`,
  ]

  for (const s of stepProbes) {
    const onfBits = s.onf
      ? ` sigil=${s.onf.sigil} reg=${s.onf.reg ?? '—'}` +
        (s.onf.couplingKind ? ` couple=${s.onf.couplingKind}` : '') +
        (s.onf.occupancy ? ` occ=${s.onf.occupancy}` : '') +
        (s.onf.payload ? ` payload=${s.onf.payload}` : '') +
        (s.onf.arity !== undefined ? ` arity=${s.onf.arity}` : '')
      : ' onf=—'
    findings.push(
      `  ${s.index + 1}. [${s.step.role}] ${s.step.surface}  health=${s.parseHealth}` +
        (s.proseFallback ? ' prose' : '') +
        onfBits +
        (s.expectationMet ? '' : ' ⚠ expectation'),
    )
  }

  return {
    ladder,
    steps: stepProbes,
    structuredHits,
    conceptualSlots,
    findings,
  }
}

/** Probe either discriminated ladder kind without erasing its identity. */
export function probeFormLadder(ladder: ResolvedFormLadder): FormLadderProbe {
  return probeLadder(ladder)
}

export function probeBoundaryLadder(id: BoundaryLadderId | string): FormLadderProbe | undefined {
  const ladder = boundaryLadder(id)
  return ladder ? probeLadder(ladder) : undefined
}

export function probeOperatorLadder(op: OperatorKind | string): FormLadderProbe | undefined {
  const ladder = operatorLadder(op)
  return ladder ? probeLadder(ladder) : undefined
}

/** Resolve a boundary name, glyph, operator, or catalog selector. */
export function resolveLadderQuery(
  query: string,
): { mode: 'all' | 'boundaries' | 'ops' | 'one'; ladder?: ResolvedFormLadder; legacyAlias?: 'brace' } {
  const q = query.trim()
  if (q === 'all') return { mode: 'all' }
  if (q === 'boundaries' || q === 'boundary' || q === 'bounds') return { mode: 'boundaries' }
  if (q === 'braces' || q === 'brace') return { mode: 'boundaries', legacyAlias: 'brace' }
  if (q === 'ops' || q === 'operators' || q === 'op') return { mode: 'ops' }

  const b = boundaryLadder(q)
  if (b) return { mode: 'one', ladder: b }
  const o = operatorLadder(q)
  if (o) return { mode: 'one', ladder: o }
  return { mode: 'one' }
}

export function formatBoundaryAxisTable(): string {
  const lines = ['boundary | axis | hypothesis | example surfaces']
  for (const row of BOUNDARY_AXIS_IMPLICATIONS) {
    lines.push(
      `${row.boundary} | ${row.axis} | ${row.implies} | ${row.surfaces.join(' · ')}`,
    )
  }
  return lines.join('\n')
}

export function formatAllLadderNotations(): string {
  const lines: string[] = [
    `# Paired-boundary ladders (${FORM_LADDER_PROFILE.id}@${FORM_LADDER_PROFILE.revision}; ${FORM_LADDER_PROFILE.status})`,
    `# included boundary kinds: ${FORM_LADDER_PROFILE.includedBoundaryKinds.join(', ')}`,
    '',
  ]
  for (const l of listBoundaryLadders()) {
    lines.push(`${l.boundary}  (${l.axes.join(', ')})`)
    lines.push(`  ${l.notation}`)
    lines.push('')
  }
  lines.push('# Operator ladders', '')
  for (const l of listOperatorLadders()) {
    lines.push(`${l.operator}  ${l.name}  → ${l.preferredBoundary}`)
    lines.push(`  ${l.notation}`)
    lines.push('')
  }
  return lines.join('\n')
}

// Backward-compatible aliases used by earlier pulse wiring
export type OperatorLadderProbe = FormLadderProbe
export function operatorLadderTable(): Array<{
  operator: OperatorKind
  name: string
  notation: string
  preferredBoundary: string
}> {
  return listOperatorLadders().map(l => ({
    operator: l.operator,
    name: l.name,
    notation: l.notation,
    preferredBoundary: l.preferredBoundary,
  }))
}

export function boundaryLadderTable(): Array<{
  boundary: BoundaryLadderId
  name: string
  notation: string
  axes: string
}> {
  return listBoundaryLadders().map(l => ({
    boundary: l.boundary,
    name: l.name,
    notation: l.notation,
    axes: l.axes.join(','),
  }))
}

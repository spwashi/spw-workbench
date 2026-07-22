import type { CouplingKind, OperatorKind } from '@spwashi/spw-seed'
import { COUPLING_DESCRIPTORS } from '@spwashi/spw-seed'
import type { RegisterDescriptor } from './types'

export const DEFAULT_REGISTER_DESCRIPTOR: RegisterDescriptor = {
  name: 'Register',
  accessMode: 'context',
  containerAffinity: 'void',
}

/**
 * Operational descriptors used by runtime and tooling.
 *
 * These labels describe implemented access and storage behavior. Interpretive
 * physical or chemical analogies belong in explicit, revisioned semantics
 * profiles rather than in this executable lookup table.
 */
export const OPERATOR_AFFINITIES = {
  '!': { name: 'Action', accessMode: 'kinetic', containerAffinity: 'void' },
  '^': { name: 'Integration', accessMode: 'structural', containerAffinity: 'promote' },
  '~': { name: 'Potential', accessMode: 'deferred', containerAffinity: 'block' },
  '?': { name: 'Wonder', accessMode: 'conditional', containerAffinity: 'conditional' },
  '*': { name: 'Value', accessMode: 'resolved', containerAffinity: 'value' },
  '=': { name: 'Set', accessMode: 'property', containerAffinity: 'property' },
  '@': { name: 'Perspective', accessMode: 'perspective', containerAffinity: 'perspective' },
  '#': { name: 'Resonance', accessMode: 'category', containerAffinity: 'category' },
  '.': { name: 'Subject', accessMode: 'property', containerAffinity: 'property' },
  '&': { name: 'Confluence', accessMode: 'confluent', containerAffinity: 'merge' },
  '$': { name: 'Substrate', accessMode: 'material', containerAffinity: 'meta' },
  '%': { name: 'Measure', accessMode: 'ratio', containerAffinity: 'scalar' },
  '<>': { name: 'Coupling', accessMode: 'relational', containerAffinity: 'relation' },
} satisfies Record<OperatorKind, RegisterDescriptor>

/**
 * Paired-boundary descriptors aligned with the structural Seed coupling table.
 *
 * Digraph `<>` is the explicit couple *Act* and is intentionally absent from
 * this boundary-only table. Open and close glyphs map to Bound kinds:
 *   []  frame
 *   {}  body
 *   < > capsule membrane (delimiters, not digraph)
 *   ()  scope
 *   << >> stream
 */
export const BOUNDARY_AFFINITIES: Record<string, RegisterDescriptor> = {
  '[': { name: 'Frame Open', accessMode: 'category', containerAffinity: 'category' },
  ']': { name: 'Frame Close', accessMode: 'category', containerAffinity: 'category' },
  '{': { name: 'Body Open', accessMode: 'property', containerAffinity: 'property' },
  '}': { name: 'Body Close', accessMode: 'property', containerAffinity: 'property' },
  '<': { name: 'Capsule Open', accessMode: 'conditional', containerAffinity: 'capsule' },
  '>': { name: 'Capsule Close', accessMode: 'conditional', containerAffinity: 'capsule' },
  '(': { name: 'Scope Open', accessMode: 'perspective', containerAffinity: 'perspective' },
  ')': { name: 'Scope Close', accessMode: 'perspective', containerAffinity: 'perspective' },
  '<<': { name: 'Stream Open', accessMode: 'conditional', containerAffinity: 'stream' },
  '>>': { name: 'Stream Close', accessMode: 'conditional', containerAffinity: 'stream' },
  '((': { name: 'NRange Open', accessMode: 'context', containerAffinity: 'stream' },
  '))': { name: 'NRange Close', accessMode: 'context', containerAffinity: 'stream' },
}

/** @deprecated "Brace" is not a stable cross-language category. */
export const BRACE_AFFINITIES = BOUNDARY_AFFINITIES

/** Map a delimiter or relation surface to its tagged coupling kind. */
export const COUPLING_KIND_BY_SURFACE: Record<string, CouplingKind> = {
  '[': 'frame',
  ']': 'frame',
  '{': 'body',
  '}': 'body',
  '(': 'scope',
  ')': 'scope',
  '<': 'capsule',
  '>': 'capsule',
  '<<': 'stream',
  '>>': 'stream',
  '((': 'nrange',
  '))': 'nrange',
  '<>': 'couple',
}

/** @deprecated Prefer COUPLING_KIND_BY_SURFACE; `<>` is not a brace. */
export const BRACE_COUPLING_KIND = COUPLING_KIND_BY_SURFACE

export function couplingKindForSurface(glyph: string): CouplingKind | undefined {
  return Object.hasOwn(COUPLING_KIND_BY_SURFACE, glyph)
    ? COUPLING_KIND_BY_SURFACE[glyph]
    : undefined
}

/** @deprecated Prefer couplingKindForSurface. */
export const couplingKindForBrace = couplingKindForSurface

export function couplingDescriptorForSurface(glyph: string) {
  const kind = couplingKindForSurface(glyph)
  return kind ? COUPLING_DESCRIPTORS[kind] : undefined
}

/** @deprecated Prefer couplingDescriptorForSurface. */
export const couplingDescriptorForBrace = couplingDescriptorForSurface

export function descriptorForKey(key: string): RegisterDescriptor {
  const operator = Object.hasOwn(OPERATOR_AFFINITIES, key)
    ? OPERATOR_AFFINITIES[key as OperatorKind]
    : undefined
  if (operator) {
    return { ...operator }
  }

  const boundary = Object.hasOwn(BOUNDARY_AFFINITIES, key)
    ? BOUNDARY_AFFINITIES[key]
    : undefined
  if (boundary) {
    return { ...boundary }
  }

  return {
    ...DEFAULT_REGISTER_DESCRIPTOR,
    name: `Register ${key}`,
  }
}

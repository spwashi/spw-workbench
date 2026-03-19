import type { OperatorKind } from '../../seed/types'
import type { RegisterDescriptor } from './types'

export const DEFAULT_REGISTER_DESCRIPTOR: RegisterDescriptor = {
  name: 'Register',
  accessMode: 'context',
  containerAffinity: 'void',
}

/**
 * Operator Periodic Table — Chemistry Commentary
 *
 * Each operator is an element with a thermodynamic descriptor.
 * The chemistry is emergent: these names arose from the code's
 * behavior patterns, not from imposed metaphor.
 *
 * @spw:axis[representation=periodic-table] - Canonical operator→element mapping
 *
 * Chemistry analogs (parallel layer, not replacement):
 *   !  Activation energy   — triggers irreversible change
 *   ^  Covalent bonding    — promotes into stable structure
 *   ~  Activation potential — energy stored, not yet released
 *   ?  Catalyst site       — lowers barrier, not consumed
 *   *  Saturation           — precipitates at value scale, dissolves at pattern scale
 *   =  Configuration       — sets the conditions of the reaction
 *   @  Observer/assay      — measures without disturbing
 *   #  Harmonic bond       — aggregation by shared frequency
 *   .  Extraction          — pull component from mixture
 *   &  Mixture             — multiple streams merging
 *   $  Substrate           — the medium the reaction occurs in
 *   %  Titration           — quantitative measurement of concentration
 *   <> Membrane            — exchange boundary (coupling, capsule, stream)
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
  '<>': { name: 'Coupling', accessMode: 'conditional', containerAffinity: 'capsule' },
} satisfies Record<OperatorKind, RegisterDescriptor>

/**
 * Brace Bond Types — Chemistry Commentary
 *
 * Four brace pairs = four bond types (fractal at every scale):
 *   []  Ionic bond       — specification of conditions (frame)
 *   {}  Covalent bond    — shared containment (body)
 *   <>  Hydrogen bond    — weak exchange / membrane (capsule)
 *   ()  Metallic bond    — delocalized perspective (scope)
 */
export const BRACE_AFFINITIES: Record<string, RegisterDescriptor> = {
  '[': { name: 'Category Brace', accessMode: 'category', containerAffinity: 'category' },
  ']': { name: 'Category Capture', accessMode: 'category', containerAffinity: 'category' },
  '{': { name: 'Property Brace', accessMode: 'property', containerAffinity: 'property' },
  '}': { name: 'Property Capture', accessMode: 'property', containerAffinity: 'property' },
  '<': { name: 'Coupling Brace', accessMode: 'conditional', containerAffinity: 'conditional' },
  '>': { name: 'Coupling Capture', accessMode: 'conditional', containerAffinity: 'conditional' },
  '(': { name: 'Perspective Brace', accessMode: 'perspective', containerAffinity: 'perspective' },
  ')': { name: 'Perspective Capture', accessMode: 'perspective', containerAffinity: 'perspective' },
}

export function descriptorForKey(key: string): RegisterDescriptor {
  const operator = OPERATOR_AFFINITIES[key as OperatorKind]
  if (operator) {
    return { ...operator }
  }

  const brace = BRACE_AFFINITIES[key]
  if (brace) {
    return { ...brace }
  }

  return {
    ...DEFAULT_REGISTER_DESCRIPTOR,
    name: `Register ${key}`,
  }
}

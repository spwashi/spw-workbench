import type { OperatorKind } from '../../seed/types'
import type { RegisterDescriptor } from './types'

export const DEFAULT_REGISTER_DESCRIPTOR: RegisterDescriptor = {
  name: 'Register',
  accessMode: 'context',
  containerAffinity: 'void',
}

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

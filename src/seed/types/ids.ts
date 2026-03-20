import { Brand, castToBrand } from './brand'

type BrandTemplateValue = string | number | boolean

/**
 * Branded Identifier Types
 *
 * Nominal types for core workbench entities. These provide type safety
 * without runtime overhead, ensuring that different ID kinds are not
 * mixed accidentally.
 */

/** A reference to an Spw Frame block. */
export type FrameId = Brand<string, 'SpwFrame'>

/** A reference to a register cell in the RegisterBank. */
export type RegisterId = Brand<string, 'SpwRegister'>

/** A reference to a domain or imprint name. */
export type DomainId = Brand<string, 'SpwDomain'>

/** A reference to a document layer or semantic facet. */
export type LayerId = Brand<string, 'SpwLayer'>

// ============================================================================
// Ergonomic Exhibits (Wonder Path)
// ============================================================================

function joinTemplate(strings: TemplateStringsArray, values: readonly BrandTemplateValue[]): string {
  let out = strings[0] ?? ''
  for (let i = 0; i < values.length; i += 1) {
    out += String(values[i]) + (strings[i + 1] ?? '')
  }
  return out
}

/** Template literal tag for Register IDs: $register`key` */
export const $register = (
  strings: TemplateStringsArray,
  ...values: BrandTemplateValue[]
): RegisterId => castToBrand<string, 'SpwRegister'>(joinTemplate(strings, values))

/** Template literal tag for Frame IDs: $frame`key` */
export const $frame = (
  strings: TemplateStringsArray,
  ...values: BrandTemplateValue[]
): FrameId => castToBrand<string, 'SpwFrame'>(joinTemplate(strings, values))

/** Template literal tag for Domain IDs: $domain`key` */
export const $domain = (
  strings: TemplateStringsArray,
  ...values: BrandTemplateValue[]
): DomainId => castToBrand<string, 'SpwDomain'>(joinTemplate(strings, values))

/** Template literal tag for Layer IDs: $layer`key` */
export const $layer = (
  strings: TemplateStringsArray,
  ...values: BrandTemplateValue[]
): LayerId => castToBrand<string, 'SpwLayer'>(joinTemplate(strings, values))

/** Identity factory for dynamic register IDs */
export const RegisterId = (key: string): RegisterId => castToBrand<string, 'SpwRegister'>(key)

/** Identity factory for dynamic frame IDs */
export const FrameId = (key: string): FrameId => castToBrand<string, 'SpwFrame'>(key)

import { Brand, castToBrand } from './brand'

type BrandTemplateValue = string | number | boolean
type BrandInput = string | TemplateStringsArray

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

function materializeBrandInput(input: BrandInput, values: readonly BrandTemplateValue[]): string {
  return typeof input === 'string' ? input : joinTemplate(input, values)
}

function createBrandTag<T extends string>() {
  return (strings: TemplateStringsArray, ...values: BrandTemplateValue[]): Brand<string, T> =>
    castToBrand<string, T>(joinTemplate(strings, values))
}

function createBrandFactory<T extends string>() {
  function brandFactory(key: string): Brand<string, T>
  function brandFactory(strings: TemplateStringsArray, ...values: BrandTemplateValue[]): Brand<string, T>
  function brandFactory(input: BrandInput, ...values: BrandTemplateValue[]): Brand<string, T> {
    return castToBrand<string, T>(materializeBrandInput(input, values))
  }
  return brandFactory
}

/** Template literal tag for Register IDs: $register`key` */
export const $register = createBrandTag<'SpwRegister'>()

/** Template literal tag for Frame IDs: $frame`key` */
export const $frame = createBrandTag<'SpwFrame'>()

/** Template literal tag for Domain IDs: $domain`key` */
export const $domain = createBrandTag<'SpwDomain'>()

/** Template literal tag for Layer IDs: $layer`key` */
export const $layer = createBrandTag<'SpwLayer'>()

/** Identity factory for dynamic register IDs */
export const RegisterId = createBrandFactory<'SpwRegister'>()

/** Identity factory for dynamic frame IDs */
export const FrameId = createBrandFactory<'SpwFrame'>()

/** Identity factory for dynamic domain IDs */
export const DomainId = createBrandFactory<'SpwDomain'>()

/** Identity factory for dynamic layer IDs */
export const LayerId = createBrandFactory<'SpwLayer'>()

import { Brand, castToBrand } from './brand'

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

/** Template literal tag for Register IDs: $register`key` */
export const $register = (s: TemplateStringsArray): RegisterId => castToBrand<string, 'SpwRegister'>(s[0])

/** Template literal tag for Frame IDs: $frame`key` */
export const $frame = (s: TemplateStringsArray): FrameId => castToBrand<string, 'SpwFrame'>(s[0])

/** Template literal tag for Domain IDs: $domain`key` */
export const $domain = (s: TemplateStringsArray): DomainId => castToBrand<string, 'SpwDomain'>(s[0])

/** Template literal tag for Layer IDs: $layer`key` */
export const $layer = (s: TemplateStringsArray): LayerId => castToBrand<string, 'SpwLayer'>(s[0])

/** Identity factory for dynamic register IDs */
export const RegisterId = (key: string): RegisterId => castToBrand<string, 'SpwRegister'>(key)

/** Identity factory for dynamic frame IDs */
export const FrameId = (key: string): FrameId => castToBrand<string, 'SpwFrame'>(key)

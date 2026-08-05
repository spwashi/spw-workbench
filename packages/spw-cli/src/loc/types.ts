/**
 * CLI localization keys — three-part dot-separated namespaces.
 *
 *   module.section.key
 *
 * module  — command or shared area (common, delta, help, lattice, …)
 * section — facet (help, meta, error, status, table, prompt)
 * key     — stable id for copy editors (header, need_paths, …)
 *
 * Not a heavy i18n framework: one default catalog + optional JSON overrides.
 * Future locales swap catalogs; keys never embed English.
 */

/** Exactly three non-empty segments joined by `.` */
export type LocKey = `${string}.${string}.${string}`

export type LocParams = Record<string, string | number | boolean | undefined | null>

export interface LocCatalog {
  /** BCP 47-ish tag; default en */
  locale: string
  /** Flat map of module.section.key → template string with {param} holes */
  messages: Record<string, string>
}

export function isLocKey(value: string): value is LocKey {
  const parts = value.split('.')
  return parts.length === 3 && parts.every(p => p.length > 0 && !p.includes(' '))
}

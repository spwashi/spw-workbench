/**
 * Light CLI localization runtime — no central string dump.
 *
 * Copy lives **in each module** via `defineLoc`:
 *
 *   const d = defineLoc('delta', {
 *     'help.summary': '…',
 *     'meta.header': '# spw delta identity={identity}',
 *   })
 *   d('help.summary')
 *   // full key: delta.help.summary
 *
 * Pattern: module.section.key (three parts). Section.key is what each file writes.
 *
 * Overrides (optional, for a copy-editing pass without code touch):
 *   SPW_LOC_FILE  or  .spw/loc/<locale>.json
 *   keys must be full module.section.key
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { isLocKey, type LocCatalog, type LocKey, type LocParams } from './types'

export type { LocCatalog, LocKey, LocParams } from './types'
export { isLocKey } from './types'

/** Registered module messages (module.section.key → template). */
const registry: Record<string, string> = Object.create(null)

let overrideMessages: Record<string, string> = Object.create(null)
let overridesLoaded = false

function interpolate(template: string, params?: LocParams): string {
  if (!params) return template
  return template.replace(/\{([A-Za-z_][\w]*)\}/g, (_, name: string) => {
    const v = params[name]
    if (v === undefined || v === null) return `{${name}}`
    return String(v)
  })
}

function tryLoadJson(filePath: string): Record<string, string> | null {
  try {
    if (!existsSync(filePath)) return null
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const out: Record<string, string> = Object.create(null)
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string' && isLocKey(k)) out[k] = v
    }
    return out
  } catch {
    return null
  }
}

/**
 * Load workspace / env overrides once per process.
 * Does not replace module defaults — only overlays matching keys.
 */
export function loadLocOverrides(
  options: { cwd?: string; locale?: string; force?: boolean } = {},
): void {
  if (overridesLoaded && !options.force) return
  const cwd = options.cwd ?? process.cwd()
  const locale = options.locale ?? process.env.SPW_LOCALE ?? 'en'
  const merged: Record<string, string> = Object.create(null)

  const fromEnv = process.env.SPW_LOC_FILE
  if (fromEnv) {
    const m = tryLoadJson(path.resolve(cwd, fromEnv))
    if (m) Object.assign(merged, m)
  }
  const fromWorkspace = tryLoadJson(path.join(cwd, '.spw', 'loc', `${locale}.json`))
  if (fromWorkspace) Object.assign(merged, fromWorkspace)

  overrideMessages = merged
  overridesLoaded = true
}

export function resetLocForTests(): void {
  // keep registry (modules re-register on import); clear overrides only
  overrideMessages = Object.create(null)
  overridesLoaded = false
}

/** Wipe registry — tests that re-import modules only. */
export function clearLocRegistryForTests(): void {
  for (const k of Object.keys(registry)) delete registry[k]
  resetLocForTests()
}

export function getLocCatalog(): LocCatalog {
  if (!overridesLoaded) loadLocOverrides()
  return {
    locale: process.env.SPW_LOCALE ?? 'en',
    messages: { ...registry, ...overrideMessages },
  }
}

/**
 * Translate a full three-part key. Missing → key (visible to editors).
 */
export function t(key: LocKey, params?: LocParams): string {
  if (!overridesLoaded) loadLocOverrides()
  const template = overrideMessages[key] ?? registry[key]
  if (template === undefined) return key
  return interpolate(template, params)
}

export type SectionKey = `${string}.${string}`

/**
 * Define copy for one module **in that module's file**.
 * `section.key` maps become `module.section.key`.
 *
 * The returned helper resolves: override → local map → registry.
 * Local map survives registry clears (tests) and keeps copy next to call sites.
 */
export function defineLoc<const M extends Record<SectionKey, string>>(
  module: string,
  messages: M,
): (key: keyof M & SectionKey, params?: LocParams) => string {
  if (!module || module.includes('.')) {
    throw new Error(`defineLoc: module must be a single segment (got ${module})`)
  }
  const local: Record<string, string> = Object.create(null)
  for (const [sectionKey, text] of Object.entries(messages)) {
    const parts = sectionKey.split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(
        `defineLoc(${module}): message key must be section.key (got ${sectionKey})`,
      )
    }
    local[sectionKey] = text
    registry[`${module}.${sectionKey}`] = text
  }

  return (sectionKey, params) => {
    if (!overridesLoaded) loadLocOverrides()
    const full = `${module}.${sectionKey}` as LocKey
    const template = overrideMessages[full] ?? local[sectionKey] ?? registry[full]
    if (template === undefined) return full
    return interpolate(template, params)
  }
}

/**
 * Assert all registered keys are well-formed three-part ids.
 */
export function validateRegistry(): string[] {
  const bad: string[] = []
  for (const k of Object.keys({ ...registry, ...overrideMessages })) {
    if (!isLocKey(k)) bad.push(k)
  }
  return bad
}

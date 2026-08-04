/**
 * Scan source for experimental / plan syntax references.
 */

import { getSyntaxCatalogEntry, type SyntaxCatalogEntry } from './syntax-catalog'

const EXP_ID_RE = /=\s*exp\s*\[\s*id\s*:\s*([a-zA-Z][a-zA-Z0-9_.]*)/g
const DIALECT_MARK_RE = /@(?:dialect|profile)\s*:\s*(Spw\.[blmxqfpt])\b|#:\s*dialect\b[^\n]*(Spw\.[blmxqfpt])\b/gi

export interface ScannedExpRef {
  id: string
  /** Character offset in source */
  offset: number
  length: number
  entry?: SyntaxCatalogEntry
}

export interface ExperimentalScan {
  expRefs: ScannedExpRef[]
  /** Unique catalog ids found (including unknown) */
  ids: string[]
  /** Dialect markers found in source text */
  dialectMarks: string[]
}

/**
 * Collect =exp[ id: … ] citations and dialect markers from source.
 */
export function scanExperimentalRefs(source: string): ExperimentalScan {
  const expRefs: ScannedExpRef[] = []
  const idSet = new Set<string>()
  const dialectMarks: string[] = []

  EXP_ID_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = EXP_ID_RE.exec(source)) !== null) {
    const id = m[1]!
    idSet.add(id)
    const idStart = m.index + m[0].lastIndexOf(id)
    expRefs.push({
      id,
      offset: idStart,
      length: id.length,
      entry: getSyntaxCatalogEntry(id),
    })
  }

  DIALECT_MARK_RE.lastIndex = 0
  while ((m = DIALECT_MARK_RE.exec(source)) !== null) {
    const raw = (m[1] ?? m[2] ?? '').replace(/^spw\./i, 'Spw.')
    if (raw) dialectMarks.push(raw.startsWith('Spw.') ? raw : `Spw.${raw}`)
  }

  return {
    expRefs,
    ids: [...idSet],
    dialectMarks: [...new Set(dialectMarks)],
  }
}

/** Resolve unique catalog entries cited in source (known ids only). */
export function resolveCitedCatalogEntries(source: string): SyntaxCatalogEntry[] {
  const { ids } = scanExperimentalRefs(source)
  return ids
    .map(id => getSyntaxCatalogEntry(id))
    .filter((e): e is SyntaxCatalogEntry => e != null)
}

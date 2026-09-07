/**
 * Resolved citation — split, classify, and (optionally) check a pathRef target.
 *
 * The parser decides what a citation *is*. This module decides how to name the
 * target so consumers do not re-split `./file.spw#anchor` with a regex.
 */

export const CITATION_RESOLVE_VERSION = 'spw.citation/1' as const

export type CitationKind = 'file' | 'route' | 'directory' | 'external' | 'malformed'

export interface ClassifiedCitation {
  version: typeof CITATION_RESOLVE_VERSION
  raw: string
  targetPath: string
  fragment: string | null
  kind: CitationKind
}

function splitFragment(raw: string): { targetPath: string; fragment: string | null } {
  const hash = raw.lastIndexOf('#')
  if (hash <= 0) return { targetPath: raw, fragment: null }
  const targetPath = raw.slice(0, hash)
  const fragment = raw.slice(hash + 1)
  return { targetPath, fragment: fragment.length > 0 ? fragment : null }
}

/** Classify a parser-extracted pathRef target. Does not touch the filesystem. */
export function classifyCitation(raw: string): ClassifiedCitation {
  const trimmed = raw.trim()
  if (!trimmed) {
    return {
      version: CITATION_RESOLVE_VERSION,
      raw,
      targetPath: '',
      fragment: null,
      kind: 'malformed',
    }
  }

  const { targetPath, fragment } = splitFragment(trimmed)
  const looksLikePath = /[A-Za-z0-9._/~]/.test(targetPath)
  if (!targetPath || targetPath.startsWith('#') || !looksLikePath) {
    return {
      version: CITATION_RESOLVE_VERSION,
      raw: trimmed,
      targetPath: looksLikePath ? targetPath : '',
      fragment,
      kind: 'malformed',
    }
  }

  let kind: CitationKind = 'file'
  if (/^[a-z][a-z0-9+.-]*:/i.test(targetPath)) kind = 'external'
  else if (targetPath.startsWith('/')) kind = 'route'
  else if (targetPath.endsWith('/')) kind = 'directory'

  return {
    version: CITATION_RESOLVE_VERSION,
    raw: trimmed,
    targetPath,
    fragment,
    kind,
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Whether `source` declares `fragment` as an addressable handle.
 * Matches the declaration forms in active use: `#>` deixis, `^"name"{`,
 * `^["name"]`, `^name[…]`, and top-level `name:` / `name =`.
 */
export function sourceDeclaresAnchor(source: string, fragment: string): boolean {
  if (!fragment) return false
  const name = escapeRegExp(fragment)
  const patterns = [
    new RegExp(`#>${name}(?:\\b|$)`),
    new RegExp(`\\^\\["${name}"\\]`),
    new RegExp(`\\^"${name}"\\s*\\{`),
    new RegExp(`\\^${name}\\[`),
    new RegExp(`(?:^|\\n)\\s*${name}\\s*[:=]`, 'm'),
  ]
  return patterns.some(pattern => pattern.test(source))
}

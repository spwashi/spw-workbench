/**
 * Spw dual-read card serialization — nested frames as groups.
 *
 * Doctrine: docs/theory/spw/representational-disclosure.spw
 *   product  → typed field material
 *   disclosure → Spw under context (this module)
 *   groups     → nested ^["name"]{…}, not // pads as semantic law
 *
 * Optional key alignment is presentation only (default off).
 */

export type SpwFacetValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly string[]

export interface SpwFacet {
  /** Apposition name without ~# prefix */
  key: string
  value: SpwFacetValue
  as?: 'flag' | 'state' | 'string' | 'path' | 'list' | 'atom' | 'raw'
}

/** Nested disclosure group — Spw frame, not a host section header. */
export interface SpwGroup {
  group: string
  parts: readonly SpwCardPart[]
}

export type SpwCardPart = SpwFacet | SpwGroup | { blank: true }

export interface FormatSpwCardOptions {
  /** Spaces per nest level (default 2). */
  indent?: number
  /** Pad ~#keys within a frame (default false — structure is the alignment). */
  align?: boolean
  maxKeyPad?: number
  /** Base indent for nested emission (internal). */
  baseIndent?: number
  /** When true, omit outer title wrapper (emit only body parts). */
  bodyOnly?: boolean
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function needsQuotes(s: string): boolean {
  if (s.length === 0) return true
  // bare numbers (counts, spans)
  if (/^-?\d+(\.\d+)?$/.test(s)) return false
  if (/^[A-Za-z_#][\w./:@+-]*$/.test(s)) return false
  // short hashes / hex ids
  if (/^[0-9a-f]{6,}$/i.test(s)) return false
  return true
}

function renderFlag(v: SpwFacetValue): string {
  if (v === true || v === 'yes') return '#yes'
  if (v === false || v === 'no') return '#no'
  if (v === 'eq' || v === 'moved' || v === 'none') return `#${v}`
  return v == null || v === '' ? '_' : String(v)
}

function renderState(v: SpwFacetValue): string {
  if (v === true || v === 'eq' || v === 'yes') return '#eq'
  if (v === false || v === 'moved' || v === 'no') return '#moved'
  if (v === 'none') return '#none'
  if (v == null || v === '') return '_'
  const s = String(v)
  return s.startsWith('#') ? s : `#${s}`
}

function renderList(items: readonly string[]): string {
  if (items.length === 0) return '#[]'
  const body = items
    .map(x => (needsQuotes(x) ? `"${escapeStr(x)}"` : x))
    .join(' ; ')
  return `#[ ${body} ]`
}

function renderValue(facet: SpwFacet): string {
  const { value, as } = facet
  if (value === null || value === undefined || value === '') return '_'

  const mode =
    as ??
    (typeof value === 'boolean'
      ? 'flag'
      : Array.isArray(value)
        ? 'list'
        : typeof value === 'number'
          ? 'atom'
          : 'atom')

  switch (mode) {
    case 'flag':
      return renderFlag(value)
    case 'state':
      return renderState(value)
    case 'path': {
      const s = String(value)
      return s === '_' ? '_' : `~"${escapeStr(s)}"`
    }
    case 'string':
      return `"${escapeStr(String(value))}"`
    case 'list':
      return renderList(Array.isArray(value) ? value : [String(value)])
    case 'raw':
      return String(value)
    case 'atom':
    default: {
      if (Array.isArray(value)) return renderList(value)
      const s = String(value)
      return needsQuotes(s) ? `"${escapeStr(s)}"` : s
    }
  }
}

function isFacet(p: SpwCardPart): p is SpwFacet {
  return 'key' in p && typeof (p as SpwFacet).key === 'string'
}

function isGroup(p: SpwCardPart): p is SpwGroup {
  return 'group' in p && typeof (p as SpwGroup).group === 'string'
}

function collectFacetKeys(parts: readonly SpwCardPart[]): string[] {
  const keys: string[] = []
  for (const p of parts) {
    if (isFacet(p)) keys.push(p.key)
  }
  return keys
}

function emitParts(
  parts: readonly SpwCardPart[],
  indentUnit: number,
  depth: number,
  align: boolean,
  maxKeyPad: number,
): string[] {
  const pad = ' '.repeat(indentUnit * depth)
  const facetKeys = collectFacetKeys(parts)
  const keyWidth = align
    ? Math.min(maxKeyPad, Math.max(0, ...facetKeys.map(k => k.length)))
    : 0
  const lines: string[] = []

  for (const part of parts) {
    if ('blank' in part && part.blank) {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('')
      continue
    }
    if (isGroup(part)) {
      lines.push(`${pad}^["${escapeStr(part.group)}"]{`)
      lines.push(...emitParts(part.parts, indentUnit, depth + 1, align, maxKeyPad))
      lines.push(`${pad}}`)
      continue
    }
    if (isFacet(part)) {
      const key = align ? part.key.padEnd(keyWidth) : part.key
      lines.push(`${pad}~#${key}: ${renderValue(part)}`)
    }
  }
  return lines
}

/**
 * Format a dual-read card. Groups become nested Spw frames.
 */
export function formatSpwCard(
  title: string,
  parts: readonly SpwCardPart[],
  options: FormatSpwCardOptions = {},
): string {
  const indentUnit = options.indent ?? 2
  const align = options.align === true
  const maxKeyPad = options.maxKeyPad ?? 16
  const base = options.baseIndent ?? 0

  if (options.bodyOnly) {
    return emitParts(parts, indentUnit, base, align, maxKeyPad).join('\n')
  }

  const pad0 = ' '.repeat(indentUnit * base)
  const lines = [
    `${pad0}^["${escapeStr(title)}"]{`,
    ...emitParts(parts, indentUnit, base + 1, align, maxKeyPad),
    `${pad0}}`,
  ]
  return lines.join('\n')
}

/** Compose several cards with a blank line between (disclosure thrift). */
export function formatSpwCards(cards: readonly string[]): string {
  return cards.filter(Boolean).join('\n\n')
}

export const facet = {
  flag: (key: string, v: boolean): SpwFacet => ({ key, value: v, as: 'flag' }),
  state: (key: string, v: 'eq' | 'moved' | boolean): SpwFacet => ({
    key,
    value: v,
    as: 'state',
  }),
  atom: (key: string, v: SpwFacetValue): SpwFacet => ({ key, value: v, as: 'atom' }),
  str: (key: string, v: string | undefined | null): SpwFacet => ({
    key,
    value: v && v.length ? v : '_',
    as: v && v.length ? 'string' : 'atom',
  }),
  path: (key: string, v: string | undefined | null): SpwFacet => ({
    key,
    value: v && v.length ? v : '_',
    as: v && v.length ? 'path' : 'atom',
  }),
  list: (key: string, items: readonly string[]): SpwFacet => ({
    key,
    value: items,
    as: 'list',
  }),
  raw: (key: string, v: string): SpwFacet => ({ key, value: v, as: 'raw' }),
  blank: (): { blank: true } => ({ blank: true }),
  group: (name: string, parts: readonly SpwCardPart[]): SpwGroup => ({
    group: name,
    parts,
  }),
}

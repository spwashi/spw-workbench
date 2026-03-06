const SEGMENT_PATTERN = /^[a-z0-9_-]+$/i
const ATTRIBUTE_KEY_PATTERN = /^[a-z0-9_-]+$/i
const ATTRIBUTE_VALUE_PATTERN = /^[a-z0-9._:-]+$/i
const TOKEN_PATTERN_SOURCE = '@spw(?::[a-z0-9_-]+)+(?:\\[[^\\]\\r\\n]+\\])?'
const MARKER_PATTERN = /^@spw(?::[a-z0-9_-]+)+(?:\[[^\]\r\n]+\])?$/i

export type SpwMarkerKind = 'family' | 'qualified'
export type SpwMarkerForm = 'plain' | 'contract'

export interface ParsedMarkerAttribute {
  key: string
  values: string[]
}

export interface ParsedSpwMarker {
  raw: string
  normalized: string
  signature: string
  family: string
  qualifiers: string[]
  segments: [string, ...string[]]
  kind: SpwMarkerKind
  form: SpwMarkerForm
  attributes: Record<string, string | string[]>
  attributeEntries: ParsedMarkerAttribute[]
}

export interface MarkerAttributeFilter {
  key: string
  value: string | null
}

export function normalizeMarkerQuery(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return ''

  const candidate = trimmed.toLowerCase().startsWith('@spw:')
    ? trimmed
    : `@spw:${trimmed}`

  const marker = parseSpwMarker(candidate)
  if (marker) {
    return marker.signature
  }

  return candidate.toLowerCase().slice('@spw:'.length)
}

export function parseMarkerAttributeFilter(value: string): MarkerAttributeFilter | null {
  const trimmed = value.trim().toLowerCase()
  if (trimmed === '') return null

  const [rawKey, rawValue] = trimmed.split('=', 2)
  const key = rawKey.trim()
  if (!ATTRIBUTE_KEY_PATTERN.test(key)) {
    return null
  }

  if (rawValue === undefined) {
    return { key, value: null }
  }

  const candidate = rawValue.trim()
  if (!ATTRIBUTE_VALUE_PATTERN.test(candidate)) {
    return null
  }

  return { key, value: candidate }
}

export function markerMatchesAttributeFilter(
  marker: Pick<ParsedSpwMarker, 'attributeEntries'>,
  filter: MarkerAttributeFilter
): boolean {
  for (const entry of marker.attributeEntries) {
    if (entry.key !== filter.key) continue
    if (filter.value === null) return true
    if (entry.values.includes(filter.value)) return true
  }

  return false
}

export function parseSpwMarker(raw: string): ParsedSpwMarker | null {
  const normalizedRaw = raw.trim().toLowerCase()
  if (!MARKER_PATTERN.test(normalizedRaw)) {
    return null
  }

  const bracketIndex = normalizedRaw.indexOf('[')
  const chainPart = bracketIndex >= 0
    ? normalizedRaw.slice(0, bracketIndex)
    : normalizedRaw
  const attributeBag = bracketIndex >= 0
    ? normalizedRaw.slice(bracketIndex + 1, -1)
    : null

  const segments = chainPart
    .slice('@spw:'.length)
    .split(':')
    .filter(Boolean)

  if (segments.length === 0 || !segments.every(segment => SEGMENT_PATTERN.test(segment))) {
    return null
  }

  const attributeEntries = attributeBag
    ? parseAttributeEntries(attributeBag)
    : []

  if (attributeBag && attributeEntries === null) {
    return null
  }

  const normalized = segments.join(':')
  const entries = attributeEntries ?? []

  return {
    raw,
    normalized,
    signature: buildSignature(normalized, entries),
    family: segments[0],
    qualifiers: segments.slice(1),
    segments: segments as [string, ...string[]],
    kind: segments.length === 1 ? 'family' : 'qualified',
    form: entries.length > 0 ? 'contract' : 'plain',
    attributes: buildAttributes(entries),
    attributeEntries: entries,
  }
}

export function extractSpwMarkers(text: string): ParsedSpwMarker[] {
  const matches = text.match(new RegExp(TOKEN_PATTERN_SOURCE, 'gi')) ?? []
  const markers: ParsedSpwMarker[] = []

  for (const match of matches) {
    const marker = parseSpwMarker(match) ?? parseFallbackMarker(match)
    if (marker) {
      markers.push(marker)
    }
  }

  return markers
}

function parseAttributeEntries(raw: string): ParsedMarkerAttribute[] | null {
  const byKey = new Map<string, Set<string>>()

  for (const segment of raw.split(',')) {
    const entry = segment.trim()
    if (entry === '') return null

    const [rawKey, rawValue] = entry.split('=', 2)
    if (rawValue === undefined) return null

    const key = rawKey.trim().toLowerCase()
    if (!ATTRIBUTE_KEY_PATTERN.test(key)) return null

    const values = rawValue
      .split('|')
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)

    if (values.length === 0 || !values.every(value => ATTRIBUTE_VALUE_PATTERN.test(value))) {
      return null
    }

    const existing = byKey.get(key) ?? new Set<string>()
    for (const value of values) {
      existing.add(value)
    }
    byKey.set(key, existing)
  }

  return [...byKey.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, values]) => ({
      key,
      values: [...values],
    }))
}

function buildAttributes(entries: ParsedMarkerAttribute[]): Record<string, string | string[]> {
  return Object.fromEntries(entries.map(entry => ([
    entry.key,
    entry.values.length === 1 ? entry.values[0] : [...entry.values],
  ])))
}

function buildSignature(normalized: string, entries: ParsedMarkerAttribute[]): string {
  if (entries.length === 0) {
    return normalized
  }

  const bag = entries
    .map(entry => `${entry.key}=${entry.values.join('|')}`)
    .join(',')

  return `${normalized}[${bag}]`
}

function parseFallbackMarker(raw: string): ParsedSpwMarker | null {
  const bracketIndex = raw.indexOf('[')
  if (bracketIndex < 0) {
    return null
  }

  return parseSpwMarker(raw.slice(0, bracketIndex))
}

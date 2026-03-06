const SEGMENT_PATTERN = /^[a-z0-9_-]+$/i
const TOKEN_PATTERN_SOURCE = '@spw(?::[a-z0-9_-]+)+'

export type SpwMarkerKind = 'family' | 'qualified'

export interface ParsedSpwMarker {
  raw: string
  normalized: string
  family: string
  qualifiers: string[]
  segments: [string, ...string[]]
  kind: SpwMarkerKind
}

export function normalizeMarkerQuery(value: string): string {
  const normalized = value.trim().toLowerCase()
  return normalized.startsWith('@spw:')
    ? normalized.slice('@spw:'.length)
    : normalized
}

export function parseSpwMarker(raw: string): ParsedSpwMarker | null {
  const normalizedRaw = raw.trim().toLowerCase()
  if (!normalizedRaw.startsWith('@spw:')) {
    return null
  }

  const segments = normalizedRaw
    .slice('@spw:'.length)
    .split(':')
    .filter(Boolean)

  if (segments.length === 0 || !segments.every(segment => SEGMENT_PATTERN.test(segment))) {
    return null
  }

  return {
    raw,
    normalized: segments.join(':'),
    family: segments[0],
    qualifiers: segments.slice(1),
    segments: segments as [string, ...string[]],
    kind: segments.length === 1 ? 'family' : 'qualified',
  }
}

export function extractSpwMarkers(text: string): ParsedSpwMarker[] {
  const matches = text.match(new RegExp(TOKEN_PATTERN_SOURCE, 'gi')) ?? []
  const markers: ParsedSpwMarker[] = []

  for (const match of matches) {
    const marker = parseSpwMarker(match)
    if (marker) {
      markers.push(marker)
    }
  }

  return markers
}

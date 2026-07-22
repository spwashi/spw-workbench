/**
 * Continuity / hold measures: title, style, subject, genre anchors
 * should reappear in composed host text when declared.
 */

export interface ContinuityReport {
  ok: boolean
  anchors_checked: number
  anchors_hit: number
  missing: string[]
  warnings: string[]
}

export type HoldKind = 'continuity' | 'style' | 'subject' | 'genre'

/** Split lock strings on | , ; or newlines. */
export function parseAnchors(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[|;,\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
}

/**
 * Collect title continuity anchors (legacy + explicit continuity field).
 */
export function collectAnchors(
  traits: Record<string, string>,
  slots: Record<string, string>,
): string[] {
  const fromField = [
    ...parseAnchors(traits.continuity),
    ...parseAnchors(slots.continuity),
    ...parseAnchors(traits.anchors),
    ...parseAnchors(slots.anchors),
  ]

  const singles: string[] = []
  for (const key of ['title', 'working_title'] as const) {
    const v = traits[key] ?? slots[key]
    if (v?.trim()) singles.push(v.trim())
  }

  return unique([...fromField, ...singles])
}

/** Style genotype phrases (style_lock). */
export function collectStyleAnchors(
  traits: Record<string, string>,
  slots: Record<string, string>,
): string[] {
  return unique([
    ...parseAnchors(traits.style_lock),
    ...parseAnchors(slots.style_lock),
    ...parseAnchors(traits.style),
    ...parseAnchors(slots.style),
  ])
}

/** Subject name + tells (subject_lock). */
export function collectSubjectAnchors(
  traits: Record<string, string>,
  slots: Record<string, string>,
): string[] {
  const singles: string[] = []
  const name = traits.subject ?? slots.subject_name ?? traits.display_name
  if (name?.trim() && !name.includes('|')) singles.push(name.trim())

  return unique([
    ...parseAnchors(traits.subject_lock),
    ...parseAnchors(slots.subject_lock),
    ...singles,
  ])
}

/** Genre promise / weather locks. */
export function collectGenreAnchors(
  traits: Record<string, string>,
  slots: Record<string, string>,
): string[] {
  return unique([
    ...parseAnchors(traits.genre_lock),
    ...parseAnchors(slots.genre_lock),
    ...parseAnchors(traits.promise),
    ...parseAnchors(traits.weather),
  ])
}

export function measureHold(
  corpus: string,
  anchors: string[],
  kind: HoldKind,
  /** Fraction of anchors that must hit (1 = all). Default all for continuity; style may use softer later. */
  minRatio = 1,
): ContinuityReport {
  const warnings: string[] = []
  if (anchors.length === 0) {
    return {
      ok: true,
      anchors_checked: 0,
      anchors_hit: 0,
      missing: [],
      warnings: [],
    }
  }

  const hay = corpus.toLowerCase()
  const missing: string[] = []
  let hit = 0
  for (const a of anchors) {
    if (hay.includes(a.toLowerCase())) hit += 1
    else missing.push(a)
  }

  const ratio = hit / anchors.length
  const ok = ratio + 1e-9 >= minRatio

  if (!ok) {
    warnings.push(
      `${kind}: missing ${missing.length}/${anchors.length} anchor(s): ${missing.slice(0, 5).join('; ')}`,
    )
  }

  return {
    ok,
    anchors_checked: anchors.length,
    anchors_hit: hit,
    missing,
    warnings,
  }
}

/** @deprecated prefer measureHold(kind='continuity') */
export function measureContinuity(corpus: string, anchors: string[]): ContinuityReport {
  return measureHold(corpus, anchors, 'continuity', 1)
}

function unique(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const k = item.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}

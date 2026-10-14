/**
 * Where a tree row points, said the way a reader looks for a file: its name
 * first, folders only where they tell two siblings apart, the rest set aside.
 *
 * A row shows what its ancestors do not: under a concept group the place is
 * the news, under a file group the concept is. A place leads with the file
 * name — `coupling-map.spw`, not `.agents/plans/caches-cut-2026-09-30/refer…`
 * cut off before the part that differs — and grows a parent folder only when
 * a sibling shares the name, as `curiosity-mutation-ergonomics/wip.spw` does.
 */

/** What a row's ancestors already say about it. */
export type RowKnown = 'concept' | 'file' | 'nothing'

/** A path split for display: the name that tells it apart, and the folder it sits in. */
export interface Place {
  name: string
  folder: string
}

/** The shortest place for one path: its parent folder and its name. */
export function shortPlace(relPath: string): string {
  const segments = relPath.split('/')
  return segments.slice(-2).join('/')
}

/**
 * For each distinct path, the shortest tail of segments no sibling shares,
 * starting from the file name, and the folder left in front of it.
 */
export function distinctPlaces(relPaths: readonly string[]): Map<string, Place> {
  const unique = [...new Set(relPaths)]
  const segments = new Map(unique.map((p) => [p, p.split('/')]))
  const places = new Map<string, Place>()
  let pending = unique
  for (let depth = 1; pending.length > 0; depth++) {
    const tail = (p: string): string => segments.get(p)!.slice(-depth).join('/')
    const counts = new Map<string, number>()
    for (const p of unique) counts.set(tail(p), (counts.get(tail(p)) ?? 0) + 1)
    pending = pending.filter((p) => {
      const parts = segments.get(p)!
      if (counts.get(tail(p)) !== 1 && depth < parts.length) return true
      places.set(p, { name: tail(p), folder: parts.slice(0, -depth).join('/') })
      return false
    })
  }
  return places
}

export interface EntryRowParts {
  /** The concept as written: `#topic`, `~#lens(living system)`. */
  concept: string
  /** The concept with no reading, so a reading can tell rows apart. */
  bareConcept: string
  /** Where it sits among its siblings, from distinctPlaces. */
  place: Place
  /** 0-based line. */
  line: number
  /** Frame path or section label, when the entry sits inside one. */
  context: string | null
}

/** Label and description for one entry row, given what its ancestors say. */
export function entryRow(parts: EntryRowParts, known: RowKnown): { label: string; description: string } {
  const at = `${parts.place.name}:${parts.line + 1}`
  const folder = parts.place.folder || null
  if (known === 'concept') {
    const reading = parts.concept === parts.bareConcept ? null : parts.concept
    return { label: at, description: [reading, parts.context, folder].filter(Boolean).join(' · ') }
  }
  if (known === 'file') {
    return { label: parts.concept, description: [parts.context, `line ${parts.line + 1}`].filter(Boolean).join(' · ') }
  }
  return { label: parts.concept, description: [at, parts.context].filter(Boolean).join(' · ') }
}

/**
 * Where a tree row points, said in as few path segments as tell it apart.
 *
 * A row shows what its ancestors do not: under a concept group the place is
 * the news, under a file group the concept is, and a path keeps only the
 * segments its siblings do not share — `curiosity-mutation-ergonomics/wip.spw`,
 * not thirteen rows that all begin `.agents/plans/` and cut off before the slug.
 */

/** What a row's ancestors already say about it. */
export type RowKnown = 'concept' | 'file' | 'nothing'

/** The shortest place for one path: its parent folder and its name. */
export function shortPlace(relPath: string): string {
  const segments = relPath.split('/')
  return segments.slice(-2).join('/')
}

/**
 * For each distinct path, the segments after the folders every sibling shares.
 * One path alone keeps its parent folder, since a bare `wip.spw` names nothing.
 */
export function distinctPlaces(relPaths: readonly string[]): Map<string, string> {
  const unique = [...new Set(relPaths)]
  const places = new Map<string, string>()
  if (unique.length === 1) {
    places.set(unique[0]!, shortPlace(unique[0]!))
    return places
  }

  const folders = unique.map((p) => p.split('/').slice(0, -1))
  let shared = 0
  while (folders.every((f) => shared < f.length && f[shared] === folders[0]![shared])) shared++

  for (const p of unique) places.set(p, p.split('/').slice(shared).join('/'))
  return places
}

export interface EntryRowParts {
  /** The concept as written: `#topic`, `~#lens(living system)`. */
  concept: string
  /** The concept with no reading, so a reading can tell rows apart. */
  bareConcept: string
  /** Where it sits among its siblings, from distinctPlaces. */
  place: string
  /** 0-based line. */
  line: number
  /** Frame path or section label, when the entry sits inside one. */
  context: string | null
}

/** Label and description for one entry row, given what its ancestors say. */
export function entryRow(parts: EntryRowParts, known: RowKnown): { label: string; description: string } {
  const at = `${parts.place}:${parts.line + 1}`
  if (known === 'concept') {
    const reading = parts.concept === parts.bareConcept ? null : parts.concept
    return { label: at, description: [reading, parts.context].filter(Boolean).join(' · ') }
  }
  if (known === 'file') {
    return { label: parts.concept, description: [parts.context, `line ${parts.line + 1}`].filter(Boolean).join(' · ') }
  }
  return { label: parts.concept, description: [parts.context, at].filter(Boolean).join(' · ') }
}

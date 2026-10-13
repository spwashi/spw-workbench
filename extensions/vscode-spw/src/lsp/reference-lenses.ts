/**
 * Which server code lenses can navigate, and where to ask for references.
 * The server sends display-only lenses (empty command); a lens whose title
 * counts references earns a peek. Everything else stays text.
 */

const REFERENCE_COUNT = /(\d+)\s+(?:file\s+)?ref(?:erence)?(?:s|\(s\))?(?![a-z])/i
const ANCHOR = /##?>([A-Za-z_][A-Za-z0-9_]*)/
const ANNOTATION = /#[!:>]?([A-Za-z_][A-Za-z0-9_]*)/

/** The reference count a lens title claims; 0 when it claims none. */
export function referenceCountFromTitle(title: string): number {
  const match = REFERENCE_COUNT.exec(title)
  return match ? Number(match[1]) : 0
}

/** True for a display-only lens whose title counts at least one reference. */
export function isNavigableReferenceLens(command: { title: string; command: string } | undefined): boolean {
  return !!command && !command.command && referenceCountFromTitle(command.title) > 0
}

/**
 * Characters on the lens line to ask for references at, in order. A lens
 * spans its whole line from column 0, but references resolve on the name
 * itself, so the anchor's name comes first and the lens start is the fallback.
 */
export function referenceLookupCharacters(lineText: string, lensCharacter: number): number[] {
  const candidates: number[] = []
  const match = ANCHOR.exec(lineText) ?? ANNOTATION.exec(lineText)
  if (match?.[1]) candidates.push(match.index + match[0].length - match[1].length)
  if (!candidates.includes(lensCharacter)) candidates.push(lensCharacter)
  return candidates
}

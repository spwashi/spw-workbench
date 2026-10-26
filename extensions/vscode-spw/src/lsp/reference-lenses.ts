/**
 * Which server code lenses can navigate, and where to ask for references.
 * A display-only lens (empty command) whose title counts references earns a
 * peek. A citation lens arrives with its own `spw.showLocations` command and
 * the sites it counts, so it needs no lookup. Everything else stays text.
 */

/** A server lens that names its own sites; arguments are (uri, position, locations), all JSON. */
export const SHOW_LOCATIONS_COMMAND = 'spw.showLocations'

export interface LensPosition { line: number; character: number }
export interface LensLocation { uri: string; range: { start: LensPosition; end: LensPosition } }

const isPosition = (value: unknown): value is LensPosition =>
  typeof value === 'object' && value !== null &&
  Number.isInteger((value as LensPosition).line) && Number.isInteger((value as LensPosition).character)

const isLocation = (value: unknown): value is LensLocation =>
  typeof value === 'object' && value !== null &&
  typeof (value as LensLocation).uri === 'string' &&
  isPosition((value as LensLocation).range?.start) && isPosition((value as LensLocation).range?.end)

/** The arguments a `spw.showLocations` lens carries, or null when they are not that shape. */
export function locationLensArguments(
  uri: unknown,
  at: unknown,
  locations: unknown,
): { uri: string; at: LensPosition; locations: LensLocation[] } | null {
  if (typeof uri !== 'string' || !isPosition(at) || !Array.isArray(locations)) return null
  if (!locations.every(isLocation)) return null
  return { uri, at, locations }
}

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

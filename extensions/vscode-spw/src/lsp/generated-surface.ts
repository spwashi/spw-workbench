/**
 * Generated surfaces as the server's lenses describe them. The Rebuild lens
 * carries what a rebuild replaces (generator, command, source), so the client
 * learns a file is generated from the lenses it already asks for, with no
 * request of its own. Kept free of `vscode` so it can be tested.
 */

/** Opens the file a lens names; one uri-string argument. */
export const OPEN_URI_COMMAND = 'spw.openUri'
/** Puts a generated file's rebuild in front of the reader; one GeneratedSurface argument. */
export const REBUILD_GENERATED_COMMAND = 'spw.rebuildGenerated'

/** Mirrors GeneratedSurface in packages/spw-lsp/src/handlers/generated-lenses.ts. */
export interface GeneratedSurface {
  generator: string
  generatorUri: string | null
  /** Typed into a terminal for the reader to run; never run by the extension. */
  command: string | null
  cwd: string
  sourceUri: string | null
  sourceLabel: string | null
}

const nullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'

export function isGeneratedSurface(value: unknown): value is GeneratedSurface {
  if (typeof value !== 'object' || value === null) return false
  const surface = value as Record<string, unknown>
  return typeof surface.generator === 'string' &&
    typeof surface.cwd === 'string' &&
    nullableString(surface.generatorUri) &&
    nullableString(surface.command) &&
    nullableString(surface.sourceUri) &&
    nullableString(surface.sourceLabel)
}

/** The surface a document's lenses describe, or null when none is a Rebuild lens. */
export function generatedSurfaceFromLenses(
  commands: ReadonlyArray<{ command: string; arguments?: unknown[] } | undefined>,
): GeneratedSurface | null {
  for (const command of commands) {
    if (command?.command !== REBUILD_GENERATED_COMMAND) continue
    const surface = command.arguments?.[0]
    if (isGeneratedSurface(surface)) return surface
  }
  return null
}

/** The warning shown the first time a generated file is edited: what it came from, and what replaces the edit. */
export function dirtyWarning(fileName: string, surface: GeneratedSurface): string {
  const from = surface.sourceLabel ? ` from ${surface.sourceLabel}` : ''
  const rebuild = surface.command ?? surface.generator
  return `${fileName} is generated${from}. An edit saved here lasts until the next rebuild (${rebuild}) replaces it.`
}

/** What the lenses last said about each open document, by uri. */
export class GeneratedSurfaces {
  private readonly byUri = new Map<string, GeneratedSurface>()

  learn(uri: string, commands: ReadonlyArray<{ command: string; arguments?: unknown[] } | undefined>): void {
    const surface = generatedSurfaceFromLenses(commands)
    if (surface) this.byUri.set(uri, surface)
    else this.byUri.delete(uri)
  }

  get(uri: string): GeneratedSurface | undefined {
    return this.byUri.get(uri)
  }
}

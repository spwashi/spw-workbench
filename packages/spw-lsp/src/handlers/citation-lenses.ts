/**
 * Citation lenses — who points at a file, and at a key inside it.
 *
 * Two counts, named apart. A citation is a path reference that resolves to
 * this file (`~"./_family.spw"`, or `~"./_family.spw#shape_1"` for a key),
 * read from the reference graph's index. A repeated name is an annotation
 * elsewhere that shares an anchor's name (`#>docs` here, `#docs` there): a
 * kinship of vocabulary, not a pointer. Each lens opens the sites it counts.
 */

import type { AnnotationEntry } from '../server-index'
import type { HandlerDeps, LspCodeLens, LspLocation, LspPosition } from '../types'
import type { CitationCount, CitationSite } from './reference-graph'

/** Shows locations in a peek; arguments are (uri, position, locations), all JSON. */
export const SHOW_LOCATIONS_COMMAND = 'spw.showLocations'

function plural(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function lensAt(
    uri: string,
    at: LspPosition,
    lineLength: number,
    title: string,
    locations: LspLocation[],
): LspCodeLens {
    return {
        range: { start: { line: at.line, character: 0 }, end: { line: at.line, character: lineLength } },
        command: { title, command: SHOW_LOCATIONS_COMMAND, arguments: [uri, at, locations] },
    }
}

function locationsOf(sites: readonly CitationSite[], deps: HandlerDeps): LspLocation[] {
    return sites.map((site) => ({ uri: deps.uriFromPath(site.file), range: site.range }))
}

/** Line 0: the files that cite this one by path, and how many citations they hold. */
export function fileCitationLens(uri: string, count: CitationCount, deps: HandlerDeps): LspCodeLens | null {
    if (count.citations === 0) return null
    const title = `↙ cited by ${plural(count.files, 'file')} · ${plural(count.citations, 'citation')}`
    return lensAt(uri, { line: 0, character: 0 }, 1, title, locationsOf(count.sites, deps))
}

/**
 * An anchor's line: citations that name its key as a fragment. The key is in
 * the title because a citation writes `#key`, not the `#>key` on the line, and
 * because a line-0 anchor shares its line with the file's own count.
 */
export function keyCitationLens(
    uri: string,
    at: LspPosition,
    lineLength: number,
    key: string,
    count: CitationCount | undefined,
    deps: HandlerDeps,
): LspCodeLens | null {
    if (!count || count.citations === 0) return null
    const title = `↙ #${key} cited by ${plural(count.files, 'file')} · ${plural(count.citations, 'citation')}`
    return lensAt(uri, at, lineLength, title, locationsOf(count.sites, deps))
}

/** An anchor's line: other files whose annotations repeat its name, whatever their sigil. */
export function nameRepeatLens(
    uri: string,
    at: LspPosition,
    lineLength: number,
    entries: readonly AnnotationEntry[],
    docPath: string,
    deps: HandlerDeps,
): LspCodeLens | null {
    const elsewhere = entries.filter((entry) => entry.file !== docPath)
    const files = new Set(elsewhere.map((entry) => entry.file)).size
    if (files === 0) return null
    const locations = elsewhere.map((entry) => ({
        uri: deps.uriFromPath(entry.file),
        range: { start: { line: entry.line, character: 0 }, end: { line: entry.line, character: 0 } },
    }))
    const title = `↗ ${plural(files, 'file')} ${files === 1 ? 'repeats' : 'repeat'} this name`
    return lensAt(uri, at, lineLength, title, locations)
}

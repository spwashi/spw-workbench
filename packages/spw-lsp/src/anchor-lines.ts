/**
 * Anchor lines — where a `~"file#anchor"` fragment lands.
 *
 * A fragment names a deixis anchor (`#>name`) inside the target surface. The
 * server already indexes every anchor it has seen, so the line is a lookup,
 * not a parse: an open buffer's own index first (an anchor typed but not yet
 * saved still lands), then the workspace scan, and a parse only for a surface
 * neither has seen. That parse is remembered per file version, so a
 * link-dense surface — a reference cut carries thousands of anchored refs —
 * pays for each unindexed target once, not once per ref per request.
 *
 * A link listing never parses (`{ parse: false }`): it runs on every open
 * and edit, and before the first workspace scan finishes a dense surface
 * would parse every target it cites. An unsettled fragment there links to
 * the file; go to definition, one ref at a time, still parses to land it.
 *
 * The index reads `#>` tokens wherever they stand, so it also sees a name
 * mentioned in prose or a stream entry; the seed binds only particles that
 * lead an expression. A name the index saw once is that anchor. A name it saw
 * more than once is settled by the seed's own deixis table, so the jump lands
 * where `resolveFragment` says, not on whichever mention came first.
 */

import { promises as fs } from 'node:fs'
import { deixisTable, parse, type ASTNode } from '@spwashi/spw-seed'
import type { AnnotationEntry } from './server-index'
import type { HandlerDeps } from './types'

/** Anchor name → 0-indexed line of its `#>` particle. */
export type AnchorLines = ReadonlyMap<string, number>

/** The line a fragment marks in a target file, or null when it dangles. */
export type AnchorLineReader = (targetPath: string, fragment: string) => Promise<number | null>

export interface AnchorLineOptions {
    /** Parse a target the index cannot settle (default true). */
    parse?: boolean
}

/** What the index can settle about one file's anchors without a parse. */
interface IndexedAnchors {
    /** Names the index saw exactly once: their line is certain. */
    lines: AnchorLines
    /** Names it saw more than once: a mention may stand before the anchor. */
    repeated: ReadonlySet<string>
}

const NO_ANCHORS: AnchorLines = new Map()

function anchorsFromIndex(entries: readonly AnnotationEntry[]): IndexedAnchors {
    const lines = new Map<string, number>()
    const repeated = new Set<string>()
    for (const entry of entries) {
        if (entry.kind !== 'anchor') continue
        if (lines.has(entry.name)) repeated.add(entry.name)
        else lines.set(entry.name, entry.line)
    }
    for (const name of repeated) lines.delete(name)
    return { lines, repeated }
}

/** Anchor lines from a parsed surface — the deixis table `resolveFragment` consults. */
function linesFromAst(ast: ASTNode): AnchorLines {
    const lines = new Map<string, number>()
    for (const [name, binding] of deixisTable(ast)) {
        // Spans are 1-indexed at the seed; LSP positions are 0-indexed.
        lines.set(name, Math.max(0, binding.particle.span.start.line - 1))
    }
    return lines
}

interface ParsedAnchors {
    mtimeMs: number
    size: number
    lines: AnchorLines
}

/**
 * Surfaces remembered at once (resolution): enough for the stray targets of
 * a whole cut, bounded so a long session cannot grow it unchecked.
 */
const PARSED_CAPACITY = 256
const parsedByPath = new Map<string, ParsedAnchors>()

function remember(targetPath: string, entry: ParsedAnchors): void {
    parsedByPath.delete(targetPath)
    if (parsedByPath.size >= PARSED_CAPACITY) {
        const oldest = parsedByPath.keys().next().value
        if (oldest !== undefined) parsedByPath.delete(oldest)
    }
    parsedByPath.set(targetPath, entry)
}

/**
 * Parse a closed target from disk, keyed by (path, mtime, size). The text
 * and the key come from the same file, so a closed buffer whose edits were
 * discarded can never answer for it; a hit moves the entry to the back of
 * the eviction order.
 */
async function parsedAnchorLines(targetPath: string): Promise<AnchorLines> {
    const stat = await fs.stat(targetPath).catch(() => null)
    if (!stat || stat.isDirectory()) return NO_ANCHORS

    const memo = parsedByPath.get(targetPath)
    if (memo && memo.mtimeMs === stat.mtimeMs && memo.size === stat.size) {
        remember(targetPath, memo)
        return memo.lines
    }

    const text = await fs.readFile(targetPath, 'utf8').catch(() => null)
    if (text === null) return NO_ANCHORS

    const ast = parse(text).ast
    const lines = ast ? linesFromAst(ast) : NO_ANCHORS
    remember(targetPath, { mtimeMs: stat.mtimeMs, size: stat.size, lines })
    return lines
}

/**
 * Only a buffer open right now outranks the workspace index: a closed
 * document keeps whatever text it held at close (edits discarded or not),
 * while the index follows the saved file through save and watch events.
 * Looked up without `getDocument`, which would refresh a closed buffer's
 * access epoch on every link to it and keep it from ever aging out.
 */
function openBuffer(targetPath: string, deps: HandlerDeps) {
    const doc = deps.serverIndex.allDocuments().get(deps.uriFromPath(targetPath))
    return doc?.tier === 'hot' ? doc : null
}

/** The index's view of a target, or null when it has none to offer. */
function indexedAnchors(targetPath: string, deps: HandlerDeps): IndexedAnchors | null {
    const open = openBuffer(targetPath, deps)
    if (open) return anchorsFromIndex(open.annotations)

    // A file the scan reached but that declares no annotations at all looks
    // the same as one it never reached; both are read by the seed instead.
    const indexed = deps.serverIndex.annotationsForFile(targetPath)
    return indexed.length > 0 ? anchorsFromIndex(indexed) : null
}

/**
 * The seed's deixis table: an open buffer's existing parse, else a
 * remembered or fresh parse of the saved file when parsing is allowed.
 */
async function seedAnchorLines(targetPath: string, deps: HandlerDeps, mayParse: boolean): Promise<AnchorLines> {
    const open = openBuffer(targetPath, deps)
    if (open) {
        const ast = open.parseResult?.ast
        return ast ? linesFromAst(ast) : NO_ANCHORS
    }
    return mayParse ? parsedAnchorLines(targetPath) : NO_ANCHORS
}

/**
 * A reader for one request: each target is looked up once, however many refs
 * in the request point into it, and read by the seed only when the index
 * cannot settle the name.
 */
export function anchorLineReader(deps: HandlerDeps, options: AnchorLineOptions = {}): AnchorLineReader {
    const mayParse = options.parse ?? true
    const views = new Map<string, IndexedAnchors | null>()
    const seeded = new Map<string, Promise<AnchorLines>>()
    return async (targetPath, fragment) => {
        let view = views.get(targetPath)
        if (view === undefined) {
            view = indexedAnchors(targetPath, deps)
            views.set(targetPath, view)
        }
        if (view && !view.repeated.has(fragment)) return view.lines.get(fragment) ?? null

        let table = seeded.get(targetPath)
        if (!table) {
            table = seedAnchorLines(targetPath, deps, mayParse).catch(() => NO_ANCHORS)
            seeded.set(targetPath, table)
        }
        return (await table).get(fragment) ?? null
    }
}

/** Forget every remembered parse, so a test starts from a cold memo. */
export function clearParsedAnchorLines(): void {
    parsedByPath.clear()
}

/**
 * Generated-surface lenses — a projection says what it was read from and how
 * it is rebuilt, and each of those lenses acts.
 *
 * The projection registry (`^projection[name]` in .spw/gen/index.spw) names a
 * generator and a spec owner per root, but the page a file was read from is
 * per file: a route tree cites it as `@page`. That citation goes through the
 * resolver Ctrl+Click uses; the registry's `source` is the fallback when it
 * names a file. Commands are client commands with JSON arguments, so a host
 * that does not know them leaves the lens as text.
 */

import path from 'node:path'
import { statKind } from '../helpers'
import type { DocumentState } from '../server-index'
import type { HandlerDeps, LspCodeLens } from '../types'

/** Opens the file a lens names; its one argument is a uri string. */
export const OPEN_URI_COMMAND = 'spw.openUri'
/** Puts the rebuild in front of the reader; its one argument is a GeneratedSurface. */
export const REBUILD_GENERATED_COMMAND = 'spw.rebuildGenerated'

/** What a client needs to rebuild a generated file and say what a rebuild replaces. */
export interface GeneratedSurface {
    /** The generator as the registry names it, workspace-relative. */
    generator: string
    /** The generator file, when it exists; a client opens it when no command is named. */
    generatorUri: string | null
    /** The command the registry's status names (`rebuilt by <command>`), typed for the reader, never run. */
    command: string | null
    /** Where the command runs: the workspace root. */
    cwd: string
    /** The file this one was read from, when it resolves. */
    sourceUri: string | null
    sourceLabel: string | null
}

const PAGE_BINDING = /^\s*@page\s*:/
const REBUILT_BY = /^rebuilt by\s+(.+?)\s*$/i

/**
 * A short name for a file: its own name, and its folder's when the name is an
 * `index.*` that every sibling page shares.
 */
function fileLabel(filePath: string): string {
    const base = path.basename(filePath)
    return /^index\./.test(base) ? `${path.basename(path.dirname(filePath))}/${base}` : base
}

function lineZero(title: string, command = '', args?: unknown[]): LspCodeLens {
    return {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        command: args ? { title, command, arguments: args } : { title, command },
    }
}

/** The file a generated surface was read from: its own `@page` citation, else the registry's source. */
async function sourceOf(doc: DocumentState, registrySource: string | undefined, deps: HandlerDeps): Promise<string | null> {
    const lines = doc.text.split('\n')
    const page = doc.selectorHits.find((hit) => PAGE_BINDING.test(lines[hit.span.startLine] ?? ''))
    if (page) {
        const resolved = await deps.resolveReferencePath(page, doc.text, doc.filePath)
        if (resolved && await statKind(resolved) === 'file') return resolved
    }
    if (registrySource) {
        const candidate = path.resolve(deps.workspaceRoot, registrySource)
        if (await statKind(candidate) === 'file') return candidate
    }
    return null
}

/**
 * Line-0 lenses for a generated surface: the hand-edit warning, then Open
 * source, Rebuild, and the spec that owns the projection. Empty for a file
 * that is neither under .spw/gen/ nor inside a registered projection root.
 */
export async function generatedLenses(doc: DocumentState, deps: HandlerDeps): Promise<LspCodeLens[]> {
    const isGenerated = deps.serverIndex.isGeneratedFile(doc.filePath)
    const proj = deps.serverIndex.getProjectionForFile(doc.filePath)
    if (!isGenerated && !proj) return []

    const lenses: LspCodeLens[] = []
    if (isGenerated) lenses.push(lineZero('⚠ generated surface — do not hand-edit'))

    const source = await sourceOf(doc, proj?.source, deps)
    const sourceUri = source ? deps.uriFromPath(source) : null
    const sourceLabel = source ? fileLabel(source) : null
    if (sourceUri) lenses.push(lineZero(`← open source: ${sourceLabel}`, OPEN_URI_COMMAND, [sourceUri]))

    if (proj?.generatorOwner) {
        const generatorPath = path.resolve(deps.workspaceRoot, proj.generatorOwner)
        const surface: GeneratedSurface = {
            generator: proj.generatorOwner,
            generatorUri: await statKind(generatorPath) === 'file' ? deps.uriFromPath(generatorPath) : null,
            command: REBUILT_BY.exec(proj.status)?.[1] ?? null,
            cwd: deps.workspaceRoot,
            sourceUri,
            sourceLabel,
        }
        lenses.push(lineZero(`↻ rebuild: ${path.basename(proj.generatorOwner)}`, REBUILD_GENERATED_COMMAND, [surface]))
    }

    if (proj?.specOwner) {
        // The spec declares the projection's shape; it is not what this file was read from.
        const specPath = path.resolve(deps.workspaceRoot, proj.specOwner.replace(/^\.\//, ''))
        const title = `← spec: ${path.relative(deps.workspaceRoot, specPath)}`
        lenses.push(await statKind(specPath) === 'file'
            ? lineZero(title, OPEN_URI_COMMAND, [deps.uriFromPath(specPath)])
            : lineZero(title))
    }

    return lenses
}

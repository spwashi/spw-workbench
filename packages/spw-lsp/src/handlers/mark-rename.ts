/**
 * Mark rename by token — a mark renames only marks of its kind and name.
 *
 * The lexer already tells a tag (#name), an anchor (#>name), a lens (#:name),
 * a focus (#!name) and an annotation (~#name) apart, and keeps strings and
 * comments whole, so a rename that matches tokens cannot reach into prose,
 * into a hyphenated sibling (#name-more is one name token), or into a mark of
 * another kind, or into a fragment written against a name (@page#name), or
 * into a plan's stream entries (lines that open with >>[date]), which record
 * what was said on their day and keep the words they were written in. It
 * lexes rather than parses, so a surface that falls back to prose is renamed
 * too; the one blind spot is a mark on the same line after an unpaired quote,
 * which the lexer reads as part of the string.
 *
 * An anchor belongs to its file: renaming #>name edits the declaring file and
 * the citations (~"path#name") that resolve to it. Lenses, foci, annotations
 * and tags are shared words, renamed wherever they appear.
 *
 * @see packages/spw-seed/src/canonical/semantic-edit.ts renameParticle, renameMark — the AST rules spw refactor plans with
 */

import path from 'node:path'
import { lex, offsetToPosition, type Token } from '@spwashi/spw-seed'
import { fragmentOf, stripAnchor } from '../helpers'
import { selectPathRefs } from '../spw-selector'
import type { HandlerDeps, LspTextEdit } from '../types'

export type MarkKind = 'tag' | 'anchor' | 'lens' | 'focus' | 'annotation'

/** A mark's kind, its name, and the source offsets of the name alone. */
export interface MarkAt {
    kind: MarkKind
    name: string
    start: number
    end: number
}

const PARTICLE_KINDS: Record<string, MarkKind> = { '>': 'anchor', ':': 'lens', '!': 'focus' }
/** Tokens a # written directly after makes a fragment of. */
const FRAGMENT_HOSTS = new Set(['IDENTIFIER', 'NUMBER', 'STRING'])
const SCAN_CONCURRENCY = 16

function tokensOf(source: string): readonly Token[] {
    try {
        return lex(source, { eventPolicy: 'none' }).tokens
    } catch {
        return []
    }
}

/** Every mark in a source, in order. */
export function marksIn(source: string): MarkAt[] {
    const tokens = tokensOf(source)
    const marks: MarkAt[] = []
    let lineStarted = false
    let inEntry = false
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const start = token.span.start.offset
        const end = token.span.end.offset
        // The lexer folds line breaks into whitespace tokens.
        if (token.type === 'WHITESPACE' && token.value.includes('\n')) {
            lineStarted = false
            inEntry = false
            continue
        }
        if (token.type === 'WHITESPACE') continue
        if (!lineStarted) {
            lineStarted = true
            inEntry = token.type === 'STREAM_CLOSE' && token.value === '>>'
        }
        if (inEntry) continue
        if (token.type === 'PARTICLE') {
            const kind = PARTICLE_KINDS[(token as { kind?: string }).kind ?? '']
            if (kind && token.value.length > 2) marks.push({ kind, name: token.value.slice(2), start: start + 2, end })
        } else if (token.type === 'ANNOTATION' && token.value.startsWith('~#') && token.value.length > 2) {
            marks.push({ kind: 'annotation', name: token.value.slice(2), start: start + 2, end })
        } else if (token.type === 'IDENTIFIER') {
            const hash = tokens[i - 1]
            if (hash?.type !== 'OPERATOR' || hash.value !== '#' || hash.span.end.offset !== start) continue
            // A # written against a name (@page#foo, file#foo) is that name's fragment, not a tag.
            const glued = tokens[i - 2]
            if (glued && glued.span.end.offset === hash.span.start.offset && FRAGMENT_HOSTS.has(glued.type)) continue
            marks.push({ kind: 'tag', name: token.value, start, end })
        }
    }
    return marks
}

/** The mark whose name holds the offset, or null. */
export function markAt(source: string, offset: number): MarkAt | null {
    return marksIn(source).find(mark => offset >= mark.start && offset < mark.end) ?? null
}

/** The offset of a 0-based line and character. */
export function offsetOf(source: string, line: number, character: number): number {
    let offset = 0
    for (let i = 0; i < line; i++) {
        const next = source.indexOf('\n', offset)
        if (next < 0) return source.length
        offset = next + 1
    }
    return Math.min(offset + character, source.length)
}

/**
 * The workspace edits that rename `mark` to `newName`, keyed by document uri.
 * `uri` is the document the rename was asked from.
 */
export async function markRenameEdits(
    mark: MarkAt,
    newName: string,
    uri: string,
    deps: HandlerDeps,
): Promise<Record<string, LspTextEdit[]>> {
    const changes: Record<string, LspTextEdit[]> = {}
    const add = (fileUri: string, source: string, start: number, end: number): void => {
        if (!changes[fileUri]) changes[fileUri] = []
        changes[fileUri].push({
            range: { start: offsetToPosition(source, start), end: offsetToPosition(source, end) },
            newText: newName,
        })
    }
    const same = (other: MarkAt): boolean => other.kind === mark.kind && other.name === mark.name
    const files = await deps.getWorkspaceSpwFiles()

    if (mark.kind === 'anchor') {
        const source = await deps.getDocumentText(uri)
        const declaring = deps.pathFromUri(uri)
        if (source === null || !declaring) return changes
        for (const other of marksIn(source)) if (same(other)) add(uri, source, other.start, other.end)

        const declaringPath = path.resolve(declaring)
        await deps.mapWithConcurrency(files, SCAN_CONCURRENCY, async (filePath: string) => {
            const fileUri = deps.uriFromPath(filePath)
            const text = await deps.getDocumentText(fileUri)
            if (text === null || !text.includes(`#${mark.name}`)) return
            for (const hit of selectPathRefs(text)) {
                if (fragmentOf(hit.target) !== mark.name) continue
                const hash = hit.raw.indexOf(`#${mark.name}`)
                if (hash < 0) continue
                const resolved = await deps.resolveReferencePath(hit, text, filePath)
                // The resolver hands back the path with its #fragment still on it.
                if (!resolved || path.resolve(stripAnchor(resolved)) !== declaringPath) continue
                const start = hit.span.startOffset + hash + 1
                add(fileUri, text, start, start + mark.name.length)
            }
        })
        return changes
    }

    await deps.mapWithConcurrency(files, SCAN_CONCURRENCY, async (filePath: string) => {
        const fileUri = deps.uriFromPath(filePath)
        const text = await deps.getDocumentText(fileUri)
        if (text === null || !text.includes(mark.name)) return
        for (const other of marksIn(text)) if (same(other)) add(fileUri, text, other.start, other.end)
    })
    return changes
}

/**
 * Handles in prose — a `@name` the file declares, written inside a quoted or
 * backtick string, follows its declaration.
 *
 * A declaration is `@name:` bound to a citation the parser reads, the
 * `@expression_query: ~"…/expression-query.js"` line of a roots frame or a
 * plan's preamble. The citation is one of the document's selector hits, so the
 * handle links where that hit links and no second scanner decides what a
 * declaration is. A handle is read only inside STRING and PHRASE tokens, from
 * the document text itself, so escapes, quotes and multi-line backticks keep
 * their offsets.
 *
 * Narrow on purpose (citation-navigation ~[refs_outside_strings]): only a
 * handle this file declares counts, and never one followed by `/` or `#` — a
 * root with a path or an anchor inside a string stays text. A use is a link
 * and a hover, never a diagnostic, a selector hit, a graph edge or path color.
 *
 * @see ./navigation.ts — the link and definition a use shares with its declaration
 * @see ./display.ts — the hover chain step that answers with the declaration
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Token } from '@spwashi/spw-seed'
import type { SpwSelectorHit } from '../spw-selector'
import type { LspPosition, LspRange } from '../types'
import { statKind } from '../helpers'
import { codeSpan } from './wonder'

export interface HandleDeclaration {
    name: string
    /** 0-based line of the declaration's `@`. */
    line: number
    /** The citation the handle is bound to: the hit its own document link follows. */
    hit: SpwSelectorHit
    /** `@name: ~"…"` as written. */
    written: string
}

export interface ProseHandle {
    name: string
    range: LspRange
    declaration: HandleDeclaration
}

/** Token kinds whose inside is prose a handle may be named in. */
const PROSE_TOKENS = new Set(['STRING', 'PHRASE'])

/** `@name:` ending right where a citation begins. The name charset is parseRoots'. */
const DECLARATION_TAIL = /(?:^|[^\w@\\])@([A-Za-z_][\w-]*)[ \t]*:[ \t]*$/

/**
 * A handle run in prose. Not after a word character (an email address), another
 * `@`, a backslash, a slash or a dot (a path or an accessor).
 */
const HANDLE_RUN = /(?<![\w@\\/.])@([A-Za-z_][\w-]*)/g

/** What may follow a name and still leave it a handle: not a path, an anchor or a dotted word. */
function endsAsHandle(source: string, end: number): boolean {
    const next = source[end]
    if (next === '/' || next === '#') return false
    if (next === '.' && /\w/.test(source[end + 1] ?? '')) return false
    return true
}

function lineStarts(text: string): number[] {
    const starts = [0]
    for (let i = 0; i < text.length; i += 1) {
        if (text[i] === '\n') starts.push(i + 1)
    }
    return starts
}

function positionAt(starts: number[], offset: number): LspPosition {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (starts[mid] <= offset) lo = mid
        else hi = mid - 1
    }
    return { line: lo, character: offset - starts[lo] }
}

/**
 * The handles this file declares, read off its own citations: each hit the
 * parser vouches for that sits right after `@name:` on its line. A later
 * declaration of the same name wins, as it does in parseRoots.
 */
export function declaredHandles(source: string, hits: readonly SpwSelectorHit[]): Map<string, HandleDeclaration> {
    const declared = new Map<string, HandleDeclaration>()
    for (const hit of hits) {
        if (hit.recovered) continue
        const lineStart = source.lastIndexOf('\n', hit.span.startOffset - 1) + 1
        const before = source.slice(lineStart, hit.span.startOffset)
        const match = DECLARATION_TAIL.exec(before)
        if (!match) continue
        const name = match[1].replace(/-+$/, '')
        if (!name) continue
        const at = lineStart + before.lastIndexOf(`@${match[1]}`)
        declared.set(name, {
            name,
            line: hit.span.startLine,
            hit,
            written: source.slice(at, hit.span.endOffset),
        })
    }
    return declared
}

/**
 * Every use of a declared handle inside a string or backtick phrase, in source
 * order. `tokens` must carry document offsets (sourceTokens gives them). A
 * string that is itself a citation's path is not prose and is skipped.
 */
export function proseHandles(
    source: string,
    hits: readonly SpwSelectorHit[],
    tokensOf: () => readonly Token[],
): ProseHandle[] {
    const declared = declaredHandles(source, hits)
    if (declared.size === 0) return []

    const starts = lineStarts(source)
    const uses: ProseHandle[] = []
    for (const token of tokensOf()) {
        if (!PROSE_TOKENS.has(token.type)) continue
        const start = token.span.start.offset
        const end = token.span.end.offset
        const body = source.slice(start, end)
        if (!body.includes('@')) continue
        if (hits.some((hit) => hit.span.startOffset < end && start < hit.span.endOffset)) continue

        for (const match of body.matchAll(HANDLE_RUN)) {
            const name = match[1].replace(/-+$/, '')
            const declaration = declared.get(name)
            if (!declaration) continue
            const at = start + (match.index ?? 0)
            const after = at + 1 + name.length
            if (!endsAsHandle(source, after)) continue
            uses.push({
                name,
                range: { start: positionAt(starts, at), end: positionAt(starts, after) },
                declaration,
            })
        }
    }
    return uses
}

/** The declared handle under the caret inside a string, if any. */
export function proseHandleAt(
    source: string,
    position: LspPosition,
    hitsOf: () => readonly SpwSelectorHit[],
    tokensOf: () => readonly Token[],
): ProseHandle | null {
    const line = source.split('\n', position.line + 1)[position.line] ?? ''
    if (!line.includes('@')) return null
    return proseHandles(source, hitsOf(), tokensOf).find(({ range }) =>
        range.start.line === position.line
        && position.character >= range.start.character
        && position.character < range.end.character,
    ) ?? null
}

// ── Hover ───────────────────────────────────────────────────────

/** Characters of a target's first line a hover shows before it trails off. */
const FIRST_LINE_LIMIT = 120

/** Comment leaders stripped before a line counts as meaning something. */
const COMMENT_LEADER = /^(?:\/\*\*?|\*\/?|\/\/+|#+(?=\s)|<!--)\s*/

/** The first line of a file that says something once comment marks are stripped. */
async function firstMeaningfulLine(filePath: string): Promise<string | null> {
    let text: string
    try {
        text = await fs.readFile(filePath, 'utf8')
    } catch {
        return null
    }
    for (const raw of text.split('\n', 40)) {
        const line = raw.trim().replace(COMMENT_LEADER, '').replace(/\s*(?:\*\/|-->)$/, '').trim()
        if (!line) continue
        return line.length > FIRST_LINE_LIMIT ? `${line.slice(0, FIRST_LINE_LIMIT - 1)}…` : line
    }
    return null
}

/**
 * The declaration's answer for a handle named in prose: where it goes, the
 * line that declares it, and the target's first meaningful line. `target` is
 * the declaration's citation resolved as its document link resolves it, or
 * null when it does not resolve.
 */
export async function proseHandleHover(
    handle: ProseHandle,
    target: string | null,
    workspaceRoot: string,
): Promise<string> {
    const { declaration } = handle
    const parts: string[] = []
    const kind = target ? await statKind(target) : null
    if (target) {
        const rel = path.relative(workspaceRoot, target) || path.basename(target)
        parts.push(`**\`@${handle.name}\`** → ${codeSpan(kind === 'dir' ? `${rel}/` : rel)}`)
    } else {
        parts.push(`**\`@${handle.name}\`** → ${codeSpan(declaration.hit.target)} — *not found*`)
    }
    parts.push(`Declared on line ${declaration.line + 1}: ${codeSpan(declaration.written)}`)
    if (target && kind === 'file') {
        const first = await firstMeaningfulLine(target)
        if (first) parts.push(`> ${codeSpan(first)}`)
    }
    return parts.join('\n\n')
}

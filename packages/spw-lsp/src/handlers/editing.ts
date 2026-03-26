/**
 * Editing Handlers — completion + formatting
 *
 * Content authoring assistance: sigil completion, @-root completion,
 * annotation completion, file-system path completion, and document formatting.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { SIGIL_SEMANTICS } from '../server-index'
import type {
    LspCompletionItem, LspTextEdit, LspPosition,
    CompletionParams, DocumentFormattingParams, CodeActionParams, LspCodeAction,
    HandlerDeps,
} from '../types'
import { CK } from '../types'

// ── Completion ──────────────────────────────────────────────────

export async function completion(params: CompletionParams, deps: HandlerDeps): Promise<LspCompletionItem[]> {
    const uri = params?.textDocument?.uri
    const pos = params?.position as LspPosition | undefined
    if (!uri || !pos) return []

    const source = await deps.getDocumentText(uri)
    if (source === null) return []

    const line = source.split('\n')[pos.line] ?? ''
    const prefix = line.slice(0, pos.character)
    const items: LspCompletionItem[] = []

    // 1. @-root completion
    if (prefix.endsWith('@')) {
        const roots = deps.mergeRoots(source, path.dirname(deps.pathFromUri(uri) || deps.workspaceRoot))
        for (const [name, resolved] of Object.entries(roots)) {
            if (name === 'here' || name === 'repo') continue
            items.push({
                label: name,
                kind: CK.Folder,
                detail: path.relative(deps.workspaceRoot, resolved),
                sortText: `0-${name}`,
            })
        }
        return items
    }

    // 2. Annotation name completion after #, #:, #!, #>
    const annotPrefix = prefix.match(/(?:##>|#!|#:|#>|#)([a-zA-Z_]\w*)$/)
    if (annotPrefix) {
        const partial = annotPrefix[1].toLowerCase()
        const names = deps.serverIndex.allAnnotationNames()
        for (const name of names) {
            if (!name.toLowerCase().startsWith(partial)) continue
            const entries = deps.serverIndex.lookupAnnotation(name)
            const fileCount = new Set(entries.map(e => e.file)).size
            items.push({
                label: name,
                kind: CK.Reference,
                detail: `${fileCount} file(s)`,
                sortText: `0-${name}`,
            })
        }
        return items
    }

    // 3. Sigil keyword completions
    const sigilPrefixMatch = /(?:^|\s)([\^!@&*?~#=%.$])$/.exec(prefix)
    if (sigilPrefixMatch) {
        const sigil = sigilPrefixMatch[1]
        const sem = SIGIL_SEMANTICS[sigil]
        if (sem) {
            const sigilSnippets: Record<string, Array<{ label: string; insert: string }>> = {
                '^': [
                    { label: '^["section"] {', insert: '^["${1:section}"] {\n\t$0\n}' },
                    { label: '^seed[name]', insert: '^seed[${1:name}]' },
                    { label: '^selector[name]', insert: '^selector[${1:name}]' },
                ],
                '!': [
                    { label: '!boon["label"]', insert: '!boon["${1:label}"]' },
                    { label: '!bone["label"]', insert: '!bone["${1:label}"]' },
                    { label: '!bonk["label"]', insert: '!bonk["${1:label}"]' },
                ],
                '#': [
                    { label: '##>prompt_root', insert: '##>${1:prompt_root}' },
                    { label: '#>anchor', insert: '#>${1:anchor}' },
                    { label: '#:lens', insert: '#:${1:lens}' },
                    { label: '#!intent', insert: '#!${1:intent}' },
                ],
                '@': [],
                '?': [
                    { label: '?["question"]', insert: '?["${1:question}"]' },
                    { label: '?match', insert: '?match' },
                ],
                '~': [
                    { label: '~#trait: value', insert: '~#${1:trait}: ${2:value}' },
                    { label: '~"path/to/file"', insert: '~"${1:path}"' },
                    { label: '~[N]', insert: '~[${1:N}]' },
                ],
                '&': [
                    { label: '&[label]', insert: '&[${1:label}]' },
                    { label: '&name', insert: '&${1:name}' },
                ],
                '%': [
                    { label: '%[measure.path]', insert: '%[${1:measure.path}]' },
                ],
                '*': [
                    { label: '*variant', insert: '*${1:variant}' },
                ],
                '$': [
                    { label: '$["selector"]', insert: '$["${1:selector}"]' },
                    { label: '$^["frame"]', insert: '$^["${1:frame}"]' },
                    { label: '$%[register.path]', insert: '$%[${1:register.path}]' },
                ],
                '=': [
                    { label: '=raw: "value"', insert: '=raw: "${1:value}"' },
                    { label: '=config', insert: '=${1:key}: ${2:value}' },
                ],
            }
            const snippets = sigilSnippets[sigil] ?? []
            for (const s of snippets) {
                items.push({
                    label: s.label,
                    kind: CK.Keyword,
                    detail: `${sem.role} — ${sem.physics}`,
                    insertText: s.insert,
                    insertTextFormat: 2, // Snippet
                    sortText: `0-${s.label}`,
                })
            }
            if (snippets.length > 0) return items
        }
    }

    // 4. File-system completion for ~"../" and @root/
    const fsMatch = /(?:~"((?:\.\.?\/)+)|@([A-Za-z_]\w*)\/)([^"]*)$/.exec(prefix)
    if (fsMatch) {
        let searchDir: string | undefined
        if (fsMatch[1]) {
            searchDir = path.resolve(path.dirname(deps.pathFromUri(uri) || ''), fsMatch[1])
        } else if (fsMatch[2]) {
            const roots = deps.mergeRoots(source, path.dirname(deps.pathFromUri(uri) || deps.workspaceRoot))
            searchDir = roots[fsMatch[2]]
        }

        if (searchDir) {
            const subPath = fsMatch[3] || ''
            const fullDir = subPath ? path.resolve(searchDir, subPath.replace(/[^/]*$/, '')) : searchDir

            try {
                const entries = await fs.readdir(fullDir, { withFileTypes: true })
                for (const entry of entries) {
                    if (entry.name.startsWith('.')) continue
                    const isDir = entry.isDirectory()
                    items.push({
                        label: entry.name,
                        kind: isDir ? CK.Folder : CK.File,
                        insertText: isDir ? `${entry.name}/` : entry.name,
                        sortText: isDir ? `0-${entry.name}` : `1-${entry.name}`,
                    })
                }
            } catch {
                // directory unreadable
            }
        }
    }

    return items
}

// ── Formatting ──────────────────────────────────────────────────

export function formatting(params: DocumentFormattingParams, deps: HandlerDeps): LspTextEdit[] {
    const uri = params?.textDocument?.uri
    if (!uri) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const formatted = deps.serverIndex.formatDocument(doc.text)
    if (formatted === doc.text) return []

    const lines = doc.text.split('\n')
    return [{
        range: {
            start: { line: 0, character: 0 },
            end: { line: lines.length - 1, character: lines[lines.length - 1].length },
        },
        newText: formatted,
    }]
}

// ── Code Actions ────────────────────────────────────────────────

export async function codeAction(params: CodeActionParams, deps: HandlerDeps): Promise<LspCodeAction[]> {
    const uri = params?.textDocument?.uri
    const range = params?.range
    if (!uri || !range) return []

    const doc = deps.serverIndex.getDocument(uri)
    if (!doc) return []

    const lines = doc.text.split('\n')
    const actions: LspCodeAction[] = []

    for (let i = range.start.line; i <= range.end.line; i++) {
        const line = lines[i]
        if (line === undefined) continue

        // Toggle Concise Trait -> Lexical Binding (~#key: value -> .{ key = value })
        const traitMatch = line.match(/^(\s*)~#([a-zA-Z0-9_]+):\s*(.+)$/)
        if (traitMatch) {
            const indent = traitMatch[1]
            const key = traitMatch[2]
            const value = traitMatch[3]
            actions.push({
                title: `Expand to Lexical Binding (.{ ${key} = ... })`,
                kind: 'refactor.rewrite',
                edit: {
                    changes: {
                        [uri]: [{
                            range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                            newText: `${indent}.{ ${key} = ${value} }`
                        }]
                    }
                }
            })
        }

        // Toggle Lexical Binding -> Concise Trait (.{ key = value } -> ~#key: value)
        const factMatch = line.match(/^(\s*)\.\{\s*([a-zA-Z0-9_]+)\s*=\s*(.+)\s*\}$/)
        if (factMatch && !factMatch[3].includes(',')) {
            const indent = factMatch[1]
            const key = factMatch[2]
            // trailing space in value should be stripped out for concise form
            let value = factMatch[3].trim()
            if (value.endsWith('}')) {
                // Should already be handled by the factMatch regex since the } is consumed
                value = value.replace(/\s*\}$/, '')
            }
            actions.push({
                title: `Toggle Concise Trait (~#${key})`,
                kind: 'refactor.rewrite',
                edit: {
                    changes: {
                        [uri]: [{
                            range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
                            newText: `${indent}~#${key}: ${value}`
                        }]
                    }
                }
            })
        }
    }

    // Wrap selection in frame (^["name"] { ... })
    if (range.start.line !== range.end.line || range.start.character !== range.end.character) {
        const startLine = lines[range.start.line]
        const indent = startLine?.match(/^(\s*)/)?.[1] ?? ''
        const innerIndent = indent + '  '
        const selectedLines = lines.slice(range.start.line, range.end.line + 1)
        const reindented = selectedLines
            .map(l => `${innerIndent}${l.replace(/^\s*/, '')}`)
            .join('\n')

        actions.push({
            title: 'Wrap in Frame (^["..."] { })',
            kind: 'refactor.extract',
            edit: {
                changes: {
                    [uri]: [{
                        range: {
                            start: { line: range.start.line, character: 0 },
                            end: { line: range.end.line, character: (lines[range.end.line] ?? '').length },
                        },
                        newText: `${indent}^["frame"] {\n${reindented}\n${indent}}`
                    }]
                }
            }
        })
    }

    return actions
}

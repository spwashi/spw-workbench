/**
 * Navigation Handlers — definition, document links, references, rename
 *
 * Cross-file navigation: go-to-definition, reference finding,
 * document links, and workspace-wide rename.
 */

import path from 'node:path'
import { selectPathRefs, findPathRefAtPosition } from '../spw-selector'
import type {
    LspLocation, LspRange, LspTextEdit, LspPosition,
    LspPrepareRenameResult, LspWorkspaceEdit,
    DefinitionParams, DocumentParams, ReferencesParams, RenameParams,
    HandlerDeps,
} from '../types'
import { escapeRegex, stripAnchor } from '../helpers'

// ── Definition ──────────────────────────────────────────────────

export async function definition(params: DefinitionParams, deps: HandlerDeps): Promise<LspLocation[] | null> {
    const uri = params?.textDocument?.uri
    const position = params?.position as LspPosition | undefined
    if (!uri || !position) return null

    const source = await deps.getDocumentText(uri)
    if (source === null) return null
    const docPath = deps.pathFromUri(uri)
    if (!docPath) return null

    const doc = deps.serverIndex.getDocument(uri)
    const hits = doc?.selectorHits ?? selectPathRefs(source)
    const hit = findPathRefAtPosition(hits, position.line, position.character)
    if (!hit) return null

    const resolved = await deps.resolveReferencePath(hit, source, docPath, { allowDirectory: true })
    if (!resolved) return null

    return [{
        uri: deps.uriFromPath(resolved),
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    }]
}

// ── Document Links ──────────────────────────────────────────────

export async function documentLinks(
    params: DocumentParams,
    deps: HandlerDeps,
): Promise<Array<{ range: LspRange; target: string }>> {
    const uri = params?.textDocument?.uri
    if (!uri) return []

    const source = await deps.getDocumentText(uri)
    if (source === null) return []
    const docPath = deps.pathFromUri(uri)
    if (!docPath) return []

    const doc = deps.serverIndex.getDocument(uri)
    const hits = doc?.selectorHits ?? selectPathRefs(source)
    const links: Array<{ range: LspRange; target: string }> = []

    for (const hit of hits) {
        const resolved = await deps.resolveReferencePath(hit, source, docPath, { allowDirectory: true })
        if (!resolved) continue
        links.push({
            range: {
                start: { line: hit.span.startLine, character: hit.span.startCharacter },
                end: { line: hit.span.endLine, character: hit.span.endCharacter },
            },
            target: deps.uriFromPath(resolved),
        })
    }

    return links
}

// ── References ──────────────────────────────────────────────────

export async function references(params: ReferencesParams, deps: HandlerDeps): Promise<LspLocation[]> {
    const uri = params?.textDocument?.uri
    const pos = params?.position as LspPosition | undefined
    if (!uri || !pos) return []

    const source = await deps.getDocumentText(uri)
    if (source === null) return []

    const line = source.split('\n')[pos.line] ?? ''

    // 1. Path reference
    const docPath = deps.pathFromUri(uri)
    if (docPath) {
        const doc = deps.serverIndex.getDocument(uri)
        const hits = doc?.selectorHits ?? selectPathRefs(source)
        const hit = findPathRefAtPosition(hits, pos.line, pos.character)
        if (hit) {
            const resolved = await deps.resolveReferencePath(hit, source, docPath, { allowDirectory: true })
            if (resolved) {
                const targetPath = stripAnchor(resolved)
                const files = await deps.getWorkspaceSpwFiles()
                const basenameNeedle = path.basename(targetPath)

                const perFile = await deps.mapWithConcurrency(files, 16, async (filePath: string) => {
                    const fileUri = deps.uriFromPath(filePath)
                    const fileText = await deps.getDocumentText(fileUri)
                    if (fileText === null) return [] as LspLocation[]
                    if (!fileText.includes(basenameNeedle)) return [] as LspLocation[]

                    const candidateHits = selectPathRefs(fileText)
                    const matches: LspLocation[] = []
                    for (const candidate of candidateHits) {
                        const candidateResolved = await deps.resolveReferencePath(candidate, fileText, filePath, { allowDirectory: true })
                        if (!candidateResolved) continue
                        if (stripAnchor(candidateResolved) !== targetPath) continue
                        matches.push({
                            uri: fileUri,
                            range: {
                                start: { line: candidate.span.startLine, character: candidate.span.startCharacter },
                                end: { line: candidate.span.endLine, character: candidate.span.endCharacter },
                            },
                        })
                    }
                    return matches
                })

                return perFile.flat()
            }
        }
    }

    // 2. Annotation reference
    const annotRe = /#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_]*)/g
    let annotMatch: RegExpExecArray | null
    while ((annotMatch = annotRe.exec(line)) !== null) {
        const start = annotMatch.index
        const end = start + annotMatch[0].length
        if (pos.character < start || pos.character >= end) continue

        const name = annotMatch[2]
        const entries = deps.serverIndex.lookupAnnotation(name)
        return entries.map(entry => ({
            uri: deps.uriFromPath(entry.file),
            range: {
                start: { line: entry.line, character: 0 },
                end: { line: entry.line, character: 0 },
            },
        }))
    }

    // 3. Selector name
    const selRe = /\b([a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+)\b/g
    let selMatch: RegExpExecArray | null
    while ((selMatch = selRe.exec(line)) !== null) {
        const start = selMatch.index
        const end = start + selMatch[0].length
        if (pos.character < start || pos.character >= end) continue

        const def = deps.serverIndex.getSelectorDef(selMatch[1])
        if (!def) continue
        return [{
            uri: deps.uriFromPath(def.file),
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        }]
    }

    return []
}

// ── Rename ──────────────────────────────────────────────────────

export async function prepareRename(
    params: DefinitionParams,
    deps: HandlerDeps,
): Promise<LspPrepareRenameResult | null> {
    const uri = params?.textDocument?.uri
    const pos = params?.position as LspPosition | undefined
    if (!uri || !pos) return null

    const source = await deps.getDocumentText(uri)
    if (source === null) return null

    const line = source.split('\n')[pos.line] ?? ''

    // 1. Annotation
    const annotRe = /(?:~)?#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_-]*)/g
    let annotMatch: RegExpExecArray | null
    while ((annotMatch = annotRe.exec(line)) !== null) {
        const nameStart = annotMatch.index + annotMatch[0].length - annotMatch[2].length
        const nameEnd = nameStart + annotMatch[2].length
        if (pos.character < nameStart || pos.character >= nameEnd) continue

        return {
            range: {
                start: { line: pos.line, character: nameStart },
                end: { line: pos.line, character: nameEnd },
            },
            placeholder: annotMatch[2],
        }
    }

    // 2. @root reference
    const rootRe = /@([a-zA-Z_][a-zA-Z0-9_]*)/g
    let rootMatch: RegExpExecArray | null
    while ((rootMatch = rootRe.exec(line)) !== null) {
        const nameStart = rootMatch.index + 1
        const nameEnd = nameStart + rootMatch[1].length
        if (pos.character < rootMatch.index || pos.character >= nameEnd) continue

        return {
            range: {
                start: { line: pos.line, character: nameStart },
                end: { line: pos.line, character: nameEnd },
            },
            placeholder: rootMatch[1],
        }
    }

    // 3. Frame name
    const frameRe = /\^(?:\[(['"])([^"']+)\1\]|(['"])([^"']+)\3)/g
    let frameMatch: RegExpExecArray | null
    while ((frameMatch = frameRe.exec(line)) !== null) {
        const name = frameMatch[2] || frameMatch[4]
        if (!name) continue
        const nameInLine = frameMatch[0]
        const fullStart = frameMatch.index
        const fullEnd = fullStart + nameInLine.length
        if (pos.character < fullStart || pos.character >= fullEnd) continue

        const nameOffset = nameInLine.indexOf(name)
        const nameStart = fullStart + nameOffset
        const nameEnd = nameStart + name.length

        return {
            range: {
                start: { line: pos.line, character: nameStart },
                end: { line: pos.line, character: nameEnd },
            },
            placeholder: name,
        }
    }

    return null
}

export async function rename(params: RenameParams, deps: HandlerDeps): Promise<LspWorkspaceEdit | null> {
    const uri = params?.textDocument?.uri
    const pos = params?.position as LspPosition | undefined
    const newName = params?.newName as string | undefined
    if (!uri || !pos || !newName) return null

    const source = await deps.getDocumentText(uri)
    if (source === null) return null

    const line = source.split('\n')[pos.line] ?? ''
    const changes: Record<string, LspTextEdit[]> = {}

    function addEdit(editUri: string, range: LspRange, text: string): void {
        if (!changes[editUri]) changes[editUri] = []
        changes[editUri].push({ range, newText: text })
    }

    // 1. Annotation rename
    const annotRe = /(?:~)?#(!|:|>)?([a-zA-Z_][a-zA-Z0-9_-]*)/g
    let annotMatch: RegExpExecArray | null
    while ((annotMatch = annotRe.exec(line)) !== null) {
        const nameStart = annotMatch.index + annotMatch[0].length - annotMatch[2].length
        const nameEnd = nameStart + annotMatch[2].length
        if (pos.character < nameStart || pos.character >= nameEnd) continue

        const oldName = annotMatch[2]
        const files = await deps.getWorkspaceSpwFiles()
        const annotPattern = new RegExp(`((?:~)?#(?:!|:|>)?)${escapeRegex(oldName)}\\b`, 'g')

        await deps.mapWithConcurrency(files, 16, async (filePath: string) => {
            const fileUri = deps.uriFromPath(filePath)
            const fileText = await deps.getDocumentText(fileUri)
            if (fileText === null || !fileText.includes(oldName)) return

            const fileLines = fileText.split('\n')
            for (let lineNo = 0; lineNo < fileLines.length; lineNo++) {
                let m: RegExpExecArray | null
                annotPattern.lastIndex = 0
                while ((m = annotPattern.exec(fileLines[lineNo])) !== null) {
                    const prefixLen = m[1].length
                    const editStart = m.index + prefixLen
                    addEdit(fileUri, {
                        start: { line: lineNo, character: editStart },
                        end: { line: lineNo, character: editStart + oldName.length },
                    }, newName)
                }
            }
        })

        return { changes }
    }

    // 2. @root rename
    const rootRe = /@([a-zA-Z_][a-zA-Z0-9_]*)/g
    let rootMatch: RegExpExecArray | null
    while ((rootMatch = rootRe.exec(line)) !== null) {
        const nameStart = rootMatch.index + 1
        const nameEnd = nameStart + rootMatch[1].length
        if (pos.character < rootMatch.index || pos.character >= nameEnd) continue

        const oldRoot = rootMatch[1]
        const files = await deps.getWorkspaceSpwFiles()
        const rootPattern = new RegExp(`@${escapeRegex(oldRoot)}\\b`, 'g')

        await deps.mapWithConcurrency(files, 16, async (filePath: string) => {
            const fileUri = deps.uriFromPath(filePath)
            const fileText = await deps.getDocumentText(fileUri)
            if (fileText === null || !fileText.includes(`@${oldRoot}`)) return

            const fileLines = fileText.split('\n')
            for (let lineNo = 0; lineNo < fileLines.length; lineNo++) {
                let m: RegExpExecArray | null
                rootPattern.lastIndex = 0
                while ((m = rootPattern.exec(fileLines[lineNo])) !== null) {
                    addEdit(fileUri, {
                        start: { line: lineNo, character: m.index + 1 },
                        end: { line: lineNo, character: m.index + 1 + oldRoot.length },
                    }, newName)
                }
            }
        })

        return { changes }
    }

    // 3. Frame name rename
    const frameRe = /\^(?:\[(['"])([^"']+)\1\]|(['"])([^"']+)\3)/g
    let frameMatch: RegExpExecArray | null
    while ((frameMatch = frameRe.exec(line)) !== null) {
        const name = frameMatch[2] || frameMatch[4]
        if (!name) continue
        const fullStart = frameMatch.index
        const fullEnd = fullStart + frameMatch[0].length
        if (pos.character < fullStart || pos.character >= fullEnd) continue

        const oldName = name
        const files = await deps.getWorkspaceSpwFiles()
        const framePattern = new RegExp(
            `\\^(?:\\[(['"])${escapeRegex(oldName)}\\1\\]|(['"])${escapeRegex(oldName)}\\2)`,
            'g',
        )

        await deps.mapWithConcurrency(files, 16, async (filePath: string) => {
            const fileUri = deps.uriFromPath(filePath)
            const fileText = await deps.getDocumentText(fileUri)
            if (fileText === null || !fileText.includes(oldName)) return

            const fileLines = fileText.split('\n')
            for (let lineNo = 0; lineNo < fileLines.length; lineNo++) {
                let m: RegExpExecArray | null
                framePattern.lastIndex = 0
                while ((m = framePattern.exec(fileLines[lineNo])) !== null) {
                    const nameOffset = m[0].indexOf(oldName)
                    const editStart = m.index + nameOffset
                    addEdit(fileUri, {
                        start: { line: lineNo, character: editStart },
                        end: { line: lineNo, character: editStart + oldName.length },
                    }, newName)
                }
            }
        })

        return { changes }
    }

    return null
}

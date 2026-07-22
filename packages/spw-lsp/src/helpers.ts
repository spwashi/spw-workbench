/**
 * LSP Helpers — shared path resolution, workspace scanning, and utilities.
 *
 * Every capability handler depends on these functions.
 * They receive a ServerContext for access to config and workspace root.
 */

import { existsSync, promises as fs } from 'node:fs'
import type { Dirent } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deriveMountRoots, discoverSpwMountResolution } from '@spwashi/spw-runtime'
import type { SpwSelectorHit } from './spw-selector'
import type { ServerIndex } from './server-index'
import type { ServerContext } from './context'
import type { SpwConfig, RootMap } from './types'
import { DEFAULT_CONFIG } from './types'

// ── URI/path helpers ────────────────────────────────────────────

export function pathFromUri(uri: string): string | null {
    if (!uri.startsWith('file://')) return null
    try { return fileURLToPath(uri) } catch { return null }
}

export function uriFromPath(filePath: string): string {
    return pathToFileURL(filePath).toString()
}

export async function fileExists(target: string): Promise<boolean> {
    try { await fs.access(target); return true } catch { return false }
}

export async function statKind(target: string): Promise<'file' | 'dir' | null> {
    try {
        const stat = await fs.stat(target)
        if (stat.isDirectory()) return 'dir'
        if (stat.isFile()) return 'file'
        return null
    } catch { return null }
}

export function parseWorkspaceRoot(params: any, fallback: string): string {
    const folders = Array.isArray(params?.workspaceFolders) ? params.workspaceFolders : []
    const first = folders[0]?.uri
    if (typeof first === 'string' && first.startsWith('file://')) {
        try { return fileURLToPath(first) || fallback } catch { return fallback }
    }
    const rootUri = params?.rootUri
    if (typeof rootUri === 'string' && rootUri.startsWith('file://')) {
        try { return fileURLToPath(rootUri) || fallback } catch { return fallback }
    }
    return fallback
}

// ── Config loading ──────────────────────────────────────────────

export async function loadConfig(root: string, initOptions?: any, ctx?: ServerContext): Promise<Required<SpwConfig>> {
    const base: Required<SpwConfig> = {
        ...DEFAULT_CONFIG,
        inlayHints: { ...DEFAULT_CONFIG.inlayHints },
        diagnostics: { ...DEFAULT_CONFIG.diagnostics },
        roots: { ...DEFAULT_CONFIG.roots },
        workspace: { exclude: [...(DEFAULT_CONFIG.workspace.exclude ?? [])] },
    }

    const configPath = path.join(root, '.spw', 'config.json')
    try {
        const raw = await fs.readFile(configPath, 'utf8')
        const parsed = JSON.parse(raw) as Partial<SpwConfig>
        ctx?.log('loaded workspace config')
        mergeConfig(base, parsed)
    } catch {
        // No config file — that's fine
    }

    if (initOptions && typeof initOptions === 'object') {
        mergeConfig(base, initOptions as Partial<SpwConfig>)
    }

    const mountResolution = await discoverSpwMountResolution(root)
    if (mountResolution) {
        base.roots = { ...deriveMountRoots(mountResolution), ...base.roots }
        const existingExclude = base.workspace.exclude ?? []
        base.workspace.exclude = [...new Set([...existingExclude, '_workbench'])]
        ctx?.log('loaded mounted workspace config')
    }

    return base
}

export function mergeConfig(target: Required<SpwConfig>, source: Partial<SpwConfig>): void {
    if (source.inlayHints) {
        target.inlayHints = { ...target.inlayHints, ...source.inlayHints }
    }
    if (source.diagnostics) {
        target.diagnostics = { ...target.diagnostics, ...source.diagnostics }
    }
    if (source.roots) {
        target.roots = { ...target.roots, ...source.roots }
    }
    if (source.workspace) {
        target.workspace = { ...target.workspace, ...source.workspace }
    }
    if (source.formatOnSave !== undefined) {
        target.formatOnSave = source.formatOnSave
    }
}

// ── Root resolution ─────────────────────────────────────────────

export function defaultRoots(fileDir: string, workspaceRoot: string, serverIndex: ServerIndex): RootMap {
    const hardcoded: RootMap = {
        docs: path.join(workspaceRoot, 'docs'),
        src: path.join(workspaceRoot, 'src'),
        spec: path.join(workspaceRoot, 'lib', 'spw-v0.3.0'),
        lib: path.join(workspaceRoot, 'lib'),
        scripts: path.join(workspaceRoot, 'scripts'),
        spw: path.join(workspaceRoot, '.spw'),
        workbench: path.join(workspaceRoot, '.spw', '_workbench'),
        cli: path.join(workspaceRoot, '.spw', '_workbench', 'packages', 'spw-cli'),
        lsp: path.join(workspaceRoot, '.spw', '_workbench', 'packages', 'spw-lsp'),
        biome: path.join(workspaceRoot, '.spw', 'biome', 'ocean'),
        harness: path.join(workspaceRoot, '.spw', 'harness'),
        gen: path.join(workspaceRoot, '.spw', 'gen'),
        hot: path.join(workspaceRoot, '.spw', 'hot.spw'),
        agents: path.join(workspaceRoot, '.agents'),
        plans: path.join(workspaceRoot, '.agents', 'plans'),
        state: path.join(workspaceRoot, '.agents', 'state'),
        skills: path.join(workspaceRoot, '.agents', 'skills'),
        here: fileDir,
        repo: workspaceRoot,
    }
    const shelves = serverIndex.getShelfRoots()
    for (const [name, absPath] of shelves) {
        hardcoded[name] = absPath
    }
    return hardcoded
}

export function parseRoots(source: string, fileDir: string, workspaceRoot?: string): RootMap {
    const roots: RootMap = {}
    const re = /@([A-Za-z0-9_-]+):\s*~"([^"]+)"/g
    let m: RegExpExecArray | null
    while ((m = re.exec(source))) {
        const rel = m[2]
        const fromFile = path.resolve(fileDir, rel)
        // When the file-relative resolution doesn't exist, try workspace root
        if (workspaceRoot && workspaceRoot !== fileDir && !existsSync(fromFile)) {
            const fromRoot = path.resolve(workspaceRoot, rel)
            if (existsSync(fromRoot)) {
                roots[m[1]] = fromRoot
                continue
            }
        }
        roots[m[1]] = fromFile
    }
    return roots
}

export function mergeRoots(
    source: string,
    fileDir: string,
    workspaceRoot: string,
    config: Required<SpwConfig>,
    serverIndex: ServerIndex,
): RootMap {
    return { ...defaultRoots(fileDir, workspaceRoot, serverIndex), ...config.roots, ...parseRoots(source, fileDir, workspaceRoot) }
}

export async function resolveCandidate(target: string): Promise<string | null> {
    const kind = await statKind(target)
    if (kind === 'file') return target
    if (!path.extname(target) && kind !== 'dir') {
        for (const ext of ['.spw', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.md']) {
            if (await fileExists(`${target}${ext}`)) return `${target}${ext}`
        }
    }
    for (const file of ['index.spw', 'index.ts', 'README.md']) {
        const inDir = path.join(target, file)
        if (await fileExists(inDir)) return inDir
    }
    return null
}

export async function resolveReferencePath(
    hit: SpwSelectorHit,
    source: string,
    docPath: string,
    workspaceRoot: string,
    config: Required<SpwConfig>,
    serverIndex: ServerIndex,
    options?: { allowDirectory?: boolean },
): Promise<string | null> {
    const docDir = path.dirname(docPath)
    const roots = mergeRoots(source, docDir, workspaceRoot, config, serverIndex)
    const allowDirectory = options?.allowDirectory === true

    if (hit.kind === 'pathRef') {
        if (hit.target.includes('*')) return null

        let cleanTarget = hit.target
        let hash = ''
        const hashIdx = cleanTarget.indexOf('#')
        if (hashIdx >= 0) {
            hash = cleanTarget.slice(hashIdx)
            cleanTarget = cleanTarget.slice(0, hashIdx)
        }

        const target = cleanTarget ? path.resolve(docDir, cleanTarget) : docPath
        const resolved = await resolveCandidate(target)
        if (resolved) return resolved + hash
        if (allowDirectory && await statKind(target) === 'dir') return target

        // Fallback: workspace-root-relative resolution (tilde-relative paths like ~"…")
        if (cleanTarget && workspaceRoot !== docDir) {
            const wsTarget = path.resolve(workspaceRoot, cleanTarget)
            if (wsTarget !== target) {
                const wsResolved = await resolveCandidate(wsTarget)
                if (wsResolved) return wsResolved + hash
                if (allowDirectory && await statKind(wsTarget) === 'dir') return wsTarget
            }
        }

        return null
    }

    const rootName = hit.root ?? ''
    const defaults = defaultRoots(docDir, workspaceRoot, serverIndex)
    let rootBase = roots[rootName]
    if (rootBase && !await fileExists(rootBase) && defaults[rootName]) {
        rootBase = defaults[rootName]
    }
    if (!rootBase) {
        const direct = path.join(workspaceRoot, rootName)
        if (await fileExists(direct)) rootBase = direct
        else {
            const src = path.join(workspaceRoot, 'src', rootName)
            rootBase = (await fileExists(src)) ? src : direct
        }
    }
    if (!rootBase || hit.target.includes('*')) return null

    let cleanTarget = hit.target
    let hash = ''
    const hashIdx = cleanTarget.indexOf('#')
    if (hashIdx >= 0) {
        hash = cleanTarget.slice(hashIdx)
        cleanTarget = cleanTarget.slice(0, hashIdx)
    }

    const target = cleanTarget ? path.resolve(rootBase, cleanTarget) : docPath
    const resolved = await resolveCandidate(target)
    if (resolved) return resolved + hash
    if (allowDirectory && await statKind(target) === 'dir') return target
    return null
}

// ── Workspace scanning ──────────────────────────────────────────

export async function collectWorkspaceSpwFiles(
    dir: string,
    out: string[],
    config: Required<SpwConfig>,
): Promise<void> {
    let entries: Dirent[]
    try {
        entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
        return
    }

    const excluded = new Set(config.workspace.exclude ?? [])
    excluded.delete('.spw')

    for (const entry of entries) {
        const target = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            if (excluded.has(entry.name)) continue
            await collectWorkspaceSpwFiles(target, out, config)
            continue
        }
        if (entry.isFile() && entry.name.endsWith('.spw')) out.push(target)
    }
}

export async function getWorkspaceSpwFiles(ctx: ServerContext): Promise<string[]> {
    const now = Date.now()
    if (ctx.workspaceFilesCache && now - ctx.workspaceFilesCache.at < ctx.workspaceFilesCacheTtlMs) {
        return ctx.workspaceFilesCache.files
    }
    const files: string[] = []
    await collectWorkspaceSpwFiles(ctx.workspaceRoot, files, ctx.config)
    ctx.workspaceFilesCache = { at: now, files }
    return files
}

// ── Concurrency ─────────────────────────────────────────────────

export async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>,
): Promise<R[]> {
    const out: R[] = new Array(items.length)
    let cursor = 0

    async function worker(): Promise<void> {
        while (true) {
            const i = cursor
            cursor += 1
            if (i >= items.length) return
            out[i] = await mapper(items[i])
        }
    }

    const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => worker())
    await Promise.all(workers)
    return out
}

// ── String utilities ────────────────────────────────────────────

export function stripAnchor(target: string): string {
    const hashIdx = target.indexOf('#')
    return hashIdx >= 0 ? target.slice(0, hashIdx) : target
}

export function normalizeRelPath(value: string): string {
    const rel = value.replace(/\\/g, '/')
    if (!rel) return './'
    if (rel.startsWith('.')) return rel
    return `./${rel}`
}

export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0
    if (!a.length) return b.length
    if (!b.length) return a.length

    const rows = a.length + 1
    const cols = b.length + 1
    const dp: number[] = new Array(rows * cols).fill(0)
    const at = (r: number, c: number) => r * cols + c

    for (let r = 0; r < rows; r += 1) dp[at(r, 0)] = r
    for (let c = 0; c < cols; c += 1) dp[at(0, c)] = c

    for (let r = 1; r < rows; r += 1) {
        for (let c = 1; c < cols; c += 1) {
            const cost = a[r - 1] === b[c - 1] ? 0 : 1
            dp[at(r, c)] = Math.min(
                dp[at(r - 1, c)] + 1,
                dp[at(r, c - 1)] + 1,
                dp[at(r - 1, c - 1)] + cost,
            )
        }
    }

    return dp[at(rows - 1, cols - 1)]
}

export function scoreCandidateName(inputName: string, candidateName: string): number {
    const input = inputName.toLowerCase()
    const candidate = candidateName.toLowerCase()
    const inputStem = input.replace(/\.[^.]+$/, '')
    const candidateStem = candidate.replace(/\.[^.]+$/, '')

    let score = 0
    if (input === candidate) score += 100
    if (inputStem === candidateStem) score += 80
    if (candidate.startsWith(input) || input.startsWith(candidate)) score += 45
    if (candidate.includes(input) || input.includes(candidate)) score += 25
    if (input.includes('spw-v') && candidate.includes('spw-v')) score += 20

    const dist = levenshteinDistance(inputStem, candidateStem)
    const maxLen = Math.max(inputStem.length, candidateStem.length, 1)
    const distScore = Math.max(0, 40 - Math.round((dist / maxLen) * 40))
    score += distScore

    return score
}

export async function suggestNearbyReference(
    hit: SpwSelectorHit,
    source: string,
    docPath: string,
    workspaceRoot: string,
    config: Required<SpwConfig>,
    serverIndex: ServerIndex,
): Promise<string | null> {
    if (hit.target.includes('*')) return null

    const docDir = path.dirname(docPath)
    const cleanTarget = stripAnchor(hit.target)
    const roots = mergeRoots(source, docDir, workspaceRoot, config, serverIndex)

    let searchBase: string
    let toRefText: (absolute: string) => string

    if (hit.kind === 'pathRef') {
        searchBase = cleanTarget ? path.resolve(docDir, cleanTarget) : docPath
        toRefText = (absolute) => normalizeRelPath(path.relative(docDir, absolute))
    } else {
        const rootName = hit.root ?? ''
        const defaults = defaultRoots(docDir, workspaceRoot, serverIndex)
        let rootBase = roots[rootName]
        if (rootBase && !await fileExists(rootBase) && defaults[rootName]) {
            rootBase = defaults[rootName]
        }
        if (!rootBase) {
            const direct = path.join(workspaceRoot, rootName)
            if (await fileExists(direct)) rootBase = direct
            else {
                const src = path.join(workspaceRoot, 'src', rootName)
                rootBase = (await fileExists(src)) ? src : direct
            }
        }
        if (!rootBase) return null
        searchBase = cleanTarget ? path.resolve(rootBase, cleanTarget) : docPath
        toRefText = (absolute) => {
            const rel = path.relative(rootBase, absolute).replace(/\\/g, '/')
            return rel ? `@${rootName}/${rel}` : `@${rootName}/`
        }
    }

    const parent = path.dirname(searchBase)
    const missingName = path.basename(searchBase)
    let entries: Dirent[]
    try {
        entries = await fs.readdir(parent, { withFileTypes: true })
    } catch {
        return null
    }

    if (entries.length === 0) return null

    const versionCandidates = entries.filter((entry) => /^spw-v\d+\.\d+\.\d+-alpha$/i.test(entry.name))
    if (/^spw-v\d+\.\d+\.\d+-alpha$/i.test(missingName) && versionCandidates.length > 0) {
        const sorted = versionCandidates
            .map((entry) => {
                const m = /^spw-v(\d+)\.(\d+)\.(\d+)-alpha$/i.exec(entry.name)
                return { entry, major: Number(m?.[1] ?? 0), minor: Number(m?.[2] ?? 0), patch: Number(m?.[3] ?? 0) }
            })
            .sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch)
        const best = sorted[0]?.entry
        if (best) {
            const absolute = path.join(parent, best.name)
            return toRefText(absolute)
        }
    }

    const scored = entries
        .map((entry) => {
            const score = scoreCandidateName(missingName, entry.name)
            return { entry, score }
        })
        .sort((a, b) => b.score - a.score)

    const top = scored[0]
    if (!top || top.score < 45) return null

    return toRefText(path.join(parent, top.entry.name))
}

// ── Document text ───────────────────────────────────────────────

export async function getDocumentText(uri: string, serverIndex: ServerIndex): Promise<string | null> {
    const doc = serverIndex.getDocument(uri)
    if (doc) return doc.text
    const filePath = pathFromUri(uri)
    return serverIndex.getDocumentText(uri, filePath)
}

// ── Regex escape ────────────────────────────────────────────────

export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

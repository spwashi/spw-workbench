/**
 * Server Context — shared state passed to all LSP capability handlers.
 *
 * Consolidates mutable server state into a single object so handlers
 * don't depend on module-level globals.
 */

import type { ServerIndex } from './server-index'
import type { SpwConfig, RootMap, JsonRpcResponse, JsonRpcRequest } from './types'
import type { RunSpwResult } from '@spwashi/spw-runtime'
import { runSpw } from '@spwashi/spw-runtime'
import { DEFAULT_CONFIG } from './types'
import path from 'node:path'
import { promises as fs } from 'node:fs'

// ── Runtime Trial Cache ─────────────────────────────────────────
const RUNTIME_TRIAL_TTL_MS = 2_000

// ── Context ─────────────────────────────────────────────────────

export class ServerContext {
    repoRoot: string
    workspaceRoot: string
    shutdown = false
    config: Required<SpwConfig> = { ...DEFAULT_CONFIG }
    serverIndex!: ServerIndex

    // Document store
    readonly documents = new Map<string, string>()

    // Caches
    readonly diagnosticDebounce = new Map<string, ReturnType<typeof setTimeout>>()
    readonly diagnosticDelayMs = 300
    readonly workspaceFilesCacheTtlMs = 5_000
    workspaceFilesCache: { at: number; files: string[] } | null = null

    // Observable state sidecar — loaded on save, used in $%[metric] hover
    observableState: Record<string, any> | null = null
    observableStateLoadedAt = 0

    // Runtime trial cache
    private readonly runtimeTrialCache = new Map<string, { at: number; result: RunSpwResult }>()

    constructor(repoRoot: string) {
        this.repoRoot = repoRoot
        this.workspaceRoot = repoRoot
    }

    // ── Transport ───────────────────────────────────────────────

    send(payload: JsonRpcResponse | JsonRpcRequest): void {
        const body = JSON.stringify(payload)
        const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`
        process.stdout.write(header + body)
    }

    sendResult(id: number | string | null, result: any): void {
        this.send({ jsonrpc: '2.0', id, result })
    }

    sendError(id: number | string | null, code: number, message: string, data?: any): void {
        this.send({ jsonrpc: '2.0', id, error: { code, message, data } })
    }

    sendNotification(method: string, params: any): void {
        this.send({ jsonrpc: '2.0', method, params } as any)
    }

    // ── Logging ─────────────────────────────────────────────────

    log(message: string): void {
        if (!process.env.SPW_LSP_TRACE) return
        process.stderr.write(`[spw-lsp] ${message}\n`)
    }

    // ── Runtime Trial ───────────────────────────────────────────

    trialRunSpw(source: string, uri: string): RunSpwResult {
        const cached = this.runtimeTrialCache.get(uri)
        if (cached && Date.now() - cached.at < RUNTIME_TRIAL_TTL_MS) {
            return cached.result
        }
        try {
            const result = runSpw(source)
            this.runtimeTrialCache.set(uri, { at: Date.now(), result })
            return result
        } catch {
            const fail: RunSpwResult = {
                success: false,
                source,
                parse: { success: false, ast: null, events: [], errors: [] } as any,
                issues: [{ stage: 'interpret', message: 'Runtime trial failed' }],
                telemetry: { events: [], resonances: [] },
            }
            this.runtimeTrialCache.set(uri, { at: Date.now(), result: fail })
            return fail
        }
    }

    // ── Observable State ────────────────────────────────────────

    async loadObservableState(): Promise<Record<string, any>> {
        const statePath = path.join(this.workspaceRoot, '.spw', 'state', 'observable.spw')
        try {
            const text = await fs.readFile(statePath, 'utf8')
            const state: Record<string, any> = {}
            const metricRe = /(?:\.\.\s*)?%\[([^\]]+)\]\s+(.+)/g
            let m: RegExpExecArray | null
            while ((m = metricRe.exec(text)) !== null) {
                const key = m[1].trim()
                let val: any = m[2].trim()
                const commentIdx = val.indexOf('//')
                if (commentIdx >= 0) val = val.slice(0, commentIdx).trim()
                if (val === 'null') val = null
                else if (val === 'true') val = true
                else if (val === 'false') val = false
                else if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val)
                else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
                const linesBefore = text.slice(0, m.index)
                const frameMatch = linesBefore.match(/\^"([^"]+)"\s*\{[^}]*$/s)
                const prefix = frameMatch ? `${frameMatch[1]}.` : ''
                state[`${prefix}${key}`] = val
            }
            this.observableState = state
            this.observableStateLoadedAt = Date.now()
            this.log('observable state loaded from .spw')
        } catch {
            if (!this.observableState) this.observableState = {}
        }
        return this.observableState!
    }
}

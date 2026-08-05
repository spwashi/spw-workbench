/**
 * Workspace session cache — disclosure memory under .spw/gen/session/cli-cache/.
 *
 * Doctrine: representational-disclosure.spw
 *   product     — ChangeReport / Patch (retained for re-project / apply)
 *   disclosure  — Spw nested-frame cards (default inspect surface)
 *   retention   — gen/session (not canon); invent/map skip
 *
 * On disk (Spw-first):
 *   index.spw          — dual-read index of entries
 *   <id>.spw           — disclosure card(s)
 *   <id>.product.json  — machine product for rehydrate (optional; not default show)
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createHash } from 'node:crypto'
import type { ChangeReport, Patch } from '@spwashi/spw-seed'
import {
  formatChangeReportSpw,
  formatPatchSpw,
  formatSpwCard,
  formatSpwCards,
  facet,
  irRefKey,
} from '@spwashi/spw-seed'

export const CLI_CACHE_SCHEMA = 'spw.cli_session_cache/1' as const

export type CliCacheKind = 'delta' | 'patch'

export interface CliCacheEntryMeta {
  id: string
  kind: CliCacheKind
  createdAt: string
  note: string
  beforePath?: string
  afterPath?: string
  layoutOnly?: boolean
  identity?: boolean
  editCount?: number
}

export interface CliCacheEntry extends CliCacheEntryMeta {
  schema: typeof CLI_CACHE_SCHEMA
  cwd: string
  /** Full ChangeReport when kind is delta (or accompanying patch). */
  report?: ChangeReport
  /** Frozen Patch when kind is patch. */
  patch?: Patch
  /** Nested-frame dual-read disclosure (default inspect). */
  dualReadSpw: string
}

export interface CliCacheIndex {
  schema: typeof CLI_CACHE_SCHEMA
  version: 1
  entries: CliCacheEntryMeta[]
}

const memoryByCwd = new Map<string, Map<string, CliCacheEntry>>()

function shortId(parts: string): string {
  return createHash('sha256').update(parts).digest('hex').slice(0, 12)
}

export function cliCacheDir(cwd: string = process.cwd()): string {
  return path.join(cwd, '.spw', 'gen', 'session', 'cli-cache')
}

function indexSpwPath(cwd: string): string {
  return path.join(cliCacheDir(cwd), 'index.spw')
}

function indexJsonPath(cwd: string): string {
  return path.join(cliCacheDir(cwd), 'index.json')
}

function entrySpwPath(cwd: string, id: string): string {
  return path.join(cliCacheDir(cwd), `${id}.spw`)
}

function entryProductPath(cwd: string, id: string): string {
  return path.join(cliCacheDir(cwd), `${id}.product.json`)
}

function memMap(cwd: string): Map<string, CliCacheEntry> {
  let m = memoryByCwd.get(cwd)
  if (!m) {
    m = new Map()
    memoryByCwd.set(cwd, m)
  }
  return m
}

function toMeta(entry: CliCacheEntry): CliCacheEntryMeta {
  return {
    id: entry.id,
    kind: entry.kind,
    createdAt: entry.createdAt,
    note: entry.note,
    beforePath: entry.beforePath,
    afterPath: entry.afterPath,
    layoutOnly: entry.layoutOnly,
    identity: entry.identity,
    editCount: entry.editCount,
  }
}

/** Dual-read index surface — default list output and on-disk index.spw. */
export function formatCliCacheIndexSpw(
  entries: readonly CliCacheEntryMeta[],
  options: { session?: string } = {},
): string {
  const session = options.session ?? cliCacheDir()
  const head = formatSpwCard('cache_index', [
    facet.atom('schema', CLI_CACHE_SCHEMA),
    facet.atom('n', entries.length),
    facet.path('session', session),
  ])
  if (entries.length === 0) {
    return formatSpwCards([
      head,
      formatSpwCard('empty', [facet.str('note', 'no cached deltas in this workspace session')]),
    ])
  }
  const entryCards = entries.map(e =>
    formatSpwCard('entry', [
      facet.atom('id', e.id),
      facet.atom('kind', e.kind),
      facet.flag('layoutOnly', e.layoutOnly ?? false),
      facet.flag('identity', e.identity ?? false),
      facet.atom('edits', e.editCount ?? 0),
      facet.path('before', e.beforePath),
      facet.path('after', e.afterPath),
      facet.str('note', e.note),
      facet.atom('at', e.createdAt),
    ]),
  )
  return formatSpwCards([head, ...entryCards])
}

function readIndex(cwd: string): CliCacheIndex {
  // Prefer index.json for machine rehydrate; fall back to empty
  const p = indexJsonPath(cwd)
  if (!existsSync(p)) {
    return { schema: CLI_CACHE_SCHEMA, version: 1, entries: [] }
  }
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8')) as CliCacheIndex
    if (!raw || !Array.isArray(raw.entries)) {
      return { schema: CLI_CACHE_SCHEMA, version: 1, entries: [] }
    }
    return raw
  } catch {
    return { schema: CLI_CACHE_SCHEMA, version: 1, entries: [] }
  }
}

function writeIndex(cwd: string, index: CliCacheIndex): void {
  const dir = cliCacheDir(cwd)
  mkdirSync(dir, { recursive: true })
  // machine meta (rehydrate list)
  writeFileSync(indexJsonPath(cwd), JSON.stringify(index, null, 2) + '\n', 'utf8')
  // Spw dual-read index (default human/agent surface)
  writeFileSync(
    indexSpwPath(cwd),
    formatCliCacheIndexSpw(index.entries, { session: cliCacheDir(cwd) }) + '\n',
    'utf8',
  )
}

function persistEntry(cwd: string, entry: CliCacheEntry): void {
  const dir = cliCacheDir(cwd)
  mkdirSync(dir, { recursive: true })

  // Disclosure — Spw only (default --show)
  writeFileSync(entrySpwPath(cwd, entry.id), entry.dualReadSpw + '\n', 'utf8')

  // Product sidecar — rehydrate for apply / re-project; not default inspect
  const product = {
    schema: entry.schema,
    id: entry.id,
    kind: entry.kind,
    createdAt: entry.createdAt,
    cwd: entry.cwd,
    beforePath: entry.beforePath,
    afterPath: entry.afterPath,
    note: entry.note,
    layoutOnly: entry.layoutOnly,
    identity: entry.identity,
    editCount: entry.editCount,
    report: entry.report,
    patch: entry.patch,
  }
  writeFileSync(entryProductPath(cwd, entry.id), JSON.stringify(product, null, 2) + '\n', 'utf8')

  const index = readIndex(cwd)
  const next = index.entries.filter(e => e.id !== entry.id)
  next.unshift(toMeta(entry))
  index.entries = next.slice(0, 64)
  writeIndex(cwd, index)
}

/** Store a ChangeReport (sense delta) in session memory + disk. */
export function cacheDeltaReport(
  report: ChangeReport,
  options: {
    cwd?: string
    beforePath?: string
    afterPath?: string
  } = {},
): CliCacheEntry {
  const cwd = options.cwd ?? process.cwd()
  const id = shortId(
    `delta|${report.beforeHash}|${report.afterHash}|${options.beforePath ?? ''}|${options.afterPath ?? ''}`,
  )
  const entry: CliCacheEntry = {
    schema: CLI_CACHE_SCHEMA,
    id,
    kind: 'delta',
    createdAt: new Date().toISOString(),
    cwd,
    beforePath: options.beforePath,
    afterPath: options.afterPath,
    note: report.note,
    layoutOnly: report.layoutOnly,
    identity: report.identity,
    editCount: report.editSpans,
    report,
    dualReadSpw: formatChangeReportSpw(report),
  }
  memMap(cwd).set(id, entry)
  persistEntry(cwd, entry)
  return entry
}

/** Store a frozen Patch in session memory + disk. */
export function cachePatchProduct(
  patch: Patch,
  options: {
    cwd?: string
    beforePath?: string
    afterPath?: string
    report?: ChangeReport
  } = {},
): CliCacheEntry {
  const cwd = options.cwd ?? process.cwd()
  const id = shortId(
    `patch|${irRefKey(patch.ref)}|${options.beforePath ?? ''}|${options.afterPath ?? ''}`,
  )
  const dual = formatSpwCards([
    formatPatchSpw(patch),
    options.report ? formatChangeReportSpw(options.report) : '',
  ])
  const entry: CliCacheEntry = {
    schema: CLI_CACHE_SCHEMA,
    id,
    kind: 'patch',
    createdAt: new Date().toISOString(),
    cwd,
    beforePath: options.beforePath,
    afterPath: options.afterPath,
    note: patch.narrative.note,
    layoutOnly: patch.narrative.layoutOnly,
    identity: patch.narrative.identity,
    editCount: patch.differential.edits.length,
    report: options.report,
    patch,
    dualReadSpw: dual,
  }
  memMap(cwd).set(id, entry)
  persistEntry(cwd, entry)
  return entry
}

export function listCliCache(cwd: string = process.cwd()): CliCacheEntryMeta[] {
  const index = readIndex(cwd)
  for (const meta of index.entries) {
    if (!memMap(cwd).has(meta.id)) {
      const full = getCliCacheEntry(meta.id, cwd)
      if (full) memMap(cwd).set(meta.id, full)
    }
  }
  return index.entries
}

export function getCliCacheEntry(
  id: string,
  cwd: string = process.cwd(),
): CliCacheEntry | undefined {
  const hit = memMap(cwd).get(id)
  if (hit) return hit

  // Prefer product sidecar for full rehydrate
  const productPath = entryProductPath(cwd, id)
  if (existsSync(productPath)) {
    try {
      const raw = JSON.parse(readFileSync(productPath, 'utf8')) as CliCacheEntry
      const dualPath = entrySpwPath(cwd, id)
      const dualReadSpw = existsSync(dualPath)
        ? readFileSync(dualPath, 'utf8').trimEnd()
        : raw.dualReadSpw ?? ''
      const entry: CliCacheEntry = {
        ...raw,
        dualReadSpw,
        schema: CLI_CACHE_SCHEMA,
        cwd,
      }
      memMap(cwd).set(id, entry)
      return entry
    } catch {
      /* fall through */
    }
  }

  // Disclosure-only: Spw card without product (inspect, no apply)
  const spwPath = entrySpwPath(cwd, id)
  if (existsSync(spwPath)) {
    const dualReadSpw = readFileSync(spwPath, 'utf8').trimEnd()
    const entry: CliCacheEntry = {
      schema: CLI_CACHE_SCHEMA,
      id,
      kind: dualReadSpw.includes('^["patch"]') ? 'patch' : 'delta',
      createdAt: '',
      cwd,
      note: 'disclosure-only (no product sidecar)',
      dualReadSpw,
    }
    memMap(cwd).set(id, entry)
    return entry
  }

  return undefined
}

export function clearCliCache(cwd: string = process.cwd()): number {
  const index = readIndex(cwd)
  const n = index.entries.length
  const dir = cliCacheDir(cwd)
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      rmSync(path.join(dir, name), { force: true })
    }
  }
  memMap(cwd).clear()
  writeIndex(cwd, { schema: CLI_CACHE_SCHEMA, version: 1, entries: [] })
  return n
}

export function resetCliCacheMemory(): void {
  memoryByCwd.clear()
}

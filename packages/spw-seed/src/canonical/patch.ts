/**
 * Patch — selection-addressed, cacheable apply product.
 *
 * Vocabulary split:
 *   delta  — sense/collate narrative between two cuts (ChangeReport, spw delta)
 *   patch  — frozen apply unit (edits + selection + ceiling + IrRef)
 *
 * Pipeline (collate → optional discharge):
 *   1. AstSelection  — file span, query selector, nest path, or whole surface
 *   2. Delta         — SourceDifferential and/or ChangeReport narrative
 *   3. Patch         — IrRef product; store in memory, IR graph, or file
 *   4. Apply         — target: one file | many files | node selection
 *
 * Retention (memory/file) never enters product identity — only contentHash,
 * schema, producer, uri, selection mask, channel.
 *
 * @see packages/spw-seed/src/canonical/change-report.ts
 * @see packages/spw-seed/src/canonical/semantic-edit.ts
 * @see packages/spw-seed/src/ir/ref.ts
 * @see docs/theory/spw/operational-field.spw
 */

import { createHash } from 'node:crypto'
import { parse } from '../parser'
import { matchAll } from '../query/match'
import type { SpwPattern } from '../query/types'
import type { ASTNode } from '../types/ast'
import { irRef, irRefKey, type IrRef } from '../ir/ref'
import {
  applyEdits,
  differentialFromSources,
  type EffectGrade,
  type SourceDifferential,
  type SourceEdit,
} from './differential'
import {
  buildChangeReport,
  type ChangeReport,
} from './change-report'
import { scanNestPaths } from './nest-path'

export const PATCH_VERSION = 'spw.patch/1' as const
export const PATCH_SCHEMA = 'spw.patch/1' as const
export const PATCH_PRODUCER = 'seed.patch' as const

/** Where a Patch may be held (retention only — not product identity). */
export type PatchStore = 'memory' | 'ir' | 'file'

/** What apply aims at. */
export type ApplyTargetKind = 'file' | 'files' | 'nodes'

/**
 * AST / surface selection that scopes patch production and apply.
 * Whole-file when only uri (or nothing) is set.
 */
export interface AstSelection {
  /** Repo-relative or opaque surface id. */
  uri?: string
  /** Content hash of the selected surface (or region when known). */
  contentHash?: string
  /** Byte span into the surface source. */
  span?: { start: number; end: number }
  /**
   * Query selector (SpwPattern object or opaque selector id string).
   * Node apply uses object form; string form is citation-only until resolved.
   */
  selector?: SpwPattern | string
  /** Nest-path skeleton pin (form geometry). */
  nestSkeleton?: string
  /** Optional nest labeled skeleton. */
  nestLabeled?: string
  /** Matched node types when selection was AST-driven. */
  nodeTypes?: string[]
}

/** Compact dual-read narrative (full ChangeReport optional). */
export interface PatchNarrative {
  identity: boolean
  layoutOnly: boolean
  pathMatch: boolean
  nestSkeletonEqual: boolean
  labelsEqual: boolean
  braceSeverity: string
  note: string
}

/**
 * Frozen patch product — collate until apply under channel ceiling.
 */
export interface Patch {
  version: typeof PATCH_VERSION
  schema: typeof PATCH_SCHEMA
  /** Product address (kind patch; retention store is separate). */
  ref: IrRef
  selection: AstSelection
  /** before → after differential (apply payload). */
  differential: SourceDifferential
  /** Optional full narrative from two-revision compare (sense delta). */
  report?: ChangeReport
  /** Compact narrative when full report is dropped for thrift. */
  narrative: PatchNarrative
  effectCeiling: EffectGrade
  /** Intended apply shape. */
  applyTarget: ApplyTargetKind
  /** Where this instance was last stored (not in irRefKey). */
  store: PatchStore
  /** ISO or beat stamp for human/session — not product identity. */
  stampedAt?: string
}

export interface BuildPatchOptions {
  uri?: string
  channel?: string
  dialect?: string
  selection?: AstSelection
  effectCeiling?: EffectGrade
  applyTarget?: ApplyTargetKind
  store?: PatchStore
  /** Include full ChangeReport (heavier). Default true. */
  includeReport?: boolean
  ruleId?: string
}

export interface ApplyPatchResult {
  ok: boolean
  source: string
  applied: number
  skipped: number
  reason?: string
  /** after content hash when ok */
  afterHash?: string
}

export interface FilePatchTarget {
  uri: string
  source: string
}

function hashSource(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function shortHash(s: string): string {
  return hashSource(s).slice(0, 16)
}

function narrativeFromReport(r: ChangeReport): PatchNarrative {
  return {
    identity: r.identity,
    layoutOnly: r.layoutOnly,
    pathMatch: r.ast.pathMatch,
    nestSkeletonEqual: r.ast.nest.skeletonEqual,
    labelsEqual: r.ast.nest.labelsEqual,
    braceSeverity: r.ast.brace.severity,
    note: r.note,
  }
}

function emptyNarrative(identity: boolean, note: string): PatchNarrative {
  return {
    identity,
    layoutOnly: false,
    pathMatch: identity,
    nestSkeletonEqual: identity,
    labelsEqual: identity,
    braceSeverity: identity ? 'none' : 'unknown',
    note,
  }
}

/** Build selection envelope from source (+ optional overrides). */
export function selectionFromSource(
  source: string,
  options: AstSelection = {},
): AstSelection {
  const nest = scanNestPaths(source)
  return {
    uri: options.uri,
    contentHash: options.contentHash ?? shortHash(source),
    span: options.span,
    selector: options.selector,
    nestSkeleton: options.nestSkeleton ?? nest.skeleton,
    nestLabeled: options.nestLabeled ?? nest.labeledSkeleton,
    nodeTypes: options.nodeTypes,
  }
}

/**
 * Two-revision Patch — primary path from spw delta / compare freeze.
 * Collate-only product until apply*.
 */
export function buildPatch(
  before: string,
  after: string,
  options: BuildPatchOptions = {},
): Patch {
  const includeReport = options.includeReport !== false
  const report = includeReport
    ? buildChangeReport(before, after, { uri: options.uri })
    : undefined
  const differential = differentialFromSources(
    before,
    after,
    options.ruleId ?? 'patch',
    'source',
    hashSource,
  )
  const selection = selectionFromSource(before, {
    ...options.selection,
    uri: options.selection?.uri ?? options.uri,
    contentHash: options.selection?.contentHash ?? shortHash(before),
  })

  const ref = irRef('patch', {
    uri: selection.uri,
    contentHash: shortHash(
      `${differential.beforeHash}|${differential.afterHash}|${selection.nestSkeleton ?? ''}`,
    ),
    dialect: options.dialect,
    channel: options.channel,
    schema: PATCH_SCHEMA,
    producer: PATCH_PRODUCER,
    lens: selection.selector
      ? {
          level: 'frame',
          id: typeof selection.selector === 'string'
            ? selection.selector
            : 'pattern',
        }
      : selection.span
        ? { level: 'body', id: `${selection.span.start}:${selection.span.end}` }
        : { level: 'file', id: 'whole' },
  })

  return {
    version: PATCH_VERSION,
    schema: PATCH_SCHEMA,
    ref,
    selection,
    differential,
    report,
    narrative: report
      ? narrativeFromReport(report)
      : emptyNarrative(
          differential.identity,
          differential.identity ? 'identity' : `edits=${differential.edits.length}`,
        ),
    effectCeiling: options.effectCeiling ?? 'effect.l1.memory',
    applyTarget: options.applyTarget ?? 'file',
    store: options.store ?? 'memory',
  }
}

/** Patch from an already-planned edit list (semantic plan / range plan). */
export function buildPatchFromEdits(
  before: string,
  edits: readonly SourceEdit[],
  options: BuildPatchOptions = {},
): Patch {
  const after = applyEdits(before, edits)
  return buildPatch(before, after, {
    ...options,
    ruleId: options.ruleId ?? 'patch_edits',
  })
}

function editsIntersectSpan(
  edit: SourceEdit,
  span: { start: number; end: number },
): boolean {
  return edit.start < span.end && edit.end > span.start
}

function nodeSpansFromSelector(
  source: string,
  selector: SpwPattern,
  ast?: ASTNode | null,
): Array<{ start: number; end: number; type: string }> {
  const root = ast !== undefined ? ast : parse(source).ast ?? null
  if (!root) return []
  const spans: Array<{ start: number; end: number; type: string }> = []
  for (const m of matchAll(root, selector)) {
    spans.push({
      start: m.node.span.start.offset,
      end: m.node.span.end.offset,
      type: m.node.type,
    })
  }
  return spans
}

/**
 * Restrict differential edits to a selection (span and/or selector nodes).
 * Whole-file selection returns all edits.
 */
export function filterEditsForSelection(
  source: string,
  edits: readonly SourceEdit[],
  selection: AstSelection,
  ast?: ASTNode | null,
): SourceEdit[] {
  if (!selection.span && !selection.selector) {
    return [...edits]
  }

  const zones: Array<{ start: number; end: number }> = []
  if (selection.span) zones.push(selection.span)

  if (selection.selector && typeof selection.selector !== 'string') {
    zones.push(
      ...nodeSpansFromSelector(source, selection.selector, ast).map(s => ({
        start: s.start,
        end: s.end,
      })),
    )
  }

  if (zones.length === 0) {
    return []
  }

  return edits.filter(e => zones.some(z => editsIntersectSpan(e, z)))
}

/**
 * Apply Patch to one source string.
 * When selection is node/span scoped, only intersecting edits apply.
 */
export function applyPatch(
  source: string,
  patch: Patch,
  options: {
    /** Re-check beforeHash against source (default true). */
    requireHashMatch?: boolean
    /** Override selection for this apply. */
    selection?: AstSelection
    ast?: ASTNode | null
  } = {},
): ApplyPatchResult {
  const requireHash = options.requireHashMatch !== false
  const beforeHash = hashSource(source)
  if (requireHash && beforeHash !== patch.differential.beforeHash) {
    return {
      ok: false,
      source,
      applied: 0,
      skipped: patch.differential.edits.length,
      reason: 'beforeHash mismatch — stale patch or wrong surface',
    }
  }

  const selection = options.selection ?? patch.selection
  const scoped = filterEditsForSelection(
    source,
    patch.differential.edits,
    selection,
    options.ast,
  )
  const skipped = patch.differential.edits.length - scoped.length

  if (
    selection.selector &&
    typeof selection.selector === 'string' &&
    !selection.span &&
    scoped.length === 0 &&
    patch.differential.edits.length > 0
  ) {
    return {
      ok: false,
      source,
      applied: 0,
      skipped: patch.differential.edits.length,
      reason: 'selector is citation-only string; provide SpwPattern or span for node apply',
    }
  }

  if (scoped.length === 0) {
    return {
      ok: true,
      source,
      applied: 0,
      skipped,
      reason: patch.differential.identity ? 'identity patch' : 'no edits in selection',
      afterHash: shortHash(source),
    }
  }

  try {
    const next = applyEdits(source, scoped)
    return {
      ok: true,
      source: next,
      applied: scoped.length,
      skipped,
      afterHash: shortHash(next),
    }
  } catch (err) {
    return {
      ok: false,
      source,
      applied: 0,
      skipped: patch.differential.edits.length,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Apply one Patch shape onto many files independently (hash check per source).
 */
export function applyPatchToFiles(
  targets: readonly FilePatchTarget[],
  patch: Patch,
  options: { requireHashMatch?: boolean } = {},
): Array<ApplyPatchResult & { uri: string }> {
  return targets.map(t => ({
    uri: t.uri,
    ...applyPatch(t.source, patch, {
      requireHashMatch: options.requireHashMatch,
      selection: { ...patch.selection, uri: t.uri },
    }),
  }))
}

/** In-memory patch bank keyed by irRefKey (session / host). */
export class PatchMemoryBank {
  private readonly map = new Map<string, Patch>()

  set(patch: Patch, store: PatchStore = 'memory'): Patch {
    const next = { ...patch, store }
    this.map.set(irRefKey(next.ref), next)
    return next
  }

  get(ref: IrRef | string): Patch | undefined {
    const key = typeof ref === 'string' ? ref : irRefKey(ref)
    return this.map.get(key)
  }

  delete(ref: IrRef | string): boolean {
    const key = typeof ref === 'string' ? ref : irRefKey(ref)
    return this.map.delete(key)
  }

  list(): Patch[] {
    return [...this.map.values()]
  }

  clear(): void {
    this.map.clear()
  }
}

/** Dual-read card for a patch (collate surface). */
export function formatPatchSpw(patch: Patch): string {
  const n = patch.narrative
  const sel = patch.selection
  return [
    `^["patch"]{`,
    `  ~#version: ${patch.version}`,
    `  ~#schema: ${patch.schema}`,
    `  ~#ref: "${irRefKey(patch.ref).replace(/"/g, '\\"')}"`,
    `  ~#store: ${patch.store}`,
    `  ~#applyTarget: ${patch.applyTarget}`,
    `  ~#ceiling: ${patch.effectCeiling}`,
    `  ~#before: ${patch.differential.beforeHash.slice(0, 16)}`,
    `  ~#after: ${patch.differential.afterHash.slice(0, 16)}`,
    `  ~#edits: ${patch.differential.edits.length}`,
    `  ~#identity: ${n.identity ? '#yes' : '#no'}`,
    `  ~#layoutOnly: ${n.layoutOnly ? '#yes' : '#no'}`,
    `  ~#pathMatch: ${n.pathMatch ? '#yes' : '#no'}`,
    `  ~#nest: ${n.nestSkeletonEqual ? '#eq' : '#moved'}`,
    `  ~#labels: ${n.labelsEqual ? '#eq' : '#moved'}`,
    `  ~#uri: ${sel.uri ? `~"${sel.uri.replace(/"/g, '\\"')}"` : '_'}`,
    `  ~#nestSkeleton: "${(sel.nestSkeleton ?? '').replace(/"/g, '\\"')}"`,
    `  ~#selectionSpan: ${
      sel.span ? `${sel.span.start}:${sel.span.end}` : '_'
    }`,
    `  ~#note: "${n.note.replace(/"/g, '\\"')}"`,
    `}`,
  ].join('\n')
}

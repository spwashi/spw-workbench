/**
 * Form context — caret-local coupling packet + gated label-mobility previews.
 *
 * Seed owns apply()/probes; this module maps them to LSP ranges/edits without
 * inventing a second structural model.
 */

import {
  applyMobilityRule,
  findNodePathAtOffset,
  normalizeToONF,
  offsetToPosition,
  positionToOffset,
  readCouplingFrame,
  resolveLabelContext,
  rulesFrom,
  type ASTNode,
  type CouplingFrame,
  type LabelPosition,
  type MobilityApplicationReceipt,
  type MobilityRule,
  type ParseHealth,
} from '@spwashi/spw-seed'
import type {
  LspCodeAction,
  LspHover,
  LspPosition,
  LspRange,
} from '../types'
import type { DocumentState } from '../server-index'

export interface CouplingPacket {
  kind: string
  form: 'boundary' | 'operator'
  surface: string
  occupancy?: 'empty' | 'inhabited'
  payload?: string
  arity?: number
  empty: boolean
  emptyState?: { occupancy: 'empty'; payload: 'void' }
  /** Digraph couple vs capsule must stay distinct in UI. */
  coupleVsCapsule: 'couple-operator' | 'capsule-boundary' | 'other-boundary' | 'n/a'
}

export interface MobilityCandidate {
  ruleId: string
  name: string
  status: MobilityRule['status']
  motion: MobilityRule['motion']
  rewrite: { before: string; after: string }
  gated: 'pass' | 'fail' | 'conceptual'
  reason?: string
  preview?: string
  receipt?: MobilityApplicationReceipt
  range?: LspRange
}

export interface FormContextAtPosition {
  uri: string
  revision: number
  offset: number
  nodeType: string | null
  label: string | null
  labelPosition: LabelPosition | null
  surface: { start: number; end: number } | null
  surfaceText: string | null
  coupling: CouplingPacket | null
  mobility: MobilityCandidate[]
  conceptual: MobilityCandidate[]
}

const HEALTH_RANK: Record<ParseHealth, number> = {
  complete_structured: 2,
  recovered: 1,
  invalid: 0,
}

const BOUNDARY_NODE_TYPES = new Set([
  'Frame',
  'Body',
  'Scope',
  'Capsule',
  'Stream',
  'NRange',
])

function spanToRange(source: string, start: number, end: number): LspRange {
  return {
    start: offsetToPosition(source, start),
    end: offsetToPosition(source, end),
  }
}

function couplingPacketFromFrame(frame: CouplingFrame): CouplingPacket {
  if (frame.form === 'operator') {
    return {
      kind: frame.kind,
      form: 'operator',
      surface: frame.surface,
      arity: frame.arity,
      empty: frame.arity === 0,
      coupleVsCapsule: 'couple-operator',
    }
  }

  const empty = frame.occupancy === 'empty'
  return {
    kind: frame.kind,
    form: 'boundary',
    surface: frame.surface,
    occupancy: frame.occupancy,
    payload: frame.payload,
    empty,
    emptyState: empty ? { occupancy: 'empty', payload: 'void' } : undefined,
    coupleVsCapsule: frame.kind === 'capsule' ? 'capsule-boundary' : 'other-boundary',
  }
}

function findCouplingNode(path: ASTNode[]): ASTNode | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]
    if (BOUNDARY_NODE_TYPES.has(node.type)) return node
    if (node.type === 'Operation') {
      const kind = (node as { operator?: { kind?: string; value?: string } }).operator?.kind
        ?? (node as { operator?: { value?: string } }).operator?.value
      if (kind === '<>') return node
    }
  }
  return null
}

function readCouplingAtPath(path: ASTNode[]): CouplingPacket | null {
  const node = findCouplingNode(path)
  if (!node) return null
  try {
    const onf = normalizeToONF(node)
    const frame = readCouplingFrame(onf.frames)
    return frame ? couplingPacketFromFrame(frame) : null
  } catch {
    return null
  }
}

function gateReceipt(
  rule: MobilityRule,
  receipt: MobilityApplicationReceipt,
): { ok: true } | { ok: false; reason: string } {
  if (receipt.afterHealth === 'invalid') {
    return { ok: false, reason: 'after parse health is invalid' }
  }
  if (HEALTH_RANK[receipt.afterHealth] < HEALTH_RANK[receipt.beforeHealth]) {
    return { ok: false, reason: `parse health regressed (${receipt.beforeHealth} → ${receipt.afterHealth})` }
  }
  // Declared inverse must round-trip on the trimmed surface when computational.
  if (rule.inverse) {
    if (receipt.inverse.status === 'failed' || receipt.inverse.status === 'unavailable') {
      return { ok: false, reason: `inverse ${rule.inverse} ${receipt.inverse.status}` }
    }
    if (receipt.inverse.status === 'changed') {
      return { ok: false, reason: `inverse ${rule.inverse} changed surface (not exact)` }
    }
  }
  // Topography loss: reject if structured markers collapse unexpectedly without motion claiming fold.
  const delta = receipt.topographyDelta
  if (delta && typeof delta === 'object') {
    const lost = (delta as { lostMarkers?: unknown }).lostMarkers
    if (Array.isArray(lost) && lost.length > 0 && rule.motion !== 'fold' && rule.motion !== 'egress') {
      return { ok: false, reason: `unexpected marker loss: ${lost.join(',')}` }
    }
  }
  return { ok: true }
}

function buildMobilityCandidates(
  source: string,
  label: string,
  position: LabelPosition,
  surface: { start: number; end: number },
): { actionable: MobilityCandidate[]; conceptual: MobilityCandidate[] } {
  const surfaceText = source.slice(surface.start, surface.end)
  const range = spanToRange(source, surface.start, surface.end)
  const actionable: MobilityCandidate[] = []
  const conceptual: MobilityCandidate[] = []

  for (const rule of rulesFrom(position)) {
    const base: MobilityCandidate = {
      ruleId: rule.id,
      name: rule.name,
      status: rule.status,
      motion: rule.motion,
      rewrite: {
        before: rule.rewrite.before.replace(/\$L/g, label),
        after: rule.rewrite.after.replace(/\$L/g, label),
      },
      gated: 'fail',
      range,
    }

    if (rule.status === 'proposed' || (rule.status === 'partial' && !rule.apply)) {
      conceptual.push({
        ...base,
        gated: 'conceptual',
        reason: rule.status === 'proposed' ? 'proposed — conceptual only' : 'partial — no computational apply',
      })
      continue
    }

    if (!rule.apply || rule.status !== 'implemented') {
      conceptual.push({
        ...base,
        gated: 'conceptual',
        reason: `status ${rule.status} without gated apply`,
      })
      continue
    }

    const application = applyMobilityRule(rule.id, surfaceText, label)
    if (!application.ok) {
      actionable.push({
        ...base,
        gated: 'fail',
        reason: application.reason,
      })
      continue
    }

    const gate = gateReceipt(rule, application.receipt)
    if (!gate.ok) {
      actionable.push({
        ...base,
        gated: 'fail',
        reason: gate.reason,
        preview: application.source,
        receipt: application.receipt,
      })
      continue
    }

    actionable.push({
      ...base,
      gated: 'pass',
      preview: application.source,
      receipt: application.receipt,
    })
  }

  return { actionable, conceptual }
}

/**
 * Assemble caret-local form context from a parsed document.
 */
export function assembleFormContext(
  doc: DocumentState,
  position: LspPosition,
): FormContextAtPosition | null {
  const source = doc.text
  const offset = positionToOffset(source, position)
  const ast = doc.parseResult?.ast as ASTNode | undefined
  if (!ast) {
    return {
      uri: doc.uri,
      revision: doc.version,
      offset,
      nodeType: null,
      label: null,
      labelPosition: null,
      surface: null,
      surfaceText: null,
      coupling: null,
      mobility: [],
      conceptual: [],
    }
  }

  const path = findNodePathAtOffset(ast, offset)
  const labelCtx = resolveLabelContext(path, source)
  const coupling = readCouplingAtPath(path)

  let mobility: MobilityCandidate[] = []
  let conceptual: MobilityCandidate[] = []
  if (labelCtx.label && labelCtx.surface) {
    const built = buildMobilityCandidates(
      source,
      labelCtx.label,
      labelCtx.position,
      labelCtx.surface,
    )
    mobility = built.actionable
    conceptual = built.conceptual
  }

  return {
    uri: doc.uri,
    revision: doc.version,
    offset,
    nodeType: path[path.length - 1]?.type ?? null,
    label: labelCtx.label,
    labelPosition: labelCtx.label ? labelCtx.position : (coupling ? labelCtx.position : null),
    surface: labelCtx.surface,
    surfaceText: labelCtx.surface
      ? source.slice(labelCtx.surface.start, labelCtx.surface.end)
      : null,
    coupling,
    mobility,
    conceptual,
  }
}

/**
 * Markdown hover for coupling + label site (S0 topography read).
 */
export function formatFormContextHover(ctx: FormContextAtPosition): string | null {
  const parts: string[] = []

  if (ctx.coupling) {
    const c = ctx.coupling
    parts.push(`**Form coupling** — *${c.form}*`)
    parts.push('')
    parts.push(`- kind: \`${c.kind}\``)
    parts.push(`- surface: \`${c.surface}\``)
    if (c.form === 'boundary') {
      parts.push(`- occupancy: \`${c.occupancy}\``)
      parts.push(`- payload: \`${c.payload}\``)
      if (c.empty && c.emptyState) {
        parts.push(`- empty state: occupancy \`${c.emptyState.occupancy}\`, payload \`${c.emptyState.payload}\``)
      } else {
        parts.push(`- empty: \`${c.empty}\``)
      }
    } else {
      parts.push(`- arity: \`${c.arity}\``)
      parts.push(`- note: digraph \`<>\` is operator coupling (not capsule \`<…>\`)`)
    }
    if (c.coupleVsCapsule === 'couple-operator') {
      parts.push('- distinction: **couple operator** `<>` ≠ capsule boundary')
    } else if (c.coupleVsCapsule === 'capsule-boundary') {
      parts.push('- distinction: **capsule boundary** `<…>` ≠ digraph couple')
    }
  }

  if (ctx.label && ctx.labelPosition) {
    if (parts.length) parts.push('')
    parts.push(`**Label site** — \`${ctx.label}\``)
    parts.push('')
    parts.push(`- site: \`${ctx.labelPosition.site}\``)
    parts.push(`- liminal: \`${ctx.labelPosition.liminal}\``)
    if (ctx.labelPosition.boundary) {
      parts.push(`- boundary: \`${ctx.labelPosition.boundary}\``)
    }
    if (ctx.surfaceText) {
      parts.push(`- surface: \`${ctx.surfaceText}\``)
    }
  }

  const passing = ctx.mobility.filter(m => m.gated === 'pass')
  if (passing.length > 0) {
    parts.push('')
    parts.push('**Mobility** (previewable)')
    for (const m of passing.slice(0, 6)) {
      parts.push(`- \`${m.ruleId}\`: \`${m.rewrite.before}\` → \`${m.preview ?? m.rewrite.after}\``)
    }
  }

  const conceptual = ctx.conceptual.slice(0, 4)
  if (conceptual.length > 0) {
    parts.push('')
    parts.push('**Conceptual** (not applied)')
    for (const m of conceptual) {
      parts.push(`- \`${m.ruleId}\` _${m.status}_: ${m.reason ?? m.name}`)
    }
  }

  if (parts.length === 0) return null
  return parts.join('\n')
}

export function formContextHover(
  doc: DocumentState,
  position: LspPosition,
): LspHover | null {
  const ctx = assembleFormContext(doc, position)
  if (!ctx) return null
  const md = formatFormContextHover(ctx)
  if (!md) return null

  const range = ctx.surface
    ? spanToRange(doc.text, ctx.surface.start, ctx.surface.end)
    : undefined

  return {
    contents: { kind: 'markdown', value: md },
    range,
  }
}

/**
 * Gated label-mobility code actions (S1 plan → S2 only on user accept via workspace edit).
 */
export function formContextCodeActions(
  doc: DocumentState,
  position: LspPosition,
): LspCodeAction[] {
  const ctx = assembleFormContext(doc, position)
  if (!ctx?.label || !ctx.surface) return []

  const actions: LspCodeAction[] = []
  const range = spanToRange(doc.text, ctx.surface.start, ctx.surface.end)

  for (const candidate of ctx.mobility) {
    if (candidate.gated !== 'pass' || !candidate.preview) continue
    // Revision must match the document we previewed against.
    if (candidate.receipt && doc.version !== ctx.revision) continue

    actions.push({
      title: `Spw mobility: ${candidate.name} (${candidate.ruleId})`,
      kind: 'refactor.rewrite',
      edit: {
        changes: {
          [doc.uri]: [
            {
              range,
              newText: candidate.preview,
            },
          ],
        },
      },
    })
  }

  return actions
}


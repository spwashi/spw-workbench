/**
 * LSP dual-read for workspace graph / temperature — formatSpwCard only.
 * Always on the wire with structured fields; no opt-in.
 *
 * @see packages/spw-seed/src/canonical/corpus-disclosure.ts
 * @see packages/spw-lsp/src/handlers/reference-graph.ts
 */

import { facet, formatSpwCard, type SpwCardPart } from '@spwashi/spw-seed'
import type { ReferenceGraphReport } from './reference-graph'
import type { WorkspaceTemperatureEntry } from './workspace'

/** Dual-read for spw/referenceGraph. */
export function formatReferenceGraphSpw(report: ReferenceGraphReport): string {
  const hubParts: SpwCardPart[] = report.hubs.map(h =>
    facet.group('hub', [
      facet.path('of', h.path),
      facet.atom('in', h.inbound),
      facet.atom('out', h.outbound),
      facet.atom('degree', h.inbound + h.outbound),
      facet.list('referrers', h.referrers.slice(0, 12)),
    ]),
  )

  return formatSpwCard('reference_graph', [
    facet.group('product', [
      facet.atom('surfaces', report.surfaces),
      facet.atom('edges', report.edges),
      facet.atom('external', report.external),
      facet.atom('unresolved', report.unresolved),
      facet.atom('plane', 'lsp_reference_graph'),
    ]),
    facet.group('hubs', hubParts),
    facet.list('orphans', report.orphans),
  ])
}

/** Dual-read for spw/workspaceTemperature (retention tier, not ocean warmth). */
export function formatWorkspaceTemperatureSpw(
  entries: readonly WorkspaceTemperatureEntry[],
  options: { limit?: number } = {},
): string {
  const limit = options.limit ?? 24
  const shown = entries.slice(0, limit)
  const parts: SpwCardPart[] = [
    facet.group('product', [
      facet.atom('n', entries.length),
      facet.atom('shown', shown.length),
      facet.atom('plane', 'lsp_retention_tier'),
      facet.str('note', 'tier is access age; not beat-cache warmth'),
    ]),
  ]
  for (const e of shown) {
    parts.push(
      facet.group('surface', [
        facet.str('uri', e.uri),
        facet.atom('tier', e.tier),
        facet.atom('volatility', e.volatility),
        facet.atom('accessAge', e.accessAgeRequests),
        facet.atom('writes', e.writeCount),
      ]),
    )
  }
  if (entries.length > shown.length) {
    parts.push(facet.atom('more', entries.length - shown.length))
  }
  return formatSpwCard('workspace_temperature', parts)
}

export interface ReferenceGraphEnvelope extends ReferenceGraphReport {
  dualReadSpw: string
}

export interface WorkspaceTemperatureEnvelope {
  entries: WorkspaceTemperatureEntry[]
  dualReadSpw: string
}

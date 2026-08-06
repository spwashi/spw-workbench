/**
 * Corpus / population / topography dual-read — formatSpwCard only.
 *
 * Avoid hand-rolled Spw string assembly; keep disclosure structure in facet trees
 * so escaping, lists, paths, and nesting stay one code path.
 *
 * @see docs/theory/spw/representational-disclosure.spw
 * @see packages/spw-seed/src/math/corpus.ts (product types)
 */

import type {
  CorpusProduct,
  PopulationRow,
  TopographyReport,
} from '../math/corpus'
import { facet, formatSpwCard, formatSpwCards, type SpwCardPart } from './spw-card'

/** Dual-read population rows — path facets, not free-form path frames. */
export function formatPopulationSpw(
  rows: readonly PopulationRow[],
  options: { among?: string[]; limit?: number } = {},
): string {
  const limit = options.limit ?? 40
  const shown = rows.slice(0, limit)
  const among = options.among ?? []

  const rowParts: SpwCardPart[] = shown.map(r =>
    facet.group('row', [
      facet.path('of', r.file),
      facet.atom('role', r.role),
      facet.atom('lines', r.lines),
      facet.atom('degree', r.inDegree + r.outDegree),
      facet.atom('in', r.inDegree),
      facet.atom('out', r.outDegree),
      facet.atom('pathRefs', r.pathRefs),
      facet.atom('rootRefs', r.rootRefs),
      facet.atom('frames', r.frames),
      facet.str('sigils', r.sigilTop || undefined),
    ]),
  )

  return formatSpwCard('population', [
    facet.list('among', among),
    facet.atom('n', rows.length),
    facet.atom('shown', shown.length),
    ...(rows.length > shown.length
      ? [facet.atom('more', rows.length - shown.length)]
      : []),
    ...rowParts,
  ])
}

/** Dual-read topography / graph product. */
export function formatTopographySpw(
  topo: TopographyReport,
  options: {
    among?: string[]
    label?: string
    memo?: string
    hubLimit?: number
    brokenLimit?: number
  } = {},
): string {
  const hubLimit = options.hubLimit ?? 12
  const brokenLimit = options.brokenLimit ?? 24
  const among = options.among ?? []

  const hubParts: SpwCardPart[] = topo.hubs.slice(0, hubLimit).map(h =>
    facet.group('hub', [
      facet.path('of', h.id),
      facet.atom('in', h.inDegree),
      facet.atom('out', h.outDegree),
      facet.atom('degree', h.total),
    ]),
  )

  const strandParts: SpwCardPart[] = topo.strands.slice(0, 12).map(s =>
    facet.group('strand', [
      facet.atom('id', s.id),
      facet.atom('score', Number(s.score.toFixed(3))),
      facet.str('detail', s.detail.slice(0, 64) || undefined),
    ]),
  )

  const broken = topo.brokenTargets.slice(0, brokenLimit)
  const parts: SpwCardPart[] = [
    facet.group('product', [
      facet.atom('view', options.label ?? '_'),
      facet.list('among', among),
      facet.atom('files', topo.files),
      facet.atom('links', topo.links),
      facet.flag('cyclic', topo.cyclic),
      facet.atom('under', options.memo ?? '_'),
    ]),
  ]

  if (topo.cyclic && topo.cycleWitness?.length) {
    parts.push(facet.list('cycle', topo.cycleWitness))
  }

  if (hubParts.length) {
    parts.push(facet.group('hubs', hubParts))
  }

  if (strandParts.length) {
    parts.push(facet.group('strands', strandParts))
  }

  if (broken.length) {
    parts.push(
      facet.group('broken', [
        facet.list('targets', broken),
        ...(topo.brokenTargets.length > broken.length
          ? [facet.atom('more', topo.brokenTargets.length - broken.length)]
          : []),
      ]),
    )
  }

  if (topo.orphans.length > 0 && topo.orphans.length <= 24) {
    parts.push(facet.list('orphans', topo.orphans))
  }

  return formatSpwCard('graph', parts)
}

/** Corpus product dual-read: head card + optional population card. */
export function formatCorpusProductSpw(
  product: CorpusProduct,
  options: { rowLimit?: number; includeRows?: boolean } = {},
): string {
  const includeRows = options.includeRows !== false
  const rowLimit = options.rowLimit ?? 24
  const roleBits = Object.entries(product.stats.byRole)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')

  const head = formatSpwCard('corpus', [
    facet.group('product', [
      facet.atom('version', product.version),
      facet.atom('fingerprint', product.fingerprint.slice(0, 16)),
      facet.list('among', product.roots),
      facet.atom('files', product.stats.files),
      facet.atom('lines', product.stats.lines),
      facet.atom('links', product.topography.links),
      facet.flag('cyclic', product.topography.cyclic),
      facet.atom('under', product.memoPlane ?? 'fresh'),
      facet.str('roles', roleBits || undefined),
      facet.atom('broken', product.topography.brokenTargets.length),
    ]),
    facet.group('hubs', [
      facet.list(
        'paths',
        product.topography.hubs.slice(0, 8).map(h => h.id),
      ),
    ]),
  ])

  if (!includeRows) return head

  const pop = formatPopulationSpw(product.population, {
    among: product.roots,
    limit: rowLimit,
  })
  return formatSpwCards([head, pop])
}

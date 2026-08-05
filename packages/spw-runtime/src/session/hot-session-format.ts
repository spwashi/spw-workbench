/**
 * Dual-read Spw disclosure for hot inspect / cite products.
 *
 * Nested frames per representational-disclosure doctrine.
 */

import {
  formatGranularityAsSpw,
  formatResonanceAsSpw,
  formatSpwCard,
  facet,
  type Granularity,
} from '@spwashi/spw-seed'
import type { StabilityChannel } from './channels'
import type { HotCiteHandle, HotInspectRecord } from './hot-session-types'

/** Spw-native inspect surface (not JSON) for agents/humans. */
export function formatInspectSpw(
  card: HotInspectRecord,
  grain: Granularity,
  pointer: string,
  options: { path?: string; channel: StabilityChannel },
): string {
  const p = card.dialectPolicy
  const receipt = card.prepared.pathReceipt
  const header = [
    `// hot-inspect  channel=${options.channel}  beat=${card.atBeat}`,
    `@dialect:${card.prepared.stack.dialect}`,
    `^seed[Hot.Inspect v:0.1 @profile:${card.prepared.stack.dialect} @intent:inspect]`,
    formatGranularityAsSpw(grain),
  ].join('\n')

  const policy = formatSpwCard('policy', [
    facet.str('subject', p.subject),
    facet.atom('cacheTier', p.cacheTier),
    facet.atom('resonanceScheme', grain.resonanceScheme),
    facet.list('opt', [...p.optHandles]),
    facet.str('literacy', p.literacy),
  ])

  const pathReceipt = formatSpwCard('path_receipt', [
    facet.atom('originalHash', receipt.originalHash),
    facet.atom('preparedHash', receipt.preparedHash),
    facet.flag('preprocessed', receipt.preprocessed),
    facet.atom('dialectSource', receipt.dialectSource),
    facet.atom('schema', receipt.schema),
  ])

  const fixity = formatSpwCard('fixity', [
    facet.atom('prefix', card.fixityCounts.prefix),
    facet.atom('postfix', card.fixityCounts.postfix),
    facet.atom('infix', card.fixityCounts.infix),
    facet.atom('none', card.fixityCounts.none),
  ])

  const medium = formatSpwCard('medium', [
    facet.atom('channel', card.medium.channel),
    facet.atom('dialect', card.medium.dialect),
    facet.atom('ceiling', card.medium.effectCeiling),
    facet.atom('follow', card.medium.maxFollowDefault),
    facet.atom('plane', card.medium.defaultPlane),
    facet.flag('collateOnly', card.medium.collateOnly),
  ])

  const cardBlock = formatSpwCard('card', [
    facet.path('path', options.path),
    facet.atom('mask', card.bytecode.contentHash),
    facet.atom('preparedHash', card.contentHash),
    facet.atom('plane', grain.plane),
    facet.atom('grain', grain.depth),
    facet.atom('pointer', pointer),
    facet.flag('parseOk', card.parse.success),
    facet.flag('inspectHit', card.cacheHit),
  ])

  return [
    header,
    policy,
    pathReceipt,
    fixity,
    medium,
    cardBlock,
    formatResonanceAsSpw(card.geometric, options.path),
  ].join('\n')
}

/**
 * Dual-read cite card — uri + mask + grain; pointer is mask facet for follow interop.
 * Soft tags are not first-class; use @bind or ~# cells for human names.
 */
export function formatCiteSpw(
  handle: HotCiteHandle,
  sessionChannel: StabilityChannel,
): string {
  const r = handle.inspect?.prepared.pathReceipt
  const mask = handle.ref.contentHash ?? handle.pointer.replace(/^@bc:/, '')
  const parts = [
    facet.path('uri', handle.path),
    facet.atom('mask', mask),
    facet.atom('plane', handle.grain.plane),
    facet.atom('grain', handle.grain.depth),
    facet.atom('follow', handle.grain.follow),
    facet.atom('channel', handle.ref.channel ?? sessionChannel),
    facet.atom('dialect', handle.ref.dialect ?? '_'),
    facet.atom('schema', handle.ref.schema ?? 'spw.geometry.bc/1'),
    facet.atom(
      'preparedHash',
      r?.preparedHash ?? handle.inspect?.contentHash ?? '_',
    ),
  ]
  if (r) parts.push(facet.flag('preprocessed', r.preprocessed))
  parts.push(facet.atom('pointer', handle.pointer))

  return [
    `// cite  dual-read point arm`,
    formatSpwCard('cite', parts),
  ].join('\n')
}

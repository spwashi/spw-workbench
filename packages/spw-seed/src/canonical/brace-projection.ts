/**
 * BraceProjection — declared semantic surface for paired boundaries.
 *
 * Layout-only claims must preserve this projection under same-profile reparse.
 * Kind, placement, and channel drift are structure (or stronger), never format.
 *
 * @see docs/theory/spw/operational-devices.spw (pair_preservation, semantic differential)
 * @see docs/theory/spw/inline-composites.spw
 * @see packages/spw-seed/src/canonical/topography-probe.ts
 */

import { parse } from '../parser'
import type { ASTNode } from '../types/ast'
import { walkAST } from '../instrumentation/audit'

export type BraceKind = 'scope' | 'frame' | 'body' | 'capsule' | 'stream' | 'nrange'

export interface BraceKindCounts {
  scope: number
  frame: number
  body: number
  capsule: number
  stream: number
  nrange: number
}

export type BracePlacement = 'shell' | 'medial'

export interface BraceProjection {
  kinds: BraceKindCounts
  coupleOps: number
  medials: number
  shells: number
  /** Sorted multiset of channel atoms (capsule tags / numeric channels). */
  channels: string[]
  /** Stable fingerprint for equality (kinds + couple + medials + channels). */
  signature: string
}

export type BraceDeltaSeverity =
  | 'none'
  | 'layout_ok'
  | 'channel'
  | 'placement'
  | 'kind'
  | 'couple'

export interface BraceProjectionDelta {
  equal: boolean
  severity: BraceDeltaSeverity
  kindDeltas: BraceKindCounts
  coupleOpsDelta: number
  medialsDelta: number
  shellsDelta: number
  channelsAdded: string[]
  channelsRemoved: string[]
  findings: string[]
}

export type MutationUseClass =
  | 'noop'
  | 'layout_safe'
  | 'review_channel'
  | 'review_structure'
  | 'refuse_health'
  | 'unknown'

export interface MutationUsefulness {
  class: MutationUseClass
  /** One-line action for agents / CLI */
  advice: string
  /** Whether a layout-profile --write should be allowed (projection-stable) */
  writeSafeLayout: boolean
  findings: string[]
}

function emptyKinds(): BraceKindCounts {
  return { scope: 0, frame: 0, body: 0, capsule: 0, stream: 0, nrange: 0 }
}

function pairedKind(node: ASTNode): BraceKind | null {
  switch (node.type) {
    case 'Scope':
      return 'scope'
    case 'Frame':
      return 'frame'
    case 'Body':
      return 'body'
    case 'Capsule':
      return 'capsule'
    case 'Stream':
      return 'stream'
    case 'NRange':
      return 'nrange'
    default:
      return null
  }
}

function channelOfCapsule(node: ASTNode): string | null {
  const cap = node as {
    type: string
    tag?: { value?: string }
    channel?: { type?: string; token?: { value?: string } }
    placement?: string
    left?: unknown
    right?: unknown
  }
  if (cap.type !== 'Capsule') return null
  if (cap.tag?.value) return cap.tag.value
  if (cap.channel?.token?.value != null) return String(cap.channel.token.value)
  return null
}

function isMedialCapsule(node: ASTNode): boolean {
  const cap = node as { type: string; placement?: string; left?: unknown; right?: unknown }
  if (cap.type !== 'Capsule') return false
  return cap.placement === 'medial' || cap.left != null || cap.right != null
}

function signatureOf(
  kinds: BraceKindCounts,
  coupleOps: number,
  medials: number,
  shells: number,
  channels: string[],
): string {
  const kindPart = (Object.keys(kinds) as (keyof BraceKindCounts)[])
    .map(k => `${k}:${kinds[k]}`)
    .join(',')
  return `k{${kindPart}}|c${coupleOps}|m${medials}|s${shells}|ch[${channels.join('|')}]`
}

/**
 * Extract BraceProjection from parsed AST (or parse source if string given).
 */
export function extractBraceProjection(sourceOrAst: string | ASTNode | null | undefined): BraceProjection {
  const kinds = emptyKinds()
  let coupleOps = 0
  let medials = 0
  let shells = 0
  const channelBag: string[] = []

  let root: ASTNode | null | undefined =
    typeof sourceOrAst === 'string' ? parse(sourceOrAst).ast ?? null : sourceOrAst

  if (!root) {
    return {
      kinds,
      coupleOps: 0,
      medials: 0,
      shells: 0,
      channels: [],
      signature: signatureOf(kinds, 0, 0, 0, []),
    }
  }

  walkAST(root, node => {
    const kind = pairedKind(node)
    if (kind) {
      kinds[kind] += 1
      if (kind === 'capsule') {
        if (isMedialCapsule(node)) medials += 1
        else shells += 1
        const ch = channelOfCapsule(node)
        if (ch != null && ch !== '') channelBag.push(ch)
      }
    }
    if (
      node.type === 'Operation' &&
      (node as { operator?: { value?: string } }).operator?.value === '<>'
    ) {
      coupleOps += 1
    }
  })

  const channels = [...channelBag].sort()
  return {
    kinds,
    coupleOps,
    medials,
    shells,
    channels,
    signature: signatureOf(kinds, coupleOps, medials, shells, channels),
  }
}

function multisetDiff(before: string[], after: string[]): { added: string[]; removed: string[] } {
  const b = [...before]
  const a = [...after]
  const removed: string[] = []
  const added: string[] = []
  for (const x of b) {
    const i = a.indexOf(x)
    if (i >= 0) a.splice(i, 1)
    else removed.push(x)
  }
  for (const x of a) added.push(x)
  return { added, removed }
}

export function braceProjectionDelta(
  before: BraceProjection,
  after: BraceProjection,
): BraceProjectionDelta {
  const kindDeltas = emptyKinds()
  let kindMoved = false
  for (const k of Object.keys(kindDeltas) as (keyof BraceKindCounts)[]) {
    kindDeltas[k] = after.kinds[k] - before.kinds[k]
    if (kindDeltas[k] !== 0) kindMoved = true
  }

  const coupleOpsDelta = after.coupleOps - before.coupleOps
  const medialsDelta = after.medials - before.medials
  const shellsDelta = after.shells - before.shells
  const { added: channelsAdded, removed: channelsRemoved } = multisetDiff(
    before.channels,
    after.channels,
  )

  const findings: string[] = []
  if (kindMoved) {
    const parts = (Object.entries(kindDeltas) as [string, number][])
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`)
    findings.push(`brace kinds: ${parts.join(' ')}`)
  }
  if (coupleOpsDelta !== 0) {
    findings.push(`couple ops Δ=${coupleOpsDelta > 0 ? '+' : ''}${coupleOpsDelta}`)
  }
  if (medialsDelta !== 0 || shellsDelta !== 0) {
    findings.push(
      `placement medialsΔ=${medialsDelta > 0 ? '+' : ''}${medialsDelta} shellsΔ=${shellsDelta > 0 ? '+' : ''}${shellsDelta}`,
    )
  }
  if (channelsAdded.length || channelsRemoved.length) {
    const bits: string[] = []
    if (channelsAdded.length) bits.push(`+${channelsAdded.join(',')}`)
    if (channelsRemoved.length) bits.push(`-${channelsRemoved.join(',')}`)
    findings.push(`channels ${bits.join(' ')}`)
  }

  const equal = before.signature === after.signature
  let severity: BraceDeltaSeverity = 'none'
  if (!equal) {
    if (kindMoved) severity = 'kind'
    else if (coupleOpsDelta !== 0) severity = 'couple'
    else if (medialsDelta !== 0 || shellsDelta !== 0) severity = 'placement'
    else if (channelsAdded.length || channelsRemoved.length) severity = 'channel'
    else severity = 'kind'
  } else {
    severity = 'layout_ok'
  }

  return {
    equal,
    severity: equal ? 'none' : severity,
    kindDeltas,
    coupleOpsDelta,
    medialsDelta,
    shellsDelta,
    channelsAdded,
    channelsRemoved,
    findings,
  }
}

/**
 * Classify a planned mutation for agents: what to do next.
 */
export function classifyMutationUsefulness(input: {
  changed: boolean
  healthRegressed: boolean
  parseHealthy: boolean
  braceEqual: boolean
  structureMoved: boolean
  layoutOnlyCandidate: boolean
  layoutVectorPositive: boolean
  nonLayoutVectorAxes: boolean
}): MutationUsefulness {
  const findings: string[] = []
  if (!input.changed) {
    return {
      class: 'noop',
      advice: 'No planned edits — fixed point; nothing to apply.',
      writeSafeLayout: false,
      findings,
    }
  }
  if (input.healthRegressed || !input.parseHealthy) {
    findings.push('parse health regressed or unhealthy')
    return {
      class: 'refuse_health',
      advice: 'Refuse write — restore parse health before mutation.',
      writeSafeLayout: false,
      findings,
    }
  }
  if (!input.braceEqual) {
    findings.push('brace projection drifted (kind/placement/channel)')
    return {
      class: 'review_structure',
      advice:
        'Review structure — brace projection changed; not a layout-only pulse. Use --diff and inspect channels/kinds.',
      writeSafeLayout: false,
      findings,
    }
  }
  if (input.structureMoved) {
    findings.push('structure metrics moved with brace projection stable')
    return {
      class: 'review_structure',
      advice: 'Review structure — depth/container counts moved; confirm intentional.',
      writeSafeLayout: false,
      findings,
    }
  }
  if (
    input.layoutOnlyCandidate &&
    input.layoutVectorPositive &&
    !input.nonLayoutVectorAxes
  ) {
    return {
      class: 'layout_safe',
      advice:
        'Layout-safe candidate — brace projection stable; --write layout_canonical allowed if policy matches.',
      writeSafeLayout: true,
      findings: ['brace projection equal', 'layout-only topography candidate'],
    }
  }
  return {
    class: 'unknown',
    advice:
      'Changed but not classified as layout-safe — inspect vector axes and --diff before write.',
    writeSafeLayout: false,
    findings: ['surface or script axes moved without full layout-only evidence'],
  }
}

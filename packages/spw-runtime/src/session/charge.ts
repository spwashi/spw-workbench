/**
 * Portable charge carriers — value · subject · substrate.
 *
 * Valence (boon/bane/…) is material *quality*. Charge here is field quantity:
 * what crawls, caches, and crystallizes across hosts.
 *
 * @see docs/theory/spw/brace-charge-crawl.spw
 * @see docs/theory/spw/valence-architecture.spw
 */

import type { RuntimeValue } from '../state/types'

/** How charge is carried across CLI / session / envelope. */
export type ChargeCarrierKind = 'value' | 'subject' | 'substrate'

/** Lifecycle of a charge quantum. */
export type ChargeState =
  | 'latent'
  | 'potentiated'
  | 'bound'
  | 'mobile'
  | 'discharged'
  | 'shielded'

export interface ChargeProvenance {
  /** Subject uri or root id when known. */
  subject?: string
  /** Substrate / session id when known. */
  substrate?: string
  /** contentHash of source that produced the value. */
  contentHash?: string
  /** Dialect at production. */
  dialect?: string
  /** Channel at production. */
  channel?: string
  /** Beat when sealed. */
  bornBeat?: number
}

/**
 * Portable charge packet. Prefer always filling provenance when exporting.
 */
export interface ChargePacket {
  kind: ChargeCarrierKind
  state: ChargeState
  /** Collapsed product when kind=value (or snapshot of subject). */
  value?: RuntimeValue
  /** Address / pathref / register key for subject. */
  address?: string
  provenance: ChargeProvenance
}

export function makeValueCharge(
  value: RuntimeValue,
  provenance: ChargeProvenance = {},
  state: ChargeState = 'bound',
): ChargePacket {
  return { kind: 'value', state, value, provenance: { ...provenance } }
}

export function makeSubjectCharge(
  address: string,
  provenance: ChargeProvenance = {},
  state: ChargeState = 'potentiated',
): ChargePacket {
  return {
    kind: 'subject',
    state,
    address,
    provenance: { subject: address, ...provenance },
  }
}

export function makeSubstrateCharge(
  substrateId: string,
  provenance: ChargeProvenance = {},
  state: ChargeState = 'bound',
): ChargePacket {
  return {
    kind: 'substrate',
    state,
    address: substrateId,
    provenance: { substrate: substrateId, ...provenance },
  }
}

/**
 * Portability score heuristic (0–1) for doctor / envelope hints.
 * Not a physical force — disclosure aid only.
 */
export function portabilityHint(packet: ChargePacket): number {
  const p = packet.provenance
  let score = 0
  if (packet.kind === 'value' && packet.value !== undefined) score += 0.35
  if (p.subject || packet.kind === 'subject') score += 0.25
  if (p.substrate || packet.kind === 'substrate') score += 0.15
  if (p.contentHash) score += 0.15
  if (p.dialect && p.channel) score += 0.1
  return Math.min(1, score)
}

/** True when export is leaky (value without subject/substrate provenance). */
export function isLeakyPortable(packet: ChargePacket): boolean {
  if (packet.kind !== 'value') return false
  const p = packet.provenance
  return !p.subject && !p.substrate && !p.contentHash
}

/**
 * Field coordinate brands — nominal types for clocks and content identity.
 *
 * RequestEpoch (LSP protocol traffic) and SessionBeat (runtime retention)
 * must not be assignable to each other or used as product-key material.
 *
 * @see docs/theory/spw/operational-field.spw
 */

import { castToBrand, type Brand } from '../types/brand'

/** Content-addressed source or product digest. */
export type ContentHash = Brand<string, 'ContentHash'>

/** Monotonic count of handled JSON-RPC requests (observe only). */
export type RequestEpoch = Brand<number, 'RequestEpoch'>

/** Runtime session retention / substrate tick (not protocol traffic). */
export type SessionBeat = Brand<number, 'SessionBeat'>

/** Producer schema id, e.g. spw.lex/1 or spw.parse/1. */
export type ProducerSchema = Brand<string, 'ProducerSchema'>

export function asContentHash(value: string): ContentHash {
  return castToBrand<string, 'ContentHash'>(value)
}

export function asRequestEpoch(value: number): RequestEpoch {
  return castToBrand<number, 'RequestEpoch'>(value)
}

export function asSessionBeat(value: number): SessionBeat {
  return castToBrand<number, 'SessionBeat'>(value)
}

export function asProducerSchema(value: string): ProducerSchema {
  return castToBrand<string, 'ProducerSchema'>(value)
}

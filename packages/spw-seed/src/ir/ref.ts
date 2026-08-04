/**
 * Addressable IR handles — portable identity for intermediates.
 *
 * Product identity (irRefKey) includes kind, uri, contentHash, dialect,
 * channel, lens, schema, and producer when present.
 * Retention stamps (bornBeat / session beat) and request epoch never key.
 *
 * @see docs/theory/spw/operational-field.spw
 * @see packages/spw-seed/src/ir/field-brands.ts
 */

import type { IrKind } from './kinds'

/** Stability / effect wall (aligned with runtime StabilityChannel). */
export type IrChannelId =
  | 'stable'
  | 'trial'
  | 'draft'
  | 'live'
  | 'experimental'
  | 'consumer'
  | 'ocean'
  | string

/** Lens that mutates what identifiers mean during traversal. */
export type IrLensLevel = 'file' | 'frame' | 'body' | 'reg' | 'graph' | 'session' | 'corpus'

export interface IrLens {
  level: IrLensLevel
  /** Opaque id for cache keys (e.g. stack hash, bias axis, crawl depth). */
  id: string
  labels?: readonly string[]
  biasAxis?: string
  /** Optional free-form params for unique opt channels. */
  params?: Record<string, string | number | boolean>
}

/**
 * Content-addressed + channel-keyed handle for any IR slice.
 * Prefer this over raw paths when composing CLI/LSP/runtime stages.
 */
export interface IrRef {
  kind: IrKind
  /** Repo-relative or opaque uri when surface-bound. */
  uri?: string
  contentHash?: string
  dialect?: string
  channel?: IrChannelId
  lens?: IrLens
  /** Stage or producer id (parse, hot-session, lsp, …). */
  producer?: string
  /**
   * Retention / birth stamp when known (session beat).
   * Never participates in irRefKey product identity.
   */
  bornBeat?: number
  /** Schema version of payload shape (producer schema id). */
  schema?: string
}

/** Fields that participate in durable product identity. */
export type IrRefKeyParts = Pick<
  IrRef,
  'kind' | 'uri' | 'contentHash' | 'dialect' | 'channel' | 'lens' | 'schema' | 'producer'
>

/**
 * Stable string key for maps / product caches.
 * Excludes bornBeat (retention) and any request-epoch material.
 */
export function irRefKey(ref: IrRefKeyParts): string {
  const segs = [
    `k:${ref.kind}`,
    ref.uri ? `u:${ref.uri}` : '',
    ref.contentHash ? `h:${ref.contentHash}` : '',
    ref.dialect ? `d:${ref.dialect}` : '',
    ref.channel ? `ch:${ref.channel}` : '',
    ref.lens ? `lens:${ref.lens.level}:${ref.lens.id}` : '',
    ref.schema ? `s:${ref.schema}` : '',
    ref.producer ? `p:${ref.producer}` : '',
  ].filter(Boolean)
  return segs.join('|')
}

export function irRef(
  kind: IrKind,
  parts: Omit<IrRef, 'kind'> = {},
): IrRef {
  return { kind, ...parts }
}

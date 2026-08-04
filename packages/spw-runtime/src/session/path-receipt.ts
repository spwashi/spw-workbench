/**
 * Path receipt — why a prepared cut of source has the identity it has.
 *
 * Dialect medium + preprocess + channel stamp on every intermediate product.
 * Retention clocks (session beat) and request epoch never appear here.
 *
 * @see docs/theory/spw/operational-field.spw
 * @see packages/spw-seed/src/ir/ref.ts
 */

import { createHash } from 'node:crypto'
import type { DialectId, SurfaceProfileStack } from '@spwashi/spw-seed'
import type { StabilityChannel } from './channels'

export const PATH_RECEIPT_VERSION = 'spw.path_receipt/1' as const

/** Schema id for prepare-stage products. */
export const PREPARE_PRODUCER_SCHEMA = 'spw.prepare/1' as const

export interface PathReceipt {
  version: typeof PATH_RECEIPT_VERSION
  /** sha256-16 of original authoring bytes. */
  originalHash: string
  /** sha256-16 of bytes after dialect preprocess (equals originalHash if none). */
  preparedHash: string
  dialect: DialectId | string
  dialectSource: SurfaceProfileStack['dialectSource']
  preprocessed: boolean
  channel: StabilityChannel
  /** True when channel policy allows this dialect. */
  dialectAllowed: boolean
  /** Producer schema for this cut. */
  schema: typeof PREPARE_PRODUCER_SCHEMA
  /** Optional surface path hint (not content identity alone). */
  path?: string
  note?: string
}

export function hashSourceBytes(source: string): string {
  return createHash('sha256').update(source).digest('hex').slice(0, 16)
}

export function buildPathReceipt(input: {
  original: string
  prepared: string
  stack: SurfaceProfileStack
  preprocessed: boolean
  channel: StabilityChannel
  dialectAllowed: boolean
  path?: string
  note?: string
}): PathReceipt {
  return {
    version: PATH_RECEIPT_VERSION,
    originalHash: hashSourceBytes(input.original),
    preparedHash: hashSourceBytes(input.prepared),
    dialect: input.stack.dialect,
    dialectSource: input.stack.dialectSource,
    preprocessed: input.preprocessed,
    channel: input.channel,
    dialectAllowed: input.dialectAllowed,
    schema: PREPARE_PRODUCER_SCHEMA,
    path: input.path,
    note: input.note,
  }
}

/** Compact Spw dual-read facet lines for cards / CLI. */
export function formatPathReceiptSpw(r: PathReceipt): string {
  const lines = [
    `~#dialect: ${r.dialect}`,
    `~#dialectSource: ${r.dialectSource}`,
    `~#originalHash: ${r.originalHash}`,
    `~#preparedHash: ${r.preparedHash}`,
    `~#preprocessed: ${r.preprocessed}`,
    `~#channel: ${r.channel}`,
    `~#schema: ${r.schema}`,
  ]
  if (r.path) lines.push(`~#path: ~"${r.path}"`)
  if (r.note) lines.push(`~#note: ${JSON.stringify(r.note)}`)
  return lines.join('\n')
}

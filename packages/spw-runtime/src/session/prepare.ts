/**
 * Meta-syntax prepare — dialect stack resolve + preprocess before parse/run.
 * Every prepare cut carries a path receipt (original vs prepared identity).
 *
 * @see packages/spw-seed/src/dialect
 * @see docs/theory/spw/brace-charge-crawl.spw
 * @see packages/spw-runtime/src/session/path-receipt.ts
 */

import {
  applyDialectPreprocess,
  resolveSurfaceProfile,
  type DialectId,
  type SurfaceProfileStack,
} from '@spwashi/spw-seed'
import type { StabilityChannel } from './channels'
import { channelAllowsDialect, resolveChannelPolicy } from './channels'
import { buildPathReceipt, type PathReceipt } from './path-receipt'

export interface PrepareSourceOptions {
  path?: string
  dialect?: DialectId | string
  /** When false, skip dialect detect/preprocess (raw bytes). Default true. */
  autoDialect?: boolean
  /** Stability channel gates regional dialects. */
  channel?: StabilityChannel | string
}

export interface PreparedSource {
  /** Bytes after dialect preprocess (or original). */
  source: string
  original: string
  stack: SurfaceProfileStack
  preprocessed: boolean
  channel: StabilityChannel
  /** False when channel forbids the resolved dialect (still returns source). */
  dialectAllowed: boolean
  note?: string
  /** Why this cut has its identity — dialect medium + hashes. */
  pathReceipt: PathReceipt
}

function finalize(
  original: string,
  source: string,
  stack: SurfaceProfileStack,
  preprocessed: boolean,
  channel: StabilityChannel,
  dialectAllowed: boolean,
  path?: string,
  note?: string,
): PreparedSource {
  const pathReceipt = buildPathReceipt({
    original,
    prepared: source,
    stack,
    preprocessed,
    channel,
    dialectAllowed,
    path,
    note,
  })
  return {
    source,
    original,
    stack,
    preprocessed,
    channel,
    dialectAllowed,
    note,
    pathReceipt,
  }
}

/**
 * Resolve surface profile and apply metasyntax preprocess.
 * Does not parse — hand `source` to parse()/runSpw.
 */
export function prepareSource(
  input: string,
  options: PrepareSourceOptions = {},
): PreparedSource {
  const auto = options.autoDialect !== false
  const channel = resolveChannelPolicy(options.channel).id

  if (!auto && !options.dialect && !options.path) {
    const stack = resolveSurfaceProfile(input, {})
    const dialectAllowed = channelAllowsDialect(resolveChannelPolicy(channel), stack.dialect)
    return finalize(input, input, stack, false, channel, dialectAllowed, options.path)
  }

  const stack = resolveSurfaceProfile(input, {
    dialect: options.dialect as DialectId | undefined,
    path: options.path,
  })

  const policy = resolveChannelPolicy(channel)
  const dialectAllowed = channelAllowsDialect(policy, stack.dialect)
  let source = input
  let preprocessed = false

  if (stack.metasyntax.newlineAsSpace) {
    const next = applyDialectPreprocess(input, stack.dialect, true)
    if (next !== input) {
      source = next
      preprocessed = true
    }
  }

  const note = dialectAllowed
    ? undefined
    : `channel ${channel} does not allow dialect ${stack.dialect}`

  return finalize(
    input,
    source,
    stack,
    preprocessed,
    channel,
    dialectAllowed,
    options.path,
    note,
  )
}

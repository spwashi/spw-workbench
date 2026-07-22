/**
 * Register liminality bridge — effect.l1.memory runtime effect for form-geometry promote.register_bridge.
 *
 * Surface geometry produces `$(label)` via seed mobility rules. This module
 * ensures a register cell exists and walks LIMINALITY_ORDER toward `global`
 * (or a requested target), aligning runtime liminality with published surface sites.
 *
 * The surface waypoint vocabulary (form-geometry.ts: exterior, void, chamber,
 * hole, aperture, membrane, published) and the runtime LIMINALITY_ORDER
 * (local, liminal, visible, global) are two different axes — one describes a
 * source-syntax position, the other a measured register-bank state. They are
 * not the same enum wearing two names. The only declared crossing between
 * them is this bridge, and the only fixed point it defines is:
 *
 *   surface `published`  ==  runtime `global`  (this module's defaultTarget)
 *
 * No other surface waypoint has a runtime-liminality equivalent; treat any
 * other apparent correspondence as coincidence, not law.
 *
 * @see packages/spw-seed/src/canonical/form-geometry.ts
 * @see packages/spw-runtime/src/state/register-bank.ts
 * @see docs/theory/spw/swap-grace.spw
 */

import { $register, type RegisterId } from '@spwashi/spw-seed'
import { RegisterBank } from './register-bank'
import {
  LIMINALITY_ORDER,
  type Liminality,
  type RuntimeValue,
} from './types'

export const REGISTER_LIMINALITY_BRIDGE_PROFILE = {
  id: 'Spw.Runtime.RegisterLiminalityBridge',
  revision: '0.1',
  status: 'operational',
  effectGrade: 'effect.l1.memory',
  sourceGrammar: '$(identifier)',
  defaultTarget: 'global',
  method: 'explicit caller supplies a RegisterBank and invokes the bridge',
  falsifier: 'parsing or displaying $(identifier) promotes a cell without an explicit call',
} as const

export interface LiminalityBridgeResult {
  profile: typeof REGISTER_LIMINALITY_BRIDGE_PROFILE
  key: RegisterId
  label: string
  created: boolean
  /** Liminality before the bridge step */
  before: Liminality
  /** Liminality after promote steps */
  after: Liminality
  /** How many promote() calls applied */
  steps: number
  /** True when target reached (or already there) */
  reached: boolean
}

/**
 * Parse a substrate meta surface `$(name)` into a bare label.
 * Returns null if the source is not a simple $(id) form.
 */
export function parseSubstrateMetaSurface(source: string): string | null {
  const m = source.trim().match(/^\$\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)$/)
  return m ? m[1] : null
}

/**
 * Ensure register cell for `label` exists, then promote liminality toward target.
 *
 * Default target is `global` (published). Pass `steps: 1` for a single promote.
 * Does not parse Spw beyond optional `$(label)` surface recognition when
 * `source` is provided instead of bare `label`.
 */
export function bridgeRegisterLiminality(
  bank: RegisterBank,
  options: {
    label?: string
    /** If set and matches $(name), label is taken from surface */
    source?: string
    target?: Liminality
    /** Max promote steps (default: full climb to target) */
    maxSteps?: number
    /** Initial value when creating the cell */
    seedValue?: RuntimeValue
  },
): LiminalityBridgeResult | null {
  const maxSteps = options.maxSteps ?? LIMINALITY_ORDER.length
  if (!Number.isInteger(maxSteps) || maxSteps < 0) return null

  let label = options.label
  const sourceLabel = options.source
    ? parseSubstrateMetaSurface(options.source) ?? undefined
    : undefined
  if (label && sourceLabel && label !== sourceLabel) return null
  if (!label) {
    label = sourceLabel
  }
  if (!label || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(label)) return null

  const key = $register`${label}`
  const target = options.target ?? REGISTER_LIMINALITY_BRIDGE_PROFILE.defaultTarget
  const targetIndex = LIMINALITY_ORDER.indexOf(target)
  if (targetIndex < 0) return null

  // Ensure entry exists (RegisterBank has no has(); materialize is undefined when missing)
  const existing = bank.materialize(key)
  const created = existing === undefined
  if (!existing) {
    bank.set(key, options.seedValue ?? null, {
      source: 'liminality-bridge',
      force: true,
    })
  }

  const metaBefore = bank.materialize(key)
  const before = (metaBefore?.liminality as Liminality | undefined) ?? LIMINALITY_ORDER[0]
  let after = before
  let steps = 0
  while (steps < maxSteps) {
    const currentIndex = LIMINALITY_ORDER.indexOf(after)
    if (currentIndex >= targetIndex) break
    const next = bank.promote(key)
    if (!next || next === after) break
    after = next
    steps += 1
  }

  return {
    profile: REGISTER_LIMINALITY_BRIDGE_PROFILE,
    key,
    label,
    created,
    before,
    after,
    steps,
    reached: after === target,
  }
}

/**
 * Surface + runtime combined step:
 * 1. Expect source already rewritten to $(label) by promote.register_bridge
 * 2. Promote register liminality
 */
export function applyRegisterBridgeEffect(
  bank: RegisterBank,
  source: string,
  options: { target?: Liminality; maxSteps?: number; seedValue?: RuntimeValue } = {},
): LiminalityBridgeResult | null {
  return bridgeRegisterLiminality(bank, {
    source,
    target: options.target,
    maxSteps: options.maxSteps,
    seedValue: options.seedValue,
  })
}

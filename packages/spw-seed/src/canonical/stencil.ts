/**
 * Stencil — portable plan program for re-plan transfer across surfaces.
 *
 * Fixes the island flaw: pulse / mutate / session cache share one product
 * instead of opaque after-bytes or one-shot CLI memory.
 *
 * Metaphor: a stencil is a cutout — it carries form, never content. Pulse
 * --cut cuts one from a plan and banks it; mutate --from presses it onto
 * another surface, which re-plans rather than replaying donor bytes.
 *
 * Transfer law (v1):
 *   transfer = 'replan' — re-run mutation automata with stencil.profile/rules
 *   on the target; never apply source A's byte offsets to B.
 *   mask gates which surfaces get the same program (brace + nest form family).
 *
 * Write-by-default is never implied — stencil is collate until mutate/apply.
 *
 * @see docs/runtime/md/pulse-mutate-beat.md
 * @see docs/theory/spw/representational-disclosure.spw
 * @see packages/spw-seed/src/canonical/patch.ts
 */

import { createHash } from 'node:crypto'
import { extractBraceProjection } from './brace-projection'
import { scanNestPaths } from './nest-path'
import {
  runMutationAutomata,
  type MutationAutomataConfig,
  type MutationRunResult,
} from './mutation-automata'
import type { EffectGrade } from './differential'
import { facet, formatSpwCard } from './spw-card'

export const STENCIL_VERSION = 'spw.stencil/1' as const
export const STENCIL_SCHEMA = 'spw.stencil/1' as const

/** Form fingerprint that decides transfer candidacy (not product identity alone). */
export interface StencilMask {
  /** Nest-path skeleton (bound forest, content out). */
  nestSkeleton: string
  /** Brace projection signature (kinds + couple + medials + channels). */
  braceSignature: string
  /** Whether the donor plan claimed layout-only evidence. */
  layoutOnlyCandidate: boolean
  /** Dialect of the donor cut when known. */
  dialect?: string
}

/**
 * Portable stencil product — program + mask + hashes.
 * Retention (where stored) is outside this type.
 */
export interface Stencil {
  version: typeof STENCIL_VERSION
  schema: typeof STENCIL_SCHEMA
  /** Short content-addressed id for session cache. */
  id: string
  /** Mutation profile id (layout_canonical, …). */
  profile: string
  /** Optional operational sequence id. */
  sequence?: string | null
  /** Optional rule restriction (subset of profile). */
  rules?: string[]
  /** Channel wall at plan time (advisory). */
  channel?: string
  /** Form mask for transfer gate. */
  mask: StencilMask
  /** Donor uri / path label (not identity). */
  sourceUri?: string
  inputHash: string
  plannedHash: string
  /**
   * How to apply on another surface.
   * replan = only v1 mode — re-run automata under stencil program.
   */
  transfer: 'replan'
  /** Ceiling at plan time (usually effect.l0.measure or l1.memory). */
  planCeiling: EffectGrade
  note: string
}

export type StencilMaskMode = 'off' | 'soft' | 'strict'

export interface StencilMaskGate {
  ok: boolean
  mode: StencilMaskMode
  findings: string[]
  targetMask: StencilMask
}

function shortId(parts: string): string {
  return createHash('sha256').update(parts).digest('hex').slice(0, 12)
}

/** Cut the form mask from a surface (parse-backed brace + nest). */
export function buildStencilMask(
  source: string,
  options: { layoutOnlyCandidate?: boolean; dialect?: string } = {},
): StencilMask {
  const nest = scanNestPaths(source)
  const brace = extractBraceProjection(source)
  return {
    nestSkeleton: nest.skeleton,
    braceSignature: brace.signature,
    layoutOnlyCandidate: options.layoutOnlyCandidate ?? false,
    dialect: options.dialect,
  }
}

/**
 * Cut a stencil from a completed mutation plan (donor surface).
 * Does not embed after-bytes — only program + mask + hashes.
 */
export function cutStencil(input: {
  profile: string
  sequence?: string | null
  rules?: string[]
  channel?: string
  sourceUri?: string
  source: string
  result: Pick<
    MutationRunResult,
    'inputHash' | 'plannedOutputHash' | 'plannedSource' | 'changed' | 'rulesPlanned'
  >
  layoutOnlyCandidate?: boolean
  dialect?: string
  planCeiling?: EffectGrade
  note?: string
}): Stencil {
  const mask = buildStencilMask(input.source, {
    layoutOnlyCandidate: input.layoutOnlyCandidate,
    dialect: input.dialect,
  })
  const id = shortId(
    [
      input.profile,
      input.sequence ?? '',
      (input.rules ?? []).join(','),
      mask.braceSignature,
      mask.nestSkeleton,
      input.result.inputHash,
      input.result.plannedOutputHash,
    ].join('|'),
  )
  return {
    version: STENCIL_VERSION,
    schema: STENCIL_SCHEMA,
    id,
    profile: input.profile,
    sequence: input.sequence ?? null,
    rules: input.rules?.length ? [...input.rules] : undefined,
    channel: input.channel,
    mask,
    sourceUri: input.sourceUri,
    inputHash: input.result.inputHash,
    plannedHash: input.result.plannedOutputHash,
    transfer: 'replan',
    planCeiling: input.planCeiling ?? 'effect.l0.measure',
    note:
      input.note ??
      `stencil ${input.profile}` +
        (input.layoutOnlyCandidate ? ' layout-only-candidate' : '') +
        (input.result.changed ? ' would-change' : ' fixed-point'),
  }
}

/**
 * Gate: may this stencil's program run against target source?
 * - off: always ok (still replan)
 * - soft: brace OR nest match
 * - strict: brace AND nest match; layoutOnly donor requires layout-ish target plan later
 */
export function gateStencilMask(
  stencil: Stencil,
  targetSource: string,
  mode: StencilMaskMode = 'soft',
): StencilMaskGate {
  const targetMask = buildStencilMask(targetSource, {
    dialect: stencil.mask.dialect,
  })
  const findings: string[] = []
  if (mode === 'off') {
    return { ok: true, mode, findings: ['mask gate off — replan only'], targetMask }
  }

  const braceOk = stencil.mask.braceSignature === targetMask.braceSignature
  const nestOk = stencil.mask.nestSkeleton === targetMask.nestSkeleton
  if (!braceOk) findings.push('brace signature mismatch')
  if (!nestOk) findings.push('nest skeleton mismatch')

  if (mode === 'strict') {
    const ok = braceOk && nestOk
    if (ok) findings.push('strict mask match')
    return { ok, mode, findings, targetMask }
  }

  // soft
  const ok = braceOk || nestOk
  if (ok) {
    findings.push(
      braceOk && nestOk
        ? 'soft mask: brace+nest match'
        : braceOk
          ? 'soft mask: brace match'
          : 'soft mask: nest match',
    )
  } else {
    findings.push('soft mask: neither brace nor nest match — refuse transfer')
  }
  return { ok, mode, findings, targetMask }
}

/** Config for replan transfer from a stencil. */
export function stencilToAutomataConfig(
  stencil: Stencil,
  options: { dryRun?: boolean; effectCeiling?: EffectGrade } = {},
): MutationAutomataConfig {
  const config: MutationAutomataConfig = {
    profile: stencil.profile,
    dryRun: options.dryRun ?? false,
    effectCeiling: options.effectCeiling ?? 'effect.l1.memory',
  }
  if (stencil.rules?.length) config.enabledRules = stencil.rules
  return config
}

/**
 * Apply stencil to a target surface by replan (v1).
 * Byte offsets from the donor are never reused.
 */
export function applyStencil(
  targetSource: string,
  stencil: Stencil,
  options: {
    maskMode?: StencilMaskMode
    dryRun?: boolean
    effectCeiling?: EffectGrade
  } = {},
): {
  ok: boolean
  refused?: string
  gate: StencilMaskGate
  result?: MutationRunResult
} {
  const maskMode = options.maskMode ?? 'soft'
  const gate = gateStencilMask(stencil, targetSource, maskMode)
  if (!gate.ok) {
    return {
      ok: false,
      refused: gate.findings.join('; '),
      gate,
    }
  }
  if (stencil.transfer !== 'replan') {
    return {
      ok: false,
      refused: `unsupported transfer mode ${stencil.transfer}`,
      gate,
    }
  }
  const result = runMutationAutomata(
    targetSource,
    stencilToAutomataConfig(stencil, {
      dryRun: options.dryRun,
      effectCeiling: options.effectCeiling,
    }),
  )
  return { ok: true, gate, result }
}

/** Nested-frame dual-read disclosure of a stencil. */
export function formatStencilSpw(stencil: Stencil): string {
  return formatSpwCard('stencil', [
    facet.group('product', [
      facet.atom('version', stencil.version),
      facet.atom('id', stencil.id),
      facet.atom('transfer', stencil.transfer),
      facet.atom('ceiling', stencil.planCeiling),
    ]),
    facet.group('program', [
      facet.atom('profile', stencil.profile),
      facet.atom('sequence', stencil.sequence ?? '_'),
      facet.list('rules', stencil.rules ?? []),
      facet.atom('channel', stencil.channel ?? '_'),
    ]),
    facet.group('mask', [
      facet.str('nest', stencil.mask.nestSkeleton || undefined),
      facet.str('brace', stencil.mask.braceSignature),
      facet.flag('layoutOnly', stencil.mask.layoutOnlyCandidate),
      facet.atom('dialect', stencil.mask.dialect ?? '_'),
    ]),
    facet.group('hashes', [
      facet.atom('input', stencil.inputHash.slice(0, 16)),
      facet.atom('planned', stencil.plannedHash.slice(0, 16)),
      facet.path('donor', stencil.sourceUri),
    ]),
    facet.group('note', [facet.str('text', stencil.note)]),
  ])
}

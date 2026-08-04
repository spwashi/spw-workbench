/**
 * Format pulses — a formatting profile read as a diffable transformation
 * sequence rather than one opaque rewrite.
 *
 * `canonicalize` applies its capabilities in a fixed order, each gated by a
 * boolean. A pulse re-runs the real formatter with a growing prefix of that
 * order, so step *n* is exactly what the formatter produces with the first *n*
 * capabilities enabled, and the last step is exactly a full format. Nothing is
 * reimplemented here, so the sequence cannot drift from the formatter it
 * describes.
 *
 * @see canonicalize.ts for the capability order this mirrors
 */

import {
  canonicalize,
  resolveFormatProfile,
  type CanonicalOptions,
  type FormatProfileId,
} from './canonicalize'

/** Capabilities that rewrite text, in the order `canonicalize` applies them. */
export const FORMAT_CAPABILITIES = [
  'normalizeNewlines',
  'trimTrailingWhitespace',
  'migrateSlashComments',
  'reflowProse',
  'indentBraces',
  'alignComments',
  'blankLineBetweenFrames',
  'collapseBlankLines',
  'ensureFinalNewline',
] as const

export type FormatCapability = (typeof FORMAT_CAPABILITIES)[number]

const CAPABILITY_LABELS: Record<FormatCapability, string> = {
  normalizeNewlines: 'normalize line endings',
  trimTrailingWhitespace: 'trim trailing whitespace',
  migrateSlashComments: 'migrate // comments to # light',
  reflowProse: 'reflow # prose to print width',
  indentBraces: 'indent by brace depth',
  alignComments: 'align trailing comments',
  blankLineBetweenFrames: 'blank line between frames',
  collapseBlankLines: 'collapse blank line runs',
  ensureFinalNewline: 'ensure final newline',
}

export interface FormatPulse {
  capability: FormatCapability
  label: string
  /** Text entering this step (the previous step's output). */
  before: string
  /** Text leaving this step. */
  after: string
  changed: boolean
  /** Lines that differ between before and after. */
  linesChanged: number
}

export interface FormatPulseSequence {
  version: 'spw.format.pulse/1'
  profile: string
  options: CanonicalOptions
  /** Only the capabilities this profile enables, in application order. */
  pulses: FormatPulse[]
  original: string
  formatted: string
  /** Pulses that actually rewrote something. */
  changedCount: number
}

function countChangedLines(before: string, after: string): number {
  const a = before.split('\n')
  const b = after.split('\n')
  let changed = Math.abs(a.length - b.length)
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) changed++
  }
  return changed
}

/**
 * Run a profile as a sequence of pulses over `input`.
 *
 * Capabilities the profile leaves off are skipped rather than reported as
 * no-ops — the sequence describes what this profile does, not what it declines.
 */
export function formatPulses(
  input: string,
  profile: FormatProfileId | string = 'canonical',
  overrides: Partial<CanonicalOptions> = {},
): FormatPulseSequence {
  const options = resolveFormatProfile(profile, overrides)
  const enabled = FORMAT_CAPABILITIES.filter(cap => options[cap] === true)

  const pulses: FormatPulse[] = []
  let before = input
  const applied: Partial<CanonicalOptions> = {}

  // Start from every capability off, then switch them on one at a time in the
  // order canonicalize applies them.
  for (const cap of FORMAT_CAPABILITIES) applied[cap] = false as never

  for (const cap of enabled) {
    applied[cap] = true as never
    const after = canonicalize(input, { ...options, ...applied }).source
    pulses.push({
      capability: cap,
      label: CAPABILITY_LABELS[cap],
      before,
      after,
      changed: before !== after,
      linesChanged: countChangedLines(before, after),
    })
    before = after
  }

  const formatted = canonicalize(input, options).source

  return {
    version: 'spw.format.pulse/1',
    profile: String(profile),
    options,
    pulses,
    original: input,
    formatted,
    changedCount: pulses.filter(p => p.changed).length,
  }
}

export interface DiffLine {
  kind: 'context' | 'add' | 'remove'
  text: string
  /** 1-indexed line in the side this line belongs to. */
  line: number
}

/**
 * Line diff with `context` lines of surrounding text.
 *
 * A common-prefix/suffix trim, not a minimal edit script: formatting changes
 * are overwhelmingly line-local, and this keeps the output readable without
 * pulling in a diff algorithm the parser package does not otherwise need.
 */
export function diffLines(before: string, after: string, context = 2): DiffLine[] {
  const a = before.split('\n')
  const b = after.split('\n')

  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++

  let endA = a.length - 1
  let endB = b.length - 1
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA--
    endB--
  }

  if (start > endA && start > endB) return []

  const out: DiffLine[] = []
  for (let i = Math.max(0, start - context); i < start; i++) {
    out.push({ kind: 'context', text: a[i]!, line: i + 1 })
  }

  const lenA = endA - start + 1
  const lenB = endB - start + 1

  if (lenA === lenB) {
    // Equal-length regions pair up line for line. Formatting rewrites lines in
    // place far more often than they insert or delete, and reading `- old` next
    // to `+ new` is the whole point of a per-pulse diff.
    for (let i = 0; i < lenA; i++) {
      const left = a[start + i]!
      const right = b[start + i]!
      if (left === right) {
        out.push({ kind: 'context', text: left, line: start + i + 1 })
        continue
      }
      out.push({ kind: 'remove', text: left, line: start + i + 1 })
      out.push({ kind: 'add', text: right, line: start + i + 1 })
    }
  } else {
    for (let i = start; i <= endA; i++) {
      out.push({ kind: 'remove', text: a[i]!, line: i + 1 })
    }
    for (let i = start; i <= endB; i++) {
      out.push({ kind: 'add', text: b[i]!, line: i + 1 })
    }
  }

  for (let i = endA + 1; i < Math.min(a.length, endA + 1 + context); i++) {
    out.push({ kind: 'context', text: a[i]!, line: i + 1 })
  }
  return out
}

export interface ProfileComparison {
  profile: string
  formatted: string
  changed: boolean
  linesChanged: number
  /** Capabilities this profile enables, in application order. */
  capabilities: FormatCapability[]
}

/**
 * Read one surface under several rule sets at once.
 *
 * Each entry is measured against the *original*, not against the previous
 * profile, so the numbers compare rule sets rather than compose them.
 */
export function compareFormatProfiles(
  input: string,
  profiles: (FormatProfileId | string)[],
  overrides: Partial<CanonicalOptions> = {},
): ProfileComparison[] {
  return profiles.map(profile => {
    const options = resolveFormatProfile(profile, overrides)
    const formatted = canonicalize(input, options).source
    return {
      profile: String(profile),
      formatted,
      changed: formatted !== input,
      linesChanged: countChangedLines(input, formatted),
      capabilities: FORMAT_CAPABILITIES.filter(cap => options[cap] === true),
    }
  })
}

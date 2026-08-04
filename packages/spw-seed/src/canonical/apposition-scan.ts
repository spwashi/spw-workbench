/**
 * Parse-free apposition scan — unit cells of author-placed readings.
 *
 * An apposition `~#name(body)` is a **unit cell** on the surface lattice:
 * name + raw body + span, hashed without invoking the parser. That accident
 * of ergonomics (prose must not be a syntax error) is also a cheap validity
 * probe for granular cache invalidation and pattern ecology.
 *
 * Photonics / materials reading (interpretive, not runtime law):
 *   unit cell  → one apposition envelope
 *   lattice    → ordered cells on a source revision
 *   spectrum   → named vs anonymous population
 *   mask       → body/span hash for transfer / reuse checks
 *
 * @see packages/spw-seed/src/lexer/matchers/apposition.ts
 * @see .agents/plans/apposition-cache-granules/PLAN.md
 * @see docs/theory/spw/operational-field.spw
 */

import { appositionParts } from '../lexer/matchers/apposition'
import { hashString } from './canonicalize'

export const APPOSITION_SCAN_VERSION = 'spw.apposition.scan/1' as const

/** Byte offset range in the scanned source (UTF-16 code units, like JS strings). */
export interface AppositionSpan {
  start: number
  end: number
}

/**
 * One apposition unit cell — parse-free extract.
 * `mask` is the content-addressed envelope (full `~#…(…)` text).
 */
export interface AppositionCell {
  /** Declared name, or null when anonymous `~#(…)`. */
  name: string | null
  /** Raw label text between the parens. */
  body: string
  /** Full matched source including `~#` and parens. */
  raw: string
  span: AppositionSpan
  /** Hash of `raw` — mask for exact envelope identity. */
  mask: string
  /** Hash of `body` alone — useful when perimeter renames but content holds. */
  bodyMask: string
  anonymous: boolean
}

/** Lattice = ordered unit cells on one source revision. */
export interface AppositionLattice {
  version: typeof APPOSITION_SCAN_VERSION
  /** Content hash of the full source (substrate identity). */
  substrateHash: string
  cells: AppositionCell[]
  /** Named cell count — spectrum peak for indexable handles. */
  namedCount: number
  /** Anonymous `~#(…)` — span-only cells; weak keys for granules. */
  anonymousCount: number
  /** Distinct non-null names (set size). */
  distinctNames: number
}

export interface ScanAppositionsOptions {
  /**
   * When true, stop at first unclosed `~#…(` (unterminated cell).
   * Default: record nothing for that attempt and continue after the `~#`.
   */
  strict?: boolean
}

/**
 * Scan source for apposition unit cells without the full lexer/parser.
 * Mirrors matchApposition rules: `~#` + optional name + balanced `(…)` on one line.
 */
export function scanAppositions(
  source: string,
  options: ScanAppositionsOptions = {},
): AppositionLattice {
  const cells: AppositionCell[] = []
  const len = source.length
  let i = 0

  while (i < len - 1) {
    if (source[i] !== '~' || source[i + 1] !== '#') {
      i++
      continue
    }

    // Reject `~#name:` annotation form — name then ':' is not an apposition.
    let ahead = i + 2
    while (ahead < len && /[a-zA-Z0-9_-]/.test(source[ahead]!)) ahead++
    if (ahead >= len || source[ahead] !== '(') {
      i++
      continue
    }

    const start = i
    // Consume through name to '('
    let raw = source.slice(i, ahead + 1)
    i = ahead + 1
    let depth = 1
    let closed = false

    while (i < len) {
      const ch = source[i]!
      if (ch === '\n') break
      raw += ch
      i++
      if (ch === '(') depth++
      else if (ch === ')') {
        depth--
        if (depth === 0) {
          closed = true
          break
        }
      }
    }

    if (!closed) {
      if (options.strict) {
        break
      }
      // Leave i where we stopped; avoid infinite loop on `~#`
      if (i === start) i = start + 2
      continue
    }

    const parts = appositionParts(raw)
    const end = start + raw.length
    cells.push({
      name: parts.name,
      body: parts.body,
      raw,
      span: { start, end },
      mask: hashString(raw),
      bodyMask: hashString(parts.body),
      anonymous: parts.name == null,
    })
  }

  const names = new Set(cells.map(c => c.name).filter((n): n is string => n != null))

  return {
    version: APPOSITION_SCAN_VERSION,
    substrateHash: hashString(source),
    cells,
    namedCount: cells.filter(c => !c.anonymous).length,
    anonymousCount: cells.filter(c => c.anonymous).length,
    distinctNames: names.size,
  }
}

/**
 * Envelope equality — same mask means the unit cell is unchanged for reuse.
 * (Granule validity: if mask holds, derived products may stay bound.)
 */
export function appositionMasksEqual(a: AppositionCell, b: AppositionCell): boolean {
  return a.mask === b.mask
}

/**
 * Spectrum summary for census / tooling — light photonics reading of the lattice.
 */
export interface AppositionSpectrum {
  version: typeof APPOSITION_SCAN_VERSION
  substrateHash: string
  total: number
  named: number
  anonymous: number
  distinctNames: number
  /** name → cell count (doping density of each named species). */
  byName: Record<string, number>
}

export function appositionSpectrum(lattice: AppositionLattice): AppositionSpectrum {
  const byName: Record<string, number> = {}
  for (const cell of lattice.cells) {
    if (cell.name == null) continue
    byName[cell.name] = (byName[cell.name] ?? 0) + 1
  }
  return {
    version: lattice.version,
    substrateHash: lattice.substrateHash,
    total: lattice.cells.length,
    named: lattice.namedCount,
    anonymous: lattice.anonymousCount,
    distinctNames: lattice.distinctNames,
    byName,
  }
}

/**
 * Diff two lattices by mask — which unit cells appeared / vanished.
 * Interpretive: interstitial defects = anonymous; named species transfer = handle stability.
 */
export interface AppositionLatticeDelta {
  added: AppositionCell[]
  removed: AppositionCell[]
  /** Same name, different mask — content doping of a named site. */
  remasked: Array<{ name: string; before: AppositionCell; after: AppositionCell }>
  stableMasks: number
}

export function diffAppositionLattices(
  before: AppositionLattice,
  after: AppositionLattice,
): AppositionLatticeDelta {
  const beforeByMask = new Map(before.cells.map(c => [c.mask, c]))
  const afterByMask = new Map(after.cells.map(c => [c.mask, c]))

  const added: AppositionCell[] = []
  const removed: AppositionCell[] = []
  let stableMasks = 0

  for (const [mask, cell] of afterByMask) {
    if (beforeByMask.has(mask)) stableMasks++
    else added.push(cell)
  }
  for (const [mask, cell] of beforeByMask) {
    if (!afterByMask.has(mask)) removed.push(cell)
  }

  // Remask: same name present in removed+added with different masks
  const remasked: AppositionLatticeDelta['remasked'] = []
  const removedNamed = removed.filter(c => c.name != null)
  const addedNamed = added.filter(c => c.name != null)
  for (const r of removedNamed) {
    const a = addedNamed.find(x => x.name === r.name && x.mask !== r.mask)
    if (a) remasked.push({ name: r.name!, before: r, after: a })
  }

  return { added, removed, remasked, stableMasks }
}

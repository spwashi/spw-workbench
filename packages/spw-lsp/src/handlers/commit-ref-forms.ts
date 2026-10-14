/**
 * Commit refs by form: where a hash sits in a file and what token it earns,
 * read from the text alone. Nothing here asks git, so the role stream and the
 * parser release can use it; commit-refs.ts confirms, links, and explains.
 *
 * @see ./commit-refs.ts — the git half
 */

import { lex, type Token } from '@spwashi/spw-seed'
import type { LspPosition, LspRange } from '../types'

/** Plan files whose commit refs are remembered between requests. */
const REF_CACHE_LIMIT = 64
/** Cited hashes read from one file before the rest are left unread. */
const CITED_LIMIT = 400

/** Where a hash was found; COMMIT_REF_STRATEGY says what it earns there. */
export type CommitRefSource = 'landed' | 'cited'

export interface CommitRefRule {
  /** Whether git must confirm the hash before it hovers or links. */
  confirmBeforeShowing: boolean
  /** Whether a hash git does not hold is reported as an information diagnostic. */
  diagnoseMissing: boolean
  /**
   * The semantic token the hash takes, chosen by form and never by git, so a
   * file's tokens never wait on a git call: a landed ref is a commitRef, and
   * any other hash-shaped run is a hashlike whether or not git knows it.
   */
  token: 'commitRef' | 'hashlike'
  /** Whether a hover over a hash git does not hold says so. */
  explainMissing: boolean
}

/**
 * The hash resolution strategy, as data. Every caller reads this table, so a
 * new place to find hashes is one reader in READERS and one row here.
 */
export const COMMIT_REF_STRATEGY: Readonly<Record<CommitRefSource, CommitRefRule>> = {
  landed: { confirmBeforeShowing: false, diagnoseMissing: true, token: 'commitRef', explainMissing: true },
  cited: { confirmBeforeShowing: true, diagnoseMissing: false, token: 'hashlike', explainMissing: true },
}

export interface CommitRef {
  hash: string
  range: LspRange
  source: CommitRefSource
}

/** True for a plan stream: a `wip.spw` under `.agents/plans/`. */
export function isPlanStreamFile(filePath: string | null | undefined): boolean {
  if (!filePath) return false
  const normalized = filePath.replace(/\\/g, '/')
  if (!normalized.endsWith('/wip.spw') && normalized !== 'wip.spw') return false
  return normalized.startsWith('.agents/plans/') || normalized.includes('/.agents/plans/')
}

// ── Reading refs from a plan file ───────────────────────────────

const refCache = new Map<string, { text: string; refs: CommitRef[] }>()

function lineStarts(text: string): number[] {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') starts.push(i + 1)
  }
  return starts
}

function positionAt(starts: number[], offset: number): LspPosition {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return { line: lo, character: offset - starts[lo] }
}

/** Every landed commit ref in a plan file, with its exact range; none elsewhere. */
export function commitRefsIn(text: string, filePath: string | null | undefined): CommitRef[] {
  if (!filePath || !isPlanStreamFile(filePath)) return []
  const cached = refCache.get(filePath)
  if (cached && cached.text === text) return cached.refs

  let tokens: Token[]
  try {
    tokens = lex(text, { planStream: true, eventPolicy: 'none' }).tokens
  } catch {
    return []
  }
  const starts = lineStarts(text)
  const refs = tokens
    .filter((token) => token.type === 'IDENTIFIER' && token.kind === 'commit_ref')
    .map((token): CommitRef => ({
      hash: token.value,
      range: {
        start: positionAt(starts, token.span.start.offset),
        end: positionAt(starts, token.span.end.offset),
      },
      source: 'landed',
    }))

  if (refCache.size >= REF_CACHE_LIMIT) refCache.clear()
  refCache.set(filePath, { text, refs })
  return refs
}

/**
 * A cited hash: 7 to 40 lowercase hex, not glued to a word, a path, a `#`
 * colour, a sigil (so no `#>name` anchor or `$slot`), or a hyphenated id,
 * with at least one digit and one letter, so neither a date nor a hex word
 * like `deadbeef` is a candidate.
 */
const CITED_HASH = /(?<![0-9A-Za-z_#./\\>!$@~%-])[0-9a-f]{7,40}(?![0-9A-Za-z_/\\-])/g

/** Candidate hashes anywhere in a file's text; git decides which are commits. */
export function citedRefsIn(text: string): CommitRef[] {
  const starts = lineStarts(text)
  const refs: CommitRef[] = []
  for (const match of text.matchAll(CITED_HASH)) {
    const hash = match[0]
    if (!/\d/.test(hash) || !/[a-f]/.test(hash)) continue
    const offset = match.index ?? 0
    refs.push({
      hash,
      range: { start: positionAt(starts, offset), end: positionAt(starts, offset + hash.length) },
      source: 'cited',
    })
    if (refs.length >= CITED_LIMIT) break
  }
  return refs
}

function overlaps(a: LspRange, b: LspRange): boolean {
  if (a.start.line !== b.start.line) return false
  return a.start.character < b.end.character && b.start.character < a.end.character
}

/** How each source reads its hashes from a file, in the order sources are consulted. */
const READERS: ReadonlyArray<readonly [CommitRefSource, (text: string, filePath: string | null | undefined) => CommitRef[]]> = [
  ['landed', commitRefsIn],
  ['cited', (text) => citedRefsIn(text)],
]

/** Every hash a file names, earlier sources first; a later source never reclaims a range. */
export function allCommitRefsIn(text: string, filePath: string | null | undefined): CommitRef[] {
  const refs: CommitRef[] = []
  for (const [, read] of READERS) {
    for (const ref of read(text, filePath)) {
      if (!refs.some((known) => overlaps(known.range, ref.range))) refs.push(ref)
    }
  }
  return refs
}

export function commitRefAt(refs: readonly CommitRef[], position: LspPosition): CommitRef | null {
  return refs.find((ref) =>
    ref.range.start.line === position.line &&
    position.character >= ref.range.start.character &&
    position.character < ref.range.end.character,
  ) ?? null
}

/** Forget the remembered refs — commit-refs resetCommitRefCaches calls this. */
export function resetCommitRefForms(): void {
  refCache.clear()
}

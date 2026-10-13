/**
 * Commit refs — git hashes a .spw file names, and what each one earns.
 *
 * Two sources, one strategy table (COMMIT_REF_STRATEGY):
 * - landed: in a plan stream (`.agents/plans/**\/wip.spw`, dialect Spw.p) the
 *   lexer keeps the hash in `.[name](551bb419):` as one IDENTIFIER of kind
 *   `commit_ref`. The line claims a commit, so it hovers even when git cannot
 *   find it, a missing hash is an information diagnostic, and the hash takes
 *   the commitRef semantic token.
 * - cited: any 7 to 40 hex run elsewhere in a .spw file — a journal `commit:`
 *   line, `(e6c56978)` in a stream entry, a receipt's `at 651b535b`. Hex words
 *   are common, so a cited hash earns a hover and a link only once git
 *   confirms it names a commit, and it never takes a color.
 *
 * Git runs in the workspace root, bounded by a timeout, and many hashes are
 * confirmed by one `git cat-file --batch-check`. A commit, once read, cannot
 * change, so it is cached by hash; a hash git could not find may still land
 * (a fetch, a rebase), so that answer is only kept for a short while.
 */

import { execFile } from 'node:child_process'
import { lex, type Token } from '@spwashi/spw-seed'
import type { LspDiagnostic, LspHover, LspPosition, LspRange } from '../types'
import { codeSpan } from './wonder'

/** Longest a single git call may take before the answer is "unknown". */
const GIT_TIMEOUT_MS = 2000
/** How long "not in this repository" is believed before git is asked again. */
const MISSING_TTL_MS = 30_000
/** Files named in a hover before the rest are summarised as a count. */
const HOVER_FILE_LIMIT = 8
const GIT_MAX_BUFFER = 1024 * 1024
/** Git processes one diagnostics pass keeps in flight at once. */
const GIT_CONCURRENCY = 4
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

export interface CommitFileChange {
  path: string
  /** Null for a binary file, which git counts as `-`. */
  added: number | null
  deleted: number | null
}

export interface CommitInfo {
  hash: string
  subject: string
  /** Strict ISO 8601 author date, offset included. */
  authorDate: string
  files: CommitFileChange[]
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

// ── Asking git ──────────────────────────────────────────────────

interface GitAnswer {
  /** Exit code; null when git could not run or ran out of time. */
  code: number | null
  stdout: string
}

function runGit(args: string[], cwd: string, input?: string): Promise<GitAnswer> {
  return new Promise((resolve) => {
    try {
      const child = execFile(
        'git',
        args,
        { cwd, timeout: GIT_TIMEOUT_MS, maxBuffer: GIT_MAX_BUFFER, encoding: 'utf8', windowsHide: true },
        (error, stdout) => {
          if (!error) {
            resolve({ code: 0, stdout })
            return
          }
          const failure = error as NodeJS.ErrnoException & { code?: number | string; killed?: boolean }
          const code = typeof failure.code === 'number' && !failure.killed ? failure.code : null
          resolve({ code, stdout: stdout ?? '' })
        },
      )
      if (input !== undefined) {
        child.stdin?.on('error', () => { /* git exited early; the callback reports it */ })
        child.stdin?.end(input)
      }
    } catch {
      resolve({ code: null, stdout: '' })
    }
  })
}

const workTrees = new Map<string, Promise<boolean>>()
const existenceChecks = new Map<string, Promise<boolean | null>>()
const presentCommits = new Set<string>()
const missingSince = new Map<string, number>()
const readCommits = new Map<string, CommitInfo>()
/** Full object name of each hash git confirmed, so a link names one commit for good. */
const fullNames = new Map<string, string>()

function cacheKey(root: string, hash: string): string {
  return `${root}\0${hash}`
}

function isWorkTree(root: string): Promise<boolean> {
  let pending = workTrees.get(root)
  if (!pending) {
    pending = runGit(['rev-parse', '--is-inside-work-tree'], root).then((answer) => {
      // No answer in time is not "no repository": ask again next time.
      if (answer.code === null) workTrees.delete(root)
      return answer.code === 0 && answer.stdout.trim() === 'true'
    })
    workTrees.set(root, pending)
  }
  return pending
}

/**
 * Whether the repository at `root` holds `hash` as a commit. Null when git
 * cannot say — no repository, no git, or no answer in time — so a silence is
 * never reported as a missing commit.
 */
export function commitExists(root: string, hash: string): Promise<boolean | null> {
  const key = cacheKey(root, hash)
  if (presentCommits.has(key)) return Promise.resolve(true)
  const missingAt = missingSince.get(key)
  if (missingAt !== undefined && Date.now() - missingAt < MISSING_TTL_MS) return Promise.resolve(false)

  // A hash cited twice, or hovered while diagnostics run, asks git once.
  let pending = existenceChecks.get(key)
  if (!pending) {
    pending = askExists(root, hash, key).finally(() => existenceChecks.delete(key))
    existenceChecks.set(key, pending)
  }
  return pending
}

async function askExists(root: string, hash: string, key: string): Promise<boolean | null> {
  if (!await isWorkTree(root)) return null
  const answer = await runGit(['cat-file', '-e', `${hash}^{commit}`], root)
  if (answer.code === 0) {
    presentCommits.add(key)
    missingSince.delete(key)
    return true
  }
  if (answer.code === null) return null
  missingSince.set(key, Date.now())
  return false
}

/**
 * Whether each hash names a commit in the repository at `root`, asked of git
 * in one process. A hash git calls ambiguous, or any hash when git cannot
 * answer, maps to null: neither a commit nor a known absence.
 */
export async function confirmCommits(root: string, hashes: readonly string[]): Promise<Map<string, boolean | null>> {
  const verdicts = new Map<string, boolean | null>()
  const unknown: string[] = []
  for (const hash of new Set(hashes)) {
    const key = cacheKey(root, hash)
    const missingAt = missingSince.get(key)
    if (presentCommits.has(key)) verdicts.set(hash, true)
    else if (missingAt !== undefined && Date.now() - missingAt < MISSING_TTL_MS) verdicts.set(hash, false)
    else unknown.push(hash)
  }
  if (unknown.length === 0) return verdicts
  if (!await isWorkTree(root)) {
    for (const hash of unknown) verdicts.set(hash, null)
    return verdicts
  }

  const answer = await runGit(['cat-file', '--batch-check=%(objectname) %(objecttype)'], root, `${unknown.join('\n')}\n`)
  const lines = answer.code === 0 ? answer.stdout.split('\n') : []
  unknown.forEach((hash, index) => {
    const key = cacheKey(root, hash)
    const [name, type] = (lines[index] ?? '').trim().split(' ')
    if (type === 'commit' && name) {
      presentCommits.add(key)
      missingSince.delete(key)
      fullNames.set(key, name)
      verdicts.set(hash, true)
    } else if (type === 'missing' || (type && type !== 'ambiguous')) {
      // Missing, or an object that is not a commit (a blob or a tree).
      missingSince.set(key, Date.now())
      verdicts.set(hash, false)
    } else {
      verdicts.set(hash, null)
    }
  })
  return verdicts
}

/** The full object name git gave for a confirmed hash, or the hash as written. */
export function fullCommitName(root: string, hash: string): string {
  return fullNames.get(cacheKey(root, hash)) ?? readCommits.get(cacheKey(root, hash))?.hash ?? hash
}

function parseCount(value: string | undefined): number | null {
  const count = Number(value)
  return Number.isInteger(count) ? count : null
}

/** Subject, author date and per-file line counts of one commit, or null. */
export async function readCommit(root: string, hash: string): Promise<CommitInfo | null> {
  const key = cacheKey(root, hash)
  const known = readCommits.get(key)
  if (known) return known
  if (!await commitExists(root, hash)) return null

  const answer = await runGit(
    ['-c', 'core.quotepath=false', 'show', '--no-color', '--no-ext-diff', '--numstat', '--format=%H%x00%s%x00%aI%x00', `${hash}^{commit}`],
    root,
  )
  if (answer.code !== 0) return null

  const [full, subject, authorDate, rest] = answer.stdout.split('\0')
  if (!full || subject === undefined || !authorDate) return null
  const files: CommitFileChange[] = []
  for (const line of (rest ?? '').split('\n')) {
    const [added, deleted, ...pathParts] = line.split('\t')
    if (pathParts.length === 0) continue
    files.push({ path: pathParts.join('\t'), added: parseCount(added), deleted: parseCount(deleted) })
  }

  const info: CommitInfo = { hash: full.trim(), subject, authorDate, files }
  readCommits.set(key, info)
  return info
}

/** Forget every git answer — for tests that build repositories of their own. */
export function resetCommitRefCaches(): void {
  refCache.clear()
  workTrees.clear()
  existenceChecks.clear()
  presentCommits.clear()
  missingSince.clear()
  readCommits.clear()
  fullNames.clear()
}

// ── Presenting ──────────────────────────────────────────────────

/** `2026-03-20T10:17:59-05:00` → `2026-03-20 10:17 (-05:00)`. */
function readableDate(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(.*)$/.exec(iso)
  if (!match) return iso
  const zone = match[3] === 'Z' ? 'UTC' : match[3]
  return zone ? `${match[1]} ${match[2]} (${zone})` : `${match[1]} ${match[2]}`
}

function lineCount(change: CommitFileChange): string {
  if (change.added === null || change.deleted === null) return 'binary'
  return `+${change.added} −${change.deleted}`
}

export function formatCommitHover(ref: CommitRef, info: CommitInfo): string {
  // A subject leads with a sigil (`&[cli] — …`); a code span keeps it literal in every client.
  const lines = [`**commit \`${ref.hash}\`** ${codeSpan(info.subject)}`, '']
  lines.push(`Authored ${readableDate(info.authorDate)}`, '')

  if (info.files.length === 0) {
    lines.push('No file changes listed (a merge, or an empty commit).')
  } else {
    const added = info.files.reduce((sum, file) => sum + (file.added ?? 0), 0)
    const deleted = info.files.reduce((sum, file) => sum + (file.deleted ?? 0), 0)
    const noun = info.files.length === 1 ? 'file' : 'files'
    lines.push(`${info.files.length} ${noun} changed · +${added} −${deleted}`)
    for (const file of info.files.slice(0, HOVER_FILE_LIMIT)) {
      lines.push(`- \`${file.path}\` ${lineCount(file)}`)
    }
    const more = info.files.length - HOVER_FILE_LIMIT
    if (more > 0) lines.push(`- … and ${more} more`)
  }
  return lines.join('\n')
}

/**
 * Hover for the hash under the cursor: a commit git holds shows its subject,
 * date, and files; a hash git does not hold says so; when git cannot answer,
 * a landed ref says that and a cited hash stays quiet.
 */
export async function hoverCommitRef(
  text: string,
  filePath: string | null | undefined,
  position: LspPosition,
  workspaceRoot: string,
): Promise<LspHover | null> {
  const ref = commitRefAt(allCommitRefsIn(text, filePath), position)
  if (!ref) return null
  const rule = COMMIT_REF_STRATEGY[ref.source]
  if (rule.confirmBeforeShowing) {
    const verdict = (await confirmCommits(workspaceRoot, [ref.hash])).get(ref.hash)
    if (verdict === false && rule.explainMissing) {
      return {
        contents: { kind: 'markdown', value: `**hash-shaped \`${ref.hash}\`** — not a commit in this repository` },
        range: ref.range,
      }
    }
    if (verdict !== true) return null
  }

  const info = await readCommit(workspaceRoot, ref.hash)
  let value: string
  if (info) {
    value = formatCommitHover(ref, info)
  } else {
    const exists = await commitExists(workspaceRoot, ref.hash)
    value = exists === false
      ? `**commit \`${ref.hash}\`** — not in this repository`
      : `**commit \`${ref.hash}\`** — git did not answer`
  }
  return { contents: { kind: 'markdown', value }, range: ref.range }
}

/** The URI a commit link opens: the full object name, and the repository it lives in. */
export function commitUri(root: string, fullHash: string): string {
  return `spw-commit:/${fullHash}?root=${encodeURIComponent(root)}`
}

/**
 * A link for every hash git confirms as a commit, landed or cited. A landed
 * ref git lacks keeps its information note and gets no link; a cited hash git
 * does not confirm stays plain text.
 */
export async function commitRefLinks(
  text: string,
  filePath: string | null | undefined,
  workspaceRoot: string,
): Promise<Array<{ range: LspRange; target: string; tooltip: string }>> {
  const refs = allCommitRefsIn(text, filePath)
  if (refs.length === 0) return []
  const verdicts = await confirmCommits(workspaceRoot, refs.map((ref) => ref.hash))
  return refs.flatMap((ref) => verdicts.get(ref.hash) === true
    ? [{ range: ref.range, target: commitUri(workspaceRoot, fullCommitName(workspaceRoot, ref.hash)), tooltip: 'Open commit' }]
    : [])
}

/** An information diagnostic for each commit ref the repository does not hold. */
export async function commitRefDiagnostics(
  text: string,
  filePath: string | null | undefined,
  workspaceRoot: string,
): Promise<LspDiagnostic[]> {
  const refs = allCommitRefsIn(text, filePath).filter((ref) => COMMIT_REF_STRATEGY[ref.source].diagnoseMissing)
  if (refs.length === 0) return []

  // A long plan cites dozens of commits; ask git a few at a time.
  const verdicts: Array<boolean | null> = []
  for (let i = 0; i < refs.length; i += GIT_CONCURRENCY) {
    const batch = refs.slice(i, i + GIT_CONCURRENCY)
    verdicts.push(...await Promise.all(batch.map((ref) => commitExists(workspaceRoot, ref.hash))))
  }
  return refs.flatMap((ref, index) => verdicts[index] === false
    ? [{
      range: ref.range,
      severity: 3, // Information — the line still reads; the hash just names nothing here
      source: 'spw-plan',
      message: `commit ${ref.hash} is not in this repository`,
    }]
    : [])
}

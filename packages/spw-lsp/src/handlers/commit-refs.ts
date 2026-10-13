/**
 * Commit refs — the hash a plan file names as a landed commit's scene.
 *
 * In a plan stream (`.agents/plans/**\/wip.spw`, dialect Spw.p) the lexer keeps
 * the hash in `.[name](551bb419):` as one IDENTIFIER of kind `commit_ref`.
 * Hover reads that commit from the repository — subject, author date, the
 * files it changed — and a hash the repository does not hold earns an
 * information diagnostic. Every other surface is left as it was.
 *
 * Git runs in the workspace root, bounded by a timeout. A commit, once read,
 * cannot change, so it is cached by hash; a hash git could not find may still
 * land (a fetch, a rebase), so that answer is only kept for a short while.
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

export interface CommitRef {
  hash: string
  range: LspRange
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

/** Every commit ref in a plan file, with its exact range; none elsewhere. */
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
    .map((token) => ({
      hash: token.value,
      range: {
        start: positionAt(starts, token.span.start.offset),
        end: positionAt(starts, token.span.end.offset),
      },
    }))

  if (refCache.size >= REF_CACHE_LIMIT) refCache.clear()
  refCache.set(filePath, { text, refs })
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

function runGit(args: string[], cwd: string): Promise<GitAnswer> {
  return new Promise((resolve) => {
    try {
      execFile(
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

/** Hover for the commit ref under the cursor in a plan file; null elsewhere. */
export async function hoverCommitRef(
  text: string,
  filePath: string | null | undefined,
  position: LspPosition,
  workspaceRoot: string,
): Promise<LspHover | null> {
  const ref = commitRefAt(commitRefsIn(text, filePath), position)
  if (!ref) return null

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

/** An information diagnostic for each commit ref the repository does not hold. */
export async function commitRefDiagnostics(
  text: string,
  filePath: string | null | undefined,
  workspaceRoot: string,
): Promise<LspDiagnostic[]> {
  const refs = commitRefsIn(text, filePath)
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

/**
 * Commit links — the pure half of the commit view.
 *
 * spw-lsp links every git hash it confirms as a commit to
 * `spw-commit:/<full hash>?root=<repository path>`. This module reads that
 * target from a URI's decoded path and query (never from `toString()`, which
 * re-encodes the query), and decides which sides of a change a diff can show.
 */

export const COMMIT_SCHEME = 'spw-commit'

export interface CommitTarget {
  hash: string
  root: string
}

/** The commit a link names, from a URI's decoded path and query; null when it names none. */
export function parseCommitTarget(uriPath: string, uriQuery: string): CommitTarget | null {
  const hash = /^\/?([0-9a-f]{7,64})$/.exec(uriPath)?.[1]
  if (!hash || !uriQuery.startsWith('root=')) return null
  const root = uriQuery.slice('root='.length)
  return root ? { hash, root } : null
}

/** First line of a commit message, for a view title. */
export function commitTitle(hash: string, message: string): string {
  const subject = message.split('\n', 1)[0]?.trim() ?? ''
  return subject ? `${hash.slice(0, 8)} ${subject}` : hash.slice(0, 8)
}

/**
 * Status codes the built-in Git extension reports for a change between two
 * refs: an added file has no original side, a deleted one no modified side.
 */
const ADDED = new Set([1, 9]) // INDEX_ADDED, INTENT_TO_ADD
const DELETED = new Set([2, 6]) // INDEX_DELETED, DELETED

export function changeSides(status: number): { original: boolean; modified: boolean } {
  return { original: !ADDED.has(status), modified: !DELETED.has(status) }
}

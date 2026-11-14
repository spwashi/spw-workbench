/**
 * Which version-control system holds a directory, read from the filesystem
 * alone, so a caller on a synchronous path (an editor's highlighting) can ask.
 *
 * Detection walks up: a .jj directory is jj (colocated when a .git sits beside
 * it), a .git directory or file is git, nothing is none. The id forms say how
 * the workspace writes a revision: git's SHA-1 hex, or SHA-256 when the
 * repository's config sets extensions.objectformat; a jj workspace adds jj's
 * change ids (seed lexer/commit-ref.ts holds the shapes). No command runs here;
 * the CLI's adapter (spw-cli vcs.ts) runs git for everything else.
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export type VcsKind = 'git' | 'jj' | 'none'
export type WorkspaceIdForm = 'git_sha1' | 'git_sha256' | 'jj_change'

export interface VcsInfo {
  kind: VcsKind
  /** The workspace root: the directory holding .git or .jj; null for none. */
  root: string | null
  /** jj with a .git beside it, so git commands see the same commits. */
  colocated: boolean
  /** The forms a revision id takes here, for a lexer reading commit refs. */
  idForms: WorkspaceIdForm[]
  /** What does not work here, in words. */
  gaps: string[]
}

const JJ_GAPS_COLOCATED = [
  'jj has no commit hooks: the commit gate (Touch ID, episode block) runs only when committing through git (open: jj_hooks)',
  'a jj change id is read and coloured, but nothing here confirms it, since no jj command runs from this code yet',
]
const JJ_GAPS_ALONE = [
  ...JJ_GAPS_COLOCATED,
  'no .git beside .jj: status, head and at() run git and are not available; a colocated workspace (jj git init --colocate) has them',
]

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/** sha256 when the repository's config says so, else sha1. A worktree's .git file points at its git dir, and that at the common one. */
function gitObjectFormat(root: string): 'sha1' | 'sha256' {
  try {
    const dotGit = path.join(root, '.git')
    let gitDir = dotGit
    if (!isDirectory(dotGit)) {
      const pointer = readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)$/m)
      if (!pointer) return 'sha1'
      gitDir = path.resolve(root, pointer[1]!.trim())
    }
    const commonFile = path.join(gitDir, 'commondir')
    const common = existsSync(commonFile) ? path.resolve(gitDir, readFileSync(commonFile, 'utf8').trim()) : gitDir
    const config = readFileSync(path.join(common, 'config'), 'utf8')
    return /^\s*objectformat\s*=\s*sha256\s*$/im.test(config) ? 'sha256' : 'sha1'
  } catch {
    return 'sha1'
  }
}

/** The version-control system holding a directory, found by walking up. */
export function detectVcs(dir: string): VcsInfo {
  let at = path.resolve(dir)
  for (;;) {
    const jj = isDirectory(path.join(at, '.jj'))
    const git = existsSync(path.join(at, '.git'))
    if (jj || git) {
      const format: WorkspaceIdForm = git && gitObjectFormat(at) === 'sha256' ? 'git_sha256' : 'git_sha1'
      if (jj) return { kind: 'jj', root: at, colocated: git, idForms: [format, 'jj_change'], gaps: git ? JJ_GAPS_COLOCATED : JJ_GAPS_ALONE }
      return { kind: 'git', root: at, colocated: false, idForms: [format], gaps: [] }
    }
    const up = path.dirname(at)
    if (up === at) return { kind: 'none', root: null, colocated: false, idForms: ['git_sha1'], gaps: ['no version control: nothing to read a revision from'] }
    at = up
  }
}

/**
 * One place that asks the version-control system what it holds (local-numbering-vcs: ~[vcs_adapter]).
 *
 * Detection walks up from a directory: a .jj directory is jj (colocated when a
 * .git sits beside it), a .git directory or file is git, nothing is none. Every
 * operation here runs git: in a colocated jj workspace git sees the same commits,
 * so the operations work there too. A jj workspace with no .git is detected and
 * its gaps are named rather than guessed at; no jj command runs here, because none
 * has been run against a real jj from this code.
 *
 * at(): a command run in a clean checkout of one revision, under the origin's
 * .claude/worktrees/ (gitignored). Workspace package names (@spwashi/…) resolve
 * to the checkout's own packages through links the checkout gets, and every other
 * dependency resolves up to the origin's node_modules; without the links a name
 * walks up to the origin's links and reads the origin's source.
 */

import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, promises as fs, statSync } from 'node:fs'
import path from 'node:path'

export const VCS_SCHEMA = 'spw.vcs/1' as const

export type VcsKind = 'git' | 'jj' | 'none'

export interface VcsInfo {
  kind: VcsKind
  /** The workspace root: the directory holding .git or .jj; null for none. */
  root: string | null
  /** jj with a .git beside it, so git commands see the same commits. */
  colocated: boolean
  /** What does not work here, in words. */
  gaps: string[]
}

const JJ_GAPS_COLOCATED = [
  'jj has no commit hooks: the commit gate (Touch ID, episode block) runs only when committing through git (open: jj_hooks)',
]
const JJ_GAPS_ALONE = [
  ...JJ_GAPS_COLOCATED,
  'no .git beside .jj: status, head and at() run git and are not available; a colocated workspace (jj git init --colocate) has them',
]

/** The version-control system holding a directory, found by walking up. */
export function detectVcs(dir: string): VcsInfo {
  let at = path.resolve(dir)
  for (;;) {
    const jj = isDirectory(path.join(at, '.jj'))
    const git = existsSync(path.join(at, '.git'))
    if (jj) return { kind: 'jj', root: at, colocated: git, gaps: git ? JJ_GAPS_COLOCATED : JJ_GAPS_ALONE }
    if (git) return { kind: 'git', root: at, colocated: false, gaps: [] }
    const up = path.dirname(at)
    if (up === at) return { kind: 'none', root: null, colocated: false, gaps: ['no version control: nothing to read a revision from'] }
    at = up
  }
}

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/** True when git commands can answer for this workspace. */
export const gitReady = (vcs: VcsInfo): vcs is VcsInfo & { root: string } => vcs.root !== null && (vcs.kind === 'git' || vcs.colocated)

function git(root: string, args: string[]): string {
  const run = spawnSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (run.status !== 0) throw new Error(`git ${args.join(' ')}: ${(run.stderr || '').trim() || `exit ${run.status}`}`)
  return run.stdout
}

/** A revision as a full commit id; throws with git's words when it names none. */
export function resolveRevision(root: string, rev: string): string {
  const run = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`], { cwd: root, encoding: 'utf8' })
  if (run.status !== 0) throw new Error(`${JSON.stringify(rev)} names no commit here`)
  return run.stdout.trim()
}

export function head(root: string): { id: string; short: string; branch: string | null } {
  const id = resolveRevision(root, 'HEAD')
  const branch = spawnSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' })
  return { id, short: id.slice(0, 8), branch: branch.status === 0 ? branch.stdout.trim() : null }
}

/** The branch a remote calls its default, else main or master where one exists; null when none can be told. */
export function defaultBranch(root: string): string | null {
  const remote = spawnSync('git', ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], { cwd: root, encoding: 'utf8' })
  if (remote.status === 0) return remote.stdout.trim().replace(/^origin\//, '')
  for (const name of ['main', 'master']) {
    if (spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${name}`], { cwd: root }).status === 0) return name
  }
  return null
}

export function isAncestor(root: string, ancestor: string, of: string): boolean {
  return spawnSync('git', ['merge-base', '--is-ancestor', ancestor, of], { cwd: root }).status === 0
}

export interface StatusEntry {
  path: string
  /** git's two status letters: index then worktree ('??' untracked, ' M' changed, 'M ' staged, …). */
  code: string
  tracked: boolean
  staged: boolean
  /** When the file last changed on disk; null when it is gone. */
  modified: Date | null
}

/** Every changed or untracked path, untracked directories listed file by file. */
export function status(root: string): StatusEntry[] {
  const out = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  const fields = out.split('\0')
  const entries: StatusEntry[] = []
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!
    if (field.length < 4) continue
    const code = field.slice(0, 2)
    const file = field.slice(3)
    // A rename or copy carries its old path in the next field.
    if (code[0] === 'R' || code[0] === 'C') i++
    let modified: Date | null = null
    try {
      modified = statSync(path.join(root, file)).mtime
    } catch {
      modified = null
    }
    entries.push({ path: file, code, tracked: code !== '??', staged: code[0] !== ' ' && code[0] !== '?', modified })
  }
  return entries
}

export interface AtOptions {
  /** Keep the checkout after the command, and say where it is. */
  keep?: boolean
  /** Where the command's output goes; inherited by default. */
  stdio?: 'inherit' | 'pipe'
}

export interface AtResult {
  exitCode: number
  revision: string
  checkout: string
  kept: boolean
  stdout?: string
  stderr?: string
}

/**
 * Run a command in a clean checkout of `rev`. In its arguments {origin} is the workspace root and {checkout} the
 * checkout; the command also sees SPW_VCS_ORIGIN, SPW_VCS_CHECKOUT and SPW_VCS_REVISION. The checkout is removed
 * afterwards (only this one), whatever the command's exit, unless keep.
 */
export async function at(vcs: VcsInfo, rev: string, command: string[], options: AtOptions = {}): Promise<AtResult> {
  if (!gitReady(vcs)) throw new Error(`spw vcs at: ${vcs.gaps.at(-1) ?? 'no git here'}`)
  if (!command.length) throw new Error('spw vcs at: name a command after --')
  const origin = vcs.root
  const revision = resolveRevision(origin, rev)
  const checkout = path.join(origin, '.claude', 'worktrees', `spw-at-${revision.slice(0, 12)}-${randomBytes(3).toString('hex')}`)
  git(origin, ['worktree', 'add', '--detach', checkout, revision])
  try {
    await linkWorkspacePackages(checkout)
    const fill = (arg: string) => arg.replaceAll('{origin}', origin).replaceAll('{checkout}', checkout)
    const [program, ...args] = command.map(fill)
    const bins = [path.join(checkout, 'node_modules', '.bin'), path.join(origin, 'node_modules', '.bin')]
    const child = spawn(program!, args, {
      cwd: checkout,
      stdio: options.stdio === 'pipe' ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      env: {
        ...process.env,
        PATH: [...bins, process.env.PATH ?? ''].join(path.delimiter),
        SPW_VCS_ORIGIN: origin,
        SPW_VCS_CHECKOUT: checkout,
        SPW_VCS_REVISION: revision,
      },
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => (stdout += chunk))
    child.stderr?.on('data', (chunk) => (stderr += chunk))
    const exitCode = await new Promise<number>((resolve, reject) => {
      child.on('error', (error: NodeJS.ErrnoException) =>
        reject(error.code === 'ENOENT' ? new Error(`spw vcs at: ${program} is not a program on PATH`) : error),
      )
      child.on('close', (code, signal) => resolve(code ?? (signal ? 128 : 1)))
    })
    return { exitCode, revision, checkout, kept: !!options.keep, ...(options.stdio === 'pipe' ? { stdout, stderr } : {}) }
  } finally {
    if (!options.keep) git(origin, ['worktree', 'remove', '--force', checkout])
  }
}

/** Link each workspace package under the checkout's node_modules/<scope>/ to the checkout's own copy. */
async function linkWorkspacePackages(checkout: string): Promise<void> {
  const manifest = JSON.parse(await fs.readFile(path.join(checkout, 'package.json'), 'utf8')) as { workspaces?: string[] }
  for (const pattern of manifest.workspaces ?? []) {
    // packages/* and extensions/vscode-spw: a trailing /* is every directory under it.
    const dirs = pattern.endsWith('/*')
      ? (await fs.readdir(path.join(checkout, pattern.slice(0, -2)), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => path.join(pattern.slice(0, -2), d.name))
      : [pattern]
    for (const dir of dirs) {
      let name: string | undefined
      try {
        name = (JSON.parse(await fs.readFile(path.join(checkout, dir, 'package.json'), 'utf8')) as { name?: string }).name
      } catch {
        continue
      }
      if (!name) continue
      const link = path.join(checkout, 'node_modules', ...name.split('/'))
      await fs.mkdir(path.dirname(link), { recursive: true })
      await fs.symlink(path.relative(path.dirname(link), path.join(checkout, dir)), link, 'dir')
    }
  }
}

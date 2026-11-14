import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { at, defaultBranch, detectVcs, head, isAncestor, resolveRevision, status } from './vcs'
import { readSince } from './vcs-cli'

const made: string[] = []
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A scratch directory outside any repository (the system temp dir has no .git above it). */
function scratch(): string {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'spw-vcs-')))
  made.push(dir)
  return dir
}

const run = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

/** A git repository with one commit holding a workspace package, as this repo's root holds packages/*. */
function repo(): string {
  const dir = scratch()
  run(dir, 'init', '--quiet', '--initial-branch=main')
  run(dir, 'config', 'user.email', 'test@example.invalid')
  run(dir, 'config', 'user.name', 'test')
  run(dir, 'config', 'commit.gpgsign', 'false')
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', private: true, workspaces: ['packages/*'] }))
  writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n.claude/worktrees/\n')
  mkdirSync(path.join(dir, 'packages', 'core'), { recursive: true })
  writeFileSync(path.join(dir, 'packages', 'core', 'package.json'), JSON.stringify({ name: '@spwashi/core', main: 'index.js' }))
  writeFileSync(path.join(dir, 'packages', 'core', 'index.js'), "module.exports = 'committed'\n")
  writeFileSync(path.join(dir, 'kept.txt'), 'committed\n')
  run(dir, 'add', '-A')
  // The fixture's own hooks directory is empty, so no gate runs here.
  run(dir, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'first')
  return dir
}

describe('detectVcs', () => {
  it('finds git, jj alone, jj colocated with git, or nothing, walking up from a subdirectory', () => {
    const git = repo()
    expect(detectVcs(path.join(git, 'packages', 'core'))).toMatchObject({ kind: 'git', root: git, colocated: false, gaps: [] })

    const jj = scratch()
    mkdirSync(path.join(jj, '.jj'))
    mkdirSync(path.join(jj, 'deep', 'er'), { recursive: true })
    const alone = detectVcs(path.join(jj, 'deep', 'er'))
    expect(alone).toMatchObject({ kind: 'jj', root: jj, colocated: false })
    expect(alone.gaps.join(' ')).toMatch(/no \.git beside \.jj/)

    mkdirSync(path.join(git, '.jj'))
    const colocated = detectVcs(git)
    expect(colocated).toMatchObject({ kind: 'jj', root: git, colocated: true })
    expect(colocated.gaps.join(' ')).toMatch(/no commit hooks/)

    expect(detectVcs(scratch())).toMatchObject({ kind: 'none', root: null })
  })
})

describe('reading a git repository', () => {
  it('gives head, its branch, the default branch, ancestry, and every changed or untracked path', () => {
    const dir = repo()
    const first = head(dir)
    expect(first.branch).toBe('main')
    expect(first.id).toMatch(/^[0-9a-f]{40}$/)
    expect(defaultBranch(dir)).toBe('main')
    expect(() => resolveRevision(dir, 'no-such-rev')).toThrow('"no-such-rev" names no commit here')

    writeFileSync(path.join(dir, 'kept.txt'), 'changed\n')
    writeFileSync(path.join(dir, 'new.txt'), 'new\n')
    mkdirSync(path.join(dir, 'fresh'))
    writeFileSync(path.join(dir, 'fresh', 'inside.txt'), 'x\n')
    run(dir, 'mv', 'packages/core/index.js', 'packages/core/main.js')
    const byPath = Object.fromEntries(status(dir).map((e) => [e.path, e]))
    expect(byPath['kept.txt']).toMatchObject({ code: ' M', tracked: true, staged: false })
    expect(byPath['new.txt']).toMatchObject({ code: '??', tracked: false, staged: false })
    expect(byPath['fresh/inside.txt']).toMatchObject({ code: '??' })
    expect(byPath['packages/core/main.js']).toMatchObject({ code: 'R ', staged: true })
    expect(byPath['packages/core/index.js']).toBeUndefined()
    expect(byPath['kept.txt']!.modified).toBeInstanceOf(Date)

    run(dir, 'add', '-A')
    run(dir, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'second')
    expect(isAncestor(dir, first.id, 'HEAD')).toBe(true)
    expect(isAncestor(dir, 'HEAD', first.id)).toBe(false)
  })
})

describe('at', () => {
  it('runs a command in a clean checkout of a revision: no uncommitted or untracked file reaches it, and workspace names resolve to its own packages', async () => {
    const dir = repo()
    writeFileSync(path.join(dir, 'kept.txt'), 'uncommitted\n')
    writeFileSync(path.join(dir, 'packages', 'core', 'index.js'), "module.exports = 'uncommitted'\n")
    writeFileSync(path.join(dir, 'untracked.txt'), 'not committed\n')
    // As npm install leaves it: the origin's node_modules links the package name to the origin's own (uncommitted) copy.
    mkdirSync(path.join(dir, 'node_modules', '@spwashi'), { recursive: true })
    symlinkSync('../../packages/core', path.join(dir, 'node_modules', '@spwashi', 'core'), 'dir')
    const script = [
      "const fs = require('node:fs')",
      "console.log(fs.readFileSync('kept.txt', 'utf8').trim())",
      "console.log(fs.existsSync('untracked.txt'))",
      "console.log(require('@spwashi/core'))",
      "console.log(fs.realpathSync(require.resolve('@spwashi/core')).startsWith(fs.realpathSync(process.env.SPW_VCS_CHECKOUT)))",
      'console.log(process.argv[1] === process.env.SPW_VCS_ORIGIN)',
    ].join(';')
    const result = await at(detectVcs(dir), 'HEAD', ['node', '-e', script, '{origin}'], { stdio: 'pipe' })
    expect(result.exitCode).toBe(0)
    expect(result.stdout!.trim().split('\n')).toEqual(['committed', 'false', 'committed', 'true', 'true'])
    expect(result.revision).toBe(head(dir).id)
    // The checkout is gone, and the origin's own changes are untouched.
    expect(run(dir, 'worktree', 'list').trim().split('\n')).toHaveLength(1)
    expect(readdirSync(path.join(dir, '.claude', 'worktrees'))).toEqual([])
    expect(status(dir).map((e) => e.path).sort()).toEqual(['kept.txt', 'packages/core/index.js', 'untracked.txt'])
  })

  it('passes the command\'s exit code back, removes the checkout after a failure, and keeps it when asked', async () => {
    const dir = repo()
    const failed = await at(detectVcs(dir), 'HEAD', ['node', '-e', 'process.exit(3)'], { stdio: 'pipe' })
    expect(failed.exitCode).toBe(3)
    expect(run(dir, 'worktree', 'list').trim().split('\n')).toHaveLength(1)

    await expect(at(detectVcs(dir), 'HEAD', ['no-such-program-here'], { stdio: 'pipe' })).rejects.toThrow('is not a program on PATH')
    expect(run(dir, 'worktree', 'list').trim().split('\n')).toHaveLength(1)

    const kept = await at(detectVcs(dir), 'HEAD', ['node', '-e', ''], { stdio: 'pipe', keep: true })
    expect(kept.kept).toBe(true)
    expect(run(dir, 'worktree', 'list')).toContain(kept.checkout)
    run(dir, 'worktree', 'remove', '--force', kept.checkout)
  })

  it('refuses a workspace git cannot answer for, saying why', async () => {
    const jj = scratch()
    mkdirSync(path.join(jj, '.jj'))
    await expect(at(detectVcs(jj), 'HEAD', ['true'])).rejects.toThrow(/no \.git beside \.jj/)
    await expect(at(detectVcs(scratch()), 'HEAD', ['true'])).rejects.toThrow(/no version control/)
  })
})

describe('readSince', () => {
  it('reads a span back from now, or a clock time today', () => {
    const now = new Date(2026, 10, 13, 23, 30)
    expect(readSince('30m', now)).toEqual(new Date(2026, 10, 13, 23, 0))
    expect(readSince('2h', now)).toEqual(new Date(2026, 10, 13, 21, 30))
    expect(readSince('1d', now)).toEqual(new Date(2026, 10, 12, 23, 30))
    expect(readSince('21:05', now)).toEqual(new Date(2026, 10, 13, 21, 5))
    expect(readSince('soon', now)).toBeNull()
  })
})

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { at, defaultBranch, detectVcs, head, isAncestor, resolveRevision, status } from './vcs'
import { diffDriverConfig, readSince } from './vcs-cli'

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

  it('says which forms a revision id takes: SHA-1 hex, SHA-256 when the repository says so, and jj change ids in a jj workspace', () => {
    const git = repo()
    expect(detectVcs(git).idForms).toEqual(['git_sha1'])
    const sha256 = scratch()
    run(sha256, 'init', '--quiet', '--object-format=sha256')
    expect(detectVcs(sha256).idForms).toEqual(['git_sha256'])
    const jj = scratch()
    mkdirSync(path.join(jj, '.jj'))
    expect(detectVcs(jj).idForms).toEqual(['git_sha1', 'jj_change'])
    // A worktree's .git is a file pointing at its git dir; the format is read from the common one.
    const wt = path.join(sha256, 'wt')
    writeFileSync(path.join(sha256, 'x'), 'x')
    run(sha256, 'add', 'x')
    run(sha256, '-c', 'user.email=t@example.invalid', '-c', 'user.name=t', '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'x')
    run(sha256, 'worktree', 'add', '--quiet', '--detach', wt)
    expect(detectVcs(wt)).toMatchObject({ kind: 'git', root: wt, idForms: ['git_sha256'] })
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

describe('spw vcs land', () => {
  const main = path.resolve(__dirname, 'main.ts')
  // The command runs in a throwaway repository, where a bare --import tsx would not resolve; name the loader whole.
  const tsx = pathToFileURL(path.resolve(__dirname, '../../../node_modules/tsx/dist/loader.mjs')).href
  const spw = (cwd: string, ...args: string[]) => {
    try {
      return { out: execFileSync(process.execPath, ['--import', tsx, main, 'vcs', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), code: 0 }
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string; status?: number }
      return { out: `${e.stdout ?? ''}${e.stderr ?? ''}`, code: e.status ?? 1 }
    }
  }

  it('lists planned lines, previews a landing, writes it with --write, and names a label it cannot find', () => {
    const dir = repo()
    const plan = path.join(dir, '.agents', 'plans', 'demo', 'wip.spw')
    mkdirSync(path.dirname(plan), { recursive: true })
    const text = ['^["commits"]{', ' ~[first_pass]: "^seed[x] — planned"', '}', ''].join('\n')
    writeFileSync(plan, text)
    const id = head(dir).id.slice(0, 8)

    expect(spw(dir, 'land', 'demo').out).toContain('~[first_pass]  ^seed[x] — planned')
    const preview = spw(dir, 'land', 'demo', 'first_pass')
    expect(preview.out).toContain(`+ .[first_pass](${id}): "first"`)
    expect(readFileSync(plan, 'utf8')).toBe(text)

    expect(spw(dir, 'land', '.agents/plans/demo/wip.spw', 'first_pass', '--write').code).toBe(0)
    expect(readFileSync(plan, 'utf8').split('\n')[1]).toBe(` .[first_pass](${id}): "first"`)

    const missing = spw(dir, 'land', 'demo', 'nowhere')
    expect(missing.code).not.toBe(0)
    expect(missing.out).toContain('no ~[nowhere] or .[nowhere] line in the commits block')
  }, 30_000)
})

describe('the diff driver', () => {
  it('makes git name the frame a change sits in and diff words without splitting marks or an em dash', () => {
    const dir = repo()
    writeFileSync(path.join(dir, '.gitattributes'), '*.spw diff=spw\n')
    const body = ['#>anchor_one', '^["notes"]{', ' a: 1', ' b: 2', ' c: 3', ' d: 4', ' claim: "one claim — and its reason — on one line, with #>marks, %body[392] and a..b"', '}', ''].join('\n')
    writeFileSync(path.join(dir, 'n.spw'), body)
    run(dir, 'add', '-A')
    run(dir, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'notes')
    writeFileSync(path.join(dir, 'n.spw'), body.replace('its reason', 'its cause').replace('a..b', 'a..c').replace('[392]', '[440]'))
    const config = Object.entries(diffDriverConfig()).flatMap(([key, value]) => ['-c', `${key}=${value}`])
    const diff = run(dir, ...config, 'diff', '--word-diff=porcelain')
    expect(diff).toMatch(/^@@ [^@]+ @@ \^\["notes"\]\{$/m)
    const changed = diff.split('\n').filter((line) => /^[-+][^-+]/.test(line))
    expect(changed).toEqual(['-reason', '+cause', '-392', '+440', '-b', '+c'])
    // Without the driver git names nothing and diffs whitespace-separated words.
    const plain = run(dir, 'diff', '--word-diff=porcelain')
    expect(plain).toMatch(/^@@ [^@]+ @@$/m)
    expect(plain.split('\n').filter((line) => /^[-+][^-+]/.test(line))).toContain('-%body[392]')
  })
})

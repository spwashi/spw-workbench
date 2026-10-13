/**
 * Commit refs in plan files — hover reads the commit from git, and a hash the
 * repository does not hold is an information diagnostic. Other surfaces are
 * untouched. Each test reads a throwaway repository with a fixed author date.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  commitExists,
  commitRefDiagnostics,
  commitRefsIn,
  hoverCommitRef,
  isPlanStreamFile,
  resetCommitRefCaches,
} from '../handlers/commit-refs'
import { publishDiagnostics } from '../handlers/analysis'
import { hover } from '../handlers/display'
import { ServerIndex } from '../server-index'
import { DEFAULT_CONFIG, type HandlerDeps, type LspDiagnostic } from '../types'

const MISSING = 'deadbee1'

let repo: string
let outside: string
let hash: string

function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Plan Author',
      GIT_AUTHOR_EMAIL: 'author@example.invalid',
      GIT_AUTHOR_DATE: '2026-01-02T03:04:05-05:00',
      GIT_COMMITTER_NAME: 'Plan Author',
      GIT_COMMITTER_EMAIL: 'author@example.invalid',
      GIT_COMMITTER_DATE: '2026-01-02T03:04:05+00:00',
    },
  }).trim()
}

beforeAll(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'spw-commit-refs-'))
  outside = mkdtempSync(path.join(tmpdir(), 'spw-commit-refs-bare-'))
  git(['init', '--quiet'])
  writeFileSync(path.join(repo, 'notes.txt'), 'one\ntwo\n')
  writeFileSync(path.join(repo, 'more.txt'), 'three\n')
  git(['add', 'notes.txt', 'more.txt'])
  git(['commit', '--quiet', '--no-gpg-sign', '-m', '#[plans] — land the notes'])
  hash = git(['rev-parse', '--short=8', 'HEAD'])
})

afterAll(() => {
  rmSync(repo, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

beforeEach(() => resetCommitRefCaches())

function planText(): string {
  return [
    '^["commits"]{',
    ` .[landed](${hash}): "#[plans] — land the notes"`,
    ` .[ghost](${MISSING}): "never made"`,
    ' ~[planned]: "&[x] — not yet"',
    '}',
    '',
  ].join('\n')
}

function planPath(root: string): string {
  return path.join(root, '.agents', 'plans', 'demo', 'wip.spw')
}

/** Column of the hash on line 1 (` .[landed](` is 11 characters). */
const HASH_COLUMN = 11

describe('which files carry commit refs', () => {
  it('reads plan streams only', () => {
    expect(isPlanStreamFile('/repo/.agents/plans/demo/wip.spw')).toBe(true)
    expect(isPlanStreamFile('.agents/plans/_archive/old/wip.spw')).toBe(true)
    expect(isPlanStreamFile('/repo/.agents/plans/demo/PLAN.spw')).toBe(false)
    expect(isPlanStreamFile('/repo/docs/wip.spw')).toBe(false)
  })

  it('finds each hash with its exact range in a plan file, and none elsewhere', () => {
    const refs = commitRefsIn(planText(), planPath(repo))
    expect(refs.map((ref) => ref.hash)).toEqual([hash, MISSING])
    expect(refs[0].range).toEqual({
      start: { line: 1, character: HASH_COLUMN },
      end: { line: 1, character: HASH_COLUMN + hash.length },
    })
    expect(commitRefsIn(planText(), path.join(repo, 'docs', 'notes.spw'))).toEqual([])
  })
})

describe('hover', () => {
  it('shows subject, author date and the files the commit changed', async () => {
    const result = await hoverCommitRef(planText(), planPath(repo), { line: 1, character: HASH_COLUMN + 2 }, repo)
    const value = result?.contents.value ?? ''
    expect(value).toContain(`commit \`${hash}\``)
    expect(value).toContain('land the notes')
    expect(value).toContain('Authored 2026-01-02 03:04 (-05:00)')
    expect(value).toContain('2 files changed · +3 −0')
    expect(value).toContain('`notes.txt` +2 −0')
    expect(result?.range).toEqual({
      start: { line: 1, character: HASH_COLUMN },
      end: { line: 1, character: HASH_COLUMN + hash.length },
    })
  })

  it('says when the hash is not in the repository', async () => {
    const result = await hoverCommitRef(planText(), planPath(repo), { line: 2, character: 12 }, repo)
    expect(result?.contents.value).toContain('not in this repository')
  })

  it('stays out of the way off the hash and outside plan files', async () => {
    expect(await hoverCommitRef(planText(), planPath(repo), { line: 1, character: 4 }, repo)).toBeNull()
    expect(await hoverCommitRef(planText(), path.join(repo, 'notes.spw'), { line: 1, character: HASH_COLUMN }, repo)).toBeNull()
  })

  it('answers through the hover handler first', async () => {
    const uri = `file://${planPath(repo)}`
    const serverIndex = new ServerIndex(repo)
    serverIndex.openDocument(uri, planPath(repo), planText(), 1)
    const deps = {
      serverIndex,
      config: DEFAULT_CONFIG,
      workspaceRoot: repo,
      pathFromUri: (value: string) => value.replace('file://', ''),
      uriFromPath: (value: string) => `file://${value}`,
      getDocumentText: async () => planText(),
      mergeRoots: () => ({}),
      resolveReferencePath: async () => null,
    } as unknown as HandlerDeps
    const result = await hover({ textDocument: { uri }, position: { line: 1, character: HASH_COLUMN } }, deps)
    expect(result?.contents.value).toContain('land the notes')
  })
})

describe('diagnostics', () => {
  it('flags only the hash the repository does not hold, as information', async () => {
    const diagnostics = await commitRefDiagnostics(planText(), planPath(repo), repo)
    expect(diagnostics).toEqual([{
      range: { start: { line: 2, character: 10 }, end: { line: 2, character: 10 + MISSING.length } },
      severity: 3,
      source: 'spw-plan',
      message: `commit ${MISSING} is not in this repository`,
    }])
  })

  it('stays silent where git cannot answer or the file is not a plan', async () => {
    expect(await commitExists(outside, hash)).toBeNull()
    expect(await commitRefDiagnostics(planText(), planPath(outside), outside)).toEqual([])
    expect(await commitRefDiagnostics(planText(), path.join(repo, 'notes.spw'), repo)).toEqual([])
  })

  it('publishes through the diagnostics handler', async () => {
    const published: LspDiagnostic[] = []
    const deps = {
      serverIndex: {
        getDocument: () => ({ text: planText(), filePath: planPath(repo), selectorHits: [], parseResult: null }),
        getProjectionsFromSpecOwner: () => [],
      },
      config: { ...DEFAULT_CONFIG, diagnostics: { unresolvedRefs: 'off', staleProjections: false } },
      workspaceRoot: repo,
      sendNotification: (_method: string, params: any) => published.push(...(params?.diagnostics ?? [])),
      trialRunSpw: () => ({ success: true }),
    } as unknown as HandlerDeps
    await publishDiagnostics(`file://${planPath(repo)}`, deps)
    expect(published.filter((d) => d.source === 'spw-plan').map((d) => d.message))
      .toEqual([`commit ${MISSING} is not in this repository`])
  })
})

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
  COMMIT_REF_STRATEGY,
  allCommitRefsIn,
  citedRefsIn,
  commitExists,
  commitRefDiagnostics,
  commitRefLinks,
  commitRefsIn,
  commitUri,
  confirmCommits,
  hoverCommitRef,
  isPlanStreamFile,
  resetCommitRefCaches,
} from '../handlers/commit-refs'
import { SEMANTIC_TOKENS_LEGEND, semanticTokens } from '../handlers/semantic-tokens'
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

  it('stays out of the way off the hash', async () => {
    expect(await hoverCommitRef(planText(), planPath(repo), { line: 1, character: 4 }, repo)).toBeNull()
  })

  it('outside plan files, hovers a cited hash only once git confirms it names a commit', async () => {
    const notes = path.join(repo, 'notes.spw')
    const confirmed = await hoverCommitRef(planText(), notes, { line: 1, character: HASH_COLUMN }, repo)
    expect(confirmed?.contents.value).toContain('land the notes')
    const shaped = await hoverCommitRef(planText(), notes, { line: 2, character: 12 }, repo)
    expect(shaped?.contents.value).toBe(`**hash-shaped \`${MISSING}\`** — not a commit in this repository`)
    expect(await hoverCommitRef(planText(), path.join(outside, 'notes.spw'), { line: 2, character: 12 }, outside)).toBeNull()
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

describe('the hash resolution strategy', () => {
  it('landed refs claim a commit and take commitRef; cited hashes take hashlike and wait for git to link', () => {
    expect(COMMIT_REF_STRATEGY.landed).toEqual({ confirmBeforeShowing: false, diagnoseMissing: true, token: 'commitRef', explainMissing: true })
    expect(COMMIT_REF_STRATEGY.cited).toEqual({ confirmBeforeShowing: true, diagnoseMissing: false, token: 'hashlike', explainMissing: true })
  })

  it('a hex run glued to a sigil is a name, not a hash', () => {
    expect(citedRefsIn('#>abc1234 #!abc1234 $abc1234 @abc1234 ~abc1234 %abc1234 (abc1234)').map((ref) => ref.hash)).toEqual(['abc1234'])
  })

  it('cites any 7 to 40 hex run with a digit and a letter that stands on its own', () => {
    const text = [
      'landed in e6c5697 and (abc1234) today; journal commit: "813444dc"',
      'not: deadbeef 20261013 #ff8800aa ./abc1234f.spw x-abc12345-y abc1234g v1.abc1234',
    ].join('\n')
    expect(citedRefsIn(text).map((ref) => ref.hash)).toEqual(['e6c5697', 'abc1234', '813444dc'])
    expect(citedRefsIn(text)[0]).toMatchObject({ source: 'cited', range: { start: { line: 0, character: 10 } } })
  })

  it('in a plan file, a landed hash is read once, as landed', () => {
    const refs = allCommitRefsIn(planText(), planPath(repo))
    expect(refs.map((ref) => `${ref.source}:${ref.hash}`)).toEqual([`landed:${hash}`, `landed:${MISSING}`])
  })
})

describe('batched confirmation', () => {
  it('asks git once for many hashes: a commit, a missing hash, and an unknown repository', async () => {
    const verdicts = await confirmCommits(repo, [hash, MISSING, hash])
    expect(verdicts.get(hash)).toBe(true)
    expect(verdicts.get(MISSING)).toBe(false)
    expect((await confirmCommits(outside, [hash])).get(hash)).toBeNull()
  })
})

describe('links', () => {
  it('links every hash git confirms to its full name, landed or cited, and nothing else', async () => {
    const full = git(['rev-parse', 'HEAD'])
    const notes = path.join(repo, 'notes.spw')
    const cited = await commitRefLinks(`see ${hash} and ${MISSING}\n`, notes, repo)
    expect(cited).toEqual([{
      range: { start: { line: 0, character: 4 }, end: { line: 0, character: 4 + hash.length } },
      target: commitUri(repo, full),
      tooltip: 'Open commit',
    }])
    const landed = await commitRefLinks(planText(), planPath(repo), repo)
    expect(landed.map((link) => link.range.start.line)).toEqual([1])
    expect(await commitRefLinks(`see ${hash}\n`, path.join(outside, 'x.spw'), outside)).toEqual([])
  })

  it('names the repository and the full hash in the link target', () => {
    expect(commitUri('/r o/x', 'abc1234')).toBe('spw-commit:/abc1234?root=%2Fr%20o%2Fx')
  })
})

describe('semantic tokens', () => {
  it('a landed hash is one commitRef token, replacing the pieces the scanner read', () => {
    const uri = `file://${planPath(repo)}`
    const serverIndex = new ServerIndex(repo)
    serverIndex.openDocument(uri, planPath(repo), planText(), 1)
    const { data } = semanticTokens({ textDocument: { uri } }, { serverIndex } as unknown as HandlerDeps)
    const commitRef = SEMANTIC_TOKENS_LEGEND.tokenTypes.indexOf('commitRef')
    const absolute: Array<{ line: number; char: number; length: number; type: number }> = []
    let line = 0
    let char = 0
    for (let i = 0; i < data.length; i += 5) {
      line += data[i]!
      char = data[i] === 0 ? char + data[i + 1]! : data[i + 1]!
      absolute.push({ line, char, length: data[i + 2]!, type: data[i + 3]! })
    }
    const onHash = absolute.filter((token) => token.line === 1 && token.char < HASH_COLUMN + hash.length && HASH_COLUMN < token.char + token.length)
    expect(onHash).toEqual([{ line: 1, char: HASH_COLUMN, length: hash.length, type: commitRef }])
    expect(absolute.filter((token) => token.type === commitRef).map((token) => token.line)).toEqual([1, 2])
  })
})

describe('hashlike tokens', () => {
  function tokensOf(text: string, filePath: string): Array<{ line: number; char: number; length: number; type: string }> {
    const uri = `file://${filePath}`
    const serverIndex = new ServerIndex(repo)
    serverIndex.openDocument(uri, filePath, text, 1)
    const { data } = semanticTokens({ textDocument: { uri } }, { serverIndex } as unknown as HandlerDeps)
    const out: Array<{ line: number; char: number; length: number; type: string }> = []
    let line = 0
    let char = 0
    for (let i = 0; i < data.length; i += 5) {
      line += data[i]!
      char = data[i] === 0 ? char + data[i + 1]! : data[i + 1]!
      out.push({ line, char, length: data[i + 2]!, type: SEMANTIC_TOKENS_LEGEND.tokenTypes[data[i + 3]!]! })
    }
    return out
  }

  it('a hash-shaped run outside a plan is one hashlike token, whether or not git knows it', () => {
    const line = '    ~<1>[begin_syntax](ebcde35): "&[foo] — syntax highlighting for hashes"'
    const tokens = tokensOf(`${line}\n`, path.join(repo, 'tmp.spw'))
    const at = line.indexOf('ebcde35')
    expect(tokens.filter((token) => token.char < at + 7 && at < token.char + token.length)).toEqual([
      { line: 0, char: at, length: 7, type: 'hashlike' },
    ])
  })

  it('a hashlike inside a string cuts the string around it, so the rest keeps its color', () => {
    const line = 'note: "landed at 651b535b today"'
    const tokens = tokensOf(`${line}\n`, path.join(repo, 'notes.spw'))
    const at = line.indexOf('651b535b')
    const open = line.indexOf('"')
    expect(tokens.filter((token) => token.char >= open)).toEqual([
      { line: 0, char: open, length: at - open, type: 'string' },
      { line: 0, char: at, length: 8, type: 'hashlike' },
      { line: 0, char: at + 8, length: line.length - at - 8, type: 'string' },
    ])
  })
})

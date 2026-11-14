/**
 * Landing a planned commit from its line: candidates come from git (HEAD, then
 * commits whose message names the label), and the edit is the line written
 * landed, nothing else touched.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { landCandidates, landCommitActions } from '../handlers/land-commit'

let repo = ''
const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()
const commit = (message: string) => {
  writeFileSync(path.join(repo, 'f.txt'), message)
  git('add', 'f.txt')
  git('-c', 'core.hooksPath=/dev/null', '-c', 'user.email=t@example.invalid', '-c', 'user.name=t', 'commit', '--quiet', '--no-gpg-sign', '-m', message)
  return git('rev-parse', '--short=8', 'HEAD')
}

const PLAN = ['^["commits"]{', ' .[done](1234abcd): "old"', ' ~[parser_pass]: "^seed[x] — planned words"', '}', ''].join('\n')
const planPath = () => path.join(repo, '.agents', 'plans', 'demo', 'wip.spw')

beforeAll(() => {
  repo = realpathSync(mkdtempSync(path.join(tmpdir(), 'spw-land-')))
  git('init', '--quiet')
  mkdirSync(path.dirname(planPath()), { recursive: true })
})
afterAll(() => rmSync(repo, { recursive: true, force: true }))

describe('landing a planned commit line', () => {
  it('offers HEAD first, then a commit whose message names the label, each once', async () => {
    const named = commit('^seed[x] — the parser pass\n\nlands parser_pass')
    const headId = commit('.[plans] — a later commit "with quotes"')
    const candidates = await landCandidates(repo, 'parser_pass')
    expect(candidates).toEqual([
      { id: headId, subject: '.[plans] — a later commit "with quotes"', why: 'head' },
      { id: named, subject: '^seed[x] — the parser pass', why: 'names the label' },
    ])
  })

  it('rewrites only the planned line, with the subject as committed and quotes escaped', async () => {
    const range = { start: { line: 2, character: 3 }, end: { line: 2, character: 3 } }
    const actions = await landCommitActions('file:///plan', PLAN, planPath(), range, repo)
    expect(actions).toHaveLength(2)
    const edit = actions[0]!.edit!.changes!['file:///plan']![0]!
    expect(edit.range).toEqual({ start: { line: 2, character: 0 }, end: { line: 2, character: PLAN.split('\n')[2]!.length } })
    expect(edit.newText).toMatch(/^ \.\[parser_pass\]\([0-9a-f]{8}\): "\.\[plans\] — a later commit \\"with quotes\\""$/)
    expect(actions[0]!.title).toMatch(/^Land parser_pass as [0-9a-f]{8} \(HEAD\): /)
  })

  it('offers nothing on a landed line, outside a plan file, or without a workspace', async () => {
    const onLanded = { start: { line: 1, character: 2 }, end: { line: 1, character: 2 } }
    expect(await landCommitActions('file:///plan', PLAN, planPath(), onLanded, repo)).toEqual([])
    const onPlanned = { start: { line: 2, character: 2 }, end: { line: 2, character: 2 } }
    expect(await landCommitActions('file:///x', PLAN, path.join(repo, 'notes.spw'), onPlanned, repo)).toEqual([])
    expect(await landCommitActions('file:///plan', PLAN, planPath(), onPlanned, undefined)).toEqual([])
  })
})

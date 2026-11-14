/**
 * Land a planned commit from its line: a code action on `~[label]: "…"` in a
 * plan's commits block that rewrites it as `.[label](id): "subject as
 * committed"`, offering HEAD and the recent commits whose message names the
 * label. The text edit is seed's (experimental/commit-lines.ts); git is asked
 * here only for candidates. In a jj workspace with no .git there are no
 * candidates, since nothing here runs jj.
 */

import { execFile } from 'node:child_process'
import { landedLineText, readCommitLines } from '@spwashi/spw-seed'
import type { LspCodeAction, LspRange } from '../types'
import { isPlanStreamFile } from './commit-ref-forms'

/** How many commits naming the label are offered besides HEAD. */
const NAMED_LIMIT = 4
const GIT_TIMEOUT_MS = 2000
/** The id length plan files write. */
const SHORT = 8

export interface LandCandidate {
  id: string
  subject: string
  /** Why it is offered. */
  why: 'head' | 'names the label'
}

function git(args: string[], cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: GIT_TIMEOUT_MS, encoding: 'utf8' }, (error, stdout) => resolve(error ? null : stdout))
  })
}

/** HEAD, then recent commits whose message names the label, each once. */
export async function landCandidates(root: string, label: string): Promise<LandCandidate[]> {
  const read = (out: string | null) =>
    (out ?? '').split('\n').filter(Boolean).map((line) => {
      const [id, subject] = line.split('\x1f')
      return { id: id!.slice(0, SHORT), subject: subject ?? '' }
    })
  const head = read(await git(['log', '-1', '--format=%H%x1f%s'], root))
  const named = read(await git(['log', `-${NAMED_LIMIT + 1}`, '--format=%H%x1f%s', '--fixed-strings', `--grep=${label}`], root))
  const out: LandCandidate[] = head.map((c) => ({ ...c, why: 'head' as const }))
  for (const c of named) if (!out.some((known) => known.id === c.id) && out.length <= NAMED_LIMIT) out.push({ ...c, why: 'names the label' })
  return out
}

/** Land actions for the planned commit lines a range touches. */
export async function landCommitActions(uri: string, text: string, filePath: string | null | undefined, range: LspRange, root: string | undefined): Promise<LspCodeAction[]> {
  if (!root || !isPlanStreamFile(filePath)) return []
  const planned = readCommitLines(text).filter((c) => c.state === 'planned' && c.inCommitsBlock && c.line >= range.start.line && c.line <= range.end.line)
  const lines = text.split('\n')
  const actions: LspCodeAction[] = []
  for (const line of planned) {
    for (const candidate of await landCandidates(root, line.label)) {
      const subject = candidate.subject.length > 60 ? `${candidate.subject.slice(0, 57)}…` : candidate.subject
      actions.push({
        title: `Land ${line.label} as ${candidate.id}${candidate.why === 'head' ? ' (HEAD)' : ''}: ${subject}`,
        kind: 'refactor.rewrite',
        edit: {
          changes: {
            [uri]: [{
              range: { start: { line: line.line, character: 0 }, end: { line: line.line, character: lines[line.line]!.length } },
              newText: landedLineText(line, candidate.id, candidate.subject),
            }],
          },
        },
      })
    }
  }
  return actions
}

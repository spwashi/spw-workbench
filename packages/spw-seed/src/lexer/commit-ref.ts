import type { Token } from '../types'
import { advance, getPosition, type LexerState } from './state'

/**
 * The shapes a version-control id is written in, as data. A caller passes the
 * shapes its workspace uses; the default is git's SHA-1 form, which is what
 * every plan file has written so far.
 *
 *   git_sha1    7 to 40 lowercase hex: a commit, abbreviated or whole
 *   git_sha256  7 to 64 lowercase hex: a commit in a repository whose object
 *               format is sha256 (git rev-parse --show-object-format)
 *   jj_change   a jj change id, which stays the same when the commit it names is
 *               rewritten; jj writes it in the letters k to z (reverse hex), 32
 *               long, shown abbreviated, so 8 to 32 here. Taken from jj's
 *               documentation, not from running jj: no jj was installed where
 *               this was written.
 *
 * A jj change id is only ever read in the landed position, never as a cited id
 * in prose: words such as "tomorrow" are made of the same letters.
 */
export const REVISION_ID_FORMS = {
  git_sha1: { pattern: '[0-9a-f]{7,40}', identity: 'content' },
  git_sha256: { pattern: '[0-9a-f]{7,64}', identity: 'content' },
  jj_change: { pattern: '[k-z]{8,32}', identity: 'change' },
} as const

export type RevisionIdForm = keyof typeof REVISION_ID_FORMS

export const DEFAULT_REVISION_ID_FORMS: readonly RevisionIdForm[] = ['git_sha1']

const sceneCache = new Map<string, RegExp>()

/** An id in one of the forms that exactly fills the scene's parentheses. */
function scenePattern(forms: readonly RevisionIdForm[]): RegExp {
  const key = forms.join(',')
  let pattern = sceneCache.get(key)
  if (!pattern) {
    pattern = new RegExp(`^(?:${forms.map((form) => REVISION_ID_FORMS[form].pattern).join('|')})(?=\\))`)
    sceneCache.set(key, pattern)
  }
  return pattern
}

/** Which form an id is in, among those given; the first that matches whole. */
export function revisionIdForm(id: string, forms: readonly RevisionIdForm[] = DEFAULT_REVISION_ID_FORMS): RevisionIdForm | null {
  return forms.find((form) => new RegExp(`^${REVISION_ID_FORMS[form].pattern}$`).test(id)) ?? null
}

/**
 * A landed commit in a plan file names the change it landed in as its
 * scene: `.[name](551bb419): "subject"`. Most short hashes start with a
 * digit, which the ordinary matchers split into a number and a word. When an
 * id in one of the workspace's forms exactly fills the parentheses, keep it
 * one identifier and mark it `commit_ref`, so editors can resolve, link and
 * check it.
 */
export function readCommitRef(state: LexerState, forms: readonly RevisionIdForm[] = DEFAULT_REVISION_ID_FORMS): Token<'IDENTIFIER'> | null {
  if (state.input[state.offset - 1] !== '(') return null
  const match = scenePattern(forms).exec(state.input.slice(state.offset, state.offset + 65))
  if (!match) return null

  const start = getPosition(state)
  advance(state, match[0].length)
  return {
    type: 'IDENTIFIER',
    kind: 'commit_ref',
    value: match[0],
    span: { start, end: getPosition(state) },
    identifier: { segments: [match[0]], qualified: false },
  }
}

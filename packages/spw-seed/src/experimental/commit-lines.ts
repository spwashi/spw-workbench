/**
 * A plan's commit lines, read and written as text: the place a Spw file meets
 * version control.
 *
 *   ^["commits"]{
 *    ~[vcs_settings]: "#[workspace] — … gains ^[vcs] …"        planned
 *    .[vcs_adapter](f53aaa1c): "^seed[cli,…] — resolve …"       landed
 *   }
 *
 * The label is the change's identity and survives any rewrite; the id in the
 * scene is the commit's content identity and does not (an amend or a rebase
 * makes a new one). Landing a line binds the label to an id and replaces the
 * planned description with the subject as committed, which is what a reader
 * of the plan wants to find again in the log.
 *
 * Nothing here asks a version-control system: a caller finds the commit (HEAD,
 * or one whose message names the label) and this writes the line.
 *
 * Experimental (spw.commit-lines/1).
 */

import { DEFAULT_REVISION_ID_FORMS, REVISION_ID_FORMS, type RevisionIdForm } from '../lexer/commit-ref'

export const COMMIT_LINES_SCHEMA = 'spw.commit-lines/1' as const

export interface CommitLine {
  state: 'planned' | 'landed'
  label: string
  /** The landed commit's id as written; null while planned. */
  id: string | null
  /** The description or subject, unquoted. */
  subject: string
  /** Zero-based line number. */
  line: number
  indent: string
  /** Whether the line sits in a ^["commits"]{ … } block. */
  inCommitsBlock: boolean
}

const LINE = /^(\s*)([~.])\[([A-Za-z0-9_]+)\](?:\(([0-9a-z]+)\))?:\s*"((?:[^"\\]|\\.)*)"\s*$/

const unquote = (s: string) => s.replace(/\\(["\\])/g, '$1')

/** A subject as a Spw string: backslashes and double quotes escaped, as landed lines write them. */
export const quoteSubject = (subject: string): string => `"${subject.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Every planned or landed commit line in a text, with whether it sits in a commits block. */
export function readCommitLines(text: string): CommitLine[] {
  const lines = text.split('\n')
  const out: CommitLine[] = []
  let inCommits = false
  lines.forEach((raw, line) => {
    if (/^\^\["commits"\]\{\s*$/.test(raw)) {
      inCommits = true
      return
    }
    if (inCommits && /^\}\s*$/.test(raw)) {
      inCommits = false
      return
    }
    const m = raw.match(LINE)
    if (!m) return
    const landed = m[2] === '.'
    // A landed line needs its id; a planned line has none.
    if (landed !== (m[4] !== undefined)) return
    out.push({ state: landed ? 'landed' : 'planned', label: m[3]!, id: m[4] ?? null, subject: unquote(m[5]!), line, indent: m[1]!, inCommitsBlock: inCommits })
  })
  return out
}

/** The text of a commit line landed in `id` with the subject as committed. */
export function landedLineText(line: Pick<CommitLine, 'indent' | 'label'>, id: string, subject: string, forms: readonly RevisionIdForm[] = DEFAULT_REVISION_ID_FORMS): string {
  if (!forms.some((form) => new RegExp(`^${REVISION_ID_FORMS[form].pattern}$`).test(id))) {
    throw new Error(`${JSON.stringify(id)} is not an id in the forms ${forms.join(', ')}`)
  }
  return `${line.indent}.[${line.label}](${id}): ${quoteSubject(subject.split('\n')[0]!.trim())}`
}

/** A text with one planned or landed line rewritten as landed; the text unchanged when the label has no line. */
export function landCommit(text: string, label: string, id: string, subject: string, forms: readonly RevisionIdForm[] = DEFAULT_REVISION_ID_FORMS): { text: string; line: number | null; was: CommitLine | null } {
  const found = readCommitLines(text).filter((c) => c.label === label && c.inCommitsBlock)
  const target = found.find((c) => c.state === 'planned') ?? found[0] ?? null
  if (!target) return { text, line: null, was: null }
  const lines = text.split('\n')
  lines[target.line] = landedLineText(target, id, subject, forms)
  return { text: lines.join('\n'), line: target.line, was: target }
}

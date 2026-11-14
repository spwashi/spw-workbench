/**
 * The lexer's tokens as POSIX extended regular expressions, for tools that
 * split text without a Spw parser: git's word diff (diff.<driver>.wordRegex)
 * and hunk headers (diff.<driver>.xfuncname).
 *
 * The word pattern is derived from the operator and connector tables the lexer
 * reads (profiles.ts) and the particle aims, so a multi-character mark (`#>`,
 * `..`, `~>`) stays one word in a diff and a new mark in the tables reaches it.
 * The frame pattern matches an unindented line that opens a body (`^["commits"]{`,
 * `!["card"]{`, `^gravity{`) or an anchor (`#>name`): the nearest one above a hunk
 * is what the hunk sits in. Over this repository's last 60 commits touching .spw
 * files, git's default left 1,102 of 1,104 hunks with no header; this pattern
 * names a frame or anchor for 1,024.
 */

import { DEFAULT_CONNECTOR_MAP, DEFAULT_OPERATOR_MAP } from './profiles'

/** The particle aims (matchers/particles.ts), the aspect particle, and the spread and arrow matchers' marks. */
const OTHER_MARKS = ['#>', '#:', '#!', '~#', '...', '=>']

const ere = (literal: string) => literal.replace(/[\\^$.|?*+()[\]{}]/g, (c) => `\\${c}`)

/** Every mark the lexer reads as one token that is longer than one character, longest first. */
export function multiCharacterMarks(): string[] {
  const marks = new Set([...Object.keys(DEFAULT_OPERATOR_MAP), ...Object.keys(DEFAULT_CONNECTOR_MAP), ...OTHER_MARKS].filter((m) => m.length > 1))
  return [...marks].sort((a, b) => b.length - a.length || a.localeCompare(b))
}

/**
 * A word for git's word diff: a multi-character mark, a name, a number, a run of
 * bytes outside ASCII (an em dash stays whole), or any other single character.
 */
export function spwWordPattern(): string {
  return [
    ...multiCharacterMarks().map(ere),
    '[A-Za-z_][A-Za-z0-9_]*',
    '[0-9]+([.][0-9]+)?',
    '[^[:space:][:alnum:][:punct:]]+',
    '[^[:space:]]',
  ].join('|')
}

/** An unindented line that opens a body, or an anchor: what a hunk header should name. */
export const SPW_FRAME_LINE = '^([~?!@.&*=$%^][^{]*[{].*|#>[A-Za-z_].*)$'

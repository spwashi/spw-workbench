import type { Token } from '../types'
import { advance, getPosition, type LexerState } from './state'

/** Seven to forty lowercase hex characters, closed by the scene's `)`. */
const SCENE_HASH = /^[0-9a-f]{7,40}(?=\))/

/**
 * A landed commit in a plan file names the change it landed in as its
 * scene: `.[name](551bb419): "subject"`. Most short hashes start with a
 * digit, which the ordinary matchers split into a number and a word. When a
 * hex run exactly fills the parentheses, keep it one identifier and mark it
 * `commit_ref`, so editors can resolve, link and check it.
 */
export function readCommitRef(state: LexerState): Token<'IDENTIFIER'> | null {
  if (state.input[state.offset - 1] !== '(') return null
  const match = SCENE_HASH.exec(state.input.slice(state.offset, state.offset + 41))
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

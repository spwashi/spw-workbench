/**
 * Particle Matcher
 *
 * The `#` particle lattice: `⟨stance⟩#⟨aim⟩name`. `#` is the resonance /
 * metadata plane; the postfix **aim** says what the mark does on that plane —
 * `>` deixis (points at the node that follows), `:` case (classifies its
 * bearer's role). See `.agents/plans/directive-lattice/PLAN.md`.
 *
 * Three aims lex here: `>` deixis, `:` case, and `!` mood (asserts pragmatic
 * force — migrated off the operator path 2026-07-23, ONF change user-approved).
 * `##` is unoccupied in the corpus and `~#` aspect keeps its bespoke
 * matchAnnotation until its value-binding semantics migrate deliberately.
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, isAtEnd } from '../state'

/** Aims recognized as PARTICLE tokens. */
const PARTICLE_AIMS: ReadonlySet<string> = new Set(['>', ':', '!'])

/**
 * Match `#⟨aim⟩name` (e.g. `#>anchor`, `#:layer`). The name is required —
 * a bare `#>` or `#:` is left for other matchers so no current parse shifts.
 */
export function* matchParticle(
  state: LexerState,
  depth: number
): Generator<ParseEvent, Token | null, void> {
  if (peek(state) !== '#') return null
  const aim = peek(state, 1)
  if (!PARTICLE_AIMS.has(aim)) return null
  if (!/[a-zA-Z_]/.test(peek(state, 2) ?? '')) return null

  const start = getPosition(state)
  let value = `#${aim}`
  advance(state, 2)

  while (!isAtEnd(state) && /[a-zA-Z0-9_-]/.test(peek(state))) {
    value += peek(state)
    advance(state)
  }

  const token: Token<'PARTICLE'> = {
    type: 'PARTICLE',
    value,
    span: { start, end: getPosition(state) },
    kind: aim,
  }

  yield {
    type: 'token',
    rule: 'particle',
    position: start,
    data: { token } as TokenEventData,
    timestamp: performance.now(),
    depth,
  }

  return token
}

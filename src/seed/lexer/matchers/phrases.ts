/**
 * Phrase Matcher
 *
 * Matches backtick-delimited phrases: `...`
 * These are the canonical string form in Spw (guillemets normalize to backticks).
 *
 * @spw:lens:syntactic - phrase tokenization operates purely on form
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek, isAtEnd } from '../state'

/**
 * Match backtick phrase: `...` → PHRASE token
 *
 * Does not support nested backticks. Escaped backticks (\`) are consumed literally.
 */
export function* matchPhrase(
    state: LexerState,
    depth: number
): Generator<ParseEvent, Token | null, void> {
    if (peek(state) !== '`') return null

    const start = getPosition(state)
    advance(state) // consume opening `

    let value = '`'

    while (!isAtEnd(state)) {
        const ch = peek(state)

        if (ch === '\\' && peek(state, 1) === '`') {
            // escaped backtick
            value += '\\`'
            advance(state, 2)
            continue
        }

        if (ch === '`') {
            value += '`'
            advance(state)
            break
        }

        value += ch
        advance(state)
    }

    const token: Token<'PHRASE'> = {
        type: 'PHRASE',
        value,
        span: { start, end: getPosition(state) },
    }

    yield {
        type: 'token',
        rule: 'phrase',
        position: start,
        data: { token } as TokenEventData,
        timestamp: performance.now(),
        depth,
    }

    return token
}

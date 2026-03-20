/**
 * Pattern Matchers
 * 
 * SPREAD (...) and ARROW (=>) tokens.
 */

import type { Token, ParseEvent, TokenEventData } from '../../types'
import type { LexerState } from '../state'
import { getPosition, advance, peek } from '../state'

/**
 * Match spread: ...
 */
export function* matchSpread(
    state: LexerState,
    depth: number
): Generator<ParseEvent, Token | null, void> {
    if (peek(state) === '.' && peek(state, 1) === '.' && peek(state, 2) === '.') {
        // Lookahead to ensure not 4+ dots
        if (peek(state, 3) !== '.') {
            const start = getPosition(state)
            advance(state, 3)

            const token: Token<'SPREAD'> = {
                type: 'SPREAD',
                value: '...',
                span: { start, end: getPosition(state) },
            }

            yield {
                type: 'token',
                rule: 'spread',
                position: start,
                data: { token } as TokenEventData,
                timestamp: performance.now(),
                depth,
            }

            return token
        }
    }

    return null
}

/**
 * Match arrow: =>
 */
export function* matchArrow(
    state: LexerState,
    depth: number
): Generator<ParseEvent, Token | null, void> {
    if (peek(state) === '=' && peek(state, 1) === '>') {
        const start = getPosition(state)
        advance(state, 2)

        const token: Token<'ARROW'> = {
            type: 'ARROW',
            value: '=>',
            span: { start, end: getPosition(state) },
        }

        yield {
            type: 'token',
            rule: 'arrow',
            position: start,
            data: { token } as TokenEventData,
            timestamp: performance.now(),
            depth,
        }

        return token
    }

    return null
}

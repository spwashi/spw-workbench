/**
 * Match Parser
 *
 * Pattern matching: ?match[input] { pattern => handler ... }
 *
 * Separated from expressions.ts because match has its own sub-grammar
 * (arms from patterns.ts) and is entered via a commit check (?match),
 * not through the general operator dispatch.
 */

import type {
    MatchNode,
    MatchArmNode,
} from '../types'
import {
    type Parser,
    getPosition,
    current,
    peek,
    advance,
    skipWhitespace,
    named,
    lazy,
} from '../combinators'
import { matchArmNode } from './patterns'
import type { ExpressionNode } from '../types'

// Lazy import to break circular dependency: match → expression → term → match
const expressionNode: Parser<ExpressionNode> = lazy(() =>
    require('./expressions').expressionNode
)

/**
 * Match: ?match[input] { pat => handler ... }
 */
export const matchNode: Parser<MatchNode> = named('match',
    function* matchParser(stream, depth) {
        const startPos = getPosition(stream)

        // Check for ?
        const opToken = current(stream)
        if (opToken.type !== 'OPERATOR' || opToken.value !== '?') return { success: false, consumed: 0 }

        // Check for match label
        const labelToken = peek(stream, 1)
        if (labelToken?.type !== 'IDENTIFIER' || labelToken.value !== 'match') return { success: false, consumed: 0 }

        advance(stream)
        advance(stream)
        let consumed = 2

        skipWhitespace(stream)

        // Input frame: [ expression ]
        if (current(stream).type !== 'CONTAINER_OPEN' || current(stream).value !== '[') {
            return { success: false, consumed: 0 }
        }
        advance(stream)
        consumed += 1

        skipWhitespace(stream)
        const inputGen = expressionNode(stream, depth + 1)
        let inputStep = inputGen.next()
        while (!inputStep.done) {
            yield inputStep.value
            inputStep = inputGen.next()
        }

        if (!inputStep.value.success) return { success: false, consumed: 0 }
        consumed += inputStep.value.consumed
        const inputNode = inputStep.value.value!

        skipWhitespace(stream)
        if (current(stream).type !== 'CONTAINER_CLOSE' || current(stream).value !== ']') {
            return { success: false, consumed: 0 }
        }
        advance(stream)
        consumed += 1

        skipWhitespace(stream)

        // Body with arms: { arm1 arm2 ... }
        if (current(stream).type !== 'CONTAINER_OPEN' || current(stream).value !== '{') {
            return { success: false, consumed: 0 }
        }
        advance(stream)
        consumed += 1

        const arms: MatchArmNode[] = []

        while (true) {
            skipWhitespace(stream)
            if (current(stream).type === 'CONTAINER_CLOSE' && current(stream).value === '}') {
                advance(stream)
                consumed += 1
                break
            }

            if (current(stream).type === 'EOF') {
                return { success: false, consumed: 0 }
            }

            const armGen = matchArmNode(stream, depth + 1)
            let armStep = armGen.next()
            while (!armStep.done) {
                yield armStep.value
                armStep = armGen.next()
            }

            if (!armStep.value.success) {
                return {
                    success: false,
                    consumed: 0,
                    error: armStep.value.error ?? {
                        message: 'Invalid match arm',
                        expected: ['pattern => handler'],
                        found: current(stream).type,
                        recoverable: false,
                    },
                }
            }
            arms.push(armStep.value.value!)
            consumed += armStep.value.consumed

            skipWhitespace(stream)
            if (current(stream).type === 'COMMA') {
                advance(stream)
                consumed += 1
            }
        }

        const endPos = getPosition(stream)
        const node: MatchNode = {
            type: 'Match',
            span: { start: startPos, end: endPos },
            input: inputNode,
            arms,
        }

        return { success: true, value: node, consumed }
    }
)

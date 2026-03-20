/**
 * Pattern Parsers
 * 
 * Parsers for pattern matching meta-syntax.
 */

import type { WildcardNode, SpreadNode, ReferenceNode, PatternNode, MatchArmNode, FrameNode, BodyNode, ExpressionNode } from '../types'
import {
    type Parser,
    getPosition,
    current,
    advance,
    named,
    skipWhitespace,
    choice,
    lazy,
    sepBy,
} from '../combinators'
import { spread, arrow, openBracket, closeBracket, comma } from './tokens'
import { referenceNode } from './references'
import { literalNode } from './literals'
import { scopeNode, bodyNode } from './containers'
import { operationNode, expressionNode } from './expressions'

/**
 * Pattern Frame: [ pattern, pattern, ... ]
 */
export const patternFrameNode: Parser<FrameNode> = named('patternFrame',
    function* patternFrameParser(stream, depth) {
        const startPos = getPosition(stream)

        // Opening bracket
        const openGen = openBracket(stream, depth + 1)
        let openStep = openGen.next()
        while (!openStep.done) { yield openStep.value; openStep = openGen.next() }
        if (!openStep.value.success) return { success: false, consumed: 0, error: openStep.value.error }
        let consumed = openStep.value.consumed

        // Content
        skipWhitespace(stream)
        const contentGen = sepBy(patternNode, comma)(stream, depth + 1)
        let contentStep = contentGen.next()
        while (!contentStep.done) { yield contentStep.value; contentStep = contentGen.next() }

        const content: PatternNode[] = contentStep.value.success ? contentStep.value.value! : []
        consumed += contentStep.value.consumed

        // Closing bracket
        skipWhitespace(stream)
        const closeGen = closeBracket(stream, depth + 1)
        let closeStep = closeGen.next()
        while (!closeStep.done) { yield closeStep.value; closeStep = closeGen.next() }

        if (!closeStep.value.success) return { success: false, consumed: 0, error: closeStep.value.error }
        consumed += closeStep.value.consumed

        // Convert content to typed array (helper type compatibility)
        // FrameNode content expects (PatternNode | ParameterNode | ConditionNode)[]
        // patternNode return PatternNode, so it fits perfectly.

        const endPos = getPosition(stream)
        const node: FrameNode = {
            type: 'Frame',
            span: { start: startPos, end: endPos },
            content,
        }

        return { success: true, value: node, consumed }
    }
)

/**
 * Pattern element choice
 */
export const patternNode: Parser<PatternNode> = lazy(() => named('pattern',
    choice<PatternNode>(
        wildcardNode,
        spreadNode,
        referenceNode,
        literalNode,
        patternFrameNode,
        scopeNode,
        operationNode
    )
))

/**
 * Match arm: pattern => handler
 */
export const matchArmNode: Parser<MatchArmNode> = named('matchArm',
    function* matchArmParser(stream, depth) {
        const startPos = getPosition(stream)

        // Pattern
        const patGen = patternNode(stream, depth + 1)
        let patStep = patGen.next()
        while (!patStep.done) { yield patStep.value; patStep = patGen.next() }
        if (!patStep.value.success) return { success: false, consumed: 0 }

        let consumed = patStep.value.consumed

        skipWhitespace(stream)

        // =>
        const arrowGen = arrow(stream, depth + 1)
        let arrowStep = arrowGen.next()
        while (!arrowStep.done) { yield arrowStep.value; arrowStep = arrowGen.next() }
        if (!arrowStep.value.success) {
            return { success: false, consumed: 0 }
        }
        consumed += arrowStep.value.consumed

        skipWhitespace(stream)

        // Handler (Expression or Body)
        const handlerGen = choice<ExpressionNode | BodyNode>(bodyNode, expressionNode)(stream, depth + 1)
        let handlerStep = handlerGen.next()
        while (!handlerStep.done) { yield handlerStep.value; handlerStep = handlerGen.next() }
        if (!handlerStep.value.success) return { success: false, consumed: 0 }

        consumed += handlerStep.value.consumed
        const endPos = getPosition(stream)

        const node: MatchArmNode = {
            type: 'MatchArm',
            span: { start: startPos, end: endPos },
            pattern: patStep.value.value!,
            handler: handlerStep.value.value!,
        }

        return { success: true, value: node, consumed }
    }
)



/**
 * Wildcard node: _
 */
export const wildcardNode: Parser<WildcardNode> = named('wildcard',
    function* wildcardParser(stream, _depth) {
        // This parser is intentionally yield-free; yield* [] keeps it compliant with require-yield.
        yield* []
        const tok = current(stream)
        if ((tok.type === 'IDENTIFIER' || tok.type === 'HOLE') && tok.value === '_') {
            advance(stream)
            return {
                success: true,
                value: { type: 'Wildcard', span: tok.span },
                consumed: 1,
            }
        }
        return { success: false, consumed: 0 }
    }
)

/**
 * Spread node: ... or ...@name
 */
export const spreadNode: Parser<SpreadNode> = named('spread',
    function* spreadParser(stream, depth) {
        const startPos = getPosition(stream)
        const spreadGen = spread(stream, depth + 1)
        let spreadStep = spreadGen.next()
        while (!spreadStep.done) {
            yield spreadStep.value
            spreadStep = spreadGen.next()
        }

        if (!spreadStep.value.success) {
            return { success: false, consumed: 0, error: spreadStep.value.error }
        }

        let consumed = spreadStep.value.consumed
        let capture: ReferenceNode | undefined

        // Optional capture after spread (e.g. ...@rest)
        // Don't skip whitespace between ... and @
        if (current(stream).type === 'OPERATOR' && current(stream).value === '@') {
            const refGen = referenceNode(stream, depth + 1)
            let refStep = refGen.next()
            while (!refStep.done) {
                yield refStep.value
                refStep = refGen.next()
            }

            if (refStep.value.success) {
                capture = refStep.value.value
                consumed += refStep.value.consumed
            }
        }

        const endPos = getPosition(stream)
        return {
            success: true,
            value: {
                type: 'Spread',
                span: { start: startPos, end: endPos },
                capture,
            },
            consumed,
        }
    }
)

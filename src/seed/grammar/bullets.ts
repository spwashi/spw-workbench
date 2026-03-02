/**
 * Bullet Parser
 *
 * Line-level prose items: .. <expression|text>
 *
 * Separated from expressions.ts because bullets are a presentation
 * concern (literate-style line items) distinct from the core
 * expression/operation/term grammar.
 */

import type {
    Token,
    BulletNode,
    ProseChunkNode,
    ExpressionNode,
} from '../types'
import {
    type Parser,
    getPosition,
    current,
    advance,
    skipWhitespace,
    token,
    named,
    lazy,
} from '../combinators'

// Lazy import to break circular dependency: bullet → expression → term → bullet
const expressionNode: Parser<ExpressionNode> = lazy(() =>
    require('./expressions').expressionNode
)

/**
 * Bullet item: .. <expression>
 */
export const bulletNode: Parser<BulletNode> = named('bullet',
    function* bulletParser(stream, depth) {
        const startPos = getPosition(stream)

        const markGen = token('CONNECTOR', '..')(stream, depth + 1)
        let markStep = markGen.next()
        while (!markStep.done) {
            yield markStep.value
            markStep = markGen.next()
        }

        if (!markStep.value.success) {
            return { success: false, consumed: 0, error: markStep.value.error }
        }

        let consumed = markStep.value.consumed
        const marker = markStep.value.value! as Token<'CONNECTOR'>

        skipWhitespace(stream)

        // If the bullet starts with a Spw trigger, parse as expression;
        // otherwise capture prose text on the same line.
        const markerLine = marker.span.start.line
        const t0 = current(stream)
        const isSpw = (
            t0.type === 'OPERATOR'
            || t0.type === 'CAPSULE_OPEN'
            || t0.type === 'STREAM_OPEN'
            || t0.type === 'NRANGE_OPEN'
            || t0.type === 'CONTAINER_OPEN'
        )

        if (isSpw) {
            const itemGen = expressionNode(stream, depth + 1)
            let itemStep = itemGen.next()
            while (!itemStep.done) {
                yield itemStep.value
                itemStep = itemGen.next()
            }

            if (!itemStep.value.success) {
                return { success: false, consumed: 0, error: itemStep.value.error }
            }

            consumed += itemStep.value.consumed
            const endPos = getPosition(stream)

            const node: BulletNode = {
                type: 'Bullet',
                span: { start: startPos, end: endPos },
                marker,
                item: itemStep.value.value!,
            }

            return { success: true, value: node, consumed }
        }

        const collected: Token[] = []
        while (true) {
            const tok = current(stream)
            if (tok.type === 'EOF') break
            if (tok.span.start.line !== markerLine) break
            if (tok.type === 'COMMENT') break
            collected.push(tok)
            advance(stream)
            consumed += 1
        }

        let startIdx = 0
        while (startIdx < collected.length && collected[startIdx].type === 'WHITESPACE') startIdx++
        let endIdx = collected.length - 1
        while (endIdx >= startIdx && collected[endIdx].type === 'WHITESPACE') endIdx--

        const text = startIdx <= endIdx
            ? collected.slice(startIdx, endIdx + 1).map((t) => t.value).join('')
            : ''

        const chunk: ProseChunkNode = {
            type: 'ProseChunk',
            span: startIdx <= endIdx
                ? { start: collected[startIdx].span.start, end: collected[endIdx].span.end }
                : { start: marker.span.end, end: marker.span.end },
            text,
        }

        const endPos = getPosition(stream)
        const node: BulletNode = {
            type: 'Bullet',
            span: { start: startPos, end: endPos },
            marker,
            item: chunk,
        }

        return { success: true, value: node, consumed }
    }
)
